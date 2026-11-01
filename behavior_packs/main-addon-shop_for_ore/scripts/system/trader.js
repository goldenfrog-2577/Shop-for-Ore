// --- Лавка странствующего торговца (VIP-остров, домик x −84…−74, z −58…−54) ---
// Под каждым товаром в рамке — кнопка (y 1). Нажал — скрипт знает, кто нажал. Покупать могут только VIP (тег player:vip),
// цена — в VIP-коинах. Предметы выдаёт /loot give из loot_tables/shop/trader, Спешку — /effect. Название, тип головы и зачарования сверх максимума задаёт loot table;
// античит знает эти предметы по названию (VIP_ITEMS в system/anticheat.js). Наборы брони (Защита IV, меч с Остротой V) — ванильный
// максимум, отдельной записи в античите не нужно; им нужно столько свободных слотов, сколько в наборе вещей (slots).

import { world } from '@minecraft/server';
import { getScore, isVip, run, tell } from '../DataBase.js';
import { TRADER_HEADS } from './achievements.js';

/** Товары: кнопка (x, y, z) → id, цена, что выдать. */
export const PRODUCTS = [
	{ pos: [-84, 1, -58], id: 'wither_skull', price: 384 },
	{ pos: [-82, 1, -58], id: 'dragon_head', price: 384 },
	{ pos: [-80, 1, -58], id: 'creeper_head', price: 384 },
	{ pos: [-78, 1, -58], id: 'pickaxe_3', price: 1728 },
	{ pos: [-76, 1, -58], id: 'pickaxe_2', price: 1152 },
	{ pos: [-74, 1, -58], id: 'pickaxe_1', price: 640 },
	{ pos: [-84, 1, -54], id: 'skeleton_skull', price: 384 },
	{ pos: [-82, 1, -54], id: 'zombie_head', price: 384 },
	{ pos: [-80, 1, -54], id: 'player_head', price: 384 },
	{ pos: [-78, 1, -54], id: 'haste', price: 512, effect: 'effect @s haste 1800 4 true' },
	// На месте бывших «Удачи III» и «Эффективности V» (они — в Магазине → Зачарования): 4 вещи брони + меч
	{ pos: [-76, 1, -54], id: 'kit_diamond', price: 768, slots: 5 },
	{ pos: [-74, 1, -54], id: 'kit_netherite', price: 1152, slots: 5 }
];

/** Товар у кнопки в этой точке. */
export const productAt = ({ x, y, z }) => PRODUCTS.find(p => p.pos[0] === x && p.pos[1] === y && p.pos[2] === z);

function freeSlots(player) {
	try { return player.getComponent('inventory').container.emptySlotsCount; } catch { return 0; }
}

/**
 * Покупка. @returns {string} итог: 'ok' | 'vip' | 'coins' | 'full'
 */
export function buy(player, product) {
	if (!isVip(player)) { tell(player, 'chat.trader.error.vip'); return 'vip'; }
	if (getScore(player, 'vip_coins') < product.price) { tell(player, 'chat.shop.cosmetics.error.no_coins'); return 'coins'; }
	const slots = product.effect ? 0 : product.slots ?? 1;
	if (freeSlots(player) < slots) {
		if (slots > 1) tell(player, 'chat.trader.error.full_kit', String(slots));
		else tell(player, 'chat.trader.error.full');
		return 'full';
	}
	run(player, `scoreboard players remove @s vip_coins ${product.price}`);
	run(player, product.effect ?? `loot give @s loot "shop/trader/${product.id}"`);
	tell(player, 'chat.trader.bought', { translate: `trader.item.${product.id}` }, String(product.price));
	// Для достижений «У торговца» и «Коллекционер голов» (system/achievements.js)
	player.addTag('stat:trader');
	if (TRADER_HEADS.includes(product.id)) player.addTag(`stat:head:${product.id}`);
	run(player, 'playsound random.levelup @s ~ ~ ~ 0.6 1.2');
	return 'ok';
}

world.events.buttonPush.subscribe((e) => {
	const player = e.source;
	if (player?.typeId !== 'minecraft:player') return;
	const product = productAt(e.block.location);
	if (product) buy(player, product);
});
