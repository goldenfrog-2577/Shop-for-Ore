// Босс Хранитель (scripts/system/boss/boss.js): условия старта, фазы, волны прислужников, пластинки,
// ключи сообщений на 4 языках, сущность и её звуки, варп с 26 уровня.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const root = new URL('../../', import.meta.url);
const bp = new URL('behavior_packs/main-addon-shop_for_ore/', root), rp = new URL('resource_packs/main-rp-shop_for_ore/', root);
const src = fs.readFileSync(new URL('scripts/system/boss/boss.js', bp), 'utf8');
const pure = src.slice(0, src.indexOf('// ======== Состояние ========'))
	.replace(/^import .*;\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');
const ctx = { Math };
vm.runInNewContext(pure + '\nglobalThis.B={onStart,checkStart,phaseOf,waveSpawns,discFor,MIN_LEVEL,MAX_FIGHTERS,HP,START,SUMMON,BARS,MINION_SPOTS,MAX_MINIONS,MAX_WITHER,DISCS};', ctx);
const B = ctx.B;

// Плита старта: стоять на резном сланце (528, −60, −68) — ноги на y −59
assert.ok(B.onStart({ x: 528.4, y: -59, z: -67.5 }));
assert.ok(!B.onStart({ x: 528.4, y: -60, z: -67.5 }) && !B.onStart({ x: 529.1, y: -59, z: -67.5 }));

// Старт: перезарядка, уровень, не больше 4, бот и низкий уровень — на спавн
const P = (name, level, bot = false) => ({ name, level, bot });
let r = B.checkStart({ busy: false, now: 100, until: 1000, players: [P('a', 30)], starter: 'a' });
assert.equal(r.reason, 'cooldown'); assert.equal(r.minutes, 15);
assert.equal(B.checkStart({ busy: true, now: 0, until: 0, players: [P('a', 30)], starter: 'a' }).reason, 'busy');
assert.equal(B.checkStart({ busy: false, now: 0, until: 0, players: [P('a', 25)], starter: 'a' }).reason, 'level');
assert.equal(B.checkStart({ busy: false, now: 0, until: 0, players: ['a', 'b', 'c', 'd', 'e'].map(n => P(n, 26)), starter: 'a' }).reason, 'too_many');
r = B.checkStart({ busy: false, now: 5, until: 5, players: [P('a', 26), P('low', 10), P('Bot', 40, true), P('b', 40)], starter: 'a' });
assert.ok(r.ok); assert.deepEqual([...r.fighters], ['a', 'b']); assert.deepEqual([...r.kick], ['low', 'Bot']);

// Фазы и здоровье по числу участников
assert.deepEqual([...B.HP], [500, 750, 1000, 1250]);
assert.equal(B.phaseOf({ current: 301, max: 500, totem: false }), 1);
assert.equal(B.phaseOf({ current: 300, max: 500, totem: false }), 2);
assert.equal(B.phaseOf({ current: 500, max: 500, totem: true }), 3);

// Волны: до 2 за раз, живых не больше 4, иссушителей — только в фазе 3 и не больше 2
assert.ok(B.waveSpawns(2, 0, 0, () => 0).every(t => t === 'minecraft:skeleton'));
assert.equal(B.waveSpawns(2, 3, 0).length, 1); assert.equal(B.waveSpawns(3, 4, 0).length, 0);
assert.deepEqual([...B.waveSpawns(3, 0, 0, () => 0)], ['minecraft:wither_skeleton', 'minecraft:wither_skeleton']);
assert.deepEqual([...B.waveSpawns(3, 1, 2, () => 0)], ['minecraft:skeleton', 'minecraft:skeleton']);
assert.deepEqual([...B.waveSpawns(3, 0, 1, () => 0)], ['minecraft:wither_skeleton', 'minecraft:skeleton']);

// Пластинки: первая — случайная, вторая — недостающая, потом ничего
assert.equal(B.discFor([], () => 0.1), 'music_disc_5'); assert.equal(B.discFor([], () => 0.9), 'music_disc_otherside');
assert.equal(B.discFor(['boss:disc:music_disc_5']), 'music_disc_otherside');
assert.equal(B.discFor(['boss:disc:music_disc_5', 'boss:disc:music_disc_otherside']), undefined);

// Точки: прислужники в утопленной площади, решётка в тоннеле, призыв в проёме портала
for (const [x, y, z] of B.MINION_SPOTS) { assert.equal(y, -60); assert.ok(Math.hypot(x - 528, z + 56) <= 19); }
assert.deepEqual(JSON.parse(JSON.stringify(B.BARS)), [[526, -55, -12], [530, -51, -12]]);

// Все ключи chat.boss.*, которые использует скрипт, есть на 4 языках; ошибки — в ERROR_KEYS
const used = new Set([...src.matchAll(/'(chat\.boss\.[a-z_0-9]+)'/g)].map(m => m[1]));
for (const m of src.matchAll(/`chat\.boss\.\$\{check\.reason\}`/g)) for (const k of ['cooldown', 'level', 'too_many']) used.add(`chat.boss.${k}`);
used.add('chat.cmd.warp.error.level'); used.add('menu.warps.button.boss'); used.add('ach.boss.name'); used.add('entity.server:warden_boss.name');
const errors = fs.readFileSync(new URL('scripts/system/ui/error_keys.js', bp), 'utf8');
for (const lang of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) {
	const keys = new Set(fs.readFileSync(new URL(`texts/${lang}.lang`, rp), 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => l.split('=')[0]));
	for (const k of used) assert.ok(keys.has(k), `${lang}: нет ${k}`);
}
for (const k of ['chat.boss.busy', 'chat.boss.cooldown', 'chat.boss.level', 'chat.boss.too_many', 'chat.cmd.warp.error.level']) assert.ok(errors.includes(`'${k}'`), k);

// Сущность: ванильный Хранитель внутри, без ухода под землю и добычи, события здоровья и ярости, звуки в RP
const ent = JSON.parse(fs.readFileSync(new URL('entities/warden_boss.json', bp), 'utf8'))['minecraft:entity'];
assert.equal(ent.description.identifier, 'server:warden_boss'); assert.equal(ent.description.runtime_identifier, 'minecraft:warden');
assert.ok(!ent.components['minecraft:behavior.dig'] && !ent.components['minecraft:loot'] && ent.components['minecraft:boss']);
for (let i = 1; i <= 4; i++) assert.equal(ent.component_groups[`server:hp_${i}`]['minecraft:health'].max, B.HP[i - 1]);
for (const ev of ['server:spawn_emerging', 'server:rage', 'server:hp_4']) assert.ok(ent.events[ev], ev);
assert.ok(src.includes('server:spawn_emerging') && src.includes("triggerEvent('server:rage')"));
const sounds = JSON.parse(fs.readFileSync(new URL('sounds.json', rp), 'utf8'));
for (const ev of ['hurt', 'death', 'step', 'roar', 'emerge']) assert.ok(sounds.entity_sounds.entities['server:warden_boss'].events[ev], ev);
assert.ok(fs.existsSync(new URL('entity/warden_boss.entity.json', rp)));

// Варп boss: игрокам с 26 уровня, персоналу — всегда; во время боя чужих не пускает
const db = fs.readFileSync(new URL('scripts/DataBase.js', bp), 'utf8');
assert.match(db, /\{ id: 'boss', role: 'player', minLevel: 26, pos: \[528, -55, -5\] \}/);
const wa = db.match(/export const warpAllowed = [^;]+;/)[0].replace('export const', 'const');
const roles = ['player', 'helper', 'moder', 'admin', 'owner'];
const w = vm.runInNewContext(wa + ';warpAllowed', {
	hasRole: (p, r) => roles.indexOf(p.role) >= roles.indexOf(r), isVip: () => false, getScore: (p) => p.lvl
});
const warp = { id: 'boss', role: 'player', minLevel: 26 };
assert.ok(!w({ role: 'player', lvl: 25 }, warp) && w({ role: 'player', lvl: 26 }, warp) && w({ role: 'helper', lvl: 1 }, warp));
assert.match(fs.readFileSync(new URL('scripts/chat/commands/player.js', bp), 'utf8'), /warp\.id === 'boss' && bossBusy\(\) && !target\.hasTag\(FIGHTER\)/);

console.log('PASS: boss start rules, phases, minion waves, discs, spots, 4-locale keys, entity/sounds, warp level gate.');
