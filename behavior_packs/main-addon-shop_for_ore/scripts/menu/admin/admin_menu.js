// --- Админ-меню для Shop for Ore ---
// Открывается предметом server:admin_menu у администратора и владельца.
// Действия над игроками, бусты, ивенты и режимы выполняются теми же командами, что и в чате
// (runChatCommand из chat/commands/commands.js): одни и те же проверки прав и сообщения.
// В 1.19.50 формы принимают только строки: ключи перевода пишутся как «%ключ», после ключа — пробел или перенос
// (сразу после ключа не ставим ни скобок, ни §-кодов).

import { durationText, playedSeconds, playtimeText } from '../../system/player/playtime.js';
import { groupProfileTags, offlineProfile, offlineProfiles, profilePosition, profileScores } from '../../system/player/registry.js';
import { clearResetHistory } from '../../system/core/reset_history.js';
import { adminEnchantMenu } from './admin_enchant.js';
import { boostSeconds } from '../../system/economy/boosts.js';
import { world } from '@minecraft/server';
import { isJailed, tellJailed, jailMinutesLeft } from '../../system/security/jail.js';
import { isPending, isBot, tell, hasRole, getRole, getScore, getWarns, muteMinutesLeft, run, findPlayer, CHAT_COLORS, isVip, VIP_TAG, MAX_LEVEL } from '../../utils.js';
import { showMenu, showModal, modal, backButton, confirm, wipeConfirm, WARN_TITLE } from '../common/forms.js';
import { runChatCommand, setMoney } from '../../chat/commands/commands.js';
import { sendChatMessage } from '../../chat/chat.js';
import { getBot, getBotName, setBotName, spawnBot, removeBot } from '../../system/bot/spawnbot.js';
import { wipeAll, wipeCounts } from '../../system/core/wipe.js';
import { resetOffline, offlineCounts } from '../../system/core/offline_reset.js';
import { canTeleport, listGames } from '../../system/minigames/minigames.js';
import { setBotMode, toggleBot, rememberBotItem, botState, SPAR_LEVELS, canGuidePlayer, startBotGuide } from '../../system/bot/bot.js';

const BACK_ICON = 'textures/ui/icon_import';
// Кружки цвета роли из шрифта карты: серый, синий, красный
const ROLE_GLYPHS = { player: '\ue137', helper: '\ue135', moder: '\ue131', admin: '\ue130' };
// Значок опыта, как у бустов в магазине
const XP_GLYPH = '\ue154';
// Значок монеты (как в балансе на панели слева)
const COIN_GLYPH = '\ue152';
const VIP_COIN_GLYPH = "";
const OPEN = '\n%menu.common.tap_to_open';
const EVENTS = ['haste', 'rain', 'gift', 'mythic'];
// Как часто срабатывают ивенты по таймеру (минуты): timers/ticks_3600, ticks_6000, ticks_4800, мистик — system/combat/mythic.js
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
	// В тюрьме (!jail) — тоже: меню телепортаций вывело бы из камеры
	if (isJailed(player)) {
		data.cancel = true;
		tellJailed(player);
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
		{ text: '%admin.players.registry.title' + OPEN, icon: 'textures/items/book_writable', run: () => playerRegistryMenu(player) },
		{ text: '%admin.main.button.money' + OPEN, icon: 'textures/items/gold_ingot', run: () => moneyPlayers(player) },
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
		// Полёт — переключатель: включить / выключить
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
		{ text: '%menu.warps.button.pvp', icon: 'textures/ui/World', run: tp(292, -25, 259) },
		// Сплиф (второй портал из мини-игр: -115 0 -51)
		{ text: '%menu.warps.button.spleef', icon: 'textures/ui/World', run: tp(500, 3, 500) },
		{ text: '%menu.warps.button.tir', icon: 'textures/ui/World', run: tp(435, -45, 338) },
		{ text: '%admin.warps.button.boss_zone', icon: 'textures/ui/World', run: tp(528, -55, -5) },
		{ text: '%admin.warps.button.cmd_zone', icon: 'textures/ui/World', run: tp(50, 5, 50) },
		{ text: '%admin.warps.button.random_player', icon: 'textures/ui/World', run: () => {
			// Случайный игрок без роли; если таких нет — сообщение
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
		{ text: '%admin.tools.button.by_id', icon: 'textures/ui/magnifyingGlass', run: () => itemById(player, 'give @s', () => tools(player)) },
		{ text: '%admin.tools.button.enchant', icon: 'textures/items/book_enchanted', run: () => adminEnchantMenu(player, () => tools(player)) },
		// Очистка всего инвентаря — с подтверждением
		{ text: '%admin.tools.button.clear_inventory', icon: 'textures/ui/cancel', run: () => confirm(player, WARN_TITLE, '%admin.tools.clear.body', () => run(player, 'clear @s'), () => tools(player)) },
		back(() => admin_menu(player))
	], () => admin_menu(player));
}

