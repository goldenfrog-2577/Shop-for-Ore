import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url);
const read = file => fs.readFileSync(new URL(file, bp), 'utf8');
const local = file => read('scripts/' + file).replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
class ItemStack {
	constructor(typeId, amount) { Object.assign(this, { typeId, amount }); }
}
const coin = amount => new ItemStack('minecraft:gold_ingot', amount);
const other = () => new ItemStack('minecraft:stone', 64);
let balance, recipientBalance, slots, errors, commandHook, rejectSlot, menu, modalForm, confirmation;
const tags = new Set();
const container = {
	get size() { return slots.length; },
	getItem(slot) { const item = slots[slot]; return item && Object.assign(new ItemStack(), item); },
	setItem(slot, item) {
		if (slot === rejectSlot) { rejectSlot = undefined; throw Error('Inventory access failed'); }
		slots[slot] = item?.amount ? Object.assign(new ItemStack(), item) : undefined;
	}
};
const player = { name: 'Miner', addTag: tag => tags.add(tag), getComponent: () => ({ container }) };
const fakeBot = { name: 'Bot', bot: true };
const recipient = { name: 'Friend' };
let players = [player, fakeBot];
const context = {
	RULES_COUNT: 1,
	world: { events: { beforeItemUse: { subscribe() {} } }, getPlayers: () => players.values() },
	Items: { get: id => id }, ItemStack,
	getScore: p => p === player ? balance : recipientBalance, isPending: p => !!p.pending, isBot: p => !!p.bot,
	findPlayer: name => players.find(p => p.name === name),
	rawTranslate: (key, ...args) => JSON.stringify({ key, args }),
	tell: (p, key, ...args) => { errors.push([key, ...args]); },
	async run(p, command) {
		if (command.startsWith('playsound ')) return;
		if (commandHook && await commandHook(command, p) === false) return;
		const [, lower, upper, action, amount] = /^execute if score @s money matches (\d*)\.\.(\d*) run scoreboard players (add|remove) @s money (\d+)$/.exec(command);
		const score = p === player ? balance : recipientBalance;
		if ((lower && score < Number(lower)) || (upper && score > Number(upper))) return { successCount: 0 };
		const changed = score + Number(amount) * (action === 'add' ? 1 : -1);
		if (p === player) balance = changed;
		else recipientBalance = changed;
		return { successCount: 1 };
	},
	showMenu(p, title, body, items) { menu = { title, body: body(), items }; },
	modal: title => ({ title, textField() { return this; }, dropdown() { return this; } }),
	showModal(p, form, submit, back) { modalForm = { form, submit, back }; },
	confirm(p, title, body, yes, no) { confirmation = { title, body, yes, no }; },
	backButton: run => ({ text: 'back', run })
};
const economy = read('scripts/utils.js').split('// ======== Деньги:')[1].split('// ======== Роли:')[0];
vm.runInNewContext(economy.slice(economy.indexOf('/**')).replace(/^export /gm, ''), context);
vm.runInNewContext(local('system/economy/bank.js'), context);
vm.runInNewContext(local('menu/main_menu.js'), context);
const { inventoryCoins, exchangeCoins, bank } = context;
const reset = (money, items) => { balance = money; slots = items; errors = []; commandHook = undefined; rejectSlot = undefined; };
const total = () => [balance, inventoryCoins(player)];
const lastKey = () => errors.at(-1)?.[0];
const bankClick = id => menu.items.find(i => i.text.endsWith('.' + id)).run();

