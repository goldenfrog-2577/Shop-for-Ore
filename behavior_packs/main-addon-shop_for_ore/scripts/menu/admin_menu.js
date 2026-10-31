// --- Админ-меню для Shop for Ore ---
// Открывается предметом server:admin_menu у администратора и владельца.
// Действия над игроками, бусты, ивенты и режимы выполняются теми же командами, что и в чате
// (runChatCommand из chat/commands.js): одни и те же проверки прав и сообщения.
// В 1.19.50 формы принимают только строки: ключи перевода пишутся как «%ключ», после ключа — пробел или перенос
// (сразу после ключа не ставим ни скобок, ни §-кодов).

import { world } from '@minecraft/server';
import { isPending, tell, hasRole, getRole, getScore, getWarns, muteMinutesLeft, run, findPlayer, CHAT_COLORS } from '../DataBase.js';
import { showMenu, showModal, modal, backButton, confirm } from './forms.js';
import { runChatCommand, setMoney } from '../chat/commands.js';
import { sendChatMessage } from '../chat/chat.js';
import { getBot, getBotName, setBotName, spawnBot, removeBot } from '../system/spawnbot.js';
import { wipeAll, wipeCounts } from '../system/wipe.js';
import { canTeleport } from '../system/minigames.js';

const BACK_ICON = 'textures/ui/icon_import';
// Заголовок «Предупреждение» со знаком «!» из шрифта карты (glyph_E1)
const WARN_TITLE = '\ue1f8 %admin.wipe.title';
// Кружки цвета роли из шрифта карты: серый, синий, красный
const ROLE_GLYPHS = { player: '\ue137', helper: '\ue135', moder: '\ue131', admin: '\ue130' };
// Значок опыта, как у бустов в магазине
const XP_GLYPH = '\ue154';
const OPEN = '\n%menu.common.tap_to_open';
const EVENTS = ['haste', 'rain', 'gift', 'mythic'];
// Как часто срабатывают ивенты по таймеру (минуты): timers/ticks_3600, ticks_6000, ticks_4800, мистик — system/mythic.js
const EVENT_PERIOD = { haste: 3, rain: 5, gift: 4, mythic: 10 };

// --- Открытие админ-меню по использованию специального предмета ---
world.events.beforeItemUse.subscribe((data) => {
	if (data.item.typeId !== 'server:admin_menu') return;
	const player = data.source;
	// Администратор и владелец (предмет можно получить через /give — тогда роль не даст открыть); сначала — вход
	if (!hasRole(player, 'admin') || isPending(player)) return;
	// Замороженный (!freeze) админ-меню не открывает: иначе ушёл бы телепортом или разморозил себя через других
	if (player.hasTag('state:frozen')) {
		data.cancel = true;
		tell(player, 'chat.cmd.freeze.active');
		return;
	}
	admin_menu(player);
});

/** Кнопка «Назад» меню администратора — со своим ключом и значком. */
const back = (run) => backButton(run, '%admin.common.back', BACK_ICON);

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
		{ text: '%admin.main.button.bot' + OPEN, icon: 'textures/server_icons/steve', run: () => botMenu(player) }
	];
	// Вайп — только владелец: администратору кнопка не показывается
	if (hasRole(player, 'owner')) {
		items.push({ text: '%admin.main.button.wipe' + OPEN, icon: 'textures/ui/friend_glyph_desaturated', run: () => wipe(player) });
	}
	showMenu(player, '%admin.main.title', '%menu.main.body', items);
}

// --- Режим игры и полёт (как !gm1/!gm2/!gm6 и !fly — с сообщением в чат) ---
function gamemodes(player) {
	showMenu(player, '%admin.gamemode.title', '%admin.gamemode.body', [
		{ text: '%admin.gamemode.button.creative', icon: 'textures/ui/heart_new', run: () => runChatCommand(player, 'gm1', []) },
		{ text: '%admin.gamemode.button.adventure', icon: 'textures/ui/absorption_heart', run: () => runChatCommand(player, 'gm2', []) },
		{ text: '%admin.gamemode.button.spectator', icon: 'textures/ui/freeze_heart', run: () => runChatCommand(player, 'gm6', []) },
		// Раньше кнопка только включала полёт — теперь переключает
		{ text: player.hasTag('state:fly') ? '%admin.gamemode.button.fly_off' : '%admin.gamemode.button.fly_on', icon: 'textures/items/feather', run: () => runChatCommand(player, 'fly', []) },
		back(() => admin_menu(player))
	], () => admin_menu(player));
}

