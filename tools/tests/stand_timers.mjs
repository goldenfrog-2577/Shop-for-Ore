import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const bp = root + 'behavior_packs/main-addon-shop_for_ore/';
const functionSource = new Map();
const matches = (value, range) => {
	if (value === undefined) return false;
	if (!range.includes('..')) return value === Number(range);
	const [min, max] = range.split('..');
	return (min === '' || value >= Number(min)) && (max === '' || value <= Number(max));
};

// Interpreter for the scoreboard/execute subset used by these real mcfunctions.
// It deliberately treats missing-score "unless" as false, matching this map's 1.19.51 checks.
class Engine {
	constructor() { this.scores = new Map(); this.players = []; this.stands = []; this.events = []; this.props = {}; }
	entity(name, type = 'player') {
		const e = { name, key: `${type}:${name}`, type, tags: new Set(),
			hasTag: t => e.tags.has(t), addTag: t => e.tags.add(t), removeTag: t => e.tags.delete(t), getTags: () => [...e.tags] };
		e.scoreboard = e;
		(type === 'player' ? this.players : this.stands).push(e); return e;
	}
	id(target) { return typeof target === 'string' ? target : target.key; }
	get(target, objective = 'system') { return this.scores.get(`${objective}|${this.id(target)}`); }
	set(target, value, objective = 'system') { this.scores.set(`${objective}|${this.id(target)}`, value); }
	select(token, self) {
		if (!token.startsWith('@')) return [token.replace(/^"|"$/g, '')];
		let list = token.startsWith('@s') ? (self ? [self] : []) : token.startsWith('@a') ? this.players.slice() : this.stands.slice();
		const name = token.match(/name="?([^",\]]+)/)?.[1];
		if (name) list = list.filter(e => e.name === name);
		for (const m of token.matchAll(/tag=(!?[^,\]]+)/g)) list = list.filter(e => m[1].startsWith('!') ? !e.tags.has(m[1].slice(1)) : e.tags.has(m[1]));
		const score = token.match(/scores=\{([^}]+)\}/)?.[1];
		if (score) for (const part of score.split(',')) { const [objective, range] = part.split('='); list = list.filter(e => matches(this.get(e, objective), range)); }
		if (token.includes('c=1')) list = list.slice(0, 1);
		return list;
	}
	value(token, objective, self) { const target = this.select(token, self)[0]; return target === undefined ? undefined : this.get(target, objective); }
	command(line, self) {
		const t = line.trim().split(/\s+/);
		if (!t[0] || t[0].startsWith('#')) return;
		if (t[0] === 'execute') {
			let contexts = [self], i = 1;
			while (t[i] !== 'run') {
				if (t[i] === 'as') { contexts = contexts.flatMap(c => this.select(t[i + 1], c)); i += 2; continue; }
				if (t[i] === 'at') { i += 2; continue; }
				const unless = t[i] === 'unless'; assert.ok(unless || t[i] === 'if', line); i++;
				if (t[i] === 'entity') { const selector = t[i + 1]; contexts = contexts.filter(c => Boolean(this.select(selector, c).length) !== unless); i += 2; continue; }
				assert.equal(t[i++], 'score', line);
				const target = t[i++], objective = t[i++], op = t[i++];
				if (op === 'matches') {
					const range = t[i++]; contexts = contexts.filter(c => { const value = this.value(target, objective, c); return value !== undefined && matches(value, range) !== unless; });
				} else {
					assert.equal(op, '=', line); const other = t[i++], otherObjective = t[i++];
					contexts = contexts.filter(c => { const a = this.value(target, objective, c), b = this.value(other, otherObjective, c); return a !== undefined && b !== undefined && (a === b) !== unless; });
				}
			}
			for (const context of contexts) this.command(t.slice(i + 1).join(' '), context);
			return;
		}
		if (t[0] === 'scoreboard' && t[1] === 'players') {
			const op = t[2], target = t[3], objective = t[4];
			if (op === 'reset') {
				for (const key of this.scores.keys()) if (key.startsWith(objective + '|') && (target === '*' || key === objective + '|' + this.id(this.select(target, self)[0]))) this.scores.delete(key);
				return;
			}
			for (const e of this.select(target, self)) {
				if (op === 'operation') { assert.equal(t[5], '='); const value = this.value(t[6], t[7], self); if (value !== undefined) this.set(e, value, objective); }
				else this.set(e, op === 'set' ? Number(t[5]) : (this.get(e, objective) ?? 0) + (op === 'remove' ? -1 : 1) * Number(t[5]), objective);
			}
			return;
		}
		if (t[0] === 'tag') { for (const e of this.select(t[1], self)) t[2] === 'add' ? e.tags.add(t[3]) : e.tags.delete(t[3]); return; }
		if (t[0] === 'function') { this.run(t[1], self); return; }
		this.events.push(line);
	}
	run(name, self) {
		if (!/^(system\/(setup|timers|migrate_stand_timers|apply_stand_timers)|boost\/|events\/rain_|timers\/ticks_(20|40|80|6000)$)/.test(name)) return;
		const file = bp + `functions/${name}.mcfunction`;
		if (!functionSource.has(name)) {
			assert.ok(fs.existsSync(file), name);
			functionSource.set(name, fs.readFileSync(file, 'utf8').split(/\r?\n/));
		}
		for (const line of functionSource.get(name)) this.command(line, self);
	}
	advance(ticks) { for (let i = 0; i < ticks; i++) this.run('system/timers'); }
	init() { this.set('setup', 6); this.advance(1); }
	loadStands(x2, x4, rain) {
		for (const [name, value] of [['X2Boost', x2], ['X4Boost', x4], ['rainEvent', rain]]) { const e = this.entity(name, 'armor_stand'); if (value !== undefined) this.set(e, value); }
	}
}

