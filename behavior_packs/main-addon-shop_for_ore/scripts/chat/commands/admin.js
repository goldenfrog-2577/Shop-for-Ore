// --- Команды администратора: режим игры (!gm6 — с хелпера), полёт, время, ивенты, бусты, бан, табло, теги, цвет, префикс, бот, достижения ---
// Обработчик: имя команды без «!» → (player, args, command). Права (роль из commandsList) проверяет
// runChatCommand в chat/commands/commands.js; return — команда выполнена или отказ уже сообщён игроку.

import { playtimeRawtext } from '../../system/player/playtime.js';
import { DEBUG_SCORES, groupProfileTags, profilePosition, profileScores } from '../../system/player/registry.js';
import { world } from '@minecraft/server';
import { run, tell, findPlayer, setChatColor, CHAT_COLORS, colorAllowed, impersonatedRole, hasRole, rawTranslate, emotes, parseTerm, rawTranslateRich, termText, getScore, getRole } from '../../utils.js';
import { botMenu } from '../../menu/admin/admin_menu.js';
import { getBot, spawnBot, getBotName } from '../../system/bot/spawnbot.js';
import { LEVEL_RANK_RE } from '../../system/player/ranks.js';
import { startMythic } from '../../system/combat/mythic.js';
import { stopAdminBoosts, markAdminBoost, MAGNET_ADMIN_TAG, BOOST_TIMERS, boostSeconds, boostTimersReady } from '../../system/economy/boosts.js';
import { ACHIEVEMENTS, has as hasAchievement, findAchievement, unlock, revoke } from '../../system/player/achievements.js';
import { addBan, kickBanned, findBan, removeBan, getBans, banActive, banMinutesLeft } from '../../system/security/ban.js';
import { columnPadding, resolveTarget, tellList, canPunish } from './common.js';
import { censor } from '../censor.js';
import { logAction } from '../../system/security/staff_log.js';

// Отказ: цвет, префикс или тег выдают игрока за роль, которой у него нет (role — owner/admin/moder/bot)
function denyImpersonation(player, target, role) {
	tell(player, 'chat.cmd.error.target_role', target.name, { translate: role === 'bot' ? 'role.tag.bot' : `role.${role}` });
}

// Служебные табло: !scoreboard меняет их только у владельца (таймеры, разовая настройка, ивенты, панель)
const PROTECTED_OBJECTIVES = ['timer', 'system', 'settings', 'display', 'online', 'xp_need', 'sfo_registry'];

/** Строки !debug. Секреты аккаунта исключаются в groupProfileTags. */
export function debugLines(target) {
	const data = profileScores(target.scoreboard);
	const scores = DEBUG_SCORES.map(id => '§e' + id + '§7: §f' + (data[id] ?? 0)).join('§8, ');
	const { count, groups } = groupProfileTags(target);
	const lines = [
		{ translate: 'chat.cmd.stats.role', with: { rawtext: [{ translate: 'role.' + getRole(target) }] } },
		{ translate: 'chat.cmd.debug.pos', with: profilePosition(target) },
		{ rawtext: [{ translate: 'admin.players.body.playtime' }, { text: ' ' }, ...playtimeRawtext(target)] },
		{ translate: 'chat.cmd.debug.scores', with: [scores] },
		{ translate: 'chat.cmd.debug.tags', with: [String(count)] }
	];
	for (const [group, values] of groups) {
		const prefix = group + ':';
		const list = values.map(tag => group && tag.startsWith(prefix) ? tag.slice(prefix.length) : tag).join('§r§8, §7');
		lines.push(group ? { text: '§6[' + group + ']§r §7' + list }
			: { rawtext: [{ text: '§6[' }, { translate: 'chat.cmd.debug.other' }, { text: ']§r §7' + list }] });
	}
	return lines;
}

/**
 * Изменить баланс игрока: add / take / set (меню администратора → Игроки → Деньги).
 * Снять больше, чем есть, нельзя — баланс станет 0. @returns {boolean} изменено
 */