// --- Время суток (как !timeset — с сообщением в чат) ---
function timeSet(player) {
	const times = ['sunrise', 'day', 'noon', 'sunset', 'night', 'midnight'];
	const items = times.map((t, i) => ({ text: `%admin.time.button.${t}`, icon: `textures/ui/time_${i + 1}${t}`, run: () => runChatCommand(player, 'timeset', [t]) }));
	items.push(back(() => admin_menu(player)));
	showMenu(player, '%admin.time.title', '%admin.time.body', items, () => admin_menu(player));
}

// --- Телепортации ---
function warps(player) {
	const tp = (x, y, z) => () => { if (canTeleport(player)) run(player, `tp @s ${x} ${y} ${z}`); };
	showMenu(player, '%admin.warps.title', '%admin.warps.body', [
		{ text: '%admin.warps.button.mine', icon: 'textures/ui/World', run: tp(0, 5, 0) },
		{ text: '%admin.warps.button.mine_2', icon: 'textures/ui/World', run: tp(0, 5, -33) },
		{ text: '%admin.warps.button.mine_3', icon: 'textures/ui/World', run: tp(0, 5, -69) },
		{ text: '%admin.warps.button.vip', icon: 'textures/ui/World', run: tp(-60, 5, -60) },
		{ text: '%menu.warps.button.minigames', icon: 'textures/ui/World', run: tp(-109, 5, -60) },
		// Туда же ведёт портал из мини-игр (system/system: -103 0 -51)
		{ text: '%admin.warps.button.pvp_arena', icon: 'textures/ui/World', run: tp(292, -25, 259) },
		// Сплиф (второй портал из мини-игр: -115 0 -51)
		{ text: '%admin.warps.button.spleef', icon: 'textures/ui/World', run: tp(500, 3, 500) },
		{ text: '%admin.warps.button.tier', icon: 'textures/ui/World', run: tp(435, -45, 338) },
		{ text: '%admin.warps.button.boss_zone', icon: 'textures/ui/World', run: tp(184, 11, 287) },
		{ text: '%admin.warps.button.cmd_zone', icon: 'textures/ui/World', run: tp(50, 5, 50) },
		{ text: '%admin.warps.button.random_player', icon: 'textures/ui/World', run: () => {
			// Случайный игрок без роли; если таких нет — сообщение (раньше команда молча не срабатывала)
			const list = [...world.getPlayers()].filter(p => getRole(p) === 'player');
			if (!list.length) return tell(player, 'chat.admin.error.no_players');
			const target = list[Math.floor(Math.random() * list.length)];
			if (!canTeleport(player)) return;
			run(player, `tp @s "${target.name}"`);
			tell(player, 'chat.cmd.tp.to', target.name);
		} },
		back(() => admin_menu(player))
	], () => admin_menu(player));
}

// --- Эффекты ---
function effects(player) {
	const effect = (name, level = 255) => () => run(player, `effect @s ${name} 3600 ${level} true`);
	showMenu(player, '%admin.effects.title', '%admin.effects.body', [
		{ text: '%admin.effects.button.invisibility', icon: 'textures/ui/invisibility_effect', run: effect('invisibility') },
		{ text: '%admin.effects.button.resistance', icon: 'textures/ui/resistance_effect', run: effect('resistance') },
		{ text: '%admin.effects.button.strength', icon: 'textures/ui/strength_effect', run: effect('strength') },
		{ text: '%admin.effects.button.haste', icon: 'textures/ui/haste_effect', run: effect('haste') },
		// Новые: сила эффекта разумная (скорость 255 или прыгучесть 128+ ломают движение)
		{ text: '%admin.effects.button.speed', icon: 'textures/ui/speed_effect', run: effect('speed', 2) },
		{ text: '%admin.effects.button.jump_boost', icon: 'textures/ui/jump_boost_effect', run: effect('jump_boost', 2) },
		{ text: '%admin.effects.button.night_vision', icon: 'textures/ui/night_vision_effect', run: effect('night_vision', 0) },
		{ text: '%admin.effects.button.regeneration', icon: 'textures/ui/regeneration_effect', run: effect('regeneration', 4) },
		{ text: '%admin.effects.button.health_boost', icon: 'textures/ui/health_boost_effect', run: effect('health_boost', 4) },
		{ text: '%admin.effects.button.fire_resistance', icon: 'textures/ui/fire_resistance_effect', run: effect('fire_resistance', 0) },
		{ text: '%admin.effects.button.water_breathing', icon: 'textures/ui/water_breathing_effect', run: effect('water_breathing', 0) },
		{ text: '%admin.effects.button.slow_falling', icon: 'textures/ui/slow_falling_effect', run: effect('slow_falling', 0) },
		{ text: '%admin.effects.button.clear', icon: 'textures/ui/cancel', run: () => {
			run(player, 'effect @s clear');
			// Невидимость из !invis снята вместе с остальными эффектами
			player.removeTag('state:invis');
		} },
		back(() => admin_menu(player))
	], () => admin_menu(player));
}

