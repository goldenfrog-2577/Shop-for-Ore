// Проверяем старые страницы банов на 26.60 и отказ при переполнении без частичной записи.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const url = new URL('../../behavior_packs/main-addon-shop_for_ore/scripts/system/security/ban.js', import.meta.url);
const source = fs.readFileSync(url, 'utf8').replace(/^import .*;$/gm, '').replace(/^export /gm, '');
const properties = new Map();
const legacy = [{ id: 'p1', names: ['tester'], by: 'Owner', reason: 'old', t: 1, until: 0 }];
properties.set('shop:bans0', JSON.stringify(legacy));
const context = {
	world: { afterEvents: { playerSpawn: { subscribe() {} } },
		getDynamicProperty: k => properties.get(k),
		setDynamicProperty: (k, v) => { assert(v.length <= 1000); properties.set(k, v); } },
	system: { runInterval() {} },
};
vm.runInNewContext(source + '\nglobalThis.api = { getBans, addBan, removeBan };', context);
const { getBans, addBan, removeBan } = context.api;
assert.deepEqual(JSON.parse(JSON.stringify(getBans())), legacy);
for (let i = 0; i <= 100; i++) {
	const before = [...properties];
	if (addBan({ name: 'Player' + i }, 'Owner', 'ш'.repeat(40), Infinity, i + 2)) continue;
	assert.deepEqual([...properties], before);
	assert.ok(properties.get('shop:bans1').length > 0);
	assert.equal(getBans().length, i + 1);
	assert.equal(removeBan('tester').id, 'p1');
	console.log('PASS: persisted ban pages, multi-page round trip and no writes when full.');
	break;
}
assert.ok(!getBans().some(entry => entry.id === 'p1'));
