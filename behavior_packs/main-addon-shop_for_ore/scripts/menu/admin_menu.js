// --- Админ-меню для Shop for Ore ---
// Открывается предметом server:admin_menu у администратора и владельца.
// Действия над игроками, бусты, ивенты и режимы выполняются теми же командами, что и в чате
// (runChatCommand из chat/commands.js): одни и те же проверки прав и сообщения.
// В 1.19.50 формы принимают только строки: ключи перевода пишутся как «%ключ», после ключа — пробел или перенос
// (сразу после ключа не ставим ни скобок, ни §-кодов).

import { world } from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { isPending, rawTranslate, hasRole, getRole, getScore, getWarns, muteMinutesLeft, run, findPlayer, emotes } from '../DataBase.js';
import { runChatCommand } from '../chat/commands.js';
import { getBot, getBotName, setBotName, spawnBot, removeBot } from '../system/spawnbot.js';

const BACK_ICON = 'textures/ui/icon_import';
const OPEN = '\n%menu.common.tap_to_open';
const EVENTS = ['haste', 'rain', 'gift'];
// Как часто срабатывают ивенты по таймеру (минуты): timers/t3600, t6000, t4800
const EVENT_PERIOD = { haste: 3, rain: 5, gift: 4 };

// --- Открытие админ-меню по использованию специального предмета ---
world.events.beforeItemUse.subscribe(data => {
	const player = data.source
	if (data.item.typeId == 'server:admin_menu') {
		// Администратор и владелец (предмет можно получить через /give — тогда роль не даст открыть)
		if (!hasRole(player, 'admin')) return;
		// Сначала вход в аккаунт
		if (isPending(player)) return;
		admin_menu(player)
	}
});

/**
 * ActionForm из списка пунктов { text, icon, run }. Номер нажатой кнопки сам находит действие,
 * поэтому пункты можно показывать не всем (например, вайп — только владельцу).
 */
function showActions(player, title, body, items) {
	const form = new ActionFormData().title(title).body(body);
	for (const item of items) form.button(item.text, item.icon);
	return form.show(player).then(r => {
		if (r.canceled || r.selection === undefined) return;
		const item = items[r.selection];
		if (item) item.run();
	});
}

/** Кнопка «Назад». */
const back = (run) => ({ text: '%admin.common.back', icon: BACK_ICON, run });

const tell = (player, key, ...args) => run(player, `tellraw @s ${rawTranslate(key, ...args)}`);

/** Окно «Да / Нет»: в 1.19.50 button1 — selection 1, button2 — selection 0. */
function confirm(player, title, body, onYes, onNo) {
	new MessageFormData()
	.title(title)
	.body(body)
	.button1(' %admin.wipe.button.yes')
	.button2(' %admin.wipe.button.no')
	.show(player).then(r => {
		if (r.selection === 1) onYes();
		else if (r.selection === 0 && onNo) onNo();
	});
}

// --- Главное админ-меню ---
export function admin_menu(player) {
	const items = [
		{ text: '%admin.main.button.players' + OPEN, icon: 'textures/ui/FriendsIcon', run: () => playersMenu(player) },
		{ text: '%admin.main.button.boosts' + OPEN, icon: 'textures/items/experience_bottle', run: () => boostsMenu(player) },
		{ text: '%admin.main.button.server' + OPEN, icon: 'textures/ui/icon_setting', run: () => serverMenu(player) },
		{ text: '%admin.main.button.gamemode' + OPEN, icon: 'textures/ui/heart_new', run: () => gamemodes(player) },
		{ text: '%admin.main.button.time' + OPEN, icon: 'textures/ui/time_4sunset', run: () => timeSet(player) },
		{ text: '%admin.main.button.warps' + OPEN, icon: 'textures/ui/World', run: () => warps(player) },
		{ text: '%admin.main.button.effects' + OPEN, icon: 'textures/items/potion_bottle_confusion', run: () => effects(player) },
		{ text: '%admin.main.button.tools' + OPEN, icon: 'textures/ui/anvil_icon', run: () => tools(player) },
		{ text: '%admin.main.button.announce' + OPEN, icon: 'textures/ui/comment', run: () => sayServer(player) },
		{ text: '%admin.main.button.bot' + OPEN, icon: 'textures/server_icons/bot', run: () => botMenu(player) }
	];
	// Вайп — только владелец: администратору кнопка не показывается
	if (hasRole(player, 'owner')) {
		items.push({ text: '%admin.main.button.wipe' + OPEN, icon: 'textures/ui/friend_glyph_desaturated', run: () => wipe(player) });
	}
	showActions(player, '%admin.main.title', '%menu.main.body', items);
}