// --- Выдача инструментов и предметов ---
function tools(player) {
	const give = (item) => () => run(player, `give @s ${item}`);
	showMenu(player, '%admin.tools.title', '%admin.tools.body', [
		{ text: '%admin.tools.button.command_block', icon: 'textures/server_icons/command_block', run: give('command_block') },
		{ text: '%admin.tools.button.repeating_command_block', icon: 'textures/server_icons/repeating_command_block', run: give('repeating_command_block') },
		{ text: '%admin.tools.button.chain_command_block', icon: 'textures/server_icons/chain_command_block', run: give('chain_command_block') },
		{ text: '%admin.tools.button.allow', icon: 'textures/server_icons/allow', run: give('allow') },
		{ text: '%admin.tools.button.deny', icon: 'textures/server_icons/deny', run: give('deny') },
		{ text: '%admin.tools.button.structure_block', icon: 'textures/server_icons/structure_block', run: give('structure_block') },
		{ text: '%admin.tools.button.structure_void', icon: 'textures/server_icons/structure_void', run: give('structure_void') },
		{ text: '%admin.tools.button.jigsaw', icon: 'textures/server_icons/jigsaw', run: give('jigsaw') },
		{ text: '%admin.tools.button.barrier', icon: 'textures/blocks/barrier', run: give('barrier') },
		{ text: '%admin.tools.button.border', icon: 'textures/server_icons/border', run: give('border_block') },
		{ text: '%admin.tools.button.light', icon: 'textures/items/light_block_15', run: give('light_block 1 15') },
		{ text: '%admin.tools.button.npc_egg', icon: 'textures/items/egg_npc', run: give('spawn_egg 1 51') },
		{ text: '%admin.tools.button.hologram_egg', icon: 'textures/items/floating_text', run: give('server:floating_text_spawn_egg') },
		{ text: '%admin.tools.button.admin_stick', icon: 'textures/items/stick', run: give('server:admin_stick') },
		{ text: '%admin.tools.button.portable_ender_crystal', icon: 'textures/items/end_crystal', run: give('server:portable_ender_crystal 16') },
		// Очистка всего инвентаря — теперь с подтверждением
		{ text: '%admin.tools.button.clear_inventory', icon: 'textures/ui/cancel', run: () => confirm(player, WARN_TITLE, '%admin.tools.clear.body', () => run(player, 'clear @s'), () => tools(player)) },
		back(() => admin_menu(player))
	], () => admin_menu(player));
}

// --- Объявление: то же, что !say (эмодзи, без пустых сообщений) ---
function sayServer(player) {
	const form = modal('%admin.announce.title')
		.textField('%admin.announce.body', '%admin.announce.placeholder');
	showModal(player, form, (values) => {
		const message = String(values[0] ?? '').trim();
		// Пустое объявление не отправляем
		if (!message) return admin_menu(player);
		runChatCommand(player, 'say', [message]);
	}, () => admin_menu(player));
}

// --- Вайп (только владелец) ---
function wipe(player) {
	if (!hasRole(player, 'owner')) return tell(player, 'chat.cmd.error.no_permission');
	const { all, online } = wipeCounts();
	confirm(player, WARN_TITLE, `%admin.wipe.body\n\n%admin.wipe.count §e${all}§7 (%admin.wipe.online §e${online}§7)`, () => wipeAll(player), () => admin_menu(player));
}

// ===== Игроки =====

