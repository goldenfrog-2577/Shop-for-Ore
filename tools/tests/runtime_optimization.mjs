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
		world: { events: { tick: { subscribe: f => callbacks.push(f) }, playerLeave: { subscribe: f => leave.push(f) } }, getPlayers: () => players.values() },
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

function toolsRuntime(path) {
	let clock = 0, calls = 0, scans = 0;
	const schedules = [], commands = [];
	const player = {
		selectedSlot: 1, hasTag: () => false,
		getComponent: () => ({ container: { getItem: () => ({ getComponent: () => ({ damage: 10, maxDurability: 100 }) }) } })
	};
	vm.runInNewContext(source(path), {
		world: { getPlayers: () => { scans++; return [player].values(); } },
		system: { runSchedule: (callback, interval = 1) => schedules.push({ callback, interval }) },
		run: (_, command) => commands.push({ command, tick: clock })
	});
	for (clock = 1; clock <= 1000; clock++) for (const s of schedules) if (clock % s.interval === 0) { calls++; s.callback(); }
	return { calls, scans, commands };
}

const idle = hudRuntime(scripts + 'system/hud.js');
await idle.advance(1000);
assert.equal(idle.commands.length, 400, 'idle HUD: one command per second per player');
for (const player of idle.players) {
	const ticks = idle.commands.filter(c => c.player === player.name).map(c => c.tick);
	assert.ok(ticks.every((tick, i) => !i || tick - ticks[i - 1] <= 20), 'keepalive prevents gaps longer than one second');
}
const active = hudRuntime(scripts + 'system/hud.js');
await active.advance(1000, tick => { if (tick % 5 === 0) active.players.forEach(p => p.scores.money++); });
assert.equal(active.commands.length, 1600, 'changing scores retain five-tick refresh');

const modes = hudRuntime(scripts + 'system/hud.js', 1), p = modes.players[0];
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

const tools = toolsRuntime(scripts + 'system/tools.js');
assert.equal(tools.calls, 50);
assert.equal(tools.scans, 50);
assert.deepEqual(tools.commands.map(c => c.tick), Array.from({ length: 50 }, (_, i) => (i + 1) * 20));

const result = { ticks: 1000, players: 8, idleHudCommands: idle.commands.length, activeHudCommands: active.commands.length, toolsCallbacks: tools.calls, toolsChecks: tools.scans };
if (process.argv[2]) {
	const baseline = process.argv[2].replace(/\\/g, '/').replace(/\/$/, '');
	const oldHud = hudRuntime(baseline + '/scripts/system/hud.js');
	await oldHud.advance(1000);
	const oldTools = toolsRuntime(baseline + '/scripts/system/tools.js');
	assert.deepEqual(tools.commands.map(c => c.tick), oldTools.commands.map(c => c.tick));
	result.baselineIdleHudCommands = oldHud.commands.length;
	result.baselineToolsCallbacks = oldTools.calls;
	assert.equal(idle.commands.length * 4, oldHud.commands.length);
	assert.equal(tools.calls * 20, oldTools.calls);
}
console.log('PASS', JSON.stringify(result));