reset(10, [coin(2), other(), coin(4), undefined]);
bank(player);
assert.ok(menu.body.startsWith('%menu.bank.welcome\n\n%menu.bank.description\n\n'));
assert.match(menu.body, /balance §e10[^\n]*\n%menu\.bank\.inventory §e6/);
assert.deepEqual(Array.from(menu.items, i => i.text), ['%menu.bank.deposit', '%menu.bank.withdraw', '%menu.bank.transfer', 'back']);
assert.ok(menu.items.slice(0, 3).every(i => i.icon));
bankClick('transfer');
assert.equal(lastKey(), 'chat.bank.error.no_players');
bankClick('deposit');
modalForm.submit(['5']);
assert.equal(confirmation.body, '%menu.bank.deposit.confirm §e5 §r\ue152§7?');
assert.deepEqual(total(), [10, 6]);
await confirmation.yes();
assert.deepEqual(total(), [15, 1]);
assert.equal(lastKey(), 'chat.bank.deposit.done');
bankClick('withdraw');
modalForm.submit(['15']);
assert.equal(confirmation.body, '%menu.bank.withdraw.confirm §e15 §r\ue152§7?');
await exchangeCoins(player, '15', false);
assert.deepEqual(total(), [0, 16]);
assert.equal(lastKey(), 'chat.bank.withdraw.done');
assert.equal(slots[1].typeId, 'minecraft:stone');

reset(100, [coin(63), other()]);
await exchangeCoins(player, '2', false);
assert.deepEqual(total(), [100, 63]);
assert.equal(lastKey(), 'chat.bank.error.no_space');
await exchangeCoins(player, '1', false);
assert.deepEqual(total(), [99, 64]);
await exchangeCoins(player, '65', true);
assert.equal(lastKey(), 'chat.bank.error.no_coins');
await exchangeCoins(player, '100', false);
assert.equal(lastKey(), 'chat.error.no_money');
await exchangeCoins(player, '1.5', true);
assert.equal(lastKey(), 'chat.cmd.error.number');

reset(2147483646, [coin(8)]);
await exchangeCoins(player, '2', true);
assert.deepEqual(total(), [2147483646, 8]);
assert.equal(lastKey(), 'chat.bank.error.balance_limit');
reset(5, [coin(8), undefined]);
commandHook = async () => false;
await exchangeCoins(player, '8', true);
assert.deepEqual(total(), [5, 8], 'failed credit restores physical coins');
assert.equal(lastKey(), 'chat.bank.error.exchange');

reset(8, [coin(1), undefined]);
commandHook = async command => { if (command.includes('remove')) slots = [other(), other()]; };
await exchangeCoins(player, '8', false);
assert.deepEqual(total(), [8, 0], 'inventory changed after debit, restore money');
assert.equal(lastKey(), 'chat.bank.error.exchange');

reset(80, [coin(62), undefined]);
rejectSlot = 1;
await exchangeCoins(player, '66', false);
assert.deepEqual(total(), [80, 62], 'partial item write rolls back and balance is refunded');

reset(5, [coin(8), undefined]);
const first = exchangeCoins(player, '5', true);
await exchangeCoins(player, '5', true);
assert.equal(lastKey(), 'chat.bank.error.busy');
await first;
assert.deepEqual(total(), [10, 3]);
const waitTransfer = () => new Promise(resolve => setImmediate(resolve));
players = [player, fakeBot, recipient];
reset(10, [undefined]);
recipientBalance = 3;
bank(player);
bankClick('transfer');
modalForm.submit([0, '7']);
await waitTransfer();
assert.deepEqual([balance, recipientBalance], [3, 10]);
assert.ok(tags.has('stat:paid'));

reset(10, [undefined]);
recipientBalance = 0;
commandHook = async (command, actor) => actor !== recipient;
context.transferMoney(player, 'Friend', '7');
await waitTransfer();
assert.deepEqual([balance, recipientBalance], [10, 0], 'failed credit refunds the sender');

reset(10, [undefined]);
recipientBalance = 0;
context.transferMoney(player, 'Friend', '7');
await exchangeCoins(player, '7', false);
await waitTransfer();
assert.deepEqual([balance, recipientBalance, inventoryCoins(player)], [3, 7, 0], 'a withdrawal cannot repeat a pending debit');
assert.doesNotMatch(read('functions/system/autosale.mcfunction'), /gold_ingot/);
assert.match(read('functions/timers/ticks_40.mcfunction'), /structure load "gold_1"/);
assert.match(read('functions/timers/ticks_80.mcfunction'), /structure load "gold_2"/);
console.log('PASS: Bank menu, 1:1 exchange, invalid inputs, inventory capacity, rollback, duplicate request and coin rain.');