// Выбор игрока из тех, кто в сети
function playersMenu(player) {
	const names = [...world.getPlayers()].map(p => p.name);
	const form = modal('%admin.players.title')
		.dropdown('%admin.players.choose', names, Math.max(0, names.indexOf(player.name)));
	showModal(player, form, (values) => {
		const name = names[values[0]];
		const target = findPlayer(name);
		if (!target) return tell(player, 'chat.cmd.error.offline', name);
		playerActions(player, target);
	}, () => admin_menu(player));
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
		{ text: '%admin.players.button.spawn', icon: 'textures/ui/World', run: () => runChatCommand(player, 'warp', ['spawn', name]) },
		{ text: '%admin.players.button.gamemode', icon: 'textures/ui/heart_new', run: () => playerGamemode(player, target) },
		{ text: '%admin.players.button.money', icon: 'textures/items/gold_ingot', run: () => playerMoney(player, target) },
		...(target.hasTag('role:bot') ? [] : [{ text: '%admin.players.button.color', icon: 'textures/items/dye_powder_pink', run: () => playerColor(player, target) }])
	);
	if (!self) {
		const muted = muteMinutesLeft(target) > 0;
		items.push(
			{ text: target.hasTag('state:frozen') ? '%admin.players.button.unfreeze' : '%admin.players.button.freeze', icon: 'textures/ui/freeze_heart', run: cmd(target.hasTag('state:frozen') ? 'unfreeze' : 'freeze') },
			muted
				? { text: '%admin.players.button.unmute', icon: 'textures/ui/mute_off', run: cmd('unmute') }
				: { text: '%admin.players.button.mute', icon: 'textures/ui/mute_on', run: () => playerMute(player, target) },
			{ text: '%admin.players.button.warn', icon: 'textures/ui/WarningGlyph', run: () => playerReason(player, target, 'warn', '%admin.players.warn.title', '%admin.players.reason') },
			// Снять одно предупреждение (если есть)
			...(getWarns(target) > 0 ? [{ text: '%admin.players.button.unwarn', icon: 'textures/ui/check', run: cmd('unwarn') }] : []),
			{ text: '%admin.players.button.kick', icon: 'textures/ui/cancel', run: () => playerReason(player, target, 'kick', '%admin.players.kick.title', '%admin.players.reason_optional') },
			{ text: '%admin.players.button.ban', icon: 'textures/ui/ErrorGlyph', run: () => playerReason(player, target, 'ban', '%admin.players.ban.title', '%admin.players.reason_optional') }
		);
		// Роль меняет только владелец, и не самому себе
		if (hasRole(player, 'owner') && !target.hasTag('role:owner') && !target.hasTag('role:bot')) {
			items.push({ text: '%admin.players.button.role', icon: 'textures/ui/permissions_op_crown', run: () => playerRole(player, target) });
			// Сброс забытого пароля — с подтверждением (команда !resetpass)
			items.push({ text: '%admin.players.button.resetpass', icon: 'textures/ui/icon_lock', run: () => confirm(player, WARN_TITLE, '%admin.players.resetpass.body', () => runChatCommand(player, 'resetpass', [target.name]), () => playerActions(player, target)) });
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
	showMenu(player, '%admin.players.title', body, items, () => playersMenu(player));
}

function playerGamemode(player, target) {
	const mode = (command) => () => runChatCommand(player, command, [target.name]);
	showMenu(player, '%admin.gamemode.title', '%admin.gamemode.body', [
		{ text: '%admin.gamemode.button.creative', icon: 'textures/ui/heart_new', run: mode('gm1') },
		{ text: '%admin.gamemode.button.adventure', icon: 'textures/ui/absorption_heart', run: mode('gm2') },
		{ text: '%admin.gamemode.button.spectator', icon: 'textures/ui/freeze_heart', run: mode('gm6') },
		back(() => playerActions(player, target))
	], () => playerActions(player, target));
}

// Цвет ника или текста в чате: что красить и цвет (первый пункт — «как у роли»)
function playerColor(player, target) {
	const colors = Object.keys(CHAT_COLORS);
	const form = modal('%admin.players.color.title')
		.dropdown('%admin.players.color.kind', ['%admin.players.color.kind.name', '%admin.players.color.kind.text'], 0)
		.dropdown('%admin.players.color.color', ['%admin.players.color.reset', ...colors.map(c => `§${CHAT_COLORS[c]}■§r %color.${c}`)], 0);
	showModal(player, form, (values) => {
		const kind = values[0] === 1 ? 'text' : 'name';
		const i = values[1];
		runChatCommand(player, 'color', [target.name, kind, i === 0 ? 'reset' : colors[i - 1]]);
	}, () => playerActions(player, target));
}

function playerMoney(player, target) {
	const actions = ['add', 'take', 'set'];
	const form = modal('%admin.players.money.title')
		.dropdown(`%admin.players.body.money ${getScore(target, 'money')}\n\n%admin.players.money.action`, actions.map(a => `%admin.players.money.${a}`), 0)
		.textField('%admin.players.money.amount', '%menu.bank.amount_placeholder');
	showModal(player, form, (values) => {
		// Игрок мог выйти, пока окно было открыто
		const online = findPlayer(target.name);
		if (!online) return tell(player, 'chat.cmd.error.offline', target.name);
		setMoney(player, online, actions[values[0]], String(values[1] ?? '').trim());
	}, () => playerActions(player, target));
}

// Мут: длительность из списка (команда принимает 1–1440 минут)
const MUTE_MINUTES = [5, 15, 30, 60, 180, 720, 1440];
function playerMute(player, target) {
	const form = modal('%admin.players.mute.title')
		.dropdown('%admin.players.mute.minutes', MUTE_MINUTES.map(m => `${m} %admin.common.min`), 0)
		.textField('%admin.players.reason_optional', '%admin.players.reason_placeholder');
	showModal(player, form, (values) => {
		const reason = String(values[1] ?? '').trim();
		runChatCommand(player, 'mute', [target.name, String(MUTE_MINUTES[values[0]]), ...(reason ? [reason] : [])]);
	}, () => playerActions(player, target));
}

// Предупреждение (причина обязательна — иначе команда покажет подсказку) или кик (причина по желанию)
function playerReason(player, target, command, title, label) {
	const form = modal(title)
		.textField(label, '%admin.players.reason_placeholder');
	showModal(player, form, (values) => {
		const reason = String(values[0] ?? '').trim();
		runChatCommand(player, command, [target.name, ...(reason ? [reason] : [])]);
	}, () => playerActions(player, target));
}

function playerRole(player, target) {
	const roles = ['player', 'helper', 'moder', 'admin'];
	const form = modal('%admin.players.role.title')
		.dropdown('%admin.players.role.choose', roles.map(r => `${ROLE_GLYPHS[r]} %role.${r}`), Math.max(0, roles.indexOf(getRole(target))));
	showModal(player, form, (values) => {
		runChatCommand(player, 'role', [target.name, roles[values[0]]]);
	}, () => playerActions(player, target));
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
	showMenu(player, '%admin.boosts.title', '%admin.boosts.body', [
		{ text: '%admin.boosts.button.boost', icon: 'textures/items/experience_bottle', run: () => boostForm(player) },
		{ text: '%admin.boosts.button.magnet', icon: 'textures/items/ender_pearl', run: () => magnetForm(player) },
		...EVENTS.map(ev => ({ text: `%admin.boosts.button.event %chat.cmd.event.name.${ev}`, icon: 'textures/ui/icon_timer', run: () => runChatCommand(player, 'event', [ev]) })),
		{ text: '%admin.boosts.button.auto', icon: 'textures/ui/icon_setting', run: () => autoEventsForm(player, () => boostsMenu(player)) },
		back(() => admin_menu(player))
	], () => admin_menu(player));
}

// Длительность буста и магнита — списком (команда принимает 1–60 минут). Все числа берут форму
// «минут» (5–20, 30, 45, 60), поэтому одной строки перевода хватает на всех языках
const BOOST_MINUTES = [5, 10, 15, 20, 30, 45, 60];
const minutesLabel = (m) => `\ue12c ${m} %admin.common.minutes`;

// «Магнит руды» бесплатно (как !boost magnet): кому и на сколько
function magnetForm(player) {
	const names = [...world.getPlayers()].map(p => p.name);
	const form = modal('%admin.boosts.magnet.title')
		.dropdown('%admin.players.choose', names, Math.max(0, names.indexOf(player.name)))
		.dropdown('%admin.boosts.boost.minutes', BOOST_MINUTES.map(minutesLabel), 0);
	showModal(player, form, (values) => {
		runChatCommand(player, 'boost', ['magnet', names[values[0]], String(BOOST_MINUTES[values[1]])]);
	}, () => boostsMenu(player));
}

// Буст для всех (как !boost): тип и длительность
function boostForm(player) {
	const types = ['x2', 'x4'];
	const form = modal('%admin.boosts.boost.title')
		.dropdown('%admin.boosts.boost.type', [`§2${XP_GLYPH} x2`, `§3${XP_GLYPH} x4`], 0)
		.dropdown('%admin.boosts.boost.minutes', BOOST_MINUTES.map(minutesLabel), 0);
	showModal(player, form, (values) => {
		runChatCommand(player, 'boost', [types[values[0]], String(BOOST_MINUTES[values[1]])]);
	}, () => boostsMenu(player));
}

const eventLabel = (ev) => `%chat.cmd.event.name.${ev} §8— %admin.boosts.auto.every ${EVENT_PERIOD[ev]} %admin.common.min`;

// Ивенты по таймеру: переключатели табло settings (раньше — только командой /scoreboard)
function autoEventsForm(player, onBack) {
	const form = modal('%admin.boosts.auto.title');
	for (const ev of EVENTS) form.toggle(eventLabel(ev), getSetting(ev) === 1);
	showModal(player, form, (values) => {
		EVENTS.forEach((ev, i) => run(player, `scoreboard players set ${ev} settings ${values[i] ? 1 : 0}`));
		tell(player, 'chat.admin.auto_events.saved');
	}, onBack);
}

// ===== Сервер: сводка =====

/** Идущие бусты: таймер — табло system у стойки X2Boost/X4Boost, в секундах (timers/ticks_20). */
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
		`%admin.server.helpers §f${count('helper')}`,
		'',
		boosts.length
			? boosts.map(b => `%admin.server.boost §a${b.type} §8— %admin.server.left ${b.minutes} %admin.common.min`).join('\n')
			: '%admin.server.boost §8—',
		'',
		'%admin.server.auto',
		...EVENTS.map(ev => `§8• %chat.cmd.event.name.${ev} §8— ${getSetting(ev) === 1 ? '%admin.server.on' : '%admin.server.off'}`)
	];
	showMenu(player, '%admin.server.title', lines.join('\n'), [
		{ text: '%admin.server.button.online', icon: 'textures/ui/FriendsIcon', run: () => runChatCommand(player, 'online', []) },
		{ text: '%admin.server.button.top_money', icon: 'textures/items/gold_ingot', run: () => runChatCommand(player, 'top', ['money']) },
		{ text: '%admin.server.button.top_lvl', icon: 'textures/items/experience_bottle', run: () => runChatCommand(player, 'top', ['lvl']) },
		{ text: '%admin.server.button.top_rebirth', icon: 'textures/items/nether_star', run: () => runChatCommand(player, 'top', ['rebirth']) },
		{ text: '%admin.server.button.top_vip_coins', icon: 'textures/items/emerald', run: () => runChatCommand(player, 'top', ['vip_coins']) },
		{ text: '%admin.server.button.top_kd', icon: 'textures/items/iron_sword', run: () => runChatCommand(player, 'top', ['kd']) },
		{ text: '%admin.server.button.top_pvp', icon: 'textures/items/diamond_sword', run: () => runChatCommand(player, 'top', ['pvp']) },
		{ text: '%admin.server.button.top_spleef', icon: 'textures/items/diamond_shovel', run: () => runChatCommand(player, 'top', ['spleef']) },
		{ text: '%admin.boosts.button.auto', icon: 'textures/ui/icon_setting', run: () => autoEventsForm(player, () => serverMenu(player)) },
		back(() => admin_menu(player))
	], () => admin_menu(player));
}

