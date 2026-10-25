// --- Обработка пользовательских команд чата для Shop for Ore ---
// Импортируем необходимые данные и списки команд
import { world } from '@minecraft/server';
import { CHAT_COLORS, setChatColor, colorAllowed, impersonatedRole, commandsList, emotes, emotesList, rawTranslate, rawTranslateRich, isPending, run, findPlayer, tellText, getRole, hasRole, ROLES, getScore, transferMoney, muteMinutesLeft, getWarns, WARPS, setIssuer, clearIssuer, canLift } from '../DataBase.js';
import { getBot, getBotName, spawnBot } from '../system/spawnbot.js';
import { teleportToArena, combatSecondsLeft } from '../system/pvp.js';
import { startMythic } from '../system/mythic.js';
import { ChangePasswordUI, resetPassword } from '../register/change.js';
import { freezePlayer, unfreezePlayer } from '../system/freeze.js';
import { botMenu } from '../menu/admin_menu.js';
import { addBan, removeBan, getBans, findBan, kickBanned } from '../system/ban.js';
import { ACHIEVEMENTS, findAchievement, unlock, revoke, has as hasAchievement } from '../system/achievements.js';
import { listGames, getGame, joinGame, leaveGame, startGame, endGame } from '../system/minigames.js';
import { cpsOf, cpsLimit } from '../system/cps.js';

// --- Общие помощники команд ---

// Отказ: цвет, префикс или тег выдают игрока за роль, которой у него нет (role — owner/admin/moder/bot)
function denyImpersonation(player, target, role) {
	run(player, `tellraw @s ${rawTranslateRich('chat.cmd.error.target_role', target.name, { translate: role === 'bot' ? 'role.tag.bot' : `role.${role}` })}`);
}

// Служебные табло: !scoreboard меняет их только у владельца (таймеры, разовая настройка, ивенты, панель)
const PROTECTED_OBJECTIVES = ['timer', 'system', 'settings', 'display', 'online', 'xp_need'];

// С кем игрок последним переписывался в ЛС (для !r): имя → имя собеседника
const lastPrivate = new Map();
world.events.playerLeave.subscribe((data) => { lastPrivate.delete(data.playerName); wipeRequests.delete(data.playerName); lastReport.delete(data.playerName); });

// Запросы на вайп, ждущие «!wipe confirm»: имя → время запроса
const wipeRequests = new Map();
const WIPE_CONFIRM_MS = 30000;

// Последняя жалоба игрока (!report) — не чаще раза в минуту: имя → время
const lastReport = new Map();
const REPORT_COOLDOWN_MS = 60000;

// Сколько строк правил в .lang (menu.rules.line.1…N) — те же, что в меню «Правила»
const RULES_LINES = 6;

/**
 * Отправить игроку несколько строк одним tellraw: заголовок, строки, разделитель.
 * @param {Player} player
 * @param {object} header — элемент rawtext заголовка
 * @param {object[]} lines — элементы rawtext строк
 */
// Сколько эмодзи в строке у !emotes (на телефоне 4 уже переносятся)
const EMOTES_PER_ROW = 3;

// --- Выравнивание !emotes ---
// Шрифт чата не моноширинный: ширина в пикселях — по шрифту default8 (буква + 1 пиксель между буквами),
// значки — по glyph_E1 (половина ширины рисунка + 1). Пробел — 4 пикселя, поэтому колонки
// совпадают с точностью до 2 пикселей.
const CHAR_WIDTH = { i: 2, l: 3, t: 4, f: 5, k: 5, j: 4, ':': 2, ' ': 4 };
const GLYPH_WIDTH = {
	'\ue1f0': 6, '\ue1f1': 6, '\ue1f2': 6, '\ue1f3': 6, '\ue1f4': 6, '\ue1f5': 6, '\ue1f6': 6, '\ue1f9': 7,
	'\ue1e0': 8, '\ue1e1': 8, '\ue1e2': 8, '\ue1e3': 7, '\ue1e4': 7,
	'\ue10e': 6, '\ue10f': 6, '\ue151': 9, '\ue152': 7, '\ue153': 7, '\ue154': 6
};
export const textWidth = (s) => [...s].reduce((w, ch) => w + (GLYPH_WIDTH[ch] ?? CHAR_WIDTH[ch] ?? 6), 0);

/** Строки сетки эмодзи: «значок :имя:», дополненные пробелами до общей ширины колонки. */
export function emoteGrid() {
	const cells = emotesList.map(e => ({ text: `§f${e.symbol} §7${e.name}`, width: textWidth(`${e.symbol} ${e.name}`) }));
	const column = Math.max(...cells.map(c => c.width)) + 4;
	const rows = [];
	for (let i = 0; i < cells.length; i += EMOTES_PER_ROW) {
		// Пробелы считаются от уже набранной ширины строки — ошибка округления не копится от колонки к колонке
		let line = '', x = 0;
		cells.slice(i, i + EMOTES_PER_ROW).forEach((c, j) => {
			if (j > 0) {
				const spaces = Math.max(1, Math.round((j * column - x) / 4));
				line += ' '.repeat(spaces); x += spaces * 4;
			}
			line += c.text; x += c.width;
		});
		rows.push(line);
	}
	return rows;
}

// Счета, которые показывает !debug (остальные — !scoreboard <ник> list)
const DEBUG_SCORES = ['money', 'vip_coins', 'lvl', 'xp', 'rebirth'];

/**
 * Строки !debug: роль, позиция, счета, теги по группам.
 * Теги паролей (auth:salt:, auth:hash:, password:) скрыты, как в !tag list.
 * @param {Player} target
 */
export function debugLines(target) {
	const { x, y, z } = target.location;
	const scores = DEBUG_SCORES.map(id => `§e${id}§7: §f${getScore(target, id)}`).join('§8, ');
	const tags = target.getTags().filter(t => !/^(auth:(salt|hash):|password:)/.test(t)).sort((a, b) => a.localeCompare(b));
	const groups = new Map();
	for (const tag of tags) {
		const i = tag.indexOf(':');
		const group = i > 0 ? tag.slice(0, i) : '';
		if (!groups.has(group)) groups.set(group, []);
		groups.get(group).push(i > 0 ? tag.slice(i + 1) : tag);
	}
	const lines = [
		{ translate: 'chat.cmd.debug.role', with: { rawtext: [{ translate: `role.${getRole(target)}` }] } },
		{ translate: 'chat.cmd.debug.pos', with: [`${Math.floor(x)} ${Math.floor(y)} ${Math.floor(z)}`, target.dimension.id.replace('minecraft:', '')] },
		{ translate: 'chat.cmd.debug.scores', with: [scores] },
		{ translate: 'chat.cmd.debug.tags', with: [String(tags.length)] }
	];
	// Группы по алфавиту, теги без «:» — последними («прочие»)
	const names = [...groups.keys()].filter(g => g).sort((a, b) => a.localeCompare(b));
	if (groups.has('')) names.push('');
	for (const g of names) {
		const list = groups.get(g).join('§r§8, §7');
		lines.push(g ? { text: `§6[${g}]§r §7${list}` }
			: { rawtext: [{ text: '§6[' }, { translate: 'chat.cmd.debug.other' }, { text: `]§r §7${list}` }] });
	}
	return lines;
}

