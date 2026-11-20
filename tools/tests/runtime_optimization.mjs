import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const scripts = root + 'behavior_packs/main-addon-shop_for_ore/scripts/';
const source = path => fs.readFileSync(path, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/\bexport (const|function)/g, '$1');

function hudRuntime(path, count = 8) {
	const callbacks = [], leave = [], commands = [];
	const players = Array.from({ length: count }, (_, i) => ({
		name: `Player${i}`, tags: new Set(),
		scores: { lvl: 5, xp: 100, xp_need: 250, money: 1000, vip_coins: 10, rebirth: 0, online: count },
		hasTag(tag) { return this.tags.has(tag); }
	}));
	const runtime = { players, commands, fail: false, time: 0 };
	const context = {
		system: { runInterval: f => callbacks.push(f) },
		world: { afterEvents: { playerLeave: { subscribe: f => leave.push(f) } }, getPlayers: () => players.values() },
		getScore: (p, key) => p.scores[key] ?? 0, isVip: p => p.hasTag('player:vip'), MAX_LEVEL: 40,
		metricNumbers: n => String(n), run: (p, command) => { commands.push({ player: p.name, command, tick: runtime.time }); return Promise.resolve(runtime.fail ? undefined : {}); }
	};
	vm.runInNewContext(source(path), context);
	runtime.advance = async (ticks, update) => {
		for (let i = 0; i < ticks; i++) {
			runtime.time++;
			if (update) update(runtime.time);
			callbacks.forEach(f => f());
			await Promise.resolve();
		}
	};
	runtime.leave = name => leave.forEach(f => f({ playerName: name }));
	return runtime;
}

function miningRuntime(path) {
	const schedules = new Map(), jobs = [], commands = [];
	const dirt = { typeId: 'minecraft:dirt', amount: 1 };
	const slots = new Map([[5, dirt]]);
	const scores = new Map([['lvl', 1], ['xp_need', 100], ['money', 0], ['xp', 0], ['pick', 1]]);
	const dim = {
		id: 'minecraft:overworld', heightRange: { min: -64, max: 320 },
		getBlock({ y }) {
			assert.ok(y >= -64 && y < 320, 'sale read outside dimension');
			return { typeId: 'minecraft:gold_block' };
		},
	};
	const player = {
		location: { x: 0, y: 1, z: 0 }, dimension: dim, selectedSlotIndex: 0,
		hasTag: tag => tag === 'auth:done', getGameMode: () => 'Adventure',
		getComponent: () => ({ container: { size: 36, getItem: i => slots.get(i), setItem: (i, v) => slots.set(i, v) } }),
		runCommand: cmd => commands.push(cmd),
	};
	const context = {
		world: { afterEvents: { worldLoad: { subscribe: fn => fn() } }, beforeEvents: { playerBreakBlock: { subscribe() {} } },
			getAllPlayers: () => [player], getDimension: () => dim,
			scoreboard: { getObjective: id => ({ getScore: () => scores.get(id), setScore: (_, n) => scores.set(id, n) }) } },
		system: { runInterval: (fn, interval) => schedules.set(interval, fn), runJob: job => jobs.push(job) },
		MAX_LEVEL: 40, getScore: (_, k) => scores.get(k) ?? 0, isPending: () => false, isBot: () => false,
		console: { error: msg => assert.fail(msg) },
	};
	vm.runInNewContext(source(path), context);
	assert.deepEqual([...schedules.keys()].sort((a, b) => a - b), [5, 20, 500]);
	for (const y of [-105, -64, 321]) { player.location.y = y; schedules.get(5)(); }
	assert.equal(slots.get(5), dirt);
	player.location.y = 1;
	schedules.get(5)();
	assert.equal(slots.get(5), undefined);
	assert.equal(scores.get('money'), 1);
	assert.equal(scores.get('xp'), 1);
	schedules.get(500)(); schedules.get(500)();
	assert.equal(jobs.length, 1, 'one active regeneration job');
}

const idle = hudRuntime(scripts + 'system/ui/hud.js');
await idle.advance(1000);
assert.equal(idle.commands.length, 400, 'idle HUD: one command per second per player');
for (const player of idle.players) {
	const ticks = idle.commands.filter(c => c.player === player.name).map(c => c.tick);
	assert.ok(ticks.every((tick, i) => !i || tick - ticks[i - 1] <= 20), 'keepalive prevents gaps longer than one second');
}
const active = hudRuntime(scripts + 'system/ui/hud.js');
await active.advance(1000, tick => { if (tick % 5 === 0) active.players.forEach(p => p.scores.money++); });
assert.equal(active.commands.length, 1600, 'changing scores retain five-tick refresh');

const modes = hudRuntime(scripts + 'system/ui/hud.js', 1), p = modes.players[0];
await modes.advance(5);
for (const key of ['money', 'xp', 'xp_need', 'lvl', 'rebirth', 'online']) {
	const before = modes.commands.length;
	p.scores[key]++;
	await modes.advance(5);
	assert.equal(modes.commands.length, before + 1, `score change: ${key}`);
}
p.tags.add('player:vip');
await modes.advance(5);
assert.ok(modes.commands.at(-1).command.includes('vip_coins'));
p.scores.vip_coins++;
const vipBefore = modes.commands.length;
await modes.advance(5);
assert.equal(modes.commands.length, vipBefore + 1);
p.tags.add('player:board_icons');
await modes.advance(5);
assert.ok(!modes.commands.at(-1).command.includes('hud.profile'));
p.tags.add('player:board_no');
const off = modes.commands.length;
await modes.advance(40);
assert.equal(modes.commands.length, off);
p.tags.delete('player:board_no');
await modes.advance(5);
assert.equal(modes.commands.length, off + 1);
modes.leave(p.name);
await modes.advance(5);
assert.equal(modes.commands.length, off + 2, 'rejoin clears HUD cache');
modes.fail = true;
p.scores.money++;
p.scores.vip_coins++;
await modes.advance(5);
const failure = modes.commands.length;
modes.fail = false;
await modes.advance(5);
assert.equal(modes.commands.length, failure + 1, 'failed send retries after five ticks');

miningRuntime(scripts + 'system/player/tools.js');
console.log('PASS: idle and active HUD refresh, mine intervals, sale at the gold block and void boundaries.');