// ===== Бот =====

export function botMenu(player) {
	const bot = getBot();
	const name = getBotName();
	const items = [];
	if (bot) {
		items.push(
			{ text: '%admin.bot.button.tp_here', icon: 'textures/items/ender_pearl', run: () => run(player, `tp "${bot.name}" @s`) },
			{ text: '%admin.bot.button.tp_to', icon: 'textures/items/ender_pearl', run: () => run(player, `tp @s "${bot.name}"`) },
			{ text: '%admin.bot.button.say', icon: 'textures/ui/comment', run: () => botSay(player) },
			{ text: '%admin.bot.button.effects', icon: 'textures/items/potion_bottle_splash_heal', run: () => botEffects(player) },
			{ text: '%admin.bot.button.clear_effects', icon: 'textures/items/bucket_milk', run: () => {
				run(bot, 'effect @s clear');
				tell(player, 'chat.admin.bot.effect.cleared', bot.name);
			} },
			{ text: '%admin.bot.button.remove', icon: 'textures/ui/cancel', run: () => {
				if (removeBot()) tell(player, 'chat.admin.bot.removed', name);
			} }
		);
	} else {
		items.push({ text: '%admin.bot.button.spawn', icon: 'textures/server_icons/steve', run: () => {
			spawnBot(player);
			tell(player, 'chat.admin.bot.spawned', name);
		} });
	}
	items.push(
		{ text: '%admin.bot.button.rename', icon: 'textures/items/name_tag', run: () => botRename(player) },
		back(() => admin_menu(player))
	);
	showMenu(player, '%admin.bot.title', `%admin.bot.name §f${name}\n${bot ? '%admin.bot.present' : '%admin.bot.absent'}`, items, () => admin_menu(player));
}

