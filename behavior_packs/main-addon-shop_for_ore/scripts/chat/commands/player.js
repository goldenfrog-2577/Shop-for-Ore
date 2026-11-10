// --- Команды игрока (роль player): справка, точки, ЛС, деньги, топ, статистика, жалобы, мини-игры ---
// Обработчик: имя команды без «!» → (player, args, command). Права (роль из commandsList) проверяет
// runChatCommand в chat/commands/commands.js; return — команда выполнена или отказ уже сообщён игроку.

import { world } from '@minecraft/server';
import { commandsList, tell, hasRole, run, WARPS, warpAllowed, tellText, muteMinutesLeft, getScore, isVip, transferMoney, findPlayer, getRole, getWarns, ROLES, RULES_COUNT, emotesList, emotes } from '../../DataBase.js';
import { isJailed, tellJailed } from '../../system/security/jail.js';
import { combatSecondsLeft, teleportToArena } from '../../system/combat/pvp.js';
import { bossBusy } from '../../system/boss/boss.js';
import { canTeleport, listGames, joinGame, leaveGame, getGame, startGame, endGame } from '../../system/minigames/minigames.js';
import { ChangePasswordUI } from '../../registration/change.js';
import { resolveTarget, tellList } from './common.js';
import { censor } from '../censor.js';

// С кем игрок последним переписывался в ЛС (для !r): имя → имя собеседника
const lastPrivate = new Map();

// Последняя жалоба игрока (!report) — не чаще раза в минуту: имя → время
const lastReport = new Map();
const REPORT_COOLDOWN_MS = 60000;

// !top: значение для сортировки и (если нужно) то, что показать вместо числа
const score = (objective) => (p) => ({ value: getScore(p, objective) });
const TOP = {
	money: score('money'),
	lvl: score('lvl'),
	rebirth: score('rebirth'),
	vip_coins: score('vip_coins'),
	// K/D — убийства/смерти; без смертей отношение равно числу убийств
	kd: (p) => {
		const kills = getScore(p, 'stat_kills'), deaths = getScore(p, 'stat_deaths');
		const ratio = deaths ? kills / deaths : kills;
		return { value: ratio, shown: { translate: 'chat.cmd.top.kd_value', with: [String(kills), String(deaths), ratio.toFixed(2)] } };
	},
	pvp: score('stat_win_pvp_ffa'),
	spleef: score('stat_win_spleef')
};

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

/** Сообщение «ты в муте» с оставшимся сроком (или «навсегда»). */
function tellMuted(player) {
	const left = muteMinutesLeft(player);
	if (left === Infinity) tell(player, 'chat.cmd.mute.active.permanent');
	else tell(player, 'chat.cmd.mute.active', String(left));
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
		tell(player, 'chat.cmd.error.offline', recipientName);
		return;
	}
	// Ругательства → «***», затем коды эмодзи → символы
	text = censor(text);
	for (const [name, symbol] of Object.entries(emotes)) {
		text = text.replaceAll(name, symbol);
	}
	// JSON собирается через JSON.stringify: кавычки в сообщении не ломают tellraw
	tell(target, 'chat.cmd.msg.received', player.name, text);
	tell(player, 'chat.cmd.msg.sent', target.name, text);
	lastPrivate.set(target.name, player.name);
	lastPrivate.set(player.name, target.name);
}

// Игрок вышел — его записи больше не нужны
world.events.playerLeave.subscribe((data) => {
	lastPrivate.delete(data.playerName);
	lastReport.delete(data.playerName);
});

