// Арена Хранителя (scripts/system/boss/arena.js): границы зоны, эмбиент и частицы только из ванильных ID 1.19.50,
// бот и игроки снаружи без звука. Музыка арены — в system/ui/music.js (tools/tests/music.mjs).
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url);
const src = fs.readFileSync(new URL('scripts/system/boss/arena.js', bp), 'utf8')
	.replace(/^import .*;\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');

let tickCb; const ran = []; const particles = []; const players = [];
const ctx = {
	Math,
	system: { runSchedule: (cb, n) => { assert.equal(n, 20); tickCb = cb; } },
	world: {
		getPlayers: () => players,
		getDimension: () => ({ runCommandAsync: c => { particles.push(c); return Promise.resolve(); } }),
	},
	run: () => { throw Error('run() не используется'); }
};
vm.runInNewContext(src + '\nglobalThis.A={ARENA,inArena,ambientCommands,particleCommands,BRAZIERS,PORTAL};', ctx);
const A = ctx.A;

// Границы: углы коробки и тоннель внутри, соседние блоки и другое измерение — снаружи
assert.ok(A.inArena({ x: 480, y: -61, z: -104 }));
assert.ok(A.inArena({ x: 575.9, y: -21.5, z: -2.1 }));
assert.ok(A.inArena({ x: 528.5, y: -54, z: -5 }));            // будущий варп в тоннеле
assert.ok(!A.inArena({ x: 479.9, y: -50, z: -50 }));
assert.ok(!A.inArena({ x: 528, y: -20, z: -50 }));
assert.ok(!A.inArena({ x: 528, y: -50, z: -1 }));
assert.ok(!A.inArena({ x: 528, y: -50, z: -50 }, 'minecraft:nether'));

// Все ID звуков и частиц существуют в ванильном Bedrock 1.19.50 (официальный тег v1.19.50.2)
const SOUNDS = new Set(['power.on.sculk_sensor', 'power.off.sculk_sensor',
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
for (const id of seen) assert.ok(!rp[id] || rp[id].sounds?.length, `ресурс-пак глушит ${id}`);
assert.ok(!src.includes('playsound ambient.cave'));
assert.ok(!A.ambientCommands({ x: 528, y: -55, z: -5 }, () => 0.4).some(c => c.includes('heartbeat')));   // у входа сердца не слышно
for (const c of A.particleCommands(rnd)) {
	const [cmd, id, x, y, z] = c.split(' ');
	assert.equal(cmd, 'particle'); assert.ok(PARTICLES.has(id), id);
	assert.ok(A.inArena({ x: Number(x), y: Number(y), z: Number(z) }), c);
}
assert.equal(A.BRAZIERS.length, 16);
// Цикл: игрок на арене получает эмбиент, бот и игрок снаружи — ничего; частицы только при игроках на арене
const tags = (n, name) => ({ hasTag: t => n.includes(t), runCommandAsync: c => { ran.push([name, c]); return Promise.resolve(); } });
players.push({ name: 'P', location: { x: 528, y: -55, z: -40 }, dimension: { id: 'minecraft:overworld' }, ...tags([], 'P') });
players.push({ name: 'Bot', location: { x: 528, y: -55, z: -40 }, dimension: { id: 'minecraft:overworld' }, ...tags(['role:bot'], 'Bot') });
players.push({ name: 'Far', location: { x: 0, y: 5, z: 0 }, dimension: { id: 'minecraft:overworld' }, ...tags([], 'Far') });
for (let i = 0; i < 20 && !ran.length; i++) tickCb();
assert.ok(ran.length && ran.every(([n, c]) => n === 'P' && c.startsWith('playsound ')));
assert.ok(particles.length > 0);
players.splice(0, 1); ran.length = 0; particles.length = 0;
for (let i = 0; i < 20; i++) tickCb();
assert.equal(ran.length, 0); assert.equal(particles.length, 0);
assert.ok(!src.includes('music'.concat('Step')) && !src.includes('playsound music.') && !src.includes('playsound record.'));

console.log('PASS: boss arena bounds, vanilla ambient sound and particle IDs, bot and outsiders silent, music moved to music.js.');