// --- Режим игры и полёт (как !gm1/!gm2/!gm6 и !fly — с сообщением в чат) ---
function gamemodes(player) {
	showActions(player, '%admin.gamemode.title', '%admin.gamemode.body', [
		{ text: '%admin.gamemode.button.creative', icon: 'textures/ui/heart_new', run: () => runChatCommand(player, 'gm1', []) },
		{ text: '%admin.gamemode.button.adventure', icon: 'textures/ui/absorption_heart', run: () => runChatCommand(player, 'gm2', []) },
		{ text: '%admin.gamemode.button.spectator', icon: 'textures/ui/freeze_heart', run: () => runChatCommand(player, 'gm6', []) },
		// Раньше кнопка только включала полёт — теперь переключает
		{ text: player.hasTag('fly:on') ? '%admin.gamemode.button.fly_off' : '%admin.gamemode.button.fly_on', icon: 'textures/items/feather', run: () => runChatCommand(player, 'fly', []) },
		back(() => admin_menu(player))
	]);
}

// --- Время суток (как !timeset — с сообщением в чат) ---
function timeSet(player) {
	const times = ['sunrise', 'day', 'noon', 'sunset', 'night', 'midnight'];
	const items = times.map((t, i) => ({ text: `%admin.time.button.${t}`, icon: `textures/ui/time_${i + 1}${t}`, run: () => runChatCommand(player, 'timeset', [t]) }));
	items.push(back(() => admin_menu(player)));
	showActions(player, '%admin.time.title', '%admin.time.body', items);
}

// --- Телепортации ---
function warps(player) {
	const tp = (x, y, z) => () => player.runCommandAsync(`tp @s ${x} ${y} ${z}`);
	showActions(player, '%admin.warps.title', '%admin.warps.body', [
		{ text: '%admin.warps.button.mine', icon: 'textures/ui/World', run: tp(0, 5, 0) },
		{ text: '%admin.warps.button.vip', icon: 'textures/ui/World', run: tp(-60, 5, -60) },
		{ text: '%menu.warps.button.minigames', icon: 'textures/ui/World', run: tp(-109, 5, -60) },
		{ text: '%admin.warps.button.cmd_zone', icon: 'textures/ui/World', run: tp(50, 5, 50) },
		{ text: '%admin.warps.button.random_player', icon: 'textures/ui/World', run: () => {
			// Случайный игрок без роли; если таких нет — сообщение (раньше команда молча не срабатывала)
			const list = [...world.getPlayers()].filter(p => getRole(p) === 'player');
			if (!list.length) return tell(player, 'chat.admin.error.no_players');
			const target = list[Math.floor(Math.random() * list.length)];
			run(player, `tp @s "${target.name}"`);
			tell(player, 'chat.cmd.tp.to', target.name);
		} },
		back(() => admin_menu(player))
	]);
}

// --- Эффекты ---
function effects(player) {
	const effect = (name) => () => player.runCommandAsync(`effect @s ${name} 3600 255 true`);
	showActions(player, '%admin.effects.title', '%admin.effects.body', [
		{ text: '%admin.effects.button.invisibility', icon: 'textures/ui/invisibility_effect', run: effect('invisibility') },
		{ text: '%admin.effects.button.resistance', icon: 'textures/ui/resistance_effect', run: effect('resistance') },
		{ text: '%admin.effects.button.strength', icon: 'textures/ui/strength_effect', run: effect('strength') },
		{ text: '%admin.effects.button.haste', icon: 'textures/ui/haste_effect', run: effect('haste') },
		{ text: '%admin.effects.button.clear', icon: 'textures/ui/cancel', run: () => {
			player.runCommandAsync('effect @s clear');
			// Невидимость из !invis снята вместе с остальными эффектами
			player.removeTag('invis:on');
		} },
		back(() => admin_menu(player))
	]);
}