// Имя задаётся при появлении бота, поэтому бот, который уже в мире, призывается заново под новым именем
function botRename(player) {
	const form = modal('%admin.bot.rename.title')
		.textField('%admin.bot.rename.body', getBotName(), getBotName());
	showModal(player, form, (values) => {
		const name = String(values[0] ?? '').trim();
		if (!setBotName(name)) return tell(player, 'chat.admin.bot.error.name');
		if (removeBot()) spawnBot(player);
		tell(player, 'chat.admin.bot.renamed', name);
	}, () => botMenu(player));
}

// Эффекты на бота (и отрицательные): эффект, усиление (ползунок 0–255, как у /effect: 0 — уровень I), время, частицы. Названия — effect.<id>.name в .lang
// (отрицательные — красным, полезные — §a). Время — списком, как у бустов; «бесконечно» — 1 000 000 с (максимум /effect в 1.19.50)
export const BOT_EFFECTS = ['speed', 'slowness', 'haste', 'mining_fatigue', 'strength', 'instant_health', 'instant_damage', 'jump_boost',
	'nausea', 'regeneration', 'resistance', 'fire_resistance', 'water_breathing', 'invisibility', 'blindness', 'night_vision', 'hunger',
	'weakness', 'poison', 'wither', 'health_boost', 'absorption', 'saturation', 'levitation', 'fatal_poison', 'slow_falling', 'conduit_power',
	'bad_omen', 'village_hero', 'darkness'];