const empty = new Engine(); empty.loadStands(undefined, 0, undefined); empty.init();
assert.equal(empty.get('stand_timers_migrated'), 1);
assert.equal(empty.get('boost_x2'), 0); assert.equal(empty.get('boost_x4'), 0); assert.equal(empty.get('rain_event'), -1);
assert.ok(!empty.events.some(s => s.includes('chat.event.rain_end')));

const partial = new Engine(); partial.loadStands(81, 0, -1); const missing = partial.stands.pop(); partial.init();
assert.equal(partial.get('stand_timers_migrated'), 0); assert.equal(partial.get('boost_x2'), 0);
partial.stands.push(missing); partial.advance(1); assert.equal(partial.get('boost_x2'), 81); assert.equal(partial.get('stand_timers_migrated'), 1);

const delayed = new Engine(); const buyer = delayed.entity('Buyer'); delayed.set(buyer, 100000, 'money'); delayed.init();
assert.equal(delayed.get('stand_timers_migrated'), 0);
delayed.run('boost/x2_boost', buyer); delayed.run('boost/x4_boost', buyer); assert.equal(delayed.get(buyer, 'money'), 100000); assert.equal(delayed.get('boost_x2'), 0); assert.equal(delayed.get('boost_x4'), 0);
assert.ok(delayed.events.some(s => s.includes('chat.boost.error.loading')));
delayed.loadStands(123, 0, 17); delayed.advance(1);
assert.equal(delayed.get('stand_timers_migrated'), 1); assert.equal(delayed.get('boost_x2'), 123); assert.equal(delayed.get('rain_event'), 17);
delayed.set('boost_x2', 122); delayed.run('system/apply_stand_timers'); assert.equal(delayed.get('boost_x2'), 122, 'idempotent migration');