export async function setMoney(player, target, action, raw, currency = 'money') {
	if (!hasRole(player, 'admin')) { tell(player, 'chat.cmd.error.no_permission'); return false; }
	if (!['money', 'vip_coins'].includes(currency)) return false;
	const amount = Number(raw);
	if (!['add', 'take', 'set'].includes(action) || !/^\d+$/.test(raw) || amount > 2147483647) {
		tell(player, 'chat.cmd.error.number', raw || '—', 0, 2147483647);
		return false;
	}
	const before = getScore(target, currency);
	const after = action === 'add' ? Math.min(before + amount, 2147483647) : action === 'take' ? Math.max(before - amount, 0) : amount;
	const result = await run(target, `scoreboard players set @s ${currency} ${after}`);
	if (!result) { tell(player, 'chat.cmd.error.offline', target.name); return false; }
	tell(player, currency === 'vip_coins' ? 'chat.cmd.money.vip.done' : 'chat.cmd.money.done', target.name, String(after));
	if (target.name !== player.name) tell(target, currency === 'vip_coins' ? 'chat.cmd.money.vip.received' : 'chat.cmd.money.received', String(after));
	return true;
}

/**
 * «Магнит руды» бесплатно (персонал): табло magnet — секунды, тег boost:magnet (timers/ticks_5, ticks_20)
 * и boost:magnet_admin — знак, что магнит выдан, а не куплен.
 * Если магнит уже работает — время заменяется новым.
 */
export function giveOreMagnet(player, target, minutes) {
	run(target, `scoreboard players set @s magnet ${minutes * 60}`);
	target.addTag('boost:magnet');
	// Выдан администратором — снимается кнопкой «Отключить выданные бусты» (system/economy/boosts.js)
	target.addTag(MAGNET_ADMIN_TAG);
	tell(target, 'chat.cmd.boost.magnet.received', player.name, String(minutes));
	run(target, 'playsound note.bell @s');
	if (target.name !== player.name) tell(player, 'chat.cmd.boost.magnet.done', target.name, String(minutes));
}

// !gm1, !gm2, !gm6
function gameMode(player, args, command) {
	// Режим себе; другому игроку — администратор+.
	// Обычному игроку system.mcfunction каждый тик возвращает приключение — режим у него не удержится
	const mode = { gm1: 'creative', gm2: 'adventure', gm6: 'spectator' }[command];
	// Приключение (обычный режим) — любому; креатив и наблюдатель — только роли, которой положена эта команда
	const target = resolveTarget(player, args[0], 'admin', { gm1: 'admin', gm6: 'helper' }[command]);
	if (!target) return;
	run(target, `gamemode ${mode} @s`);
	tell(target, `chat.cmd.${command}`);
	if (target.name !== player.name) tell(player, 'chat.cmd.gm.other', target.name, { translate: `chat.cmd.mode.${mode}` });
}