// --- Выдача инструментов и предметов ---
function tools(player) {
	const give = (item) => () => player.runCommandAsync(`give @s ${item}`);
	showActions(player, '%admin.tools.title', '%admin.tools.body', [
		{ text: '%admin.tools.button.command_block', icon: 'textures/server_icons/command_block', run: give('command_block') },
		{ text: '%admin.tools.button.allow', icon: 'textures/server_icons/allow', run: give('allow') },
		{ text: '%admin.tools.button.deny', icon: 'textures/server_icons/deny', run: give('deny') },
		{ text: '%admin.tools.button.structure_block', icon: 'textures/server_icons/structure_block', run: give('structure_block') },
		{ text: '%admin.tools.button.structure_void', icon: 'textures/server_icons/structure_void', run: give('structure_void') },
		{ text: '%admin.tools.button.barrier', icon: 'textures/blocks/barrier', run: give('barrier') },
		{ text: '%admin.tools.button.border', icon: 'textures/server_icons/border', run: give('border_block') },
		{ text: '%admin.tools.button.light', icon: 'textures/items/light_block_15', run: give('light_block 1 15') },
		{ text: '%admin.tools.button.npc_egg', icon: 'textures/items/egg_npc', run: give('spawn_egg 1 51') },
		{ text: '%admin.tools.button.hologram_egg', icon: 'textures/items/floating_text', run: give('server:floating_text_spawn_egg') },
		{ text: '%admin.tools.button.admin_stick', icon: 'textures/items/stick', run: give('server:admin_stick') },
		// Очистка всего инвентаря — теперь с подтверждением
		{ text: '%admin.tools.button.clear_inventory', icon: 'textures/ui/cancel', run: () => confirm(player, ' %admin.wipe.title', '%admin.tools.clear.body', () => player.runCommandAsync('clear @s'), () => tools(player)) },
		back(() => admin_menu(player))
	]);
}

// --- Объявление: то же, что !say (эмодзи, без пустых сообщений) ---
function sayServer(player) {
	new ModalFormData()
	.title('%admin.announce.title')
	.textField('%admin.announce.body', '%admin.announce.placeholder')
	.show(player).then(r => {
		if (!r.formValues) return;
		const message = String(r.formValues[0] ?? '').trim();
		// Пустое объявление не отправляем
		if (!message) return admin_menu(player);
		runChatCommand(player, 'say', [message]);
	});
}

// --- Вайп (только владелец) ---
function wipe(player) {
	if (!hasRole(player, 'owner')) return tell(player, 'chat.cmd.error.no_permission');
	confirm(player, ' %admin.wipe.title', '%admin.wipe.body', () => player.runCommandAsync('function system/wipe'), () => admin_menu(player));
}

// ===== Игроки =====

// Выбор игрока из тех, кто в сети
function playersMenu(player) {
	const names = [...world.getPlayers()].map(p => p.name);
	new ModalFormData()
	.title('%admin.players.title')
	.dropdown('%admin.players.choose', names, Math.max(0, names.indexOf(player.name)))
	.show(player).then(r => {
		if (!r.formValues) return admin_menu(player);
		const name = names[r.formValues[0]];
		const target = findPlayer(name);
		if (!target) return tell(player, 'chat.cmd.error.offline', name);
		playerActions(player, target);
	});
}