const e = empty; e.stands = []; const player = e.entity('Shopper'), joined = e.entity('Joined'); e.set(player, 20000, 'money'); e.set(joined, 60000, 'money');
e.run('boost/x2_boost', player); assert.equal(e.get(player, 'money'), 10000); assert.equal(e.get('boost_x2'), 300);
e.players.forEach(p => p.tags.delete('boost:x2'));
e.run('boost/x4_boost', joined); assert.equal(e.get(joined, 'money'), 60000); assert.equal(e.get('boost_x4'), 0, 'mutual exclusion uses global state');
e.set('t20', 0, 'timer'); e.advance(20); assert.ok(joined.hasTag('boost:x2')); assert.equal(e.get('boost_x2'), 299);
e.advance(299 * 20); assert.equal(e.get('boost_x2'), 0); assert.ok(e.players.every(p => !p.hasTag('boost:x2')));
assert.equal(e.events.filter(s => s.includes('chat.boost.x2_end')).length, 1);
e.run('events/rain_start'); assert.equal(e.get('rain_event'), 30); e.set('t20', 0, 'timer'); e.advance(600); e.advance(1);
assert.equal(e.get('rain_event'), -1); assert.equal(e.events.filter(s => s.includes('chat.event.rain_end')).length, 1);
assert.ok(e.events.some(s => s.includes('structure load "gold_')));
e.run('boost/x4_boost', joined); assert.equal(e.get('boost_x4'), 300); assert.equal(e.get(joined, 'money'), 10000);

const withoutImports = file => fs.readFileSync(file, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/\bexport (const|function)/g, '$1');
const scores = () => [...e.scores].filter(([key]) => key.startsWith('system|')).map(([key, score]) => ({ participant: { displayName: key.slice(7), type: 'fakePlayer' }, score }));
const context = {
	world: { events: { worldInitialize: { subscribe() {} } }, getPlayers: () => e.players.values(), getDimension: () => ({}), scoreboard: { getObjective: () => ({ getScores: scores }) }, getDynamicProperty: key => e.props[key], setDynamicProperty: (key,value) => e.props[key] = value },
	DynamicPropertiesDefinition: class { defineString() {} }, Date: { now: () => 1000 }, run: (who, cmd) => { e.command(cmd, who?.key ? who : undefined); return Promise.resolve({}); }
};
vm.runInNewContext(withoutImports(bp + 'scripts/system/boosts.js') + '\nglobalThis.api={boostTimersReady,boostSeconds,markAdminBoost,adminBoost,stopAdminBoosts};', context);
assert.equal(context.api.boostTimersReady(), true); assert.equal(context.api.boostSeconds('x4'), 300);
context.api.stopAdminBoosts(); assert.equal(e.get('boost_x4'), 300, 'purchased boost survives admin stop');
context.api.markAdminBoost('x4', 5); assert.equal(context.api.adminBoost(), 'x4'); context.api.stopAdminBoosts(); assert.equal(e.get('boost_x4'), 1);
e.set('t20', 0, 'timer'); e.advance(20); assert.equal(e.get('boost_x4'), 0); assert.equal(context.api.adminBoost(), undefined);

// The existing offline reset must preserve the new fake-player records without entities.
context.world.scoreboard.getObjectives = () => [{ id: 'system', getScores: scores, getScore: p => {
	const value = e.get(p); if (value === undefined) throw new Error('No score'); return value;
} }];
context.tell = () => {};
e.set('boost_x2', 47); e.set('rain_event', 12);
vm.runInNewContext(withoutImports(bp + 'scripts/system/offline_reset.js') + '\nglobalThis.resetOfflineForTest=resetOffline;', context);
context.resetOfflineForTest(player);
assert.equal(e.get('boost_x2'), 47); assert.equal(e.get('rain_event'), 12); assert.equal(e.get('stand_timers_migrated'), 1);

for (const file of ['scripts/chat/commands/admin.js', 'scripts/menu/admin_menu.js', 'scripts/system/boosts.js']) assert.ok(!/X2Boost|X4Boost|rainEvent|\$\{stand\}/.test(fs.readFileSync(bp + file, 'utf8')), file);
console.log('PASS: missing scores, delayed/partial loading, active transfer, idempotency, no-stand purchases/countdown/expiry/rain, join tags, mutual exclusion, admin stop ownership, offline-reset preservation.');
