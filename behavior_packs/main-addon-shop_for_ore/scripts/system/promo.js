// --- Промокоды (Меню сервера → Промокоды) ---
// Каждый промокод — один раз на игрока: введённый отмечается тегом promo:<код> (строчными) и переживает ребитх;
// вайп снимает отметки (system/wipe.js). Регистр при вводе не важен.
// Условия: minLevel — с какого уровня, vip — только VIP. Награда — как у достижений: money, vip_coins, xp,
// items: [[id, количество], …] (название предмета — ключ ach.item.<id> в .lang).
// До 0.3.0 отметки хранились в табло promo1…promo4 — migrateLegacyPromos переносит их в теги при входе игрока.

import { getScore, isVip, run, rawTranslateRich, tell } from '../DataBase.js';
import { rewardText } from './achievements.js';

export const PROMO_TAG = 'promo:';

export const PROMOCODES = [
	// Стартовые: на табличке у спавна и на финише паркура
	{ code: 'kapycta', reward: { xp: 500 } },
	{ code: 'parkour', reward: { money: 500 } },
	{ code: 'sweetHome', reward: { money: 1000 } },
	{ code: 'pvpFighter', reward: { items: [['golden_apple', 4]] } },
	{ code: 'tir', reward: { items: [['bow', 1], ['arrow', 16]] } },
	// По уровню и VIP
	{ code: 'hellbonus', minLevel: 16, reward: { xp: 25000 } },
	{ code: 'cavebonus', minLevel: 26, reward: { xp: 50000 } },
	{ code: 'VIPbonus', vip: true, reward: { vip_coins: 100 } }
];

// Табло до 0.3.0 → промокод
export const LEGACY_PROMOS = { promo1: 'kapycta', promo2: 'parkour', promo3: 'hellbonus', promo4: 'VIPbonus' };

const tagOf = (promo) => PROMO_TAG + promo.code.toLowerCase();
/** Промокод по введённому тексту (без учёта регистра и пробелов по краям) или undefined. */
export const findPromo = (text) => PROMOCODES.find(p => p.code.toLowerCase() === String(text ?? '').trim().toLowerCase());
/** Игрок уже вводил этот промокод. */
export const usedPromo = (player, promo) => player.hasTag(tagOf(promo));

function giveReward(player, reward) {
	if (reward.money) run(player, `scoreboard players add @s money ${reward.money}`);
	if (reward.vip_coins) run(player, `scoreboard players add @s vip_coins ${reward.vip_coins}`);
	if (reward.xp) run(player, `scoreboard players add @s xp ${reward.xp}`);
	for (const [id, n] of reward.items ?? []) run(player, `give @s ${id} ${n}`);
}

/**
 * Ввести промокод. Ошибки — игроку в чат, успех — всем.
 * @returns {'ok'|'invalid'|'used'|'level'|'vip'}
 */
export function redeemPromo(player, text) {
	const promo = findPromo(text);
	if (!promo) { tell(player, 'chat.promo.error.invalid'); return 'invalid'; }
	if (usedPromo(player, promo)) { tell(player, 'chat.promo.error.used'); return 'used'; }
	if (promo.vip && !isVip(player)) { tell(player, 'chat.promo.error.vip'); return 'vip'; }
	if (promo.minLevel && getScore(player, 'lvl') < promo.minLevel) {
		tell(player, 'chat.promo.error.level', String(promo.minLevel));
		return 'level';
	}
	// Сначала отметка, потом награда: второй ввод того же кода уже не пройдёт
	player.addTag(tagOf(promo));
	giveReward(player, promo.reward);
	run(player, `tellraw @a ${rawTranslateRich('chat.promo.reward', player.name, { rawtext: rewardText(promo.reward) })}`);
	run(player, 'playsound random.levelup @s');
	return 'ok';
}

/**
 * Перенести отметки из табло promo1…promo4 в теги (раз в секунду, system/migrate.js). Счёт после переноса
 * сбрасывается — табло больше ничем не заполняются, и когда все игроки зайдут хотя бы раз, их можно удалить.
 * @returns {number} сколько отметок перенесено
 */
export function migrateLegacyPromos(player) {
	let n = 0;
	for (const [objective, code] of Object.entries(LEGACY_PROMOS)) {
		if (getScore(player, objective) < 1) continue;
		player.addTag(PROMO_TAG + code.toLowerCase());
		run(player, `scoreboard players reset @s ${objective}`);
		n++;
	}
	return n;
}