// Действия над выбранным игроком. Права проверяет сама команда: например, модератора не может наказать модератор
function playerActions(player, target) {
	const name = target.name;
	if (!findPlayer(name)) return tell(player, 'chat.cmd.error.offline', name);
	const cmd = (command, ...args) => () => runChatCommand(player, command, [name, ...args]);
	const self = name === player.name;
	const items = [{ text: '%admin.players.button.stats', icon: 'textures/items/book_writable', run: cmd('stats') }];
	if (!self) {
		items.push(
			{ text: '%admin.players.button.tp_to', icon: 'textures/items/ender_pearl', run: cmd('tp') },
			{ text: '%admin.players.button.tp_here', icon: 'textures/items/ender_pearl', run: cmd('tphere') }
		);
	}
	items.push(
		{ text: '%admin.players.button.spawn', icon: 'textures/ui/World', run: cmd('spawn') },
		{ text: '%admin.players.button.gamemode', icon: 'textures/ui/heart_new', run: () => playerGamemode(player, target) },
		{ text: '%admin.players.button.money', icon: 'textures/items/gold_ingot', run: () => playerMoney(player, target) }
	);
	if (!self) {
		const muted = muteMinutesLeft(target) > 0;
		items.push(
			{ text: target.hasTag('frozen') ? '%admin.players.button.unfreeze' : '%admin.players.button.freeze', icon: 'textures/ui/freeze_heart', run: cmd('freeze') },
			muted
				? { text: '%admin.players.button.unmute', icon: 'textures/ui/mute_off', run: cmd('unmute') }
				: { text: '%admin.players.button.mute', icon: 'textures/ui/mute_on', run: () => playerMute(player, target) },
			{ text: '%admin.players.button.warn', icon: 'textures/ui/ErrorGlyph', run: () => playerReason(player, target, 'warn', '%admin.players.warn.title', '%admin.players.reason') },
			{ text: '%admin.players.button.kick', icon: 'textures/ui/cancel', run: () => playerReason(player, target, 'kick', '%admin.players.kick.title', '%admin.players.reason_optional') }
		);
		// Роль меняет только владелец, и не самому себе
		if (hasRole(player, 'owner') && !target.hasTag('host')) {
			items.push({ text: '%admin.players.button.role', icon: 'textures/ui/permissions_op_crown', run: () => playerRole(player, target) });
		}
	}
	items.push(back(() => playersMenu(player)));
	const body = [
		`%admin.players.body.name ${name}`,
		`%admin.players.body.role %role.${getRole(target)}`,
		`%admin.players.body.lvl ${getScore(target, 'lvl')}`,
		`%admin.players.body.money ${getScore(target, 'money')}`,
		`%admin.players.body.warns ${getWarns(target)}/3`
	].join('\n');
	showActions(player, '%admin.players.title', body, items);
}

function playerGamemode(player, target) {
	const mode = (command) => () => runChatCommand(player, command, [target.name]);
	showActions(player, '%admin.gamemode.title', '%admin.gamemode.body', [
		{ text: '%admin.gamemode.button.creative', icon: 'textures/ui/heart_new', run: mode('gm1') },
		{ text: '%admin.gamemode.button.adventure', icon: 'textures/ui/absorption_heart', run: mode('gm2') },
		{ text: '%admin.gamemode.button.spectator', icon: 'textures/ui/freeze_heart', run: mode('gm6') },
		back(() => playerActions(player, target))
	]);
}

function playerMoney(player, target) {
	const actions = ['add', 'take', 'set'];
	new ModalFormData()
	.title('%admin.players.money.title')
	.dropdown(`%admin.players.body.money ${getScore(target, 'money')}\n\n%admin.players.money.action`, actions.map(a => `%admin.players.money.${a}`), 0)
	.textField('%admin.players.money.amount', '%menu.bank.amount_placeholder')
	.show(player).then(r => {
		if (!r.formValues) return playerActions(player, target);
		runChatCommand(player, 'money', [target.name, actions[r.formValues[0]], String(r.formValues[1] ?? '').trim()]);
	});
}

// Мут: длительность из списка (команда принимает 1–1440 минут)
const MUTE_MINUTES = [5, 15, 30, 60, 180, 720, 1440];
function playerMute(player, target) {
	new ModalFormData()
	.title('%admin.players.mute.title')
	.dropdown('%admin.players.mute.minutes', MUTE_MINUTES.map(m => `${m} %admin.common.min`), 0)
	.textField('%admin.players.reason_optional', '%admin.players.reason_placeholder')
	.show(player).then(r => {
		if (!r.formValues) return playerActions(player, target);
		const reason = String(r.formValues[1] ?? '').trim();
		runChatCommand(player, 'mute', [target.name, String(MUTE_MINUTES[r.formValues[0]]), ...(reason ? [reason] : [])]);
	});
}