export const ADMIN_COMMANDS = {
	gm1: gameMode,

	gm2: gameMode,

	gm6: gameMode,

	fly(player, args) {
		// !fly — переключить; !fly on/off; !fly [on/off] <ник> — другому (администратор+).
		// Состояние полёта скрипт прочитать не может, поэтому запоминаем его тегом state:fly
		let state = args[0] ? args[0].toLowerCase() : undefined;
		let targetName = args[1];
		if (state && state !== 'on' && state !== 'off') { targetName = args[0]; state = undefined; }
		const target = findPlayer(targetName ?? player.name);
		// Включить полёт — только администратору и выше; выключить — любому
		const turnOn = state ? state === 'on' : !(target ?? player).hasTag('state:fly');
		if (!resolveTarget(player, targetName, 'admin', turnOn ? 'admin' : undefined)) return;
		const on = turnOn;
		run(target, `ability @s mayfly ${on}`);
		if (on) target.addTag('state:fly'); else target.removeTag('state:fly');
		tell(target, `chat.cmd.fly.${on ? 'on' : 'off'}`);
		if (target.name !== player.name) tell(player, `chat.cmd.fly.other.${on ? 'on' : 'off'}`, target.name);
	},

	async bot(player, args) {
		// !bot settings — окно управления ботом (как в меню администратора); откроется после закрытия чата
		if ((args[0] || '').toLowerCase() === 'settings') {
			tell(player, 'chat.cmd.bot.settings');
			botMenu(player);
			return;
		}
		// Призвать бота к себе (второй раз — не призывается: бот уже в мире). Управление ботом — в меню администратора
		const bot = getBot();
		if (bot) {
			tell(player, 'chat.admin.bot.error.present', bot.name);
			return;
		}
		const spawned = await spawnBot(player);
		tell(player, spawned ? 'chat.admin.bot.spawned' : 'chat.admin.bot.error.spawn', getBotName());
	},

	stick(player, args) {
		// Палочка админа себе или другому администратору (игроку и модератору — нельзя)
		const target = resolveTarget(player, args[0], 'admin', 'admin');
		if (!target) return;
		run(target, 'give @s server:admin_stick');
		tell(target, 'chat.cmd.stick');
		if (target.name !== player.name) tell(player, 'chat.cmd.stick.other', target.name);
	},

	timeset(player, args) {
		// Время суток: словом или числом 0–24000
		const time = (args[0] || '').toLowerCase();
		const words = ['sunrise', 'day', 'noon', 'sunset', 'night', 'midnight'];
		if (words.includes(time) || (/^\d+$/.test(time) && Number(time) <= 24000)) {
			run(player, `time set ${time}`);
			tell(player, 'chat.cmd.timeset.done', time);
		} else {
			tell(player, 'chat.cmd.timeset.use');
		}
	},

	color(player, args) {
		// !color <ник> <name|text> <цвет|reset> — цвет ника (в чате и над головой) или текста сообщений в чате.
		// Цвет — словом (aqua, gold…) или кодом без «§» (b, 6…)
		const kind = (args[1] || '').toLowerCase();
		const value = (args[2] || '').toLowerCase();
		if (!args[0] || !['name', 'text'].includes(kind) || !value) {
			tell(player, 'chat.cmd.color.use');
			return;
		}
		const target = findPlayer(args[0]);
		if (!target) {
			tell(player, 'chat.cmd.error.offline', args[0]);
			return;
		}
		if (target.hasTag('role:bot')) {
			tell(player, 'chat.cmd.color.error.bot');
			return;
		}
		if (value === 'reset') {
			setChatColor(target, kind, undefined);
			tell(player, `chat.cmd.color.reset.${kind}`, target.name);
			return;
		}
		const id = CHAT_COLORS[value] !== undefined ? value : Object.keys(CHAT_COLORS).find(k => CHAT_COLORS[k] === value.replace(/^§/, ''));
		if (!id) {
			tell(player, 'chat.cmd.color.error.color', args[2]);
			return;
		}
		// Цвет роли — только тому, у кого эта роль (иначе игрока над головой не отличить от персонала)
		if (kind === 'name' && !colorAllowed(target, CHAT_COLORS[id])) {
			denyImpersonation(player, target, impersonatedRole(target, `§${CHAT_COLORS[id]}`));
			return;
		}
		setChatColor(target, kind, CHAT_COLORS[id]);
		tell(player, `chat.cmd.color.done.${kind}`, target.name, { text: `§${CHAT_COLORS[id]}■` }, { translate: `color.${id}` });
	},

	prefix(player, args, command) {
		// Префиксы в чате (теги rank:). Уровень (rank:§rN + значок уровня) и VIP (rank:§aVIP) — тоже теги rank:, их не показываем и не трогаем
		const prefixPlayer = args[0];
		const prefixAction = (args[1] || '').toLowerCase();
		const prefixName = args.slice(2).join(' ');
		if (prefixPlayer && (prefixAction === 'list' || prefixAction === 'clear')) {
			const target = findPlayer(prefixPlayer);
			if (!target) {
				tell(player, 'chat.cmd.error.offline', prefixPlayer);
				return;
			}
			// Служебные префиксы — уровень и VIP (system/player/ranks.js) — не показываем и не снимаем
			const prefixes = target.getTags().filter(t => t.startsWith('rank:') && !LEVEL_RANK_RE.test(t));
			if (prefixAction === 'list') {
				tell(player, 'chat.cmd.prefix.list', target.name, prefixes.length ? prefixes.map(t => t.slice(5)).join('§r§7, ') : '—');
			} else {
				prefixes.forEach(t => target.removeTag(t));
				tell(player, 'chat.cmd.prefix.clear', target.name);
			}
		} else if (prefixPlayer && ['set', 'take'].includes(prefixAction) && prefixName) {
			const target = findPlayer(prefixPlayer);
			if (!target) {
				tell(player, 'chat.cmd.error.offline', prefixPlayer);
				return;
			}
			// Префикс с ругательством не ставится (chat/censor.js), даже персоналу
			if (prefixAction === 'set' && censor(prefixName) !== prefixName) {
				tell(player, 'chat.cmd.prefix.error.profanity');
				return;
			}
			// Префикс с цветом или названием роли (Админ, §cVIP…) — только тому, у кого эта роль
			const fakeRole = prefixAction === 'set' ? impersonatedRole(target, prefixName) : undefined;
			if (fakeRole) {
				denyImpersonation(player, target, fakeRole);
				return;
			}
			// Тег в кавычках — префикс может содержать пробелы («Super Star»)
			const prefixTag = JSON.stringify(`rank:${prefixName}`);
			const command = prefixAction === 'set'
				? `tag "${target.name}" add ${prefixTag}`: `tag "${target.name}" remove ${prefixTag}`;
			run(player, command);
			tell(player, prefixAction === 'set' ? 'chat.cmd.prefix.set' : 'chat.cmd.prefix.take', prefixName, target.name);
		} else {
			tell(player, 'chat.cmd.prefix.use');
		}
	},

	tag(player, args) {
		// Теги игрока: add/remove/list. Служебные теги паролей (auth:salt:, auth:hash:, password:) не показываются;
		// роли и вход (role:*, auth:*) так не меняются — иначе администратор выдал бы себе role:owner
		const tagTarget = args[0];
		const tagAction = (args[1] || '').toLowerCase();
		const tagName = args[2];
		if (tagTarget && tagAction === 'list') {
			const target = findPlayer(tagTarget);
			if (!target) {
				tell(player, 'chat.cmd.error.offline', tagTarget);
				return;
			}
			const tags = target.getTags().filter(t => !/^(auth:(salt|hash):|password:)/.test(t));
			tell(player, 'chat.cmd.tag.list', target.name, tags.length ? tags.join('§r§7, ') : '—');
		} else if (tagTarget && ['add', 'remove'].includes(tagAction) && tagName) {
			if (/^(role|auth):|^password:/.test(tagName) || tagName === 'sys:bot') {
				tell(player, 'chat.cmd.tag.error.protected');
				return;
			}
			// Префикс (rank:) и цвет (chat:…_color:, старые name:/text:) — те же проверки, что у !prefix и !color
			if (tagAction === 'add' && tagName.startsWith('rank:') && censor(tagName.slice(5)) !== tagName.slice(5)) {
				tell(player, 'chat.cmd.prefix.error.profanity');
				return;
			}
			if (tagAction === 'add' && /^(rank:|chat:|name:|text:)/.test(tagName)) {
				const target = findPlayer(tagTarget);
				if (!target) {
					tell(player, 'chat.cmd.error.offline', tagTarget);
					return;
				}
				const color = /^(chat:name_color:|name:§?)(.)$/.exec(tagName)?.[2];
				const fakeRole = tagName.startsWith('rank:') ? impersonatedRole(target, tagName.slice(5))
					: color && !colorAllowed(target, color.toLowerCase()) ? impersonatedRole(target, `§${color}`) : undefined;
				if (fakeRole) {
					denyImpersonation(player, target, fakeRole);
					return;
				}
			}
			const tagCommand = `tag "${tagTarget}" ${tagAction} ${JSON.stringify(tagName)}`;
			run(player, tagCommand);
			tell(player, `chat.cmd.tag.${tagAction}`, tagName, tagTarget);
		} else {
			tell(player, 'chat.cmd.tag.use');
		}
	},

	debug(player, args) {
		// Отладка: роль, позиция, главные счета и все теги игрока, сгруппированные по префиксу до «:»
		const target = args[0] ? findPlayer(args.join(' ')) : player;
		if (!target) {
			tell(player, 'chat.cmd.error.offline', args.join(' '));
			return;
		}
		tellList(player, { translate: 'chat.cmd.debug.header', with: [target.name] }, debugLines(target));
	},

	scoreboard(player, args) {
		// !scoreboard objectives — все табло; !scoreboard <ник> list — все счета игрока;
		// <ник> get <табло>; <ник> add/remove/set <табло> <число>; <ник> reset [табло].
		// Служебные табло (таймеры, настройки) меняет только владелец — иначе собьются таймеры и setup
		const sbUse = () => tell(player, 'chat.cmd.scoreboard.use');
		if ((args[0] || '').toLowerCase() === 'objectives' && !args[1]) {
			const objectives = world.scoreboard.getObjectives();
			const padding = columnPadding(objectives.map(o => o.id));
			const lines = objectives.map((o, i) => `§e${o.id}${o.displayName && o.displayName !== o.id ? `${padding[i]} §8— §7${o.displayName}` : ''}`);
			tellList(player, { translate: 'chat.cmd.scoreboard.objectives' }, (lines.length ? lines : ['—']).map(text => ({ text })));
			return;
		}
		const sbAction = (args[1] || '').toLowerCase();
		if (!args[0] || !['get', 'list', 'add', 'remove', 'set', 'reset'].includes(sbAction)) { sbUse(); return; }
		const target = findPlayer(args[0]);
		if (!target) {
			tell(player, 'chat.cmd.error.offline', args[0]);
			return;
		}
		// Счёт игрока в табло или undefined (счёта нет)
		const scoreOf = (objective) => { try { return objective.getScore(target.scoreboard); } catch { return undefined; } };
		if (sbAction === 'list') {
			const scores = world.scoreboard.getObjectives().map(o => [o.id, scoreOf(o)]).filter(([, value]) => value !== undefined);
			const padding = columnPadding(scores.map(([id]) => id));
			const lines = scores.map(([id, value], i) => `§e${id}${padding[i]} §8— §f${value}`);
			tellList(player, { translate: 'chat.cmd.scoreboard.list', with: [target.name] }, (lines.length ? lines : ['—']).map(text => ({ text })));
			return;
		}
		const sbObjective = args[2];
		if (!sbObjective && sbAction !== 'reset') { sbUse(); return; }
		let objective;
		if (sbObjective) {
			try { objective = world.scoreboard.getObjective(sbObjective); } catch { objective = undefined; }
			if (!objective) {
				tell(player, 'chat.cmd.error.not_found', sbObjective, '!scoreboard objectives');
				return;
			}
		}
		if (sbAction === 'get') {
			tell(player, 'chat.cmd.scoreboard.get', target.name, sbObjective, scoreOf(objective) ?? '—');
			return;
		}
		// Дальше — изменения: служебные табло (или сброс всех табло сразу) — только владельцу
		if ((!sbObjective || PROTECTED_OBJECTIVES.includes(sbObjective)) && !hasRole(player, 'owner')) {
			tell(player, 'chat.cmd.scoreboard.error.protected', sbObjective ?? '*');
			return;
		}
		if (sbAction === 'reset') {
			run(player, `scoreboard players reset "${target.name}"${sbObjective ? ' ' + sbObjective : ''}`);
			if (sbObjective) tell(player, 'chat.cmd.scoreboard.reset', target.name, sbObjective);
			else tell(player, 'chat.cmd.scoreboard.reset.all', target.name);
			return;
		}
		const raw = args[3] ?? '';
		if (!/^-?\d+$/.test(raw) || Math.abs(Number(raw)) > 2147483647) {
			tell(player, 'chat.cmd.error.number', raw || '—', -2147483648, 2147483647);
			return;
		}
		const amount = Number(raw);
		const before = scoreOf(objective) ?? 0;
		const after = Math.max(-2147483648, Math.min(2147483647, sbAction === 'add' ? before + amount : sbAction === 'remove' ? before - amount : amount));
		run(player, `scoreboard players set "${target.name}" ${sbObjective} ${after}`);
		tell(player, `chat.cmd.scoreboard.${sbAction}`, target.name, sbObjective, String(amount), String(after));
	},

	event(player, args) {
		// Запустить ивент сразу (по таймеру они идут, только если включены в settings)
		const ev = (args[0] || '').toLowerCase();
		// «Мистик» — скрипт (system/combat/mythic.js): наполняет сундук в центре PvP-арены
		if (ev === 'mythic') {
			if (!startMythic()) {
				tell(player, 'chat.cmd.event.error.no_chest');
				return;
			}
			tell(player, 'chat.cmd.event.done', { translate: 'chat.cmd.event.name.mythic' });
			return;
		}
		const fn = { haste: 'events/haste_event', rain: 'events/rain_start', gift: 'events/gift_event' }[ev];
		if (!fn) {
			tell(player, 'chat.cmd.event.use');
			return;
		}
		// «Ускорение» и «Подарок» выбирают игрока без роли владельца (role:owner) — без других игроков ничего не произойдёт
		if (ev !== 'rain' && ![...world.getPlayers()].some(p => !p.hasTag('role:owner'))) {
			tell(player, 'chat.cmd.event.error.no_players');
			return;
		}
		run(player, `function ${fn}`);
		tell(player, 'chat.cmd.event.done', { translate: `chat.cmd.event.name.${ev}` });
	},

	boost(player, args) {
		// Бесплатный общий буст x2/x4 на 1–60 минут (по умолчанию 5). Как покупка в магазине, но без списания денег
		const type = (args[0] || '').toLowerCase();
		if (['x2', 'x4', 'stop'].includes(type) && !boostTimersReady()) {
			tell(player, 'chat.boost.error.loading');
			return;
		}
		// !boost stop — отключить бусты, выданные администратором (купленные игроками не трогаются)
		if (type === 'stop') {
			const { boost, magnets } = stopAdminBoosts();
			if (!boost && !magnets.length) {
				tell(player, 'chat.cmd.boost.stop.none');
				return;
			}
			logAction(player, 'boost', '', 'stop');
			tell(player, 'chat.cmd.boost.stop.done', boost ?? { translate: 'chat.cmd.boost.stop.no' }, String(magnets.length));
			return;
		}
		// Личный «Магнит руды» (как в магазине): !boost magnet [ник] [минуты 1–60] — себе или игроку
		if (type === 'magnet') {
			const rest = args.slice(1);
			const minutesArg = rest.length && /^\d+$/.test(rest[rest.length - 1]) ? Number(rest.pop()) : 5;
			if (minutesArg < 1 || minutesArg > 60) {
				tell(player, 'chat.cmd.boost.use');
				return;
			}
			const target = rest.length ? findPlayer(rest.join(' ')) : player;
			if (!target) {
				tell(player, 'chat.cmd.error.offline', rest.join(' '));
				return;
			}
			giveOreMagnet(player, target, minutesArg);
			logAction(player, 'boost', target.name, `magnet ${minutesArg}`);
			return;
		}
		const minutes = args[1] === undefined ? 5 : Number(args[1]);
		if (!['x2', 'x4'].includes(type) || !Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
			tell(player, 'chat.cmd.boost.use');
			return;
		}
		if (boostSeconds('x2') > 0 || boostSeconds('x4') > 0) {
			tell(player, 'chat.boost.error.active');
			return;
		}
		const timer = BOOST_TIMERS[type];
		run(player, `scoreboard players set scoreboards.${type}boost display 0`);
		run(player, `scoreboard players set ${timer} system ${minutes * 60}`);
		// Общий тег обновляется для зашедших позже по служебному таймеру.
		run(player, `tag @a add boost:${type}`);
		markAdminBoost(type, minutes);
		logAction(player, 'boost', '', `${type} ${minutes}`);
		run(player, `tellraw @a ${rawTranslate('chat.cmd.boost.started', player.name, type, String(minutes))}`);
		run(player, 'execute as @a at @s run playsound note.bell @s');
	},

	say(player, args) {
		// Объявление от сервера всем (эмодзи заменяются)
		let text = censor(args.join(' '));
		if (!text) {
			tell(player, 'chat.cmd.say.use');
			return;
		}
		for (const [name, symbol] of Object.entries(emotes)) text = text.replaceAll(name, symbol);
		run(player, `tellraw @a ${rawTranslate('chat.cmd.say', text)}`);
	},

	achievement(player, args) {
		// !achievement <ник> list | grant <id> | revoke <id> — для проверки и исправлений
		const action = (args[1] || '').toLowerCase();
		if (!args[0] || !['list', 'grant', 'revoke'].includes(action)) {
			tell(player, 'chat.cmd.achievement.use');
			return;
		}
		const target = findPlayer(args[0]);
		if (!target) { tell(player, 'chat.cmd.error.offline', args[0]); return; }
		if (action === 'list') {
			const got = ACHIEVEMENTS.filter(a => hasAchievement(target, a.id));
			const lines = ACHIEVEMENTS.map(a => ({ rawtext: [{ text: `${hasAchievement(target, a.id) ? (a.type === 'challenge' ? '§d✔' : '§a✔') : '§8✘'} §7${a.id} §8— ` }, { translate: `ach.${a.id}.name` }] }));
			tellList(player, { translate: 'chat.cmd.achievement.list', with: [target.name, String(got.length), String(ACHIEVEMENTS.length)] }, lines);
			return;
		}
		const a = findAchievement(args[2]);
		if (!a) { tell(player, 'chat.cmd.error.not_found', args[2] ?? '', '!achievement <player> list'); return; }
		if (action === 'grant') {
			if (!unlock(target, a.id)) { tell(player, 'chat.cmd.achievement.error.has', target.name, a.id); return; }
			tell(player, 'chat.cmd.achievement.granted', target.name, a.id);
		} else {
			if (!revoke(target, a.id)) { tell(player, 'chat.cmd.achievement.error.missing', target.name, a.id); return; }
			tell(player, 'chat.cmd.achievement.revoked', target.name, a.id);
		}
	},

	ban(player, args) {
		// Бан: по номеру игрока в мире и нику (system/security/ban.js). Игрока в сети — сразу выгоняет.
		// !ban <ник> [срок|permanent] [причина]: без срока — навсегда, как раньше
		if (!args[0]) {
			tell(player, 'chat.cmd.ban.use');
			return;
		}
		const term = parseTerm(args[1]);
		const banMinutes = term ?? Infinity;
		const reason = args.slice(term === undefined ? 1 : 2).join(' ');
		const target = findPlayer(args[0]);
		if (target) {
			if (!canPunish(player, target)) return;
			if (target.hasTag('role:bot') || target.hasTag('role:owner')) {
				tell(player, 'chat.cmd.error.self');
				return;
			}
			if (!addBan({ id: target.id, name: target.name }, player.name, reason, banMinutes)) {
				tell(player, 'chat.cmd.ban.error.full');
				return;
			}
			logAction(player, 'ban', target.name, args.slice(1));
			run(player, `tellraw @a ${rawTranslateRich('chat.cmd.ban.done', target.name, termText(banMinutes), reason ? { text: reason } : { translate: 'chat.cmd.kick.no_reason' })}`);
			kickBanned(target, findBan(target));
		} else {
			// Не в сети — бан только по нику; номер игрока запомнится, когда он зайдёт под этим ником
			if (!addBan({ name: args[0] }, player.name, reason, banMinutes)) {
				tell(player, 'chat.cmd.ban.error.full');
				return;
			}
			logAction(player, 'ban', args[0], args.slice(1));
			tell(player, 'chat.cmd.ban.offline', args[0], termText(banMinutes));
		}
	},

	unban(player, args) {
		if (!args[0]) {
			tell(player, 'chat.cmd.unban.use');
			return;
		}
		const removed = removeBan(args.join(' '));
		if (!removed) {
			tell(player, 'chat.cmd.error.not_found', args.join(' '), '!banlist');
			return;
		}
		logAction(player, 'unban', removed.names.join(', '));
		tell(player, 'chat.cmd.unban.done', removed.names.join(', '));
	},

	banlist(player, args) {
		// Только действующие баны; номер — тот же, что принимает !unban <номер> (system/security/ban.js, removeBan)
		const bans = getBans().filter(b => banActive(b));
		const lines = bans.map((b, i) => {
			const rawtext = [{ text: `§e${i + 1}. §f${b.names.join('§7, §f')} §8— §7${b.by}${b.reason ? ' §8— §7' + b.reason : ''}` }];
			// Бан только по нику (игрок не заходил после бана) — пометка на языке игрока
			if (!b.id) rawtext.push({ text: ' §8' }, { translate: 'chat.cmd.banlist.by_nick' });
			rawtext.push({ text: ' §8— §c' }, termText(banMinutesLeft(b)));
			return { rawtext };
		});
		if (!lines.length) lines.push({ translate: 'chat.cmd.banlist.empty' });
		tellList(player, { translate: 'chat.cmd.banlist.header' }, lines, 6);
	}
};
