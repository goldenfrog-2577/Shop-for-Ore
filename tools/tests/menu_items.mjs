import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url);
// These items must be exposed to the client as well as constructible through ItemStack.
for (const [file, category] of [
	['menu/menu', 'items'],
	['admin_tools/admin_menu', 'items'],
	['admin_tools/admin_stick', 'equipment'],
	['weapons/portable_ender_crystal', 'equipment']
]) {
	const definition = JSON.parse(fs.readFileSync(new URL('items/' + file + '.json', bp), 'utf8'))['minecraft:item'];
	const menu = definition.description.menu_category;
	assert.equal(menu?.category, category, definition.description.identifier);
	assert.equal(menu.is_hidden_in_commands, false, definition.description.identifier);
}
const source = fs.readFileSync(new URL('scripts/menu/main_menu.js', bp), 'utf8');
const slots = Array(36);
const inventory = {
	size: slots.length,
	getItem: slot => slots[slot],
	setItem: (slot, item) => { slots[slot] = item; },
	moveItem(from, to) {
		assert.equal(slots[to], undefined);
		slots[to] = slots[from];
		slots[from] = undefined;
	},
	swapItems(from, to) { [slots[from], slots[to]] = [slots[to], slots[from]]; }
};
class ItemStack {
	constructor(typeId) { this.typeId = typeId; }
}
const player = { id: 'miner', isValid: true, hasTag: () => false, getComponent: () => ({ container: inventory }) };
const listeners = {};
const callbacks = ['playerSpawn', 'playerLeave', 'playerInventoryItemChange'];
const afterEvents = Object.fromEntries(callbacks.map(event => [event, {
	subscribe(callback) { listeners[event] = callback; }
}]));
let poll;
const context = {
	world: { afterEvents, getAllPlayers: () => [player] },
	system: { runInterval(callback, ticks) { assert.equal(ticks, 20); poll = callback; } },
	ItemStack, ItemLockMode: { slot: 'slot' }, isBot: () => false, hasRole: () => player.staff,
	tell() {}, RULES_COUNT: 1
};
vm.runInNewContext(source.replace(/^import .*$/gm, '').replace(/^export /gm, ''), context);
const server = 'server:menu', admin = 'server:admin_menu';
listeners.playerSpawn({ player });
assert.equal(slots[8].typeId, server);
assert.ok(slots[8].keepOnDeath);
assert.equal(slots[7], undefined);

const valuable = new ItemStack('minecraft:diamond');
valuable.nameTag = 'Keep this stack';
slots[7] = valuable;
player.staff = true;
poll();
assert.equal(slots[7].typeId, admin);
assert.equal(slots[7].lockMode, 'slot');
assert.ok(slots[7].keepOnDeath);
assert.ok(slots.includes(valuable));

slots[15] = new ItemStack(admin);
player.staff = false;
poll();
assert.ok(!slots.some(stack => stack?.typeId === admin));
slots[16] = new ItemStack(admin);
listeners.playerInventoryItemChange({ player, itemStack: slots[16] });
poll();
assert.equal(slots[16], undefined);

for (let i = 0; i < slots.length; i++) if (!slots[i]) slots[i] = new ItemStack('minecraft:stone');
const occupied = slots[7];
player.staff = true;
poll();
assert.equal(slots[7], occupied);
slots[20] = undefined;
poll();
assert.equal(slots[7].typeId, admin);
assert.equal(slots[20], occupied);

// Earlier saves could have the menu unlocked elsewhere, even in a full inventory.
[slots[7], slots[20]] = [slots[20], slots[7]];
slots[20].lockMode = 'none';
poll();
assert.equal(slots[7].lockMode, 'slot');
assert.equal(slots[20], occupied);
assert.equal(slots.filter(i => i?.typeId === admin).length, 1);