export const PLAYER_COMMANDS = {
	help(player, args) {
		// !help — список команд своей роли; !help <команда> — описание одной команды
		if (args[0]) {
			const name = args[0].replace(/^!/, '').toLowerCase();
			const cmd = commandsList.find(c => c.command.split(' ')[0] === `!${name}`);
			if (!cmd) {
				tell(player, 'chat.cmd.error.unknown', `!${name}`);
				return;
			}
			tell(player, 'chat.cmd.help.detail', cmd.command, { translate: cmd.description.slice(1) }, { translate: `role.${cmd.role}` });
			return;
		}
		// Каждый видит только команды своей роли и ниже — сплошным списком в порядке commandsList
		const rawtext = [{ translate: 'chat.help.header' }];
		for (const cmd of commandsList.filter(cmd => hasRole(player, cmd.role))) {
			rawtext.push({ text: `\n§f${cmd.command} - ` }, { translate: cmd.description.slice(1) });
		}
		rawtext.push({ text: '\n§8------------------------' });
		run(player, `tellraw @s ${JSON.stringify({ rawtext })}`);
	},

	warp(player, args) {
		// !warp — список точек; !warp <точка> — себя; !warp <точка> <ник> — другого (модератор и выше).
		// Заменяет !spawn: спавн — это !warp spawn
		// Точки своей роли; VIP-остров — только VIP и персоналу (warpAllowed)
		const available = WARPS.filter(w => warpAllowed(player, w));
		if (!args[0]) {
			const rawtext = [{ translate: 'chat.cmd.warp.header' }];
			for (const w of available) rawtext.push({ text: `\n§f!warp ${w.id} §8- ` }, { translate: `warp.${w.id}` });
			rawtext.push({ text: '\n§8------------------------' });
			run(player, `tellraw @s ${JSON.stringify({ rawtext })}`);
			return;
		}
		const id = args[0].toLowerCase();
		// Точка VIP, а игрок не VIP — понятная ошибка вместо «не найдено»
		if (WARPS.some(w => w.id === id && w.vip && hasRole(player, w.role) && !warpAllowed(player, w))) {
			tell(player, 'chat.cmd.warp.error.vip');
			return;
		}
		// Точка с уровня (арена босса), а уровень ниже — понятная ошибка
		const gated = WARPS.find(w => w.id === id && w.minLevel && hasRole(player, w.role) && !warpAllowed(player, w));
		if (gated) {
			tell(player, 'chat.cmd.warp.error.level', String(gated.minLevel));
			return;
		}
		const warp = available.find(w => w.id === id);
		if (!warp) {
			tell(player, 'chat.cmd.error.not_found', args[0], '!warp');
			return;
		}
		// Замороженный и посаженный в тюрьму не могут уйти сами
		if (!args[1] && player.hasTag('state:frozen')) {
			tell(player, 'chat.cmd.freeze.active');
			return;
		}
		if (!args[1] && isJailed(player)) {
			tellJailed(player);
			return;
		}
		// Режим боя на PvP-арене: сам уйти нельзя, пока не пройдут 15 секунд после удара
		if (!args[1] && combatSecondsLeft(player) > 0) {
			tell(player, 'chat.pvp.combat', combatSecondsLeft(player));
			return;
		}
		const target = resolveTarget(player, args.slice(1).join(' ') || undefined, 'moder');
		if (!target) return;
		// Не-VIP на VIP-остров не отправить: system/system сразу вернёт его на спавн
		if (!warpAllowed(target, warp)) {
			tell(player, 'chat.cmd.warp.error.vip_other', target.name);
			return;
		}
		// Сплиф: участникам и зрителям телепорт закрыт до конца игры (кроме владельца)
		if (!canTeleport(target, player)) return;
		// Бой с Хранителем: варп ведёт в тоннель за закрытой решёткой — пока идёт бой, туда никого
		if (warp.id === 'boss' && bossBusy()) {
			tell(player, 'chat.boss.busy');
			return;
		}
		if (warp.arena) {
			teleportToArena(target);
		} else {
			const [x, y, z] = typeof warp.pos === 'function' ? warp.pos(target) : warp.pos;
			run(target, `tp @s ${x} ${y} ${z}`);
		}
		tell(target, 'chat.cmd.warp.done', { translate: `warp.${warp.id}` });
		if (target.name !== player.name) tell(player, 'chat.cmd.warp.other', target.name, { translate: `warp.${warp.id}` });
	},

	emotes(player, args) {
		// Список эмодзи сеткой по 3 в ряд: значок, имя и пробелы до ширины колонки
		tellText(player, `%chat.emotes.header\n${emoteGrid().join('\n')}\n§8------------------------§f`);
	},

	msg(player, args) {
		// Личное сообщение другому игроку с поддержкой эмодзи (в муте — нельзя)
		if (muteMinutesLeft(player) > 0) {
			tellMuted(player);
			return;
		}
		if (args[0] && args.length > 1) {
			sendPrivate(player, args[0], args.slice(1).join(' '));
		} else {
			tell(player, 'chat.cmd.msg.use');
		}
	},

	reply(player, args) {
		// Ответ тому, с кем последним переписывался в ЛС
		const partner = lastPrivate.get(player.name);
		if (muteMinutesLeft(player) > 0) {
			tellMuted(player);
		} else if (!args.length) {
			tell(player, 'chat.cmd.reply.use');
		} else if (!partner) {
			tell(player, 'chat.cmd.reply.none');
		} else {
			sendPrivate(player, partner, args.join(' '));
		}
	},

	balance(player, args) {
		// Монеты на балансе; у VIP — ещё VIP-монеты
		tell(player, 'chat.cmd.balance', getScore(player, 'money'));
		if (isVip(player)) tell(player, 'chat.cmd.balance.vip', getScore(player, 'vip_coins'));
	},

	pay(player, args) {
		// То же, что перевод в меню банка
		if (!args[0] || !args[1]) {
			tell(player, 'chat.cmd.pay.use');
			return;
		}
		transferMoney(player, args[0], args[1]);
	},

	top(player, args) {
		// Топ-5 игроков в сети. Без аргумента — подсказка (раньше сразу топ по монетам)
		const by = (args[0] || '').toLowerCase();
		const source = TOP[by];
		if (!source) {
			tell(player, 'chat.cmd.top.use');
			return;
		}
		const top = [...world.getPlayers()]
			.filter(p => !p.hasTag('role:bot'))
			.map(p => ({ name: p.name, ...source(p) }))
			.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
			.slice(0, 5);
		tellList(player, { translate: `chat.cmd.top.header.${by}` },
			top.map((p, i) => ({ translate: 'chat.cmd.top.line', with: { rawtext: [{ text: String(i + 1) }, { text: p.name }, p.shown ?? { text: String(p.value) }] } })));
	},

	stats(player, args) {
		// Статистика своя или другого игрока в сети
		const target = args[0] ? findPlayer(args[0]) : player;
		if (!target) {
			tell(player, 'chat.cmd.error.offline', args[0]);
			return;
		}
		const lvl = getScore(target, 'lvl');
		const lines = [
			{ translate: 'chat.cmd.stats.lvl', with: { rawtext: [isVip(target) ? { translate: 'chat.cmd.stats.vip', with: [String(lvl)] } : { text: String(lvl) }] } },
			// Последний уровень (xp_need 0) — без «/ 0»
			getScore(target, 'xp_need') > 0
				? { translate: 'chat.cmd.stats.xp', with: [String(getScore(target, 'xp')), String(getScore(target, 'xp_need'))] }
				: { translate: 'chat.cmd.stats.xp.max', with: [String(getScore(target, 'xp'))] },
			{ translate: 'chat.cmd.stats.money', with: [String(getScore(target, 'money'))] },
			{ translate: 'chat.cmd.stats.vip_coins', with: [String(getScore(target, 'vip_coins'))] },
			{ translate: 'chat.cmd.stats.rebirth', with: [String(getScore(target, 'rebirth'))] },
			{ translate: 'chat.cmd.stats.role', with: { rawtext: [{ translate: `role.${getRole(target)}` }] } },
			{ translate: 'chat.cmd.stats.warns', with: [String(getWarns(target))] }
		];
		tellList(player, { translate: 'chat.cmd.stats.header', with: [target.name] }, lines);
	},

	online(player, args) {
		// Кто в сети: ник, роль, уровень; старшие роли сверху
		const list = [...world.getPlayers()]
			.map(p => ({ name: p.name, role: getRole(p), lvl: getScore(p, 'lvl') }))
			.sort((a, b) => ROLES.indexOf(b.role) - ROLES.indexOf(a.role) || a.name.localeCompare(b.name));
		tellList(player, { translate: 'chat.cmd.online.header', with: [String(list.length)] },
			list.map(p => ({ translate: 'chat.cmd.online.line', with: { rawtext: [{ text: p.name }, { translate: `role.${p.role}` }, { text: String(p.lvl) }] } })));
	},

	report(player, args) {
		// Жалоба на игрока — уходит хелперам и выше, кто в сети
		const reportName = args[0];
		const reason = censor(args.slice(1).join(' '));
		if (!reportName || !reason) {
			tell(player, 'chat.cmd.report.use');
			return;
		}
		const target = findPlayer(reportName);
		if (!target) {
			tell(player, 'chat.cmd.error.offline', reportName);
			return;
		}
		if (target.name === player.name) {
			tell(player, 'chat.cmd.error.self');
			return;
		}
		const last = lastReport.get(player.name);
		if (last && Date.now() - last < REPORT_COOLDOWN_MS) {
			tell(player, 'chat.cmd.report.error.cooldown');
			return;
		}
		const staff = [...world.getPlayers()].filter(p => hasRole(p, 'helper') && p.name !== player.name);
		if (!staff.length) {
			tell(player, 'chat.cmd.report.error.no_staff');
			return;
		}
		lastReport.set(player.name, Date.now());
		for (const s of staff) {
			tell(s, 'chat.cmd.report.staff', player.name, target.name, reason);
			run(s, 'playsound note.pling @s');
		}
		tell(player, 'chat.cmd.report.sent');
	},

	rules(player, args) {
		// Правила сервера — те же строки, что в меню «Правила»
		const lines = [];
		for (let i = 1; i <= RULES_COUNT; i++) lines.push({ translate: `menu.rules.line.${i}` });
		lines.push({ translate: 'menu.rules.footer' });
		tellList(player, { translate: 'menu.rules.header' }, lines);
	},

	clearchat(player, args) {
		// !clearchat — только себе (любой игрок); !clearchat all — всем (модератор+)
		const clearText = '{"rawtext":[{"text":"' + '\\n'.repeat(100) + '"}]}';
		if ((args[0] || '').toLowerCase() === 'all') {
			if (!hasRole(player, 'moder')) {
				tell(player, 'chat.cmd.error.no_permission');
				return;
			}
			run(player, `tellraw @a ${clearText}`);
			tell(player, 'chat.cmd.clearchat');
		} else {
			run(player, `tellraw @s ${clearText}`);
			tell(player, 'chat.cmd.clearchat.self');
		}
	},

	game(player, args) {
		// !game — список; join <игра> / leave; администратор: start / stop <игра>
		const sub = (args[0] || '').toLowerCase();
		if (!sub) {
			const lines = listGames().map(g => ({ translate: 'chat.cmd.game.line', with: { rawtext: [{ text: g.def.id }, { translate: `minigame.${g.def.id}.name` }, { translate: `menu.games.phase.${g.phase}` }, { text: String(g.players.size) }, { text: String(g.def.maxPlayers) }] } }));
			tellList(player, { translate: 'chat.cmd.game.header' }, lines);
			return;
		}
		if (sub === 'join') { joinGame(player, args[1]); return; }
		if (sub === 'leave') {
			if (!leaveGame(player)) tell(player, 'chat.game.error.not_in_game');
			return;
		}
		if (sub === 'start' || sub === 'stop') {
			if (!hasRole(player, 'admin')) { tell(player, 'chat.cmd.error.no_permission'); return; }
			const g = getGame(args[1]);
			if (!g) { tell(player, 'chat.cmd.error.not_found', args[1] ?? '', '!game'); return; }
			if (sub === 'start') {
				if (!startGame(g)) tell(player, 'chat.cmd.game.error.start');
			} else if (g.players.size) endGame(g, undefined, 'stop');
			else tell(player, 'chat.cmd.game.error.empty');
			return;
		}
		tell(player, 'chat.cmd.game.use');
	},

	password(player, args) {
		// Смена пароля: форма откроется, как только игрок закроет чат (registration/change.js) — подсказываем
		tell(player, 'chat.account.change.close_chat');
		ChangePasswordUI(player);
	}
};
