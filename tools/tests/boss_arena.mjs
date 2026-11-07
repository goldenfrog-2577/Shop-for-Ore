// Арена Хранителя (scripts/system/boss/arena.js): границы зоны, очередь Ancestry → «5», выход и выключенная
// музыка, эмбиент и частицы только из ванильных ID 1.19.50, бот без звука, состояние по нику забывается.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url);
const src = fs.readFileSync(new URL('scripts/system/boss/arena.js', bp), 'utf8')
	.replace(/^import .*;\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');

let tickCb, leaveCb; const ran = []; const particles = []; const players = [];
const ctx = {
	Math, MUSIC_OFF: 'player:music_off',
	system: { runSchedule: (cb, n) => { assert.equal(n, 20); tickCb = cb; } },
	world: {
		getPlayers: () => players,
		getDimension: () => ({ runCommandAsync: c => { particles.push(c); return Promise.resolve(); } }),
		events: { playerLeave: { subscribe: cb => { leaveCb = cb; } } }
	},
	run: () => { throw Error('run() не используется'); }
};
vm.runInNewContext(src + '\nglobalThis.A={ARENA,TRACKS,TRACK_GAP,inArena,musicStep,ambientCommands,particleCommands,BRAZIERS,PORTAL,CENTER,MUSIC_VOLUME};', ctx);
const A = ctx.A;

// Границы: углы коробки и тоннель внутри, соседние блоки и другое измерение — снаружи
assert.ok(A.inArena({ x: 480, y: -61, z: -104 }));
assert.ok(A.inArena({ x: 575.9, y: -21.5, z: -2.1 }));
assert.ok(A.inArena({ x: 528.5, y: -54, z: -5 }));            // будущий варп в тоннеле
assert.ok(!A.inArena({ x: 479.9, y: -50, z: -50 }));
assert.ok(!A.inArena({ x: 528, y: -20, z: -50 }));
assert.ok(!A.inArena({ x: 528, y: -50, z: -1 }));
assert.ok(!A.inArena({ x: 528, y: -50, z: -50 }, 'minecraft:nether'));

// Очередь: вход → Ancestry, до конца трека новых playsound нет, затем «5», затем снова Ancestry
let s, cmds;
({ state: s, commands: cmds } = A.musicStep(undefined, { inside: true, musicOff: false, now: 0 }));
assert.equal(cmds[0], 'stopsound @s music.game');
assert.match(cmds[1], /^playsound music\.game\.deep_dark @s /);
({ state: s, commands: cmds } = A.musicStep(s, { inside: true, musicOff: false, now: 343 }));
assert.deepEqual([...cmds], ['stopsound @s music.game']);
({ state: s, commands: cmds } = A.musicStep(s, { inside: true, musicOff: false, now: 343 + A.TRACK_GAP }));
assert.match(cmds[1], /^playsound record\.5 @s /);
({ state: s, commands: cmds } = A.musicStep(s, { inside: true, musicOff: false, now: 343 + 178 + 2 * A.TRACK_GAP }));
assert.match(cmds[1], /^playsound music\.game\.deep_dark @s /);

// Выход — остановить оба трека и забыть; снаружи без состояния — ни одной команды
let out = A.musicStep(s, { inside: false, musicOff: false, now: 600 });
assert.equal(out.state, undefined);
assert.deepEqual([...out.commands], ['stopsound @s music.game.deep_dark', 'stopsound @s record.5']);
assert.equal(A.musicStep(undefined, { inside: false, musicOff: false, now: 1 }).commands.length, 0);

// Музыка выключена: треки останавливаются один раз, новых нет; включили обратно — трек играет заново
({ state: s } = A.musicStep(undefined, { inside: true, musicOff: false, now: 0 }));
({ state: s, commands: cmds } = A.musicStep(s, { inside: true, musicOff: true, now: 5 }));
assert.ok(cmds.includes('stopsound @s music.game.deep_dark') && !cmds.some(c => c.startsWith('playsound')));
({ state: s, commands: cmds } = A.musicStep(s, { inside: true, musicOff: true, now: 6 }));
assert.deepEqual([...cmds], ['stopsound @s music.game']);
({ state: s, commands: cmds } = A.musicStep(s, { inside: true, musicOff: false, now: 7 }));
assert.match(cmds[1], /^playsound music\.game\.deep_dark @s /);
({ commands: cmds } = A.musicStep(undefined, { inside: true, musicOff: true, now: 0 }));
assert.ok(!cmds.some(c => c.startsWith('playsound')));

// Все ID звуков и частиц существуют в ванильном Bedrock 1.19.50 (официальный тег v1.19.50.2)
const SOUNDS = new Set(['music.game.deep_dark', 'record.5', 'music.game', 'power.on.sculk_sensor', 'power.off.sculk_sensor',
	'spread.sculk', 'bloom.sculk_catalyst', 'shriek.sculk_shrieker', 'ambient.soulsand_valley.mood', 'mob.warden.heartbeat']);
// Только частицы без variable.direction (её задаёт игра, /particle — нет): проверено по particles/*.json v1.19.50.2
const PARTICLES = new Set(['minecraft:blue_flame_particle', 'minecraft:sculk_sensor_redstone_particle']);
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const seen = new Set();
for (let i = 0; i < 4000; i++) {
	const L = i % 2 ? { x: 528, y: -55, z: -70 } : { x: 490 + (i % 80), y: -59, z: -95 + (i % 90) };
	for (const c of A.ambientCommands(L, rnd)) {
		const [, id, target, x, y, z, vol, pitch, min] = c.split(' ');
		assert.ok(SOUNDS.has(id), id); assert.equal(target, '@s'); seen.add(id);
		assert.ok([x, y, z, vol, pitch, min].every(v => Number.isFinite(Number(v))), c);
		assert.ok(Number(vol) > 0 && Number(pitch) > 0 && Number(min) >= 0 && Number(min) <= 1, c);
		// Bedrock: радиус слышимости /playsound = 16 × volume; дальше — только с minimumVolume > 0
		const dist = Math.hypot(Number(x) - L.x, Number(y) - L.y, Number(z) - L.z);
		assert.ok(dist <= 16 * Number(vol), `не слышно: ${c} на расстоянии ${dist.toFixed(1)}`);
	}
}
for (const id of ['power.on.sculk_sensor', 'shriek.sculk_shrieker', 'mob.warden.heartbeat', 'ambient.soulsand_valley.mood']) assert.ok(seen.has(id), id);
// Ресурс-пак карты не должен глушить используемые звуки (например, ambient.cave там пустой)
const rp = JSON.parse(fs.readFileSync(new URL('../../resource_packs/main-rp-shop_for_ore/sounds/sound_definitions.json', import.meta.url), 'utf8'));
for (const id of [...seen, ...A.TRACKS.map(t => t.id)]) assert.ok(!rp[id] || rp[id].sounds?.length, `ресурс-пак глушит ${id}`);
assert.ok(!src.includes('playsound ambient.cave'));
assert.ok(!A.ambientCommands({ x: 528, y: -55, z: -5 }, () => 0.4).some(c => c.includes('heartbeat')));   // у входа сердца не слышно
for (const c of A.particleCommands(rnd)) {
	const [cmd, id, x, y, z] = c.split(' ');
	assert.equal(cmd, 'particle'); assert.ok(PARTICLES.has(id), id);
	assert.ok(A.inArena({ x: Number(x), y: Number(y), z: Number(z) }), c);
}
assert.equal(A.BRAZIERS.length, 16);
// Музыку из центра слышно во всей коробке и в тоннеле
for (const x of [A.ARENA.min[0], A.ARENA.max[0]]) for (const y of [A.ARENA.min[1], A.ARENA.max[1]]) for (const z of [A.ARENA.min[2], A.ARENA.max[2]])
	assert.ok(Math.hypot(x - A.CENTER[0], y - A.CENTER[1], z - A.CENTER[2]) <= 16 * A.MUSIC_VOLUME, `музыка не слышна в углу ${x} ${y} ${z}`);
assert.match(A.musicStep(undefined, { inside: true, musicOff: false, now: 0 }).commands[1], / 5 1 0\.4$/);

// Цикл: игрок на арене получает музыку и эмбиент, бот — ничего, игрок снаружи — ничего; частицы только при игроках
const tags = (n, name) => ({ hasTag: t => n.includes(t), runCommandAsync: c => { ran.push([name, c]); return Promise.resolve(); } });
players.push({ name: 'P', location: { x: 528, y: -55, z: -40 }, dimension: { id: 'minecraft:overworld' }, ...tags([], 'P') });
players.push({ name: 'Bot', location: { x: 528, y: -55, z: -40 }, dimension: { id: 'minecraft:overworld' }, ...tags(['role:bot'], 'Bot') });
players.push({ name: 'Far', location: { x: 0, y: 5, z: 0 }, dimension: { id: 'minecraft:overworld' }, ...tags([], 'Far') });
tickCb();
assert.ok(ran.some(([n, c]) => n === 'P' && c.startsWith('playsound music.game.deep_dark')));
assert.ok(!ran.some(([n]) => n === 'Bot' || n === 'Far'));
assert.ok(particles.length > 0);
players.length = 1; players[0].location = { x: 0, y: 5, z: 0 }; ran.length = 0; particles.length = 0;
tickCb();
assert.deepEqual(ran.map(r => r[1]), ['stopsound @s music.game.deep_dark', 'stopsound @s record.5']);
assert.equal(particles.length, 0);
players[0].location = { x: 528, y: -55, z: -40 }; tickCb(); leaveCb({ playerName: 'P' });
players.length = 0; ran.length = 0; tickCb(); assert.equal(ran.length, 0);

console.log('PASS: boss arena bounds, Ancestry → 5 queue, exit/music_off stops, vanilla sound and particle IDs, bot and outsiders silent.');