// Предупреждение (причина обязательна — иначе команда покажет подсказку) или кик (причина по желанию)
function playerReason(player, target, command, title, label) {
	new ModalFormData()
	.title(title)
	.textField(label, '%admin.players.reason_placeholder')
	.show(player).then(r => {
		if (!r.formValues) return playerActions(player, target);
		const reason = String(r.formValues[0] ?? '').trim();
		runChatCommand(player, command, [target.name, ...(reason ? [reason] : [])]);
	});
}

function playerRole(player, target) {
	const roles = ['player', 'moder', 'admin'];
	new ModalFormData()
	.title('%admin.players.role.title')
	.dropdown('%admin.players.role.choose', roles.map(r => `%role.${r}`), Math.max(0, roles.indexOf(getRole(target))))
	.show(player).then(r => {
		if (!r.formValues) return playerActions(player, target);
		runChatCommand(player, 'role', [target.name, roles[r.formValues[0]]]);
	});
}

// ===== Бусты и ивенты =====

/** Значение настройки из табло settings (участники haste/rain/gift). 1 — включено. */
function getSetting(name) {
	try {
		const info = world.scoreboard.getObjective('settings').getScores().find(s => s.participant.displayName === name);
		return info ? info.score : 0;
	} catch {
		return 0;
	}
}

function boostsMenu(player) {
	showActions(player, '%admin.boosts.title', '%admin.boosts.body', [
		{ text: '%admin.boosts.button.boost', icon: 'textures/items/experience_bottle', run: () => boostForm(player) },
		...EVENTS.map(ev => ({ text: `%admin.boosts.button.event %chat.cmd.event.name.${ev}`, icon: 'textures/ui/icon_timer', run: () => runChatCommand(player, 'event', [ev]) })),
		{ text: '%admin.boosts.button.auto', icon: 'textures/ui/icon_setting', run: () => autoEventsForm(player, () => boostsMenu(player)) },
		back(() => admin_menu(player))
	]);
}

// Буст для всех (как !boost): тип и длительность 1–60 минут
function boostForm(player) {
	const types = ['x2', 'x4'];
	new ModalFormData()
	.title('%admin.boosts.boost.title')
	.dropdown('%admin.boosts.boost.type', ['§2x2', '§3x4'], 0)
	.slider('%admin.boosts.boost.minutes', 1, 60, 1, 5)
	.show(player).then(r => {
		if (!r.formValues) return boostsMenu(player);
		runChatCommand(player, 'boost', [types[r.formValues[0]], String(r.formValues[1])]);
	});
}

const eventLabel = (ev) => `%chat.cmd.event.name.${ev} §8— %admin.boosts.auto.every ${EVENT_PERIOD[ev]} %admin.common.min`;

// Ивенты по таймеру: переключатели табло settings (раньше — только командой /scoreboard)
function autoEventsForm(player, onBack) {
	const form = new ModalFormData().title('%admin.boosts.auto.title');
	for (const ev of EVENTS) form.toggle(eventLabel(ev), getSetting(ev) === 1);
	form.show(player).then(r => {
		if (!r.formValues) return onBack();
		EVENTS.forEach((ev, i) => run(player, `scoreboard players set ${ev} settings ${r.formValues[i] ? 1 : 0}`));
		tell(player, 'chat.admin.auto_events.saved');
	});
}

// ===== Сервер: сводка =====

/** Идущие бусты: таймер — табло system у стойки X2Boost/X4Boost, в секундах (timers/t20). */
function activeBoosts() {
	const list = [];
	for (const [type, stand] of [['x2', 'X2Boost'], ['x4', 'X4Boost']]) {
		try {
			for (const e of world.getDimension('overworld').getEntities({ name: stand })) {
				const left = getScore(e, 'system');
				if (left > 0) { list.push({ type, minutes: Math.ceil(left / 60) }); break; }
			}
		} catch { /* стойки нет в загруженных чанках */ }
	}
	return list;
}