// --- Предмет по ID: id (minecraft:… можно не писать), количество, метаданные ---
// command — начало команды: «give @s» себе или «replaceitem entity "<бот>" slot.hotbar 0» (слоты бота)
export const ITEM_ID = /^([a-z0-9_]+:)?[a-z0-9_.]+$/;
/** Проверить поля формы предмета: { id, count, data } или ключ ошибки. */
export function parseItemFields(id, count, data, maxCount = 255) {
	const item = String(id ?? '').trim().toLowerCase();
	const n = Number(String(count ?? '').trim() || 1), d = Number(String(data ?? '').trim() || 0);
	if (!ITEM_ID.test(item)) return { error: 'chat.admin.item.error.id' };
	if (!Number.isInteger(n) || n < 1 || n > maxCount) return { error: 'chat.cmd.error.number', args: [String(count ?? ''), 1, maxCount] };
	if (!Number.isInteger(d) || d < 0 || d > 32767) return { error: 'chat.cmd.error.number', args: [String(data ?? ''), 0, 32767] };
	return { id: item, count: n, data: d };
}
function itemById(player, command, onBack) {
	const form = modal('%admin.item.title')
		.textField('%admin.item.id', 'minecraft:diamond_sword')
		.textField('%admin.item.count', '1', '1')
		.textField('%admin.item.data', '0', '0');
	showModal(player, form, ([id, count, data]) => {
		const parsed = parseItemFields(id, count, data);
		if (parsed.error) return tell(player, parsed.error, ...(parsed.args ?? []));
		// Нет такого предмета — команда не сработает (run вернёт undefined)
		run(player, `${command} ${parsed.id} ${parsed.count} ${parsed.data}`).then(r => {
			if (r === undefined) tell(player, 'chat.admin.item.error.unknown', parsed.id);
			else tell(player, 'chat.admin.item.given', parsed.id, String(parsed.count));
		});
	}, onBack);
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

// --- Вайп (только владелец): полный вайп и сброс игроков не в сети, у каждого — окно «Да / Нет» (forms.js) ---
function wipe(player) {
	if (!hasRole(player, 'owner')) return tell(player, 'chat.cmd.error.no_permission');
	const again = () => wipe(player);
	showMenu(player, '%admin.wipe.menu.title', '%admin.wipe.menu.body', [
		{ text: '%admin.wipe.button.full', icon: 'textures/ui/friend_glyph_desaturated', run: () => {
			const { all, online } = wipeCounts();
			wipeConfirm(player, `%admin.wipe.body\n\n%admin.wipe.count §e${all}§7 (%admin.wipe.online §e${online}§7)`, () => wipeAll(player), again);
		} },
		{ text: '%admin.wipe.button.offline', icon: 'textures/ui/permissions_visitor_hand', run: () => {
			const { offline, online } = offlineCounts();
			wipeConfirm(player, `%admin.wipe.offline.body\n\n%admin.wipe.offline.count §e${offline}§7 (%admin.wipe.online §e${online}§7)`, () => resetOffline(player), again);
		} },
		{ text: '%admin.wipe.history.title', icon: 'textures/ui/refresh_light', run: () => confirm(player, WARN_TITLE, '%admin.wipe.history.body', () => clearResetHistory(player), again) },
		back(() => admin_menu(player))
	], () => admin_menu(player));
}

// ===== Игроки =====

// Выбор игрока из тех, кто в сети
export function orderedPlayers(viewer, players = [...world.getPlayers()], random = Math.random) {
	const kind = p => isBot(p) ? 1 : getRole(p) === 'owner' ? 2 : 0;
	const sorted = players.slice().sort((a, b) => kind(a) - kind(b) || a.name.localeCompare(b.name));
	const candidates = sorted.filter(p => kind(p) === 0 && p.name !== viewer.name);
	if (candidates.length) {
		const chosen = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
		sorted.splice(sorted.indexOf(chosen), 1); sorted.unshift(chosen);
	}
	return sorted;
}
const REGISTRY_PAGE_SIZE = 12;
const PROFILE_TAG_TITLES = {
	ach: 'achievement', auth: 'auth', boss: 'boss', cosmetic: 'cosmetic', fx: 'fx', music: 'music',
	player: 'player', rank: 'rank', role: 'role', stat: 'stat', sys: 'system', '': 'other'
};
const profileValue = value => value === undefined ? '§8—' : '§e' + value;
const registryTitle = '%admin.players.registry.title';

function registryAllowed(player) {
	return hasRole(player, 'admin') && !isPending(player);
}

function playersMenu(player) {
	const names = orderedPlayers(player).map(p => p.name);
	if (!names.length) return tell(player, 'chat.admin.error.no_players');
	const form = modal('%admin.players.title')
		.dropdown('%admin.players.choose', names, 0);
	showModal(player, form, (values) => {
		const name = names[values[0]];
		const target = findPlayer(name);
		if (!target) return tell(player, 'chat.cmd.error.offline', name);
		playerActions(player, target);
	}, () => admin_menu(player));
}

function playerRegistryMenu(player, page = 0) {
	if (!registryAllowed(player)) return;
	const connected = [...world.getPlayers()];
	const online = connected.filter(p => !isBot(p)).sort((a, b) =>
		Number(b.name === player.name) - Number(a.name === player.name) || a.name.localeCompare(b.name));
	const offline = [...offlineProfiles(new Set(connected.map(p => p.name))).keys()].sort((a, b) => a.localeCompare(b));
	const records = online.map(p => ({ name: p.name, status: p.name === player.name ? 'self' : 'online' }))
		.concat(offline.map(name => ({ name, status: 'offline' })));
	const last = Math.max(0, Math.ceil(records.length / REGISTRY_PAGE_SIZE) - 1);
	page = Math.min(page, last);
	const returnToList = () => playerRegistryMenu(player, page);
	const items = records.slice(page * REGISTRY_PAGE_SIZE, (page + 1) * REGISTRY_PAGE_SIZE).map(({ name, status }) => ({
		text: '§8' + name + '\n' + (status === 'offline' ? '§c' : '§2') + '■§r %admin.players.registry.status.' + status,
		icon: 'textures/server_icons/steve',
		run: () => playerProfileMenu(player, name, returnToList)
	}));
	if (page > 0) items.push({ text: '%admin.players.registry.prev', run: () => playerRegistryMenu(player, page - 1) });
	if (page < last) items.push({ text: '%admin.players.registry.next', run: () => playerRegistryMenu(player, page + 1) });
	items.push(back(() => admin_menu(player)));
	return showMenu(player, registryTitle, '%admin.players.registry.body §f' + (page + 1) + '§7/§f' + (last + 1), items);
}

function playerProfileMenu(player, name, returnToList = () => playerRegistryMenu(player)) {
	if (!registryAllowed(player)) return;
	const live = findPlayer(name);
	const identity = live ? undefined : offlineProfiles(new Set()).get(name);
	const data = live ? {
		scores: profileScores(live.scoreboard),
		role: getRole(live), vip: isVip(live), warns: getWarns(live), seconds: playedSeconds(live)
	} : identity ? offlineProfile(identity) : { scores: {} };
	const { scores, vip } = data;
	const role = live && isBot(live) ? 'role.tag.bot' : data.role ? 'role.' + data.role : undefined;
	const xp = vip ? '§r\ue128' : scores.xp === undefined ? profileValue(undefined)
		: profileValue(scores.xp) + (scores.xp_need > 0 ? '§7/' + profileValue(scores.xp_need)
			: scores.xp_need === 0 && scores.lvl >= MAX_LEVEL ? ' %admin.players.registry.xp.max' : '');
	const status = !live ? 'offline' : live.name === player.name ? 'self' : 'online';
	const body = [
		'%admin.players.registry.status_label %admin.players.registry.status.' + status + (status === 'self' ? ' §8· %admin.players.registry.status.online' : ''),
		...(!live ? [data.role ? '%admin.players.registry.snapshot' : '%admin.players.registry.snapshot_missing'] : []),
		'',
		'%admin.players.body.role ' + (role ? '%' + role : profileValue(undefined)),
		'%admin.players.body.lvl ' + (vip ? '§aVIP' : profileValue(scores.lvl)) + ' §r\ue153',
		'%admin.players.registry.xp ' + xp + (vip ? '' : ' §r\ue154'),
		'%admin.players.registry.money ' + profileValue(scores.money) + ' §r' + COIN_GLYPH,
		...(vip ? ['%admin.players.body.vip_coins ' + profileValue(scores.vip_coins) + ' §r' + VIP_COIN_GLYPH] : []),
		'%admin.players.registry.rebirth ' + profileValue(scores.rebirth) + ' §r\ue116',
		'%admin.players.body.warns ' + (data.warns === undefined ? profileValue(undefined) : '§e' + data.warns + '§7/§f3'),
		'%admin.players.body.playtime ' + (data.seconds === undefined ? profileValue(undefined) : durationText(data.seconds))
	].join('\n');
	const openProfile = () => playerProfileMenu(player, name, returnToList);
	return showMenu(player, '%admin.players.registry.profile §8' + name, body, [
		{ text: '%admin.players.registry.details', icon: 'textures/items/book_writable', run: () => playerRegistryDetails(player, name, openProfile) },
		live && { text: '%admin.players.registry.actions', run: () => {
			if (!registryAllowed(player)) return;
			const target = findPlayer(name);
			return target ? playerActions(player, target, openProfile) : openProfile();
		} },
		{ text: '%admin.players.registry.refresh', run: openProfile },
		back(returnToList)
	]);
}

function playerRegistryDetails(player, name, openProfile) {
	if (!registryAllowed(player)) return;
	const target = findPlayer(name);
	const identity = target ? undefined : offlineProfiles(new Set()).get(name);
	const scores = profileScores(target?.scoreboard ?? identity);
	const scoreLine = (label, id, glyph, color = '§e') =>
		glyph + ' %admin.players.' + label + ' ' + (scores[id] === undefined ? '§8—' : color + scores[id]) + '§r';
	const scoreBlock = [
		'%admin.players.registry.scores_heading',
		scoreLine('registry.money', 'money', COIN_GLYPH),
		scoreLine('body.vip_coins', 'vip_coins', VIP_COIN_GLYPH, '§g'),
		scoreLine('body.lvl', 'lvl', '\ue153'),
		scoreLine('registry.xp', 'xp', XP_GLYPH),
		scoreLine('registry.rebirth', 'rebirth', '\ue116')
	];
	const title = '%admin.players.registry.details §8» ' + name;
	if (!target) return showMenu(player, title, [
		'%admin.players.registry.snapshot', '', ...scoreBlock, '', '%admin.players.registry.offline_details'
	].join('\n'), [back(openProfile)]);
	const [position, dimension] = profilePosition(target);
	const dimensionText = ['overworld', 'nether', 'the_end'].includes(dimension)
		? '%admin.players.registry.dimension.' + dimension : '§f' + dimension;
	const { count, groups } = groupProfileTags(target);
	const body = [
		'%admin.players.registry.location_heading',
		'%admin.players.registry.position §f' + position.replaceAll(' ', ', ') + '§r',
		'%admin.players.registry.dimension ' + dimensionText,
		'',
		...scoreBlock,
		'',
		'%admin.players.registry.tags_heading §7(' + count + ')'
	];
	const reopen = () => playerRegistryDetails(player, name, openProfile);
	const label = group => Object.prototype.hasOwnProperty.call(PROFILE_TAG_TITLES, group)
		? '%admin.players.registry.tag.' + PROFILE_TAG_TITLES[group] : '§8' + group;
	const items = groups.map(([group, tags]) => ({ text: label(group) + ' §8(' + tags.length + ')', run: () => {
		if (!registryAllowed(player)) return;
		const fresh = findPlayer(name);
		if (!fresh) return reopen();
		const values = groupProfileTags(fresh).groups.find(([key]) => key === group)?.[1] ?? [];
		const prefix = group ? group + ':' : '';
		const body = values.map(value => '§8■ §7' + prefix + value + '§r').join('\n');
		return showMenu(player, label(group), body, [back(reopen)]);
	} }));
	items.push(back(openProfile));
	return showMenu(player, title, body.join('\n'), items);
}

// Действия над выбранным игроком. Права проверяет сама команда: например, модератора не может наказать модератор
function playerActions(player, target, openProfile = () => playersMenu(player)) {
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
		{ text: '%admin.main.button.gamemode', icon: 'textures/ui/heart_new', run: () => playerGamemode(player, target) },
		{ text: '%admin.players.button.money', icon: 'textures/items/gold_ingot', run: () => playerMoney(player, target) },
		...(target.hasTag('role:bot') ? [] : [{ text: '%admin.players.button.color', icon: 'textures/items/dye_powder_pink', run: () => playerColor(player, target) }])
	);
	if (!self) {
		const muted = muteMinutesLeft(target) > 0;
		items.push(
			{ text: target.hasTag('state:frozen') ? '%admin.players.button.unfreeze' : '%admin.players.button.freeze', icon: 'textures/ui/freeze_heart', run: cmd(target.hasTag('state:frozen') ? 'unfreeze' : 'freeze') },
			muted
				? { text: '%admin.players.button.unmute', icon: 'textures/ui/mute_off', run: cmd('unmute') }
				: { text: '%admin.players.button.mute', icon: 'textures/ui/mute_on', run: () => playerTerm(player, target, 'mute', '%admin.players.mute.title', TERMS_SHORT) },
			// Тюрьма (!jail / !unjail): срок списком и причина
			isJailed(target)
				? { text: '%admin.players.button.unjail', icon: 'textures/blocks/iron_bars', run: cmd('unjail') }
				: { text: '%admin.players.button.jail', icon: 'textures/blocks/iron_bars', run: () => playerTerm(player, target, 'jail', '%admin.players.jail.title', TERMS_SHORT) },
			{ text: '%admin.players.button.warn', icon: 'textures/ui/WarningGlyph', run: () => playerReason(player, target, 'warn', '%admin.players.warn.title', '%admin.players.reason') },
			// Снять одно предупреждение (если есть)
			...(getWarns(target) > 0 ? [{ text: '%admin.players.button.unwarn', icon: 'textures/ui/check', run: cmd('unwarn') }] : []),
			{ text: '%admin.players.button.kick', icon: 'textures/ui/cancel', run: () => playerReason(player, target, 'kick', '%admin.players.kick.title', '%admin.players.reason_optional') },
			{ text: '%admin.players.button.ban', icon: 'textures/ui/ErrorGlyph', run: () => playerTerm(player, target, 'ban', '%admin.players.ban.title', TERMS_LONG) }
		);
		// Роль меняет только владелец, и не самому себе
		if (hasRole(player, 'owner') && !target.hasTag('role:owner') && !target.hasTag('role:bot')) {
			items.push({ text: '%admin.players.button.role', icon: 'textures/ui/permissions_op_crown', run: () => playerRole(player, target) });
		}
	}
	if (hasRole(player, 'owner')) items.push(isVip(target)
		? { text: '%admin.players.button.vip_take', icon: 'textures/items/amethyst_shard', run: () => setVip(player, target, false) }
		: { text: '%admin.players.button.vip_give', icon: 'textures/items/amethyst_shard', run: () => setVip(player, target, true) });
	// Сброс забытого пароля — последним перед «Назад», с подтверждением (команда !resetpass). Тем же, кому можно менять роль
	if (!self && hasRole(player, 'owner') && !target.hasTag('role:owner') && !target.hasTag('role:bot')) {
		items.push({ text: '%admin.players.button.resetpass', icon: 'textures/ui/icon_lock', run: () => confirm(player, WARN_TITLE, '%admin.players.resetpass.body', () => runChatCommand(player, 'resetpass', [target.name]), () => playerActions(player, target)) });
	}
	items.push(back(openProfile));
	const body = [
		`%admin.players.body.name ${name}`,
		`%admin.players.body.playtime ${playtimeText(target)}`,
		`%admin.players.body.role %role.${getRole(target)}`,
		// Заявка «Я забыл пароль» с экрана входа (registration/forgot.js) — сверить с Telegram и сбросить кнопкой ниже
		...(target.hasTag('auth:reset_request') ? ['%admin.players.body.reset_request'] : []),
		`%admin.players.body.lvl ${getScore(target, 'lvl')}`,
		`%admin.players.body.warns ${getWarns(target)}§7/§f3§r`,
		`%admin.players.body.money ${getScore(target, 'money')} §r${COIN_GLYPH}`,
		...(isVip(target) ? [`%admin.players.body.vip_coins ${getScore(target, 'vip_coins')} §r${VIP_COIN_GLYPH}`] : []),
		`%admin.players.body.mute ${muteMinutesLeft(target) === Infinity ? '%chat.term.permanent' : muteMinutesLeft(target) > 0 ? muteMinutesLeft(target) + ' %admin.common.min' : '%admin.players.mute.none'}`,
		// В тюрьме — сколько осталось
		...(isJailed(target) ? [`%admin.players.body.jail ${jailMinutesLeft(target) === Infinity ? '%chat.term.permanent' : `${jailMinutesLeft(target)} %admin.common.min`}`] : [])
	].join('\n');
	showMenu(player, '%admin.players.title', body, items, openProfile);
}

