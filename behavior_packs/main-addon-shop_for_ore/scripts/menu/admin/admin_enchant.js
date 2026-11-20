// Зачарование предмета из инвентаря без магазина; доступны только персоналу с правами администратора.
import { EnchantmentTypes } from '@minecraft/server';
import { hasRole, tell } from '../../utils.js';
import { showMenu, showModal, modal, backButton } from '../common/forms.js';
import { ITEM_ENCHANTS, PICKAXE_ENCHANTS, nameKey } from '../enchant_shop.js';

const EXTRA = [
	['aqua_affinity', 'enchantment.waterWorker', 1], ['respiration', 'enchantment.oxygen', 3],
	['depth_strider', 'enchantment.waterWalker', 3], ['frost_walker', 'enchantment.frostwalker', 2],
	['soul_speed', 'enchantment.soul_speed', 3], ['swift_sneak', 'enchantment.swift_sneak', 3],
	['smite', 'enchantment.damage.undead', 5], ['bane_of_arthropods', 'enchantment.damage.arthropods', 5],
	['looting', 'enchantment.lootBonus', 3], ['silk_touch', 'enchantment.untouching', 1],
	['flame', 'enchantment.arrowFire', 1], ['luck_of_the_sea', 'enchantment.lootBonusFishing', 3], ['lure', 'enchantment.fishingSpeed', 3],
	['binding', 'enchantment.curse.binding', 1], ['vanishing', 'enchantment.curse.vanishing', 1]
];
const CATALOG = [...ITEM_ENCHANTS, ...PICKAXE_ENCHANTS, ...EXTRA.map(([id,name,max]) => ({id,name,max}))];
const inventory = p => p.getComponent('inventory').container;
export function adminEnchantOptions(item) {
	const list = item?.getComponent('minecraft:enchantable');
	if (!list) return [];
	return CATALOG.filter(e => {
		const type = EnchantmentTypes.get('minecraft:' + e.id);
		if (!type) return false;
		try { return list.hasEnchantment(type) || list.canAddEnchantment({ type, level: 1 }); } catch { return false; }
	});
}
export function applyAdminEnchant(player, slot, expectedType, enchantId, rawLevel) {
	if (!hasRole(player, 'admin')) return tell(player, 'chat.cmd.error.no_permission');
	const container = inventory(player), item = container.getItem(slot);
	if (!item || item.typeId !== expectedType) return tell(player, 'chat.shop.item_enchant.error.changed');
	const e = adminEnchantOptions(item).find(e => e.id === enchantId), level = Number(rawLevel);
	if (!e || !Number.isInteger(level) || level < 0 || level > e.max) return tell(player, 'chat.admin.enchant.error');
	try {
		const list = item.getComponent('minecraft:enchantable');
		const type = EnchantmentTypes.get('minecraft:' + e.id);
		if (!type) return tell(player, 'chat.admin.enchant.error');
		if (list.hasEnchantment(type)) list.removeEnchantment(type);
		if (level > 0) list.addEnchantment({ type, level });
		container.setItem(slot, item);
		tell(player, 'chat.admin.enchant.done');
	} catch { tell(player, 'chat.admin.enchant.error'); }
}
export function adminEnchantMenu(player, back) {
	if (!hasRole(player, 'admin')) return tell(player, 'chat.cmd.error.no_permission');
	const container = inventory(player), items = [];
	for (let slot = 0; slot < container.size; slot++) {
		const item = container.getItem(slot);
		if (!adminEnchantOptions(item).length) continue;
		items.push({ text: `${item.nameTag || '%' + nameKey(item.typeId)}\n§r%admin.enchant.slot ${slot + 1}`, icon: 'textures/items/book_enchanted', run: () => choose(player, slot, item.typeId, () => adminEnchantMenu(player, back)) });
	}
	showMenu(player, '%admin.enchant.title', items.length ? '%admin.enchant.body' : '%admin.enchant.empty', [...items, backButton(back)], back);
}
function choose(player, slot, typeId, back) {
	const item = inventory(player).getItem(slot);
	if (!item || item.typeId !== typeId) return tell(player, 'chat.shop.item_enchant.error.changed');
	const options = adminEnchantOptions(item);
	const form = modal('%admin.enchant.title').dropdown('%admin.enchant.choose', options.map(e => '%' + e.name + ' §f(0–' + e.max + ')'), { defaultValueIndex: 0 })
		.textField('%admin.enchant.level', '1', { defaultValue: '1' });
	showModal(player, form, ([i,level]) => applyAdminEnchant(player, slot, typeId, options[i]?.id, level), back);
}