function tellList(player, header, lines) {
	const rawtext = [header];
	for (const line of lines) rawtext.push({ text: '\n' }, line);
	rawtext.push({ text: '\n§8------------------------' });
	run(player, `tellraw @s ${JSON.stringify({ rawtext })}`);
}

/**
 * Цель команды: игрок из аргумента [ник] или сам вызвавший.
 * Применить команду к другому можно только с ролью не ниже otherRole.
 * При ошибке сообщает игроку и возвращает null.
 * @param {Player} player
 * @param {string|undefined} name
 * @param {string} otherRole
 * @returns {Player|null}
 */
function resolveTarget(player, name, otherRole, targetRole) {
	if (!name) return player;
	const target = findPlayer(name);
	if (!target) {
		run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', name)}`);
		return null;
	}
	if (target.name !== player.name && !hasRole(player, otherRole)) {
		player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.error.no_permission"}]}');
		return null;
	}
	// Права, которые даёт команда (креатив, наблюдатель, полёт, палочка админа), — только тому, чья роль
	// сама позволяет такую команду: игроку и модератору креатив не выдать даже от администратора
	if (targetRole && target.name !== player.name && !hasRole(target, targetRole)) {
		run(player, `tellraw @s ${rawTranslateRich('chat.cmd.error.target_role', target.name, { translate: `role.${targetRole}` })}`);
		return null;
	}
	return target;
}

/**
 * Изменить баланс игрока: add / take / set (меню администратора → Игроки → Деньги).
 * Снять больше, чем есть, нельзя — баланс станет 0. @returns {boolean} изменено
 */
export function setMoney(player, target, action, raw) {
	const amount = Number(raw);
	if (!['add', 'take', 'set'].includes(action) || !/^\d+$/.test(raw) || amount > 2147483647) {
		player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.money.error.amount"}]}');
		return false;
	}
	const before = getScore(target, 'money');
	const after = action === 'add' ? Math.min(before + amount, 2147483647) : action === 'take' ? Math.max(before - amount, 0) : amount;
	run(target, `scoreboard players set @s money ${after}`);
	run(player, `tellraw @s ${rawTranslate('chat.cmd.money.done', target.name, String(after))}`);
	if (target.name !== player.name) run(target, `tellraw @s ${rawTranslate('chat.cmd.money.received', String(after))}`);
	return true;
}

/**
 * Можно ли наказать игрока (мут, предупреждение, заморозка): не себя и только роль ниже своей
 * (владелец — любого). При отказе сообщает игроку.
 * @param {Player} player
 * @param {Player} target
 * @returns {boolean}
 */
function canPunish(player, target) {
	if (target.name === player.name) {
		player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.error.self"}]}');
		return false;
	}
	if (getRole(player) !== 'owner' && hasRole(target, getRole(player))) {
		run(player, `tellraw @s ${rawTranslate('chat.cmd.error.role', target.name)}`);
		return false;
	}
	return true;
}

/**
 * «Магнит руды» бесплатно (персонал): табло magnet — секунды, тег boost:magnet (timers/ticks_5, ticks_20).
 * Если магнит уже работает — время заменяется новым.
 */
export function giveOreMagnet(player, target, minutes) {
	run(target, `scoreboard players set @s magnet ${minutes * 60}`);
	target.addTag('boost:magnet');
	run(target, `tellraw @s ${rawTranslateRich('chat.cmd.boost.magnet.received', player.name, String(minutes))}`);
	run(target, 'playsound note.bell @s');
	if (target.name !== player.name) run(player, `tellraw @s ${rawTranslate('chat.cmd.boost.magnet.done', target.name, String(minutes))}`);
}

/**
 * Личное сообщение с эмодзи; запоминает собеседников для !r.
 * @param {Player} player
 * @param {string} recipientName
 * @param {string} text
 */
function sendPrivate(player, recipientName, text) {
	const target = findPlayer(recipientName);
	if (!target) {
		run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', recipientName)}`);
		return;
	}
	// Замена текстовых кодов эмодзи на символы
	for (const [name, symbol] of Object.entries(emotes)) {
		text = text.replaceAll(name, symbol);
	}
	// JSON собирается через JSON.stringify: кавычки в сообщении не ломают tellraw
	run(target, `tellraw @s ${rawTranslate('chat.cmd.msg.received', player.name, text)}`);
	run(player, `tellraw @s ${rawTranslate('chat.cmd.msg.sent', target.name, text)}`);
	lastPrivate.set(target.name, player.name);
	lastPrivate.set(player.name, target.name);
}

// --- Главный обработчик команд чата ---
world.events.beforeChat.subscribe((data) => {
	const player = data.sender;
	const message = data.message.trim();

	// Если не команда (не начинается с "!") — не обрабатываем
	if (!message.startsWith("!")) return;
	data.cancel = true;
	// До входа в аккаунт команды недоступны (сообщение игроку показывает chat.js)
	if (isPending(player)) return;

	// Парсим команду и аргументы
	const args = message.slice(1).split(/\s+/);
	const command = args.shift().toLowerCase();
	runChatCommand(player, command, args);
});

/**
 * Выполнить !-команду от имени игрока — из чата или из меню администратора.
 * Права проверяются здесь же, по роли игрока.
 * @param {Player} player
 * @param {string} command — имя без «!», строчными
 * @param {string[]} args — аргументы; из меню ник с пробелом передаётся одним элементом
 */
