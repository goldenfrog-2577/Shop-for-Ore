// --- Миграция тегов на новые названия (0.3.0): «группа:значение», строчными, слова через «_» ---
// Теги хранятся у каждого игрока в данных мира, поэтому старые меняются на новые, когда игрок в сети
// (проверка раз в секунду). Табло qx и tpore переименовывает functions/system/setup (setup system = 2).
// Когда у всех игроков мира теги уже новые, файл можно удалить.

import { world, system } from '@minecraft/server';

// Старый тег → новый
const PLAIN = {
	chekLogin: 'auth:login', chekRegister: 'auth:register', hasRegister: 'auth:done',
	host: 'role:owner', bot: 'role:bot',
	frozen: 'state:frozen', 'fly:on': 'state:fly', 'invis:on': 'state:invis', kick: 'state:kick',
	x2boost: 'boost:x2', x4boost: 'boost:x4', 'player:tp_ore': 'boost:magnet',
	'buy:ok': 'sys:buy_ok', 'pick:update': 'sys:pick_update', 'rebirth:now': 'sys:rebirth_now',
	'hunger:off': 'sys:hunger_off', 'pvp:v2': 'sys:pvp_v2', 'warp:pvp': 'sys:warp_pvp',
	rebirth: 'player:rebirth'
};
// Старое начало тега → новое (значение после него сохраняется)
const PREFIX = [
	['mute:', 'state:mute:'], ['warn:', 'state:warn:'], ['frozenat:', 'state:frozen_at:'],
	['muteby:', 'state:mute_by:'], ['warnby:', 'state:warn_by:'], ['frozenby:', 'state:frozen_by:'],
	['pws:', 'auth:salt:'], ['pwh:', 'auth:hash:']
];

// Цвет в чате (до 0.3.0): name:§b / text:§b → chat:name_color:b / chat:text_color:b; пустой или неверный — удаляется
const COLOR_PREFIX = [['name:', 'chat:name_color:'], ['text:', 'chat:text_color:']];

/** Новое название тега; '' — тег удалить; undefined — тег уже в новом стиле. */
export function migratedTag(tag) {
	const c = COLOR_PREFIX.find(([from]) => tag.startsWith(from));
	if (c) {
		const code = tag.slice(c[0].length).replace(/^§/, '');
		return /^[0-9a-g]$/.test(code) ? c[1] + code : '';
	}
	if (Object.prototype.hasOwnProperty.call(PLAIN, tag)) return PLAIN[tag];
	const p = PREFIX.find(([from]) => tag.startsWith(from));
	return p ? p[1] + tag.slice(p[0].length) : undefined;
}

/** Переименовать старые теги игрока. @returns {number} сколько тегов заменено */
export function migratePlayer(player) {
	let n = 0;
	for (const tag of player.getTags()) {
		const next = migratedTag(tag);
		if (next === undefined) continue;
		// Сначала новый, потом снять старый: игрок ни на миг не остаётся без тега (например, без пароля)
		if (next) player.addTag(next);
		player.removeTag(tag);
		n++;
	}
	return n;
}

system.runSchedule(() => {
	for (const player of world.getPlayers()) migratePlayer(player);
}, 20);