function serverMenu(player) {
	const players = [...world.getPlayers()];
	const count = (...roles) => players.filter(p => roles.includes(getRole(p))).length;
	const boosts = activeBoosts();
	const lines = [
		`%admin.server.online §f${players.length}`,
		`%admin.server.staff §f${count('owner', 'admin')}`,
		`%admin.server.moders §f${count('moder')}`,
		'',
		boosts.length
			? boosts.map(b => `%admin.server.boost §a${b.type} §8— %admin.server.left ${b.minutes} %admin.common.min`).join('\n')
			: '%admin.server.boost §8—',
		'',
		'%admin.server.auto',
		...EVENTS.map(ev => `§8• %chat.cmd.event.name.${ev} §8— ${getSetting(ev) === 1 ? '%admin.server.on' : '%admin.server.off'}`)
	];
	showActions(player, '%admin.server.title', lines.join('\n'), [
		{ text: '%admin.server.button.online', icon: 'textures/ui/FriendsIcon', run: () => runChatCommand(player, 'online', []) },
		{ text: '%admin.server.button.top', icon: 'textures/items/gold_ingot', run: () => runChatCommand(player, 'top', []) },
		{ text: '%admin.boosts.button.auto', icon: 'textures/ui/icon_setting', run: () => autoEventsForm(player, () => serverMenu(player)) },
		back(() => admin_menu(player))
	]);
}

// ===== Бот =====

function botMenu(player) {
	const bot = getBot();
	const name = getBotName();
	const items = [];
	if (bot) {
		items.push(
			{ text: '%admin.bot.button.tp_here', icon: 'textures/items/ender_pearl', run: () => run(player, `tp "${bot.name}" @s`) },
			{ text: '%admin.bot.button.tp_to', icon: 'textures/items/ender_pearl', run: () => run(player, `tp @s "${bot.name}"`) },
			{ text: '%admin.bot.button.say', icon: 'textures/ui/comment', run: () => botSay(player) },
			{ text: '%admin.bot.button.remove', icon: 'textures/ui/cancel', run: () => {
				if (removeBot()) tell(player, 'chat.admin.bot.removed', name);
			} }
		);
	} else {
		items.push({ text: '%admin.bot.button.spawn', icon: 'textures/server_icons/bot', run: () => {
			spawnBot(player);
			tell(player, 'chat.admin.bot.spawned', name);
		} });
	}
	items.push(
		{ text: '%admin.bot.button.rename', icon: 'textures/items/name_tag', run: () => botRename(player) },
		back(() => admin_menu(player))
	);
	showActions(player, '%admin.bot.title', `%admin.bot.name §f${name}\n${bot ? '%admin.bot.present' : '%admin.bot.absent'}`, items);
}

// Имя задаётся при появлении бота, поэтому бот, который уже в мире, призывается заново под новым именем
function botRename(player) {
	new ModalFormData()
	.title('%admin.bot.rename.title')
	.textField('%admin.bot.rename.body', getBotName(), getBotName())
	.show(player).then(r => {
		if (!r.formValues) return botMenu(player);
		const name = String(r.formValues[0] ?? '').trim();
		if (!setBotName(name)) return tell(player, 'chat.admin.bot.error.name');
		if (removeBot()) spawnBot(player);
		tell(player, 'chat.admin.bot.renamed', name);
	});
}

// Сообщение в общий чат от имени бота (у симулированного игрока в 1.19.50 нет своего chat())
function botSay(player) {
	new ModalFormData()
	.title('%admin.bot.say.title')
	.textField('%admin.announce.body', '%admin.announce.placeholder')
	.show(player).then(r => {
		if (!r.formValues) return botMenu(player);
		let text = String(r.formValues[0] ?? '').trim();
		const bot = getBot();
		if (!text) return botMenu(player);
		if (!bot) return tell(player, 'chat.admin.bot.error.absent');
		for (const [code, symbol] of Object.entries(emotes)) text = text.replaceAll(code, symbol);
		run(player, `tellraw @a ${rawTranslate('chat.admin.bot.says', bot.name, text)}`);
	});
}