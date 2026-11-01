// --- Лавка странствующего торговца (VIP-остров, домик x −84…−74, z −58…−54) ---
// Под каждым товаром в рамке — кнопка (y 1). Нажал — скрипт знает, кто нажал. Покупать могут только VIP (тег player:vip),
// цена — в VIP-коинах. Предметы — готовые структуры structures/trader/<товар>.mcstructure (предметы, лежащие на земле):
// /structure load ставит их у ног покупателя, Спешку — /effect. Только структура сохраняет всё сразу: зачарования сверх
// ванильного максимума (loot table их срезает), CanDestroy и keep_on_death у кирок, проклятия в наборах.
// Античит знает VIP-предметы по названию (VIP_ITEMS в system/anticheat.js); у наборов чары ванильные — записи не нужно.
// Набору нужно столько свободных слотов, сколько в нём вещей (slots).

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

/** Выдать товар: структура с предметами у ног игрока (только сущности — блоки вокруг не трогаются). */
export const structureCommand = (id) => `structure load "trader:${id}" ~ ~ ~ 0_degrees none true false`;

/** Товар у кнопки в этой точке. */
export const productAt = ({ x, y, z }) => PRODUCTS.find(p => p.pos[0] === x && p.pos[1] === y && p.pos[2] === z);

function freeSlots(player) {
	try { return player.getComponent('inventory').container.emptySlotsCount; } catch { return 0; }
}

// Покупка, которая ждёт выдачи товара: повторное нажатие до её конца не покупает второй раз
const pending = new Set();

/**
 * Покупка: проверки, затем выдача товара; коины списываются только после удачной выдачи
 * (структура не загрузилась — коины остаются, игроку сообщение об ошибке).
 * @returns {string} итог проверок: 'ok' (выдача начата) | 'vip' | 'coins' | 'full' | 'busy'
 */
export function buy(player, product) {
	if (pending.has(player.name)) return 'busy';
	if (!isVip(player)) { tell(player, 'chat.trader.error.vip'); return 'vip'; }
	if (getScore(player, 'vip_coins') < product.price) { tell(player, 'chat.shop.cosmetics.error.no_coins'); return 'coins'; }
	const slots = product.effect ? 0 : product.slots ?? 1;
	if (freeSlots(player) < slots) {
		if (slots > 1) tell(player, 'chat.trader.error.full_kit', String(slots));
		else tell(player, 'chat.trader.error.full');
		return 'full';
	}
	pending.add(player.name);
	run(player, product.effect ?? structureCommand(product.id)).then((result) => {
		pending.delete(player.name);
		if (!result) { tell(player, 'chat.trader.error.give'); return; }
		run(player, `scoreboard players remove @s vip_coins ${product.price}`);
		tell(player, 'chat.trader.bought', { translate: `trader.item.${product.id}` }, String(product.price));
		// Для достижений «У торговца» и «Коллекционер голов» (system/achievements.js)
		player.addTag('stat:trader');
		if (TRADER_HEADS.includes(product.id)) player.addTag(`stat:head:${product.id}`);
		run(player, 'playsound random.levelup @s ~ ~ ~ 0.6 1.2');
	});
	return 'ok';
}

world.events.buttonPush.subscribe((e) => {
	const player = e.source;
	if (player?.typeId !== 'minecraft:player') return;
	const product = productAt(e.block.location);
	if (product) buy(player, product);
});