const EFFECT_SECONDS = [30, 60, 300, 600, 1800, 1000000];
const secondsLabel = (s) => s >= 1000000 ? '\ue12c %admin.bot.effects.infinite'
	: s < 60 ? `\ue12c ${s} %admin.bot.effects.sec` : `\ue12c ${s / 60} %admin.bot.effects.min`;

function botEffects(player) {
	const form = modal('%admin.bot.effects.title')
		.dropdown('%admin.bot.effects.effect', BOT_EFFECTS.map(id => `%effect.${id}.name`), 0)
		.slider('%admin.bot.effects.level', 0, 255, 1, 0)
		.dropdown('%admin.bot.effects.time', EFFECT_SECONDS.map(secondsLabel), 1)
		.toggle('%admin.bot.effects.hide', false);
	showModal(player, form, ([effect, level, time, hide]) => {
		const bot = getBot();
		if (!bot) return tell(player, 'chat.admin.bot.error.absent');
		const id = BOT_EFFECTS[effect], seconds = EFFECT_SECONDS[time];
		run(bot, `effect @s ${id} ${seconds} ${Math.round(level)} ${hide ? 'true' : 'false'}`);
		tell(player, 'chat.admin.bot.effect.added', bot.name, { translate: `effect.${id}.name` }, String(level + 1),
			seconds >= 1000000 ? { translate: 'admin.bot.effects.infinite' } : { rawtext: [{ text: String(seconds < 60 ? seconds : seconds / 60) + ' ' }, { translate: seconds < 60 ? 'admin.bot.effects.sec' : 'admin.bot.effects.min' }] });
	}, () => botMenu(player));
}

// Сообщение в общий чат от имени бота — в том же формате, что сообщения игроков (sendChatMessage из chat/chat.js)
function botSay(player) {
	const form = modal('%admin.bot.say.title')
		.textField('%admin.announce.body', '%admin.announce.placeholder');
	showModal(player, form, (values) => {
		const text = String(values[0] ?? '').trim();
		const bot = getBot();
		if (!text) return botMenu(player);
		if (!bot) return tell(player, 'chat.admin.bot.error.absent');
		// Ограничение длины, как в обычном чате
		if (text.length > 200) return tell(player, 'chat.error.too_long');
		sendChatMessage(bot, text);
	}, () => botMenu(player));
}