/** Выдать или снять VIP (тег player:vip). Игрок мог выйти, пока окно было открыто. */
function setVip(player, target, on) {
	if (!hasRole(player, 'owner')) return tell(player, 'chat.cmd.error.no_permission');
	const online = findPlayer(target.name);
	if (!online) return tell(player, 'chat.cmd.error.offline', target.name);
	if (on) {
		online.addTag(VIP_TAG);
		tell(online, 'chat.vip.welcome');
	} else online.removeTag(VIP_TAG);
	tell(player, on ? 'chat.admin.vip.given' : 'chat.admin.vip.taken', online.name);
	playerActions(player, online);
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

function playerMoney(player, target, back = () => playerActions(player, target)) {
	const actions = ['add', 'take', 'set'];
	const form = modal('%admin.players.money.title')
		.dropdown(`%admin.players.body.money ${getScore(target, 'money')} §r${COIN_GLYPH}\n%admin.players.body.vip_coins ${getScore(target, 'vip_coins')} §r${VIP_COIN_GLYPH}\n\n%admin.players.money.currency`, ['%admin.players.money.normal', '%admin.players.money.vip'], 0)
		.dropdown('%admin.players.money.action', actions.map(a => `%admin.players.money.${a}`), 0)
		.textField('%admin.players.money.amount', '%menu.bank.amount_placeholder');
	showModal(player, form, (values) => {
		// Игрок мог выйти, пока окно было открыто
		const online = findPlayer(target.name);
		if (!online) return tell(player, 'chat.cmd.error.offline', target.name);
		return setMoney(player, online, actions[values[1]], String(values[2] ?? '').trim(), values[0] === 1 ? 'vip_coins' : 'money');
	}, back);
}

// Мут, тюрьма, бан: срок из списка (как у команд: минуты, 'permanent') и причина по желанию
const TERMS_SHORT = [5, 15, 30, 60, 180, 720, 1440, 'permanent'];
const TERMS_LONG = ['permanent', 60, 1440, 4320, 10080, 43200];
/** Подпись срока в списке: минуты, часы, дни или «навсегда». */
export const termLabel = (m) => m === 'permanent' ? '%chat.term.permanent'
	: m % 1440 === 0 ? `${m / 1440} %admin.common.days` : m % 60 === 0 && m >= 60 ? `${m / 60} %admin.common.hours` : `${m} %admin.common.min`;
function playerTerm(player, target, command, title, terms) {
	const form = modal(title)
		.dropdown('%admin.players.term', terms.map(termLabel), 0)
		.textField('%admin.players.reason_optional', '%admin.players.reason_placeholder');
	showModal(player, form, (values) => {
		const reason = String(values[1] ?? '').trim();
		runChatCommand(player, command, [target.name, String(terms[values[0]]), ...(reason ? [reason] : [])]);
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
		// Выданные из этого меню или командой бусты и магниты — по ошибке; купленные игроками не трогаются
		{ text: '%admin.boosts.button.stop', icon: 'textures/ui/cancel', run: () => wipeConfirm(player, '%admin.boosts.stop.body',
			() => runChatCommand(player, 'boost', ['stop']), () => boostsMenu(player)) },
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

// Ивенты по таймеру: переключатели табло settings (то же, что /scoreboard players set <ивент> settings 1|0)
function autoEventsForm(player, onBack) {
	const form = modal('%admin.boosts.auto.title');
	for (const ev of EVENTS) form.toggle(eventLabel(ev), getSetting(ev) === 1);
	showModal(player, form, (values) => {
		EVENTS.forEach((ev, i) => run(player, `scoreboard players set ${ev} settings ${values[i] ? 1 : 0}`));
		tell(player, 'chat.admin.auto_events.saved');
	}, onBack);
}

// ===== Сервер: сводка =====

/** Общие бусты: служебные таймеры в system, в секундах. */
function activeBoosts() {
	const list = [];
	for (const type of ['x2', 'x4']) {
		const left = boostSeconds(type);
		if (left > 0) list.push({ type, minutes: Math.ceil(left / 60) });
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
		...['x2', 'x4'].map(type => {
			const active = boosts.find(b => b.type === type);
			return `%admin.server.boost ${type} §8— ${active ? '%admin.server.on %admin.server.left ' + active.minutes + ' %admin.common.min' : '%admin.server.off'}`;
		}),
		'',
		`%admin.server.magnets §f${players.filter(p => p.hasTag('boost:magnet')).map(p => p.name).sort((a,b) => a.localeCompare(b)).join('§7, §f') || '%admin.server.none'}`,
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
		{ text: '%admin.server.button.top_boss', icon: 'textures/items/echo_shard', run: () => runChatCommand(player, 'top', ['boss']) },
		{ text: '%admin.server.button.top_boss_time', icon: 'textures/items/clock_item', run: () => runChatCommand(player, 'top', ['boss_time']) },
		{ text: '%admin.boosts.button.auto', icon: 'textures/ui/icon_setting', run: () => autoEventsForm(player, () => serverMenu(player)) },
		back(() => admin_menu(player))
	], () => admin_menu(player));
}

// ===== Бот =====

export function botMenu(player) {
	const bot = getBot(), name = getBotName(), st = botState();
	const status = (title, value) => `${title}\n§8[§7 ${value} §8]`;
	const toggle = (key, label, icon) => ({
		text: status(`%admin.bot.button.${label}`, key === 'sit'
			? st.sit ? '%admin.bot.sit.sneaking' : '%admin.bot.sit.standing'
			: st[key] ? '%menu.settings.state.on' : '%menu.settings.state.off'), icon,
		run: () => { const on = toggleBot(key); tell(player, `chat.admin.bot.${label}.${on ? 'on' : 'off'}`, name); botMenu(player); }
	});
	const items = bot ? [
		{ text: '%admin.bot.button.tp_here', icon: 'textures/items/ender_pearl', run: () => run(player, `tp "${bot.name}" @s`) },
		{ text: '%admin.bot.button.tp_to', icon: 'textures/items/ender_pearl', run: () => run(player, `tp @s "${bot.name}"`) },
		{ text: status('%admin.bot.button.mode', `%admin.bot.mode.${st.mode}`), icon: 'textures/items/compass_item', run: () => botModeMenu(player) },
		{ text: '%admin.bot.button.say', icon: 'textures/ui/comment', run: () => botSay(player) },
		{ text: '%admin.bot.button.slots', icon: 'textures/items/iron_chestplate', run: () => botSlots(player) },
		toggle('sit', 'sit', 'textures/ui/sneak'),
		{ text: '%admin.bot.button.guide', icon: 'textures/items/book_normal', run: () => botGuide(player) },
		{ text: '%admin.main.button.effects', icon: 'textures/items/potion_bottle_confusion', run: () => botEffects(player) },
		{ text: '%admin.bot.button.clear_effects', icon: 'textures/items/bucket_milk', run: () => { run(bot, 'effect @s clear'); tell(player, 'chat.admin.bot.effect.cleared', bot.name); } },
	] : [{ text: '%admin.bot.button.spawn', icon: 'textures/server_icons/steve', run: async () => { const bot = await spawnBot(player); tell(player, bot ? 'chat.admin.bot.spawned' : 'chat.admin.bot.error.spawn', name); if (bot) botMenu(player); } }];
	items.push(toggle('totem', 'totem', 'textures/items/totem'), toggle('returnOnLoad', 'return', 'textures/ui/refresh_light'),
		{ text: '%admin.bot.button.rename', icon: 'textures/items/name_tag', run: () => botRename(player) },
		// «Убрать бота» — только когда он в мире (без бота вверху кнопка «Вызвать бота»)
		...(bot ? [{ text: '%admin.bot.button.remove', icon: 'textures/ui/cancel', run: () => { if (removeBot()) tell(player, 'chat.admin.bot.removed', name); botMenu(player); } }] : []),
		back(() => admin_menu(player)));
	showMenu(player, '%admin.bot.title', () => `%admin.bot.name §f${getBotName()}\n%admin.bot.status ${getBot() ? '%admin.bot.present' : '%admin.bot.absent'}`, items, () => admin_menu(player));
}

// Режим бота (system/bot/bot.js): за мной и «повторяй» — за тем, кто открыл меню
function botModeMenu(player) {
	const name = getBotName();
	const done = (mode, opts) => {
		const error = setBotMode(mode, opts);
		if (error) return tell(player, error, ...(opts?.game ? [{ translate: `minigame.${opts.game}.name` }] : []));
		tell(player, 'chat.admin.bot.mode', name, { translate: `admin.bot.mode.${mode}` });
	};
	const mode = (id, icon, opts) => ({ text: `§8 %admin.bot.mode.${id}\n%admin.bot.mode.${id}.desc`, icon, run: () => done(id, opts) });
	showMenu(player, '%admin.bot.mode.title', `%admin.bot.mode.now §f %admin.bot.mode.${botState().mode}`, [
		mode('idle', 'textures/server_icons/steve'),
		mode('dummy', 'textures/items/armor_stand'),
		mode('follow', 'textures/items/lead', { target: player.name }),
		mode('stay', 'textures/blocks/barrier'),
		mode('mirror', 'textures/blocks/glass', { target: player.name }),
		{ text: '§8 %admin.bot.mode.spar\n%admin.bot.mode.spar.desc', icon: 'textures/items/diamond_sword', run: () => botSpar(player) },
		{ text: '§8 %admin.bot.mode.game\n%admin.bot.mode.game.desc', icon: 'textures/items/diamond_shovel', run: () => botGame(player) },
		back(() => botMenu(player))
	], () => botMenu(player));
}

function botSpar(player) {
	const form = modal('%admin.bot.spar.title')
		.dropdown('%admin.bot.spar.level', SPAR_LEVELS.map(l => `%admin.bot.spar.level.${l}`), Math.max(0, SPAR_LEVELS.indexOf(botState().level)));
	showModal(player, form, ([level]) => {
		const error = setBotMode('spar', { level: SPAR_LEVELS[level] });
		if (error) return tell(player, error);
		tell(player, 'chat.admin.bot.mode', getBotName(), { translate: 'admin.bot.mode.spar' });
	}, () => botModeMenu(player));
}

function botGame(player) {
	showMenu(player, '%admin.bot.game.title', '%admin.bot.game.body', [
		...listGames().map(g => ({ text: `§8 %minigame.${g.def.id}.name\n§8 %menu.games.phase.${g.phase} §7(${g.players.size}/${g.def.maxPlayers})`, run: () => {
			const error = setBotMode('game', { game: g.def.id });
			if (error) return tell(player, error, { translate: `minigame.${g.def.id}.name` });
			tell(player, 'chat.admin.bot.mode', getBotName(), { translate: 'admin.bot.mode.game' });
		} })),
		back(() => botModeMenu(player))
	], () => botModeMenu(player));
}

function botGuide(player) {
	if (!hasRole(player, 'admin')) return tell(player, 'chat.cmd.error.no_permission');
	const bot = getBot();
	if (!bot) return tell(player, 'chat.admin.bot.error.absent');
	const names = orderedPlayers(player).filter(target => canGuidePlayer(target, bot)).map(target => target.name);
	if (!names.length) return tell(player, 'chat.admin.bot.error.guide_target');
	const form = modal('%admin.bot.guide.title').dropdown('%admin.players.choose', names, 0);
	showModal(player, form, ([index]) => {
		if (!hasRole(player, 'admin')) return tell(player, 'chat.cmd.error.no_permission');
		const name = names[index];
		const target = findPlayer(name);
		if (!target) return tell(player, 'chat.cmd.error.offline', name);
		const error = startBotGuide(target);
		if (error) return tell(player, error);
		tell(player, 'chat.admin.bot.guide.done', target.name);
	}, () => botMenu(player));
}

// Имя задаётся при появлении бота, поэтому бот, который уже в мире, призывается заново под новым именем
function botRename(player) {
	const form = modal('%admin.bot.rename.title')
		.textField('%admin.bot.rename.body', getBotName(), getBotName());
	showModal(player, form, async (values) => {
		const name = String(values[0] ?? '').trim();
		if (!setBotName(name)) return tell(player, 'chat.admin.bot.error.name');
		if (removeBot() && !await spawnBot(player)) return tell(player, 'chat.admin.bot.error.spawn');
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
		.dropdown('%admin.boosts.boost.minutes', EFFECT_SECONDS.map(secondsLabel), 1)
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

// Слоты бота: хотбар 1–9, вторая рука, броня. Пустой ID — очистить слот. Для хотбара можно сразу выбрать слот в руку
export const BOT_SLOTS = [
	...Array.from({ length: 9 }, (_, i) => ({ id: `hotbar${i + 1}`, slot: `slot.hotbar ${i}`, label: `%admin.bot.slots.hotbar ${i + 1}`, hotbar: i })),
	{ id: 'offhand', slot: 'slot.weapon.offhand 0', label: '%admin.bot.slots.offhand' },
	{ id: 'head', slot: 'slot.armor.head 0', label: '%admin.bot.slots.head' },
	{ id: 'chest', slot: 'slot.armor.chest 0', label: '%admin.bot.slots.chest' },
	{ id: 'legs', slot: 'slot.armor.legs 0', label: '%admin.bot.slots.legs' },
	{ id: 'feet', slot: 'slot.armor.feet 0', label: '%admin.bot.slots.feet' }
];
/** Название слота для сообщения в чат: «Хотбар 3», «Голова»… */
const slotName = (slot) => {
	const [key, num] = slot.label.slice(1).split(' ');
	return { rawtext: [{ translate: key }, { text: num ? ` ${num}` : '' }] };
};
function botSlots(player) {
	const form = modal('%admin.bot.slots.title')
		.dropdown('%admin.bot.slots.slot', BOT_SLOTS.map(s => s.label), 0)
		.textField('%admin.bot.slots.id', 'minecraft:diamond_sword')
		.textField('%admin.item.count', '1', '1')
		.textField('%admin.item.data', '0', '0')
		.toggle('%admin.bot.slots.select', true);
	showModal(player, form, ([slotIndex, id, count, data, select]) => {
		const bot = getBot();
		if (!bot) return tell(player, 'chat.admin.bot.error.absent');
		const slot = BOT_SLOTS[slotIndex];
		const target = `replaceitem entity "${bot.name}" ${slot.slot}`;
		if (select && slot.hotbar !== undefined) {
			try { bot.selectedSlot = slot.hotbar; } catch { /* у бота нет выбора слота */ }
		}
		if (!String(id ?? '').trim()) {
			run(player, `${target} air`);
			rememberBotItem(slot.slot);
			return tell(player, 'chat.admin.bot.slots.cleared', bot.name, slotName(slot));
		}
		const parsed = parseItemFields(id, count, data, 64);
		if (parsed.error) return tell(player, parsed.error, ...(parsed.args ?? []));
		run(player, `${target} ${parsed.id} ${parsed.count} ${parsed.data}`).then(r => {
			if (r === undefined) tell(player, 'chat.admin.item.error.unknown', parsed.id);
			else {
				// Запомнить — после перезахода в мир бот получит предмет заново (system/bot/bot.js)
				rememberBotItem(slot.slot, `${parsed.id} ${parsed.count} ${parsed.data}`);
				tell(player, 'chat.admin.bot.slots.set', bot.name, parsed.id);
			}
		});
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
function moneyPlayers(player) {
	if (!hasRole(player, 'admin')) return tell(player, 'chat.cmd.error.no_permission');
	const names = orderedPlayers(player).map(p => p.name);
	if (!names.length) return tell(player, 'chat.admin.error.no_players');
	const form = modal('%admin.players.money.title').dropdown('%admin.players.choose', names, 0);
	showModal(player, form, ([i]) => {
		const target = findPlayer(names[i]);
		if (!target) return tell(player, 'chat.cmd.error.offline', names[i]);
		playerMoney(player, target, () => moneyPlayers(player));
	}, () => admin_menu(player));
}