export function runChatCommand(player, command, args) {
	// Поиск команды в списке — по точному имени (раньше «!f» находило «!fly», «!g» — «!gm1»)
	const findCommand = commandsList.find(cmd => cmd.command.split(' ')[0] === `!${command}`);
	if (!findCommand) {
		run(player, `tellraw @s ${rawTranslate('chat.cmd.error.unknown', `!${command}`)}`);
		return;
	}

	// Проверка роли: команда доступна, если роль игрока не ниже нужной
	if (!hasRole(player, findCommand.role)) {
		player.runCommandAsync(`tellraw @s {"rawtext":[{"translate":"chat.cmd.error.no_permission"}]}`);
		return;
	}

	// --- Обработка каждой команды ---
	switch (command) {
		case "help": {
			// !help — список команд своей роли; !help <команда> — описание одной команды
			if (args[0]) {
				const name = args[0].replace(/^!/, '').toLowerCase();
				const cmd = commandsList.find(c => c.command.split(' ')[0] === `!${name}`);
				if (!cmd) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.error.unknown', `!${name}`)}`);
					break;
				}
				run(player, `tellraw @s ${rawTranslateRich('chat.cmd.help.detail', cmd.command, { translate: cmd.description.slice(1) }, { translate: `role.${cmd.role}` })}`);
				break;
			}
			// Каждый видит только команды своей роли и ниже — сплошным списком в порядке commandsList
			const rawtext = [{ translate: 'chat.help.header' }];
			for (const cmd of commandsList.filter(cmd => hasRole(player, cmd.role))) {
				rawtext.push({ text: `\n§f${cmd.command} - ` }, { translate: cmd.description.slice(1) });
			}
			rawtext.push({ text: '\n§8------------------------' });
			run(player, `tellraw @s ${JSON.stringify({ rawtext })}`);
			break;
		}

		case "warp": {
			// !warp — список точек; !warp <точка> — себя; !warp <точка> <ник> — другого (модератор и выше).
			// Заменяет !spawn: спавн — это !warp spawn
			const available = WARPS.filter(w => hasRole(player, w.role));
			if (!args[0]) {
				const rawtext = [{ translate: 'chat.cmd.warp.header' }];
				for (const w of available) rawtext.push({ text: `\n§f!warp ${w.id} §8- ` }, { translate: `warp.${w.id}` });
				rawtext.push({ text: '\n§8------------------------' });
				run(player, `tellraw @s ${JSON.stringify({ rawtext })}`);
				break;
			}
			const warp = available.find(w => w.id === args[0].toLowerCase());
			if (!warp) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.warp.error.unknown', args[0])}`);
				break;
			}
			// Замороженный не может уйти сам
			if (!args[1] && player.hasTag('state:frozen')) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.freeze.active"}]}');
				break;
			}
			// Режим боя на PvP-арене: сам уйти нельзя, пока не пройдут 15 секунд после удара
			if (!args[1] && combatSecondsLeft(player) > 0) {
				run(player, `tellraw @s ${rawTranslate('chat.pvp.combat', combatSecondsLeft(player))}`);
				break;
			}
			const target = resolveTarget(player, args.slice(1).join(' ') || undefined, 'moder');
			if (!target) break;
			if (warp.arena) {
				teleportToArena(target);
			} else {
				const [x, y, z] = typeof warp.pos === 'function' ? warp.pos(target) : warp.pos;
				run(target, `tp @s ${x} ${y} ${z}`);
			}
			run(target, `tellraw @s ${rawTranslateRich('chat.cmd.warp.done', { translate: `warp.${warp.id}` })}`);
			if (target.name !== player.name) run(player, `tellraw @s ${rawTranslateRich('chat.cmd.warp.other', target.name, { translate: `warp.${warp.id}` })}`);
			break;
		}

		case "emotes": {
			// Список эмодзи сеткой по 3 в ряд: значок, имя и пробелы до ширины колонки
			tellText(player, `%chat.emotes.header\n${emoteGrid().join('\n')}\n§8------------------------§f`);
			break;
		}

		case "msg":
			// Личное сообщение другому игроку с поддержкой эмодзи (в муте — нельзя)
			if (muteMinutesLeft(player) > 0) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.mute.active', muteMinutesLeft(player))}`);
				break;
			}
			if (args[0] && args.length > 1) {
				sendPrivate(player, args[0], args.slice(1).join(" "));
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.msg.use"}]}');
			}
			break;

		case "reply": {
			// Ответ тому, с кем последним переписывался в ЛС
			const partner = lastPrivate.get(player.name);
			if (muteMinutesLeft(player) > 0) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.mute.active', muteMinutesLeft(player))}`);
			} else if (!args.length) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.reply.use"}]}');
			} else if (!partner) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.reply.none"}]}');
			} else {
				sendPrivate(player, partner, args.join(" "));
			}
			break;
		}

		case "balance": {
			// Монеты на балансе; у VIP — ещё VIP-монеты
			run(player, `tellraw @s ${rawTranslate('chat.cmd.balance', getScore(player, 'money'))}`);
			if (getScore(player, 'lvl') >= 26) run(player, `tellraw @s ${rawTranslate('chat.cmd.balance.vip', getScore(player, 'vip_coins'))}`);
			break;
		}

		case "pay": {
			// То же, что перевод в меню банка
			if (!args[0] || !args[1]) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.pay.use"}]}');
				break;
			}
			transferMoney(player, args[0], args[1]);
			break;
		}

		case "top": {
			// Топ-5 игроков в сети по деньгам, уровню, ребитхам или VIP-коинам
			const by = (args[0] || 'money').toLowerCase();
			if (!['money', 'lvl', 'rebirth', 'vip_coins'].includes(by)) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.top.use"}]}');
				break;
			}
			const top = [...world.getPlayers()]
				.map(p => ({ name: p.name, value: getScore(p, by) }))
				.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
				.slice(0, 5);
			tellList(player, { translate: `chat.cmd.top.header.${by}` },
				top.map((p, i) => ({ translate: 'chat.cmd.top.line', with: [String(i + 1), p.name, String(p.value)] })));
			break;
		}

		case "stats": {
			// Статистика своя или другого игрока в сети
			const target = args[0] ? findPlayer(args[0]) : player;
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[0])}`);
				break;
			}
			const lvl = getScore(target, 'lvl');
			const lines = [
				{ translate: 'chat.cmd.stats.lvl', with: { rawtext: [lvl >= 26 ? { translate: 'chat.cmd.stats.vip' } : { text: String(lvl) }] } },
				{ translate: 'chat.cmd.stats.xp', with: [String(getScore(target, 'xp')), String(getScore(target, 'xp_need'))] },
				{ translate: 'chat.cmd.stats.money', with: [String(getScore(target, 'money'))] },
				{ translate: 'chat.cmd.stats.vip_coins', with: [String(getScore(target, 'vip_coins'))] },
				{ translate: 'chat.cmd.stats.rebirth', with: [String(getScore(target, 'rebirth'))] },
				{ translate: 'chat.cmd.stats.role', with: { rawtext: [{ translate: `role.${getRole(target)}` }] } },
				{ translate: 'chat.cmd.stats.warns', with: [String(getWarns(target))] }
			];
			tellList(player, { translate: 'chat.cmd.stats.header', with: [target.name] }, lines);
			break;
		}

		case "online": {
			// Кто в сети: ник, роль, уровень; старшие роли сверху
			const list = [...world.getPlayers()]
				.map(p => ({ name: p.name, role: getRole(p), lvl: getScore(p, 'lvl') }))
				.sort((a, b) => ROLES.indexOf(b.role) - ROLES.indexOf(a.role) || a.name.localeCompare(b.name));
			tellList(player, { translate: 'chat.cmd.online.header', with: [String(list.length)] },
				list.map(p => ({ translate: 'chat.cmd.online.line', with: { rawtext: [{ text: p.name }, { translate: `role.${p.role}` }, { text: String(p.lvl) }] } })));
			break;
		}

		case "report": {
			// Жалоба на игрока — уходит модераторам и выше, кто в сети
			const reportName = args[0];
			const reason = args.slice(1).join(' ');
			if (!reportName || !reason) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.report.use"}]}');
				break;
			}
			const target = findPlayer(reportName);
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', reportName)}`);
				break;
			}
			if (target.name === player.name) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.report.error.self"}]}');
				break;
			}
			const last = lastReport.get(player.name);
			if (last && Date.now() - last < REPORT_COOLDOWN_MS) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.report.error.cooldown"}]}');
				break;
			}
			const staff = [...world.getPlayers()].filter(p => hasRole(p, 'moder') && p.name !== player.name);
			if (!staff.length) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.report.error.no_staff"}]}');
				break;
			}
			lastReport.set(player.name, Date.now());
			for (const s of staff) {
				run(s, `tellraw @s ${rawTranslate('chat.cmd.report.staff', player.name, target.name, reason)}`);
				run(s, 'playsound note.pling @s');
			}
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.report.sent"}]}');
			break;
		}

		case "rules": {
			// Правила сервера — те же строки, что в меню «Правила»
			const lines = [];
			for (let i = 1; i <= RULES_LINES; i++) lines.push({ translate: `menu.rules.line.${i}` });
			lines.push({ translate: 'menu.rules.footer' });
			tellList(player, { translate: 'menu.rules.header' }, lines);
			break;
		}

		case "gm1":
		case "gm2":
		case "gm6": {
			// Режим себе; другому игроку — администратор+.
			// Обычному игроку system.mcfunction каждый тик возвращает приключение — режим у него не удержится
			const mode = { gm1: 'creative', gm2: 'adventure', gm6: 'spectator' }[command];
			// Приключение (обычный режим) — любому; креатив и наблюдатель — только роли, которой положена эта команда
			const target = resolveTarget(player, args[0], 'admin', { gm1: 'admin', gm6: 'moder' }[command]);
			if (!target) break;
			run(target, `gamemode ${mode} @s`);
			run(target, `tellraw @s {"rawtext":[{"translate":"chat.cmd.${command}"}]}`);
			if (target.name !== player.name) run(player, `tellraw @s ${rawTranslateRich('chat.cmd.gm.other', target.name, { translate: `chat.cmd.mode.${mode}` })}`);
			break;
		}

		case "fly": {
			// !fly — переключить; !fly on/off; !fly [on/off] <ник> — другому (администратор+).
			// Состояние полёта скрипт прочитать не может, поэтому запоминаем его тегом state:fly
			let state = args[0] ? args[0].toLowerCase() : undefined;
			let targetName = args[1];
			if (state && state !== 'on' && state !== 'off') { targetName = args[0]; state = undefined; }
			const target = findPlayer(targetName ?? player.name);
			// Включить полёт — только администратору и выше; выключить — любому
			const turnOn = state ? state === 'on' : !(target ?? player).hasTag('state:fly');
			if (!resolveTarget(player, targetName, 'admin', turnOn ? 'admin' : undefined)) break;
			const on = turnOn;
			run(target, `ability @s mayfly ${on}`);
			if (on) target.addTag('state:fly'); else target.removeTag('state:fly');
			run(target, `tellraw @s {"rawtext":[{"translate":"chat.cmd.fly.${on ? 'on' : 'off'}"}]}`);
			if (target.name !== player.name) run(player, `tellraw @s ${rawTranslate(`chat.cmd.fly.other.${on ? 'on' : 'off'}`, target.name)}`);
			break;
		}

		case "clearchat": {
			// !clearchat — только себе (любой игрок); !clearchat all — всем (модератор+)
			const clearText = '{"rawtext":[{"text":"' + '\\n'.repeat(100) + '"}]}';
			if ((args[0] || '').toLowerCase() === 'all') {
				if (!hasRole(player, 'moder')) {
					player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.error.no_permission"}]}');
					break;
				}
				player.runCommandAsync(`tellraw @a ${clearText}`);
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.clearchat"}]}');
			} else {
				player.runCommandAsync(`tellraw @s ${clearText}`);
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.clearchat.self"}]}');
			}
			break;
		}

		case "invis": {
			// !invis — переключить; !invis on/off. Состояние — тег state:invis
			const state = args[0] ? args[0].toLowerCase() : undefined;
			if (state && state !== 'on' && state !== 'off') {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.invis.use"}]}');
				break;
			}
			const on = state ? state === 'on' : !player.hasTag('state:invis');
			if (on) {
				player.runCommandAsync("effect @s invisibility 3600 255 true");
				player.addTag('state:invis');
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.invis.on"}]}');
			} else {
				// Только невидимость (раньше снимались все эффекты)
				player.runCommandAsync("effect @s invisibility 0");
				player.removeTag('state:invis');
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.invis.off"}]}');
			}
			break;
		}

		case "bot": {
			// !bot settings — окно управления ботом (как в меню администратора); откроется после закрытия чата
			if ((args[0] || '').toLowerCase() === 'settings') {
				run(player, 'tellraw @s {"rawtext":[{"translate":"chat.cmd.bot.settings"}]}');
				botMenu(player);
				break;
			}
			// Призвать бота к себе (второй раз — не призывается: бот уже в мире). Управление ботом — в меню администратора
			const bot = getBot();
			if (bot) {
				run(player, `tellraw @s ${rawTranslate('chat.admin.bot.error.present', bot.name)}`);
				break;
			}
			spawnBot(player);
			run(player, `tellraw @s ${rawTranslate('chat.admin.bot.spawned', getBotName())}`);
			break;
		}

		case "stick": {
			// Палочка админа себе или другому администратору (игроку и модератору — нельзя)
			const target = resolveTarget(player, args[0], 'admin', 'admin');
			if (!target) break;
			run(target, "give @s server:admin_stick");
			run(target, 'tellraw @s {"rawtext":[{"translate":"chat.cmd.stick"}]}');
			if (target.name !== player.name) run(player, `tellraw @s ${rawTranslate('chat.cmd.stick.other', target.name)}`);
			break;
		}

		case 'timeset': {
			// Время суток: словом или числом 0–24000
			const time = (args[0] || '').toLowerCase();
			const words = ["sunrise", "day", "noon", "sunset", "night", "midnight"];
			if (words.includes(time) || (/^\d+$/.test(time) && Number(time) <= 24000)) {
				player.runCommandAsync(`time set ${time}`);
				player.runCommandAsync(`tellraw @s ${rawTranslate('chat.cmd.timeset.done', time)}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.timeset.use"}]}');
			}
			break;
		}

		case "color": {
			// !color <ник> <name|text> <цвет|reset> — цвет ника (в чате и над головой) или текста сообщений в чате.
			// Цвет — словом (aqua, gold…) или кодом без «§» (b, 6…)
			const kind = (args[1] || '').toLowerCase();
			const value = (args[2] || '').toLowerCase();
			if (!args[0] || !['name', 'text'].includes(kind) || !value) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.color.use"}]}');
				break;
			}
			const target = findPlayer(args[0]);
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[0])}`);
				break;
			}
			if (target.hasTag('role:bot')) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.color.error.bot"}]}');
				break;
			}
			if (value === 'reset') {
				setChatColor(target, kind, undefined);
				run(player, `tellraw @s ${rawTranslate(`chat.cmd.color.reset.${kind}`, target.name)}`);
				break;
			}
			const id = CHAT_COLORS[value] !== undefined ? value : Object.keys(CHAT_COLORS).find(k => CHAT_COLORS[k] === value.replace(/^§/, ''));
			if (!id) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.color.error.color', args[2])}`);
				break;
			}
			// Цвет роли — только тому, у кого эта роль (иначе игрока над головой не отличить от персонала)
			if (kind === 'name' && !colorAllowed(target, CHAT_COLORS[id])) {
				denyImpersonation(player, target, impersonatedRole(target, `§${CHAT_COLORS[id]}`));
				break;
			}
			setChatColor(target, kind, CHAT_COLORS[id]);
			run(player, `tellraw @s ${rawTranslateRich(`chat.cmd.color.done.${kind}`, target.name, { text: `§${CHAT_COLORS[id]}■` }, { translate: `color.${id}` })}`);
			break;
		}

		case "prefix": {
			// Префиксы в чате (теги rank:). Уровень игрока тоже хранится тегом rank:§rN — его не показываем и не трогаем
			const prefixPlayer = args[0];
			const prefixAction = (args[1] || '').toLowerCase();
			const prefixName = args.slice(2).join(" ");
			if (prefixPlayer && (prefixAction === 'list' || prefixAction === 'clear')) {
				const target = findPlayer(prefixPlayer);
				if (!target) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', prefixPlayer)}`);
					break;
				}
				const prefixes = target.getTags().filter(t => t.startsWith('rank:') && !/^rank:§r\d+$/.test(t));
				if (prefixAction === 'list') {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.prefix.list', target.name, prefixes.length ? prefixes.map(t => t.slice(5)).join('§r§7, ') : '—')}`);
				} else {
					prefixes.forEach(t => target.removeTag(t));
					run(player, `tellraw @s ${rawTranslate('chat.cmd.prefix.clear', target.name)}`);
				}
			} else if (prefixPlayer && ["set", "take"].includes(prefixAction) && prefixName) {
				const target = findPlayer(prefixPlayer);
				if (!target) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', prefixPlayer)}`);
					break;
				}
				// Префикс с цветом или названием роли (Админ, §cVIP…) — только тому, у кого эта роль
				const fakeRole = prefixAction === 'set' ? impersonatedRole(target, prefixName) : undefined;
				if (fakeRole) {
					denyImpersonation(player, target, fakeRole);
					break;
				}
				// Тег в кавычках — префикс может содержать пробелы («Super Star»)
				const prefixTag = JSON.stringify(`rank:${prefixName}`);
				const command = prefixAction === "set"
				? `tag "${target.name}" add ${prefixTag}`: `tag "${target.name}" remove ${prefixTag}`;
				run(player, command);
				player.runCommandAsync(`tellraw @s ${rawTranslate(prefixAction === "set" ? 'chat.cmd.prefix.set' : 'chat.cmd.prefix.take', prefixName, target.name)}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.prefix.use"}]}');
			}
			break;
		}

		case "tag": {
			// Теги игрока: add/remove/list. Служебные теги паролей (auth:salt:, auth:hash:, password:) не показываются;
			// роли и вход (role:*, auth:*) так не меняются — иначе администратор выдал бы себе role:owner
			const tagTarget = args[0];
			const tagAction = (args[1] || '').toLowerCase();
			const tagName = args[2];
			if (tagTarget && tagAction === 'list') {
				const target = findPlayer(tagTarget);
				if (!target) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', tagTarget)}`);
					break;
				}
				const tags = target.getTags().filter(t => !/^(auth:(salt|hash):|password:)/.test(t));
				run(player, `tellraw @s ${rawTranslate('chat.cmd.tag.list', target.name, tags.length ? tags.join('§r§7, ') : '—')}`);
			} else if (tagTarget && ["add", "remove"].includes(tagAction) && tagName) {
				if (/^(role|auth):|^password:/.test(tagName)) {
					player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.tag.error.protected"}]}');
					break;
				}
				// Префикс (rank:) и цвет (chat:…_color:, старые name:/text:) — те же проверки, что у !prefix и !color
				if (tagAction === 'add' && /^(rank:|chat:|name:|text:)/.test(tagName)) {
					const target = findPlayer(tagTarget);
					if (!target) {
						run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', tagTarget)}`);
						break;
					}
					const color = /^(chat:name_color:|name:§?)(.)$/.exec(tagName)?.[2];
					const fakeRole = tagName.startsWith('rank:') ? impersonatedRole(target, tagName.slice(5))
						: color && !colorAllowed(target, color.toLowerCase()) ? impersonatedRole(target, `§${color}`) : undefined;
					if (fakeRole) {
						denyImpersonation(player, target, fakeRole);
						break;
					}
				}
				const tagCommand = `tag "${tagTarget}" ${tagAction} ${JSON.stringify(tagName)}`;
				run(player, tagCommand);
				player.runCommandAsync(`tellraw @s ${rawTranslate(`chat.cmd.tag.${tagAction}`, tagName, tagTarget)}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.tag.use"}]}');
			}
			break;
		}

		case "debug": {
			// Отладка: роль, позиция, главные счета и все теги игрока, сгруппированные по префиксу до «:»
			const target = args[0] ? findPlayer(args.join(' ')) : player;
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args.join(' '))}`);
				break;
			}
			tellList(player, { translate: 'chat.cmd.debug.header', with: [target.name] }, debugLines(target));
			break;
		}

		case "scoreboard": {
			// !scoreboard objectives — все табло; !scoreboard <ник> list — все счета игрока;
			// <ник> get <табло>; <ник> add/remove/set <табло> <число>; <ник> reset [табло].
			// Служебные табло (таймеры, настройки) меняет только владелец — иначе собьются таймеры и setup
			const sbUse = () => player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.scoreboard.use"}]}');
			if ((args[0] || '').toLowerCase() === 'objectives' && !args[1]) {
				const lines = world.scoreboard.getObjectives().map(o => `§e${o.id}${o.displayName && o.displayName !== o.id ? ` §8— §7${o.displayName}` : ''}`);
				run(player, `tellraw @s ${JSON.stringify({ rawtext: [{ translate: 'chat.cmd.scoreboard.objectives' }, { text: `\n${lines.join('\n') || '—'}` }] })}`);
				break;
			}
			const sbAction = (args[1] || '').toLowerCase();
			if (!args[0] || !['get', 'list', 'add', 'remove', 'set', 'reset'].includes(sbAction)) { sbUse(); break; }
			const target = findPlayer(args[0]);
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[0])}`);
				break;
			}
			// Счёт игрока в табло или undefined (счёта нет)
			const scoreOf = (objective) => { try { return objective.getScore(target.scoreboard); } catch { return undefined; } };
			if (sbAction === 'list') {
				const lines = world.scoreboard.getObjectives().map(o => [o.id, scoreOf(o)]).filter(([, v]) => v !== undefined).map(([id, v]) => `§e${id}§7: §f${v}`);
				run(player, `tellraw @s ${JSON.stringify({ rawtext: [{ translate: 'chat.cmd.scoreboard.list', with: [target.name] }, { text: `\n${lines.join('\n') || '—'}` }] })}`);
				break;
			}
			const sbObjective = args[2];
			if (!sbObjective && sbAction !== 'reset') { sbUse(); break; }
			let objective;
			if (sbObjective) {
				try { objective = world.scoreboard.getObjective(sbObjective); } catch { objective = undefined; }
				if (!objective) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.scoreboard.error.objective', sbObjective)}`);
					break;
				}
			}
			if (sbAction === 'get') {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.scoreboard.get', target.name, sbObjective, scoreOf(objective) ?? '—')}`);
				break;
			}
			// Дальше — изменения: служебные табло (или сброс всех табло сразу) — только владельцу
			if ((!sbObjective || PROTECTED_OBJECTIVES.includes(sbObjective)) && !hasRole(player, 'owner')) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.scoreboard.error.protected', sbObjective ?? '*')}`);
				break;
			}
			if (sbAction === 'reset') {
				run(player, `scoreboard players reset "${target.name}"${sbObjective ? ' ' + sbObjective : ''}`);
				run(player, `tellraw @s ${sbObjective ? rawTranslate('chat.cmd.scoreboard.reset', target.name, sbObjective) : rawTranslate('chat.cmd.scoreboard.reset.all', target.name)}`);
				break;
			}
			const raw = args[3] ?? '';
			if (!/^-?\d+$/.test(raw) || Math.abs(Number(raw)) > 2147483647) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.scoreboard.error.number', raw || '—')}`);
				break;
			}
			const amount = Number(raw);
			const before = scoreOf(objective) ?? 0;
			const after = Math.max(-2147483648, Math.min(2147483647, sbAction === 'add' ? before + amount : sbAction === 'remove' ? before - amount : amount));
			run(player, `scoreboard players set "${target.name}" ${sbObjective} ${after}`);
			run(player, `tellraw @s ${rawTranslate(`chat.cmd.scoreboard.${sbAction}`, target.name, sbObjective, String(amount), String(after))}`);
			break;
		}

		case "kick":
			// Кик игрока с причиной
			const kickTarget = args[0];
			const kickReason = args.slice(1).join(" ");
			if (kickTarget) {
				const target = findPlayer(kickTarget);
				if (!target) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', kickTarget)}`);
					break;
				}
				// Выгнать можно только игрока с ролью ниже своей (владелец — любого, кроме себя)
				if (target.name !== player.name && getRole(player) !== 'owner' && hasRole(target, getRole(player))) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.kick.error.role', target.name)}`);
					break;
				}
				// Без причины — стандартное сообщение игры (раньше выгнанный видел сырой ключ %chat.cmd.kick.no_reason)
				run(player, kickReason ? `kick "${target.name}" ${kickReason}` : `kick "${target.name}"`);
				// JSON через JSON.stringify: кавычки в причине больше не ломают сообщение
				run(player, `tellraw @a ${JSON.stringify({ rawtext: [{ translate: "chat.cmd.kick", with: { rawtext: [{ text: target.name }, kickReason ? { text: kickReason } : { translate: "chat.cmd.kick.no_reason" }] } }] })}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.kick.use"}]}');
			}
			break;

		case "event": {
			// Запустить ивент сразу (по таймеру они идут, только если включены в settings)
			const ev = (args[0] || '').toLowerCase();
			// «Мистик» — скрипт (system/mythic.js): наполняет сундук в центре PvP-арены
			if (ev === 'mythic') {
				if (!startMythic()) {
					player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.event.error.no_chest"}]}');
					break;
				}
				run(player, `tellraw @s ${rawTranslateRich('chat.cmd.event.done', { translate: 'chat.cmd.event.name.mythic' })}`);
				break;
			}
			const fn = { haste: 'events/haste_event', rain: 'events/rain_start', gift: 'events/gift_event' }[ev];
			if (!fn) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.event.use"}]}');
				break;
			}
			// «Ускорение» и «Подарок» выбирают игрока без тега host — без других игроков ничего не произойдёт
			if (ev !== 'rain' && ![...world.getPlayers()].some(p => !p.hasTag('role:owner'))) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.event.error.no_players"}]}');
				break;
			}
			run(player, `function ${fn}`);
			run(player, `tellraw @s ${rawTranslateRich('chat.cmd.event.done', { translate: `chat.cmd.event.name.${ev}` })}`);
			break;
		}

		case "boost": {
			// Бесплатный общий буст x2/x4 на 1–60 минут (по умолчанию 5). Как покупка в магазине, но без списания денег
			const type = (args[0] || '').toLowerCase();
			// Личный «Магнит руды» (как в магазине): !boost magnet [ник] [минуты 1–60] — себе или игроку
			if (type === 'magnet') {
				const rest = args.slice(1);
				const minutesArg = rest.length && /^\d+$/.test(rest[rest.length - 1]) ? Number(rest.pop()) : 5;
				if (minutesArg < 1 || minutesArg > 60) {
					player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.boost.use"}]}');
					break;
				}
				const target = rest.length ? findPlayer(rest.join(' ')) : player;
				if (!target) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', rest.join(' '))}`);
					break;
				}
				giveOreMagnet(player, target, minutesArg);
				break;
			}
			const minutes = args[1] === undefined ? 5 : Number(args[1]);
			if (!['x2', 'x4'].includes(type) || !Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.boost.use"}]}');
				break;
			}
			if ([...world.getPlayers()].some(p => p.hasTag('boost:x2') || p.hasTag('boost:x4'))) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.boost.error.active"}]}');
				break;
			}
			const stand = type === 'x2' ? 'X2Boost' : 'X4Boost';
			run(player, `scoreboard players set scoreboards.${type}boost display 0`);
			run(player, `scoreboard players set @e[name="${stand}"] system ${minutes * 60}`);
			run(player, `tag @a add ${type}boost`);
			run(player, `tellraw @a ${rawTranslate('chat.cmd.boost.started', player.name, type, String(minutes))}`);
			run(player, 'execute positioned as @a run playsound note.bell @a');
			break;
		}

		case "say": {
			// Объявление от сервера всем (эмодзи заменяются)
			let text = args.join(' ');
			if (!text) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.say.use"}]}');
				break;
			}
			for (const [name, symbol] of Object.entries(emotes)) text = text.replaceAll(name, symbol);
			run(player, `tellraw @a ${rawTranslate('chat.cmd.say', text)}`);
			break;
		}

		case "mute": {
			// Мут на 1–1440 минут: нельзя писать в общий чат и ЛС. Хранится тегом mute:<окончание>
			const target = args[0] ? findPlayer(args[0]) : undefined;
			const minutes = Number(args[1]);
			if (!args[0] || !/^\d+$/.test(args[1] || '') || minutes < 1 || minutes > 1440) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.mute.use"}]}');
				break;
			}
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[0])}`);
				break;
			}
			if (!canPunish(player, target)) break;
			// Перебить мут, выданный старшим, нельзя (canPunish это не проверяет: роль цели может быть ниже обоих)
			if (muteMinutesLeft(target) > 0 && !canLift(player, target, 'mute')) break;
			target.getTags().filter(t => t.startsWith('state:mute:')).forEach(t => target.removeTag(t));
			target.addTag(`state:mute:${Date.now() + minutes * 60000}`);
			setIssuer(target, 'mute', getRole(player));
			const reason = args.slice(2).join(' ');
			run(player, `tellraw @a ${rawTranslateRich('chat.cmd.mute', target.name, String(minutes), reason ? { text: reason } : { translate: 'chat.cmd.kick.no_reason' })}`);
			break;
		}

		case "unmute": {
			const target = args[0] ? findPlayer(args[0]) : undefined;
			if (!args[0]) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.unmute.use"}]}');
				break;
			}
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[0])}`);
				break;
			}
			if (muteMinutesLeft(target) === 0) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.unmute.error.not_muted', target.name)}`);
				break;
			}
			// Мут, выданный старшим по роли, снять нельзя
			if (!canLift(player, target, 'mute')) break;
			target.getTags().filter(t => t.startsWith('state:mute:')).forEach(t => target.removeTag(t));
			clearIssuer(target, 'mute');
			run(player, `tellraw @s ${rawTranslate('chat.cmd.unmute.done', target.name)}`);
			run(target, 'tellraw @s {"rawtext":[{"translate":"chat.cmd.unmute.received"}]}');
			break;
		}

		case "warn": {
			// Предупреждение (тег warn:N); на третьем — кик и счётчик с нуля
			const reason = args.slice(1).join(' ');
			if (!args[0] || !reason) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.warn.use"}]}');
				break;
			}
			const target = findPlayer(args[0]);
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[0])}`);
				break;
			}
			if (!canPunish(player, target)) break;
			const warns = getWarns(target) + 1;
			target.getTags().filter(t => t.startsWith('state:warn:')).forEach(t => target.removeTag(t));
			run(player, `tellraw @a ${rawTranslate('chat.cmd.warn', target.name, String(warns), reason)}`);
			if (warns >= 3) {
				// Причина кика — без перевода (её показывает сама игра), поэтому «3/3: причина»
				clearIssuer(target, 'warn');
				run(player, `kick "${target.name}" 3/3: ${reason}`);
				run(player, `tellraw @a ${JSON.stringify({ rawtext: [{ translate: "chat.cmd.kick", with: { rawtext: [{ text: target.name }, { text: `3/3: ${reason}` }] } }] })}`);
			} else {
				target.addTag(`state:warn:${warns}`);
				// Снять предупреждения сможет роль не ниже самой старшей из выдавших
				setIssuer(target, 'warn', getRole(player), true);
			}
			break;
		}

		case "unwarn": {
			// Снять предупреждения: !unwarn <ник> [число|all] (по умолчанию одно)
			const name = args[0];
			const amountArg = (args[1] || '1').toLowerCase();
			if (!name || !(amountArg === 'all' || /^\d+$/.test(amountArg)) || amountArg === '0') {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.unwarn.use"}]}');
				break;
			}
			const target = findPlayer(name);
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', name)}`);
				break;
			}
			const before = getWarns(target);
			if (before === 0) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.unwarn.error.none', target.name)}`);
				break;
			}
			if (target.name !== player.name && !canPunish(player, target)) break;
			if (!canLift(player, target, 'warn')) break;
			const left = amountArg === 'all' ? 0 : Math.max(0, before - Number(amountArg));
			target.getTags().filter(t => t.startsWith('state:warn:')).forEach(t => target.removeTag(t));
			if (left > 0) target.addTag(`state:warn:${left}`);
			else clearIssuer(target, 'warn');
			run(player, `tellraw @s ${rawTranslate('chat.cmd.unwarn.done', target.name, String(before - left), String(left))}`);
			if (target.name !== player.name) run(target, `tellraw @s ${rawTranslate('chat.cmd.unwarn.received', String(before - left), String(left))}`);
			break;
		}

		case "freeze": {
			// Заморозка: игрок застывает на месте (даже в воздухе), недоступны меню, меню администратора и !warp.
			// Разморозка — !unfreeze
			if (!args[0]) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.freeze.use"}]}');
				break;
			}
			const target = findPlayer(args[0]);
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[0])}`);
				break;
			}
			if (!canPunish(player, target)) break;
			if (target.hasTag('state:frozen')) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.freeze.error.already', target.name)}`);
				break;
			}
			// Игрок застывает там, где стоит (в том числе в воздухе): system/freeze.js возвращает его на место каждый тик
			freezePlayer(target);
			setIssuer(target, 'frozen', getRole(player));
			run(player, `tellraw @s ${rawTranslate('chat.cmd.freeze.on', target.name)}`);
			run(target, 'tellraw @s {"rawtext":[{"translate":"chat.cmd.freeze.received.on"}]}');
			break;
		}

		case "unfreeze": {
			if (!args[0]) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.unfreeze.use"}]}');
				break;
			}
			const target = findPlayer(args[0]);
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[0])}`);
				break;
			}
			if (!target.hasTag('state:frozen')) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.unfreeze.error.not_frozen', target.name)}`);
				break;
			}
			// Разморозить может только роль не ниже заморозившего
			if (!canLift(player, target, 'frozen')) break;
			unfreezePlayer(target);
			run(player, `tellraw @s ${rawTranslate('chat.cmd.freeze.off', target.name)}`);
			run(target, 'tellraw @s {"rawtext":[{"translate":"chat.cmd.freeze.received.off"}]}');
			break;
		}

		case "cps": {
			// CPS игрока сейчас и максимум за 10 секунд (предупреждения сами приходят модераторам)
			if (!args[0]) { player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.cps.use"}]}'); break; }
			const target = findPlayer(args.join(' '));
			if (!target) { run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args.join(' '))}`); break; }
			const { now, max } = cpsOf(target.name);
			run(player, `tellraw @s ${rawTranslate('chat.cmd.cps.info', target.name, now, max, cpsLimit())}`);
			break;
		}

		case "game": {
			// !game — список; join <игра> / leave; администратор: start / stop <игра>
			const sub = (args[0] || '').toLowerCase();
			if (!sub) {
				const lines = listGames().map(g => ({ translate: 'chat.cmd.game.line', with: { rawtext: [{ text: g.def.id }, { translate: `minigame.${g.def.id}.name` }, { translate: `menu.games.phase.${g.phase}` }, { text: String(g.players.size) }, { text: String(g.def.maxPlayers) }] } }));
				tellList(player, { translate: 'chat.cmd.game.header' }, lines);
				break;
			}
			if (sub === 'join') { joinGame(player, args[1]); break; }
			if (sub === 'leave') {
				if (!leaveGame(player)) player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.game.error.not_in_game"}]}');
				break;
			}
			if (sub === 'start' || sub === 'stop') {
				if (!hasRole(player, 'admin')) { player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.error.no_permission"}]}'); break; }
				const g = getGame(args[1]);
				if (!g) { run(player, `tellraw @s ${rawTranslate('chat.game.error.unknown', args[1] ?? '')}`); break; }
				if (sub === 'start') {
					if (!startGame(g)) player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.game.error.start"}]}');
				} else if (g.players.size) endGame(g, undefined, 'stop');
				else player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.game.error.empty"}]}');
				break;
			}
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.game.use"}]}');
			break;
		}

		case "achievement": {
			// !achievement <ник> list | grant <id> | revoke <id> — для проверки и исправлений
			const action = (args[1] || '').toLowerCase();
			if (!args[0] || !['list', 'grant', 'revoke'].includes(action)) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.achievement.use"}]}');
				break;
			}
			const target = findPlayer(args[0]);
			if (!target) { run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[0])}`); break; }
			if (action === 'list') {
				const got = ACHIEVEMENTS.filter(a => hasAchievement(target, a.id));
				const lines = ACHIEVEMENTS.map(a => ({ rawtext: [{ text: `${hasAchievement(target, a.id) ? (a.type === 'challenge' ? '§d✔' : '§a✔') : '§8✘'} §7${a.id} §8— ` }, { translate: `ach.${a.id}.name` }] }));
				tellList(player, { translate: 'chat.cmd.achievement.list', with: [target.name, String(got.length), String(ACHIEVEMENTS.length)] }, lines);
				break;
			}
			const a = findAchievement(args[2]);
			if (!a) { run(player, `tellraw @s ${rawTranslate('chat.cmd.achievement.error.unknown', args[2] ?? '')}`); break; }
			if (action === 'grant') {
				if (!unlock(target, a.id)) { run(player, `tellraw @s ${rawTranslate('chat.cmd.achievement.error.has', target.name, a.id)}`); break; }
				run(player, `tellraw @s ${rawTranslate('chat.cmd.achievement.granted', target.name, a.id)}`);
			} else {
				if (!revoke(target, a.id)) { run(player, `tellraw @s ${rawTranslate('chat.cmd.achievement.error.missing', target.name, a.id)}`); break; }
				run(player, `tellraw @s ${rawTranslate('chat.cmd.achievement.revoked', target.name, a.id)}`);
			}
			break;
		}

		case "wipe": {
			// Самая опасная команда: сначала предупреждение, выполнение — только «!wipe confirm» в течение 30 секунд
			const asked = wipeRequests.get(player.name);
			if ((args[0] || '').toLowerCase() === 'confirm') {
				wipeRequests.delete(player.name);
				if (!asked || Date.now() - asked > WIPE_CONFIRM_MS) {
					player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.wipe.expired"}]}');
					break;
				}
				player.runCommandAsync("function system/wipe");
			} else {
				wipeRequests.set(player.name, Date.now());
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.wipe.confirm"}]}');
			}
			break;
		}

		case "tp": {
			// !tp <ник> — ты к игроку (отправить другого игрока к себе — !tphere)
			if (!args[0]) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.tp.use"}]}');
				break;
			}
			const first = findPlayer(args[0]);
			if (!first) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[0])}`);
				break;
			}
			if (first.name === player.name) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.tp.error.self"}]}');
				break;
			}
			run(player, `tp @s "${first.name}"`);
			run(player, `tellraw @s ${rawTranslate('chat.cmd.tp.to', first.name)}`);
			break;
		}

		case "tphere": {
			// Игрока к себе (раньше это делала !tp)
			const targetName = args[0];
			if (!targetName) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.tphere.use"}]}');
				break;
			}
			const tpTarget = findPlayer(targetName);
			if (!tpTarget) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', targetName)}`);
				break;
			}
			if (tpTarget.name === player.name) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.tp.error.self"}]}');
				break;
			}
			run(player, `tp "${tpTarget.name}" @s`);
			run(player, `tellraw @s ${rawTranslate('chat.cmd.tp.done', tpTarget.name)}`);
			break;
		}

		case "role": {
			// Назначение роли — только владелец (проверено выше по commandsList)
			const roleTargetName = args[0];
			const newRole = (args[1] || '').toLowerCase();
			if (!roleTargetName || !['player', 'moder', 'admin'].includes(newRole)) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.role.use"}]}');
				break;
			}
			const roleTarget = findPlayer(roleTargetName);
			if (!roleTarget) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', roleTargetName)}`);
				break;
			}
			// Боту роль не выдаётся: у него всегда префикс «Бот»
			if (roleTarget.hasTag('role:bot')) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.role.error.bot"}]}');
				break;
			}
			// Владелец один — его роль командой не меняется
			if (roleTarget.hasTag('role:owner')) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.role.error.owner"}]}');
				break;
			}
			roleTarget.removeTag('role:moder');
			roleTarget.removeTag('role:admin');
			if (newRole !== 'player') roleTarget.addTag(`role:${newRole}`);
			run(player, `tellraw @s ${rawTranslateRich('chat.cmd.role.done', roleTarget.name, { translate: `role.${newRole}` })}`);
			if (roleTarget.name !== player.name) {
				run(roleTarget, `tellraw @s ${rawTranslateRich('chat.cmd.role.received', { translate: `role.${newRole}` })}`);
			}
			break;
		}

		case "password":
			// Смена пароля: форма откроется, как только игрок закроет чат (register/change.js) — подсказываем
			run(player, 'tellraw @s {"rawtext":[{"translate":"chat.account.change.close_chat"}]}');
			ChangePasswordUI(player);
			break;

		case "resetpass": {
			// Сброс забытого пароля — только владелец и только игроку в сети: ему сразу показывается регистрация
			const name = args.join(' ');
			if (!name) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.resetpass.use"}]}');
				break;
			}
			const target = findPlayer(name);
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.resetpass.error.offline', name)}`);
				break;
			}
			if (target.name === player.name || target.hasTag('role:bot')) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.error.self"}]}');
				break;
			}
			resetPassword(player, target);
			break;
		}

		case "ban": {
			// Бан: по номеру игрока в мире и нику (system/ban.js). Игрока в сети — сразу выгоняет
			if (!args[0]) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.ban.use"}]}');
				break;
			}
			const reason = args.slice(1).join(' ');
			const target = findPlayer(args[0]);
			if (target) {
				if (!canPunish(player, target)) break;
				if (target.hasTag('role:bot') || target.hasTag('role:owner')) {
					player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.error.self"}]}');
					break;
				}
				if (!addBan({ id: target.id, name: target.name }, player.name, reason)) {
					player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.ban.error.full"}]}');
					break;
				}
				run(player, `tellraw @a ${rawTranslateRich('chat.cmd.ban.done', target.name, reason ? { text: reason } : { translate: 'chat.cmd.kick.no_reason' })}`);
				kickBanned(target, findBan(target));
			} else {
				// Не в сети — бан только по нику; номер игрока запомнится, когда он зайдёт под этим ником
				if (!addBan({ name: args[0] }, player.name, reason)) {
					player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.ban.error.full"}]}');
					break;
				}
				run(player, `tellraw @s ${rawTranslate('chat.cmd.ban.offline', args[0])}`);
			}
			break;
		}

		case "unban": {
			if (!args[0]) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.unban.use"}]}');
				break;
			}
			const removed = removeBan(args.join(' '));
			if (!removed) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.unban.error.not_found', args.join(' '))}`);
				break;
			}
			run(player, `tellraw @s ${rawTranslate('chat.cmd.unban.done', removed.names.join(', '))}`);
			break;
		}

		case "banlist": {
			const bans = getBans();
			const rawtext = [{ translate: 'chat.cmd.banlist.header' }];
			if (!bans.length) rawtext.push({ text: '\n' }, { translate: 'chat.cmd.banlist.empty' });
			bans.forEach((b, i) => rawtext.push({ text: `\n§e${i + 1}. §f${b.names.join('§7, §f')} §8— §7${b.by}${b.reason ? ' §8— §7' + b.reason : ''}${b.id ? '' : ' §8(ник)'}` }));
			rawtext.push({ text: '\n§8------------------------' });
			run(player, `tellraw @s ${JSON.stringify({ rawtext })}`);
			break;
		}

		case "roles": {
			// Роли игроков в сети: сначала старшие.
			// В 1.19.50 getPlayers() возвращает итератор, а не массив — у него нет .map, поэтому [...]
			const lines = [...world.getPlayers()]
				.map(p => ({ name: p.name, role: getRole(p) }))
				.sort((a, b) => ROLES.indexOf(b.role) - ROLES.indexOf(a.role) || a.name.localeCompare(b.name))
				.map(p => ({ translate: 'chat.cmd.roles.line', with: { rawtext: [{ text: p.name }, { translate: `role.${p.role}` }] } }));
			const rawtext = [{ translate: 'chat.cmd.roles.header' }];
			for (const line of lines) rawtext.push({ text: '\n' }, line);
			rawtext.push({ text: '\n§8------------------------' });
			run(player, `tellraw @s ${JSON.stringify({ rawtext })}`);
			break;
		}

		default:
			// Неизвестная команда
			run(player, `tellraw @s ${rawTranslate('chat.cmd.error.unknown', `!${command}`)}`);
	}
}