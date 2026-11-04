// --- Префикс уровня в чате ---
// Каждому игроку — тег rank:§r<уровень> со значком уровня, у VIP вместо уровня — rank:§aVIP.
// Чат (chat/chat.js) показывает все теги rank: в квадратных скобках, поэтому чужие префиксы уровня
// (после повышения, ребитха, покупки VIP) снимаются. Свои префиксы игрока (!prefix) не трогаются.
// Раз в секунду.

import { world } from '@minecraft/server';
import { getScore, isVip, MAX_LEVEL } from '../../DataBase.js';

export const VIP_RANK = 'rank:§aVIP';
const LEVEL_GLYPH = '\ue153';
const CHECK_TICKS = 20;

/** Служебный префикс: уровень (и старый, без значка) или VIP. Их не показывает и не снимает !prefix. */
export const LEVEL_RANK_RE = /^rank:(§r\d+\ue153?|§aVIP)$/;

/** Какой префикс должен быть у игрока: VIP, уровень 1–40 или никакого (нет уровня). */
export function rankTagOf(player) {
	if (isVip(player)) return VIP_RANK;
	const level = getScore(player, 'lvl');
	if (level < 1 || level > MAX_LEVEL) return undefined;
	return `rank:§r${level}${LEVEL_GLYPH}`;
}

/** Поставить нужный префикс и снять остальные служебные. */
export function updateRank(player) {
	const wanted = rankTagOf(player);
	for (const tag of player.getTags()) {
		if (tag !== wanted && LEVEL_RANK_RE.test(tag)) player.removeTag(tag);
	}
	if (wanted && !player.hasTag(wanted)) player.addTag(wanted);
}

let tick = 0;
world.events.tick.subscribe(() => {
	if (++tick % CHECK_TICKS !== 0) return;
	for (const player of world.getPlayers()) updateRank(player);
});
