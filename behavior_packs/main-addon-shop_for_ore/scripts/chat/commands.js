// --- Обработка пользовательских команд чата для Shop for Ore ---
// Импортируем необходимые данные и списки команд
import { world } from '@minecraft/server';
import { commandsList, emotes, emotesList, rawTranslate, rawTranslateRich, isPending, run, findPlayer, tellText, getRole, hasRole, ROLES, getScore, transferMoney, muteMinutesLeft, getWarns } from '../DataBase.js';

// --- Общие помощники команд ---

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
function resolveTarget(player, name, otherRole) {
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
	return target;
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

		case "spawn": {
			// !spawn — себя; !spawn <ник> — другого (модератор+)
			// Замороженный не может уйти на спавн сам
			if (!args[0] && player.hasTag('frozen')) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.freeze.active"}]}');
				break;
			}
			const target = resolveTarget(player, args[0], 'moder');
			if (!target) break;
			run(target, "tp @s 0 2 0");
			run(target, 'tellraw @s {"rawtext":[{"translate":"chat.cmd.spawn"}]}');
			if (target.name !== player.name) run(player, `tellraw @s ${rawTranslate('chat.cmd.spawn.other', target.name)}`);
			break;
		}

		case "emotes":
			// Вывод списка эмодзи
			const emotesMessage = emotesList.map(emote => `${emote.name} - ${emote.symbol}`).join("\n");
			tellText(player, `%chat.emotes.header\n${emotesMessage}\n§8------------------------§f`);
			break;

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

		case "r": {
			// Ответ тому, с кем последним переписывался в ЛС
			const partner = lastPrivate.get(player.name);
			if (muteMinutesLeft(player) > 0) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.mute.active', muteMinutesLeft(player))}`);
			} else if (!args.length) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.r.use"}]}');
			} else if (!partner) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.r.none"}]}');
			} else {
				sendPrivate(player, partner, args.join(" "));
			}
			break;
		}

		case "balance": {
			// Монеты на балансе; у VIP — ещё VIP-монеты
			run(player, `tellraw @s ${rawTranslate('chat.cmd.balance', getScore(player, 'money'))}`);
			if (getScore(player, 'lvl') >= 26) run(player, `tellraw @s ${rawTranslate('chat.cmd.balance.vip', getScore(player, 'money2'))}`);
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
			// Топ-5 игроков в сети по деньгам, уровню или ребитхам
			const by = (args[0] || 'money').toLowerCase();
			if (!['money', 'lvl', 'rebirth'].includes(by)) {
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
				{ translate: 'chat.cmd.stats.xp', with: [String(getScore(target, 'xp')), String(getScore(target, 'qx'))] },
				{ translate: 'chat.cmd.stats.money', with: [String(getScore(target, 'money'))] },
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
			const target = resolveTarget(player, args[0], 'admin');
			if (!target) break;
			run(target, `gamemode ${mode} @s`);
			run(target, `tellraw @s {"rawtext":[{"translate":"chat.cmd.${command}"}]}`);
			if (target.name !== player.name) run(player, `tellraw @s ${rawTranslateRich('chat.cmd.gm.other', target.name, { translate: `chat.cmd.mode.${mode}` })}`);
			break;
		}

		case "fly": {
			// !fly — переключить; !fly on/off; !fly [on/off] <ник> — другому (администратор+).
			// Состояние полёта скрипт прочитать не может, поэтому запоминаем его тегом fly:on
			let state = args[0] ? args[0].toLowerCase() : undefined;
			let targetName = args[1];
			if (state && state !== 'on' && state !== 'off') { targetName = args[0]; state = undefined; }
			const target = resolveTarget(player, targetName, 'admin');
			if (!target) break;
			const on = state ? state === 'on' : !target.hasTag('fly:on');
			run(target, `ability @s mayfly ${on}`);
			if (on) target.addTag('fly:on'); else target.removeTag('fly:on');
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
			// !invis — переключить; !invis on/off. Состояние — тег invis:on
			const state = args[0] ? args[0].toLowerCase() : undefined;
			if (state && state !== 'on' && state !== 'off') {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.invis.use"}]}');
				break;
			}
			const on = state ? state === 'on' : !player.hasTag('invis:on');
			if (on) {
				player.runCommandAsync("effect @s invisibility 3600 255 true");
				player.addTag('invis:on');
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.invis.on"}]}');
			} else {
				// Только невидимость (раньше снимались все эффекты)
				player.runCommandAsync("effect @s invisibility 0");
				player.removeTag('invis:on');
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.invis.off"}]}');
			}
			break;
		}

		case "bot":
			// Спавн бота
			player.runCommandAsync("function system/spawnbot");
			break;

		case "stick": {
			// Палочка админа себе или другому (администратор+)
			const target = resolveTarget(player, args[0], 'admin');
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
				// Тег в кавычках — префикс может содержать пробелы («Super Admin»)
				const prefixTag = JSON.stringify(`rank:${prefixName}`);
				const command = prefixAction === "set"
				? `tag "${prefixPlayer}" add ${prefixTag}`: `tag "${prefixPlayer}" remove ${prefixTag}`;
				run(player, command);
				player.runCommandAsync(`tellraw @s ${rawTranslate(prefixAction === "set" ? 'chat.cmd.prefix.set' : 'chat.cmd.prefix.take', prefixName, prefixPlayer)}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.prefix.use"}]}');
			}
			break;
		}

		case "tag": {
			// Теги игрока: add/remove/list. Служебные теги паролей (pws:, pwh:, password:) не показываются
			const tagTarget = args[0];
			const tagAction = (args[1] || '').toLowerCase();
			const tagName = args[2];
			if (tagTarget && tagAction === 'list') {
				const target = findPlayer(tagTarget);
				if (!target) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', tagTarget)}`);
					break;
				}
				const tags = target.getTags().filter(t => !/^(pws|pwh|password):/.test(t));
				run(player, `tellraw @s ${rawTranslate('chat.cmd.tag.list', target.name, tags.length ? tags.join('§r§7, ') : '—')}`);
			} else if (tagTarget && ["add", "remove"].includes(tagAction) && tagName) {
				const tagCommand = `tag "${tagTarget}" ${tagAction} ${JSON.stringify(tagName)}`;
				run(player, tagCommand);
				player.runCommandAsync(`tellraw @s ${rawTranslate(`chat.cmd.tag.${tagAction}`, tagName, tagTarget)}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.tag.use"}]}');
			}
			break;
		}

		case "scoreboard": {
			// Значение табло игрока: add/remove/set <число>, get — посмотреть
			const sbTarget = args[0];
			const sbAction = (args[1] || '').toLowerCase();
			const sbObjective = args[2];
			const sbAmount = parseInt(args[3], 10);
			if (sbTarget && sbAction === 'get' && sbObjective) {
				const target = findPlayer(sbTarget);
				if (!target) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', sbTarget)}`);
					break;
				}
				let objective;
				try { objective = world.scoreboard.getObjective(sbObjective); } catch { objective = undefined; }
				if (!objective) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.scoreboard.error.objective', sbObjective)}`);
					break;
				}
				let value;
				try { value = objective.getScore(target.scoreboard); } catch { value = undefined; }
				run(player, `tellraw @s ${rawTranslate('chat.cmd.scoreboard.get', target.name, sbObjective, value ?? '—')}`);
			} else if (sbTarget && ["add", "remove", "set"].includes(sbAction) && sbObjective && !isNaN(sbAmount)) {
				run(player, `scoreboard players ${sbAction} "${sbTarget}" ${sbObjective} ${sbAmount}`);
				player.runCommandAsync(`tellraw @s ${rawTranslate(`chat.cmd.scoreboard.${sbAction}`, sbTarget, sbObjective, sbAmount)}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.scoreboard.use"}]}');
			}
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

		case "money": {
			// Деньги игроку в сети: add/take/set. Снять больше, чем есть, нельзя — баланс станет 0
			const action = (args[1] || '').toLowerCase();
			const raw = args[2] || '';
			const amount = Number(raw);
			if (!args[0] || !['add', 'take', 'set'].includes(action) || !/^\d+$/.test(raw) || amount > 2147483647) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.money.use"}]}');
				break;
			}
			const target = findPlayer(args[0]);
			if (!target) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[0])}`);
				break;
			}
			const before = getScore(target, 'money');
			const after = action === 'add' ? Math.min(before + amount, 2147483647) : action === 'take' ? Math.max(before - amount, 0) : amount;
			run(target, `scoreboard players set @s money ${after}`);
			run(player, `tellraw @s ${rawTranslate('chat.cmd.money.done', target.name, String(after))}`);
			if (target.name !== player.name) run(target, `tellraw @s ${rawTranslate('chat.cmd.money.received', String(after))}`);
			break;
		}

		case "event": {
			// Запустить ивент сразу (по таймеру они идут, только если включены в settings)
			const ev = (args[0] || '').toLowerCase();
			const fn = { haste: 'events/haste_event', rain: 'events/rain_start', gift: 'events/gift_event' }[ev];
			if (!fn) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.event.use"}]}');
				break;
			}
			// «Ускорение» и «Подарок» выбирают игрока без тега host — без других игроков ничего не произойдёт
			if (ev !== 'rain' && ![...world.getPlayers()].some(p => !p.hasTag('host'))) {
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
			const minutes = args[1] === undefined ? 5 : Number(args[1]);
			if (!['x2', 'x4'].includes(type) || !Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.boost.use"}]}');
				break;
			}
			if ([...world.getPlayers()].some(p => p.hasTag('x2boost') || p.hasTag('x4boost'))) {
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
			target.getTags().filter(t => t.startsWith('mute:')).forEach(t => target.removeTag(t));
			target.addTag(`mute:${Date.now() + minutes * 60000}`);
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
			target.getTags().filter(t => t.startsWith('mute:')).forEach(t => target.removeTag(t));
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
			target.getTags().filter(t => t.startsWith('warn:')).forEach(t => target.removeTag(t));
			run(player, `tellraw @a ${rawTranslate('chat.cmd.warn', target.name, String(warns), reason)}`);
			if (warns >= 3) {
				// Причина кика — без перевода (её показывает сама игра), поэтому «3/3: причина»
				run(player, `kick "${target.name}" 3/3: ${reason}`);
				run(player, `tellraw @a ${JSON.stringify({ rawtext: [{ translate: "chat.cmd.kick", with: { rawtext: [{ text: target.name }, { text: `3/3: ${reason}` }] } }] })}`);
			} else {
				target.addTag(`warn:${warns}`);
			}
			break;
		}

		case "freeze": {
			// Заморозка: нельзя двигаться и прыгать, недоступны меню и !spawn. Повторная команда — разморозка
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
			if (target.hasTag('frozen')) {
				target.removeTag('frozen');
				run(target, 'effect @s slowness 0');
				run(target, 'effect @s jump_boost 0');
				run(player, `tellraw @s ${rawTranslate('chat.cmd.freeze.off', target.name)}`);
				run(target, 'tellraw @s {"rawtext":[{"translate":"chat.cmd.freeze.received.off"}]}');
			} else {
				target.addTag('frozen');
				// Замедление 255 — стоит на месте; прыгучесть 128 (переполнение) — не прыгает
				run(target, 'effect @s slowness 1000000 255 true');
				run(target, 'effect @s jump_boost 1000000 128 true');
				run(player, `tellraw @s ${rawTranslate('chat.cmd.freeze.on', target.name)}`);
				run(target, 'tellraw @s {"rawtext":[{"translate":"chat.cmd.freeze.received.on"}]}');
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
			// !tp <ник> — ты к игроку; !tp <ник1> <ник2> — первого ко второму
			if (!args[0]) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.tp.use"}]}');
				break;
			}
			const first = findPlayer(args[0]);
			if (!first) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[0])}`);
				break;
			}
			if (args[1]) {
				const second = findPlayer(args[1]);
				if (!second) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', args[1])}`);
					break;
				}
				if (first.name === second.name) {
					player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.tp.error.self"}]}');
					break;
				}
				run(player, `tp "${first.name}" "${second.name}"`);
				run(player, `tellraw @s ${rawTranslate('chat.cmd.tp.between', first.name, second.name)}`);
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
			// Владелец один — его роль командой не меняется
			if (roleTarget.hasTag('host')) {
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
});