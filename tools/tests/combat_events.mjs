import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const directory = new URL('../../behavior_packs/main-addon-shop_for_ore/scripts/system/security/', import.meta.url);
const listeners = {};
const afterEvents = Object.fromEntries(['entityHurt', 'entityHitEntity', 'playerBreakBlock', 'playerLeave'].map(name => {
	listeners[name] = [];
	return [name, { subscribe(fn) { listeners[name].push(fn); } }];
}));
const flags = [];
function load(file, expose) {
	const source = fs.readFileSync(new URL(file, directory), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
	return vm.runInNewContext(source + '\n' + expose, {
		world: { afterEvents }, system: { runInterval() {} },
		flag: (_p, check) => flags.push(check), rollbackEnabled: () => true, isExempt: () => false
	});
}
load('anticheat_checks.js', 'checkHit');
const opponentHp = load('cps.js', 'opponentHp');
const health = { currentValue: 8, effectiveMax: 12, setCurrentValue(n) { this.currentValue = n; } };
const attacker = { id: '1', name: 'Archer', typeId: 'minecraft:player', hasTag: () => true,
	getHeadLocation: () => ({ x: 0, y: 1.6, z: 0 }), getViewDirection: () => ({ x: 1, y: 0, z: 0 }) };
const victim = { id: '2', name: 'Target', typeId: 'minecraft:player', hasTag: () => true,
	location: { x: 2, y: 0, z: 0 }, getComponent: () => health };
function hit(cause) {
	for (const fn of listeners.entityHurt) fn({ hurtEntity: victim, damage: 8, damageSource: { cause, damagingEntity: attacker } });
}
hit('entityAttack');
assert.deepEqual(flags, []);
const online = new Map([[victim.name, victim]]);
assert.equal(opponentHp(attacker, online), '§a8');
victim.location.x = 12;
hit('projectile');
assert.deepEqual(flags, []);
assert.equal(health.currentValue, 8);
hit('entityAttack');
assert.deepEqual(flags, ['reach']);
assert.equal(health.currentValue, 12, 'rollback honors the actual maximum health');
