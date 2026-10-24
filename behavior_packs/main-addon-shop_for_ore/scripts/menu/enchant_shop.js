// --- Магазин → Зачарования ---
// Один экран выбора: кирка уровня и каждый подходящий предмет инвентаря (меч, лук, броня).
// Меню открывается предметом server:menu, поэтому «в руке» всегда само меню: предмет выбирается из инвентаря.
// Надетая броня в 1.19.50 скриптам недоступна — её надо снять в инвентарь.
// Предметы: покупка повышает уровень одного зачарования на 1 (до ванильного максимума — чтобы античит
// не посчитал предмет читерским). Цена уровня = базовая цена × новый уровень.
// Кирка уровня: «Эффективность» и «Удача» хранятся в табло и накладываются в timers/t20; покупка — прежние
// функции shop/enchants/*, цены и максимумы — там же (здесь только для показа).

import { MinecraftEnchantmentTypes, Enchantment } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { getScore, metricNumbers, rawTranslateRich, run, closedByPlayer } from '../DataBase.js';

// id — ключ в MinecraftEnchantmentTypes, name — ванильный ключ перевода (переводится на языке игрока)
export const ITEM_ENCHANTS = [
	{ id: 'sharpness', name: 'enchantment.damage.all', max: 5, price: 5000 },
	{ id: 'fireAspect', name: 'enchantment.fire', max: 2, price: 8000 },
	{ id: 'knockback', name: 'enchantment.knockback', max: 2, price: 4000 },
	{ id: 'protection', name: 'enchantment.protect.all', max: 4, price: 5000 },
	{ id: 'thorns', name: 'enchantment.thorns', max: 3, price: 6000 },
	{ id: 'featherFalling', name: 'enchantment.protect.fall', max: 4, price: 3000 },
	{ id: 'power', name: 'enchantment.arrowDamage', max: 5, price: 4000 },
	{ id: 'punch', name: 'enchantment.arrowKnockback', max: 2, price: 4000 },
	{ id: 'infinity', name: 'enchantment.arrowInfinite', max: 1, price: 30000 },
	{ id: 'unbreaking', name: 'enchantment.durability', max: 3, price: 4000 },
	{ id: 'mending', name: 'enchantment.mending', max: 1, price: 40000 }
];

export const priceFor = (e, level) => e.price * level;

/** Предмет в слоте инвентаря: { container, item } или undefined. */
function itemAt(player, slot) {
	const container = player.getComponent('inventory').container;
	const item = container.getItem(slot);
	return item ? { container, item } : undefined;
}

/** Предметы инвентаря, которые можно зачаровать здесь: [{ slot, item }]. */
export function enchantableItems(player) {
	const container = player.getComponent('inventory').container;
	const out = [];
	for (let slot = 0; slot < container.size; slot++) {
		const item = container.getItem(slot);
		if (item && optionsFor(item).length) out.push({ slot, item });
	}
	return out;
}

const shortId = (typeId) => typeId.replace('minecraft:', '');
// Иконка предмета: textures/items/<id>, у золотых и деревянных в ванили другие имена файлов
const itemIcon = (typeId) => `textures/items/${shortId(typeId).replace(/^golden_/, 'gold_').replace(/^wooden_/, 'wood_').replace(/^bow$/, 'bow_standby')}`;

/**
 * Что можно купить для предмета: [{ e, level (текущий), next (или undefined, если максимум) }].
 * Пустой список — предмет не зачаровывается (или это кирка уровня).
 */
export function optionsFor(item) {
	if (!item || item.typeId.endsWith('_pickaxe')) return [];
	const comp = item.getComponent('enchantments');
	if (!comp) return [];
	const list = comp.enchantments;
	const out = [];
	for (const e of ITEM_ENCHANTS) {
		const type = MinecraftEnchantmentTypes[e.id];
		const level = list.hasEnchantment(type);
		if (level > 0) out.push({ e, level, next: level >= e.max ? undefined : level + 1 });
		else if (list.canAddEnchantment(new Enchantment(type, 1))) out.push({ e, level: 0, next: 1 });
	}
	return out;
}

/** Купить следующий уровень. @returns {boolean} куплено */
export function buyEnchant(player, slot, typeId, enchantId) {
	const held = itemAt(player, slot);
	// Пока окно было открыто, предмет в этом слоте сменили или переложили — ничего не делаем
	if (!held || held.item.typeId !== typeId) {
		run(player, 'tellraw @s {"rawtext":[{"translate":"chat.shop.item_enchant.error.changed"}]}');
		return false;
	}
	const opt = optionsFor(held.item).find(o => o.e.id === enchantId);
	if (!opt) return false;
	if (opt.next === undefined) {
		run(player, 'tellraw @s {"rawtext":[{"translate":"chat.shop.error.enchant_max"}]}');
		return false;
	}
	const price = priceFor(opt.e, opt.next);
	if (getScore(player, 'money') < price) {
		run(player, 'tellraw @s {"rawtext":[{"translate":"chat.error.no_money"}]}');
		return false;
	}
	const comp = held.item.getComponent('enchantments');
	const list = comp.enchantments;
	const type = MinecraftEnchantmentTypes[opt.e.id];
	if (opt.level > 0) list.removeEnchantment(type);
	if (!list.addEnchantment(new Enchantment(type, opt.next))) return false;
	comp.enchantments = list;
	held.container.setItem(slot, held.item);
	run(player, `scoreboard players remove @s money ${price}`);
	run(player, `tellraw @s ${rawTranslateRich('chat.shop.item_enchant.done', { translate: opt.e.name }, { translate: `enchantment.level.${opt.next}` }, String(price))}`);
	return true;
}

// Кирка уровня: табло, функция покупки, максимум и цена (как в functions/shop/enchants/*), ванильное название
export const PICKAXE_ENCHANTS = [
	{ id: 'efficiency', name: 'enchantment.digging', max: 5, price: 25000 },
	{ id: 'fortune', name: 'enchantment.lootBonusDigger', max: 3, price: 10000 }
];

const coin = (n) => `§8${metricNumbers(n)} \ue152`;
const levelText = (name, level) => `%${name} %enchantment.level.${level}`;
const buyButton = (name, current, max, price) => current >= max
	? `${levelText(name, current)}\n%menu.shop.item_enchants.max`
	: `${levelText(name, current + 1)}\n${coin(price)}`;

/** Магазин → Зачарования: что зачаровать. back — в Магазин. */
export function enchantsMenu(player, back) {
	const items = enchantableItems(player);
	const pick = PICKAXE_ENCHANTS.map(e => `%${e.name} §8${Math.min(getScore(player, e.id), e.max)}/${e.max}`).join(' §8· ');
	const form = new ActionFormData()
		.title('%menu.shop.enchants.title')
		.body('%menu.shop.enchants.body\n%menu.shop.enchants.body2')
		.button(`%menu.shop.enchants.button.pickaxe\n${pick}`, 'textures/items/diamond_pickaxe');
	for (const { item } of items) form.button(`%item.${shortId(item.typeId)}.name\n${currentEnchantsText(item, 2)}`, itemIcon(item.typeId));
	form.button('%menu.common.back');
	form.show(player).then(r => {
		if (closedByPlayer(r) || r.selection === items.length + 1) return back();
		if (r.selection === 0) return pickaxeMenu(player, () => enchantsMenu(player, back));
		const chosen = items[(r.selection ?? 0) - 1];
		if (chosen) itemEnchantMenu(player, chosen.slot, () => enchantsMenu(player, back));
	});
}

/** Текущие зачарования предмета из каталога: «Острота II, Прочность I» (не больше limit, дальше «…»). */
function currentEnchantsText(item, limit = 99) {
	const list = item.getComponent('enchantments')?.enchantments;
	if (!list) return '%menu.shop.item_enchants.none';
	const have = ITEM_ENCHANTS.map(e => [e, list.hasEnchantment(MinecraftEnchantmentTypes[e.id])]).filter(([, l]) => l > 0);
	if (!have.length) return '%menu.shop.item_enchants.none';
	// Без §-кода прямо перед %ключом: так ключ точно переводится (цвет — из строки вокруг)
	const parts = have.slice(0, limit).map(([e, l]) => levelText(e.name, l));
	return parts.join(', ') + (have.length > limit ? ' …' : '');
}

/** Экран кирки уровня. back — к выбору. */
function pickaxeMenu(player, back) {
	const form = new ActionFormData()
		.title('%menu.shop.enchants.pickaxe.title')
		.body('%menu.shop.enchants.pickaxe.body');
	for (const e of PICKAXE_ENCHANTS) form.button(buyButton(e.name, getScore(player, e.id), e.max, e.price), 'textures/items/book_enchanted');
	form.button('%menu.common.back');
	form.show(player).then(r => {
		if (closedByPlayer(r) || r.selection === PICKAXE_ENCHANTS.length) return back();
		const e = PICKAXE_ENCHANTS[r.selection];
		if (!e) return;
		// Покупка — прежней функцией (проверки денег и максимума, сообщения); окно — снова, уже с новым уровнем
		run(player, `function shop/enchants/${e.id}`).then(() => pickaxeMenu(player, back));
	});
}

/** Зачарования для предмета в слоте. back — к выбору. */
function itemEnchantMenu(player, slot, back) {
	const held = itemAt(player, slot);
	const options = held ? optionsFor(held.item) : [];
	if (!options.length) return back();
	const typeId = held.item.typeId;
	const form = new ActionFormData()
		.title('%menu.shop.item_enchants.title')
		.body(`%menu.shop.item_enchants.item %item.${shortId(typeId)}.name\n%menu.shop.item_enchants.current ${currentEnchantsText(held.item)}\n\n%menu.shop.item_enchants.body`);
	for (const o of options) form.button(buyButton(o.e.name, o.level, o.e.max, priceFor(o.e, Math.min(o.level + 1, o.e.max))), 'textures/items/book_enchanted');
	form.button('%menu.common.back');
	form.show(player).then(r => {
		if (closedByPlayer(r) || r.selection === options.length) return back();
		const o = options[r.selection];
		if (!o) return;
		// После покупки окно открывается снова — удобно поднять несколько уровней подряд
		if (buyEnchant(player, slot, typeId, o.e.id)) itemEnchantMenu(player, slot, back);
	});
}
