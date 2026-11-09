// Босс Хранитель (scripts/system/boss/boss.js): условия старта, фазы, волны прислужников, пластинки,
// ключи сообщений на 4 языках, сущность и её звуки, варп с 26 уровня.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const root = new URL('../../', import.meta.url);
const bp = new URL('behavior_packs/main-addon-shop_for_ore/', root), rp = new URL('resource_packs/main-rp-shop_for_ore/', root);
const src = fs.readFileSync(new URL('scripts/system/boss/boss.js', bp), 'utf8');
const pure = src.slice(0, src.indexOf('// ======== Состояние ========'))
	.replace(/^import .*;\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');
const ctx = { Math };
vm.runInNewContext(pure + '\nglobalThis.B={inFight,CLEAR,onStart,hornAction,HORN,HORN_SOUND,HORN_MS,vampireHeal,isSonic,VAMPIRE_RAGE,checkStart,phaseOf,waveSpawns,discFor,DISCS:DISCS,MIN_LEVEL,MAX_FIGHTERS,HP,START,SUMMON,BARS,MINION_SPOTS,MAX_MINIONS,MAX_WITHER,DISCS};', ctx);
const B = ctx.B;

// Плита старта: резной сланец (528, −61, −68; владелец опустил на 1) — ноги на y −60
assert.ok(B.onStart({ x: 528.41, y: -60, z: -67.61 }));   // точка из игры (скриншот владельца)
assert.ok(!B.onStart({ x: 528.4, y: -59, z: -67.5 }) && !B.onStart({ x: 529.1, y: -60, z: -67.5 }));
// Рог: «Тосковать» = data 6; на плите — старт, не на плите — подсказка; другая мелодия на плите — подсказка; не рог — ничего
assert.equal(B.HORN, 'minecraft:goat_horn'); assert.equal(B.HORN_SOUND, 6);
assert.equal(B.hornAction('minecraft:goat_horn', 6, true), 'start');
assert.equal(B.hornAction('minecraft:goat_horn', 6, false), 'place');
assert.equal(B.hornAction('minecraft:goat_horn', 0, true), 'melody');
assert.equal(B.hornAction('minecraft:goat_horn', 7, false), null);
assert.equal(B.hornAction('minecraft:stick', 6, true), null);
// Старт — по itemStartCharge (на перезарядке его нет): мелодия доигрывает ≈ 7 с, через полсекунды проверки ещё раз,
// рог забирается, и только потом startFight; рога уже нет — отказ; плита без рога больше не будит
assert.equal(B.HORN_MS, 7500);
assert.match(src, /world\.events\.itemStartCharge\.subscribe[\s\S]*?summon = \{ name: p\.name, at: Date\.now\(\) \+ HORN_MS \}/);
assert.match(src, /Date\.now\(\) < summon\.at\) return;[\s\S]*?if \(!hasHorn\(p\)\) return tell\(p, 'chat\.boss\.horn_lost'\);[\s\S]*?const check = tryStart\(p\);[\s\S]*?clear @s \$\{HORN\} \$\{HORN_SOUND\} 1`\)\.then\(\(result\) => \{[\s\S]*?startFight\(/);
// Вампиризм: звуковой удар (без причины или издалека), лечит на отнятое, за смерть — на запас цели; в ярости ×1,5; потолок — порог фазы
assert.ok(B.isSonic(undefined, 12) && B.isSonic(undefined, 2) && B.isSonic('entityAttack', 9) && !B.isSonic('entityAttack', 1.9));
assert.equal(B.vampireHeal({ phase: 1, current: 900, max: 1000, damage: 15, died: false, victimMax: 20 }), 915);
assert.equal(B.vampireHeal({ phase: 1, current: 995, max: 1000, damage: 15, died: false, victimMax: 20 }), 1000);
assert.equal(B.vampireHeal({ phase: 1, current: 1000, max: 1000, damage: 15, died: false, victimMax: 20 }), null);
assert.equal(B.vampireHeal({ phase: 1, current: 500, max: 1000, damage: 15, died: true, victimMax: 20 }), 520);
assert.equal(B.vampireHeal({ phase: 2, current: 590, max: 1000, damage: 15, died: false, victimMax: 20 }), 600);   // фаза 2 не откатывается
assert.equal(B.vampireHeal({ phase: 2, current: 600, max: 1000, damage: 15, died: false, victimMax: 20 }), null);
assert.equal(B.vampireHeal({ phase: 3, current: 100, max: 1000, damage: 15, died: false, victimMax: 20 }), 122.5);  // ярость ×1,5
assert.equal(B.vampireHeal({ phase: 3, current: 100, max: 1000, damage: 15, died: true, victimMax: 20 }), 130);
assert.equal(B.vampireHeal({ phase: 3, current: 100, max: 1000, damage: 0, died: false, victimMax: 20 }), null);
assert.match(src, /if \(fight && e\.damagingEntity\?\.typeId === BOSS\) vampire\(e\);/);
assert.ok(!/inside\.find\(p => onStart/.test(src));
// Рог — только из мистика
assert.match(fs.readFileSync(new URL('scripts/system/combat/mythic.js', bp), 'utf8'), /\{ w: 2, item: 'goat_horn', count: \[1, 1\], data: 6 \}/);

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
// Идентификаторы Bedrock 1.19.50 (recipes/record_5.json: minecraft:record_5), не Java music_disc_*
assert.deepEqual([...B.DISCS], ['record_5', 'record_otherside']);
assert.equal(B.discFor([], () => 0.1), 'record_5'); assert.equal(B.discFor([], () => 0.9), 'record_otherside');
assert.equal(B.discFor(['boss:disc:record_5']), 'record_otherside');
assert.equal(B.discFor(['boss:disc:record_5', 'boss:disc:record_otherside']), undefined);
// отметка о пластинке — только после успешной выдачи
assert.match(src, /run\(p, `give @s \$\{disc\} 1`\)\.then\(\(result\) => \{\s*if \(!result\) return;\s*p\.addTag/);

// Арена боя — только за решёткой (z −12): тоннель не считается, плита старта и портал — внутри
assert.ok(B.inFight({ x: 528.5, y: -59, z: -67.5 }) && B.inFight({ x: 480, y: -61, z: -104 }));
assert.ok(!B.inFight({ x: 528.5, y: -55, z: -5 }) && !B.inFight({ x: 528.5, y: -55, z: -12 }) && B.inFight({ x: 528.5, y: -55, z: -12.01 }));
assert.ok(!B.inFight({ x: 528.5, y: -59, z: -67.5 }, 'minecraft:nether'));
// погибшему инвентарь чистится по тегу, а не по состоянию боя: отметка ставится при смерти, снимается после /clear
assert.match(src, /e\.hurtEntity\.addTag\(CLEAR\)/); assert.match(src, /run\(p, 'clear @s'\);\s*p\.removeTag\(CLEAR\)/);
assert.ok(src.indexOf('processClears();') < src.indexOf('if (fight) {\n\t\tfor (const p of world.getPlayers()) if (p.hasTag(FIGHTER)'), 'чистка — до проверки боя');

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
assert.match(fs.readFileSync(new URL('scripts/chat/commands/player.js', bp), 'utf8'), /warp\.id === 'boss' && bossBusy\(\)\) \{/);

// world.getPlayers() в 1.19.50 возвращает PlayerIterator — методы массива на нём падают «not a function»
// (так было в boss.js:283 — ошибка каждую секунду). Проверяем все скрипты.
const walk = (u) => fs.readdirSync(u, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(new URL(e.name + '/', u)) : [new URL(e.name, u)]);
for (const f of walk(new URL('scripts/', bp)).filter(u => u.pathname.endsWith('.js'))) {
	const code = fs.readFileSync(f, 'utf8');
	assert.ok(!/getPlayers\([^)]*\)\s*\.(filter|find|some|map|forEach|every|reduce|length)\b/.test(code), `итератор как массив: ${f.pathname.split('/scripts/')[1]}`);
	assert.ok(!/getEntities\([^)]*\)\s*\.(filter|find|some|map|forEach|every|reduce|length)\b/.test(code), `итератор как массив: ${f.pathname.split('/scripts/')[1]}`);
}

// Портативный кристалл Энда разрешён участникам боя: тег в pvp.js совпадает с FIGHTER
const pvp = fs.readFileSync(new URL('scripts/system/combat/pvp.js', bp), 'utf8');
assert.ok(src.includes("export const FIGHTER = 'boss:fighter'") && pvp.includes("e.source.hasTag('boss:fighter')"));

// Codex (#123/#124): ушедший с арены выбывает до награды; тотем отмечается сразу при ударе (иначе добитый за секунду босс — «отмена»)
assert.match(src, /function fightStep\(\) \{[\s\S]*?knockOut\(name, 'chat\.boss\.left'\)[\s\S]*?if \(!boss\) return arenaLoaded\(\) \? endFight\(fight\.totem \? 'victory' : 'abort'\) : undefined;/);
assert.match(src, /e\.hurtEntity\?\.typeId === BOSS\)[\s\S]*?if \(absorbed \|\| hp <= 0\) markTotem\(e\.hurtEntity\);/);
// Codex (#108): кристалл — участнику боя только внутри арены (тот же прямоугольник, что inFight)
{ const pvp = fs.readFileSync(new URL('scripts/system/combat/pvp.js', bp), 'utf8');
  assert.match(pvp, /hasTag\('boss:fighter'\) && inBossFight\(e\.source\.location, e\.source\.dimension\?\.id\)\) return;/);
  const fightBox = src.match(/export function inFight\(loc, dimensionId = 'minecraft:overworld'\) \{\s*return (.*);/)[1];
  assert.equal(pvp.match(/export const inBossFight = \(loc, dimensionId\) => (.*);/)[1], fightBox); }
// Не вошедший в аккаунт (auth:login / auth:register) не будит Хранителя и не попадает в участники
assert.match(src, /hasTag\('role:bot'\) \|\| isPending\(p\) \|\| !loaded\) return;/);
assert.match(src, /if \(!p \|\| isPending\(p\) \|\| !inArena/);
assert.match(src, /inFight\(q\.location, q\.dimension\?\.id\) && !isPending\(q\)/);
// Вампиризм берёт фазу по текущему здоровью (не по снимку раз в секунду), фаза назад не откатывается
assert.match(src, /const phase = Math\.max\(fight\.phase, phaseOf\(\{ current, max: fight\.max, totem: fight\.totem \}\)\);\n\tconst next = vampireHeal\(\{ phase,/);
assert.equal(B.vampireHeal({ phase: Math.max(1, B.phaseOf({ current: 299, max: 500, totem: false })), current: 299, max: 500, damage: 10, died: false, victimMax: 20 }), 300);
// Перезагрузка посреди боя: арену сначала грузим (tickingarea), убираем только когда чанки загружены; до этого бой не начать
{
	const load = src.slice(src.indexOf('function load()'), src.indexOf('const hinted'));
	assert.match(load, /recovering = 1;\n\t\tarenaArea\(true\);\n\t\treturn;/);
	assert.match(src, /tickingarea add 480 -62 -104 575 -20 -12 \$\{ARENA_AREA\}/);
	// бой: арена загружена весь бой; невидимый босс — не победа, пока арена не загружена
	assert.match(src, /arenaArea\(true\);\n\tcmd\(`summon \$\{BOSS\}/);
	assert.match(src.slice(src.indexOf('function endFight')), /clearArena\(\);\n\tarenaArea\(false\);/);
	assert.match(src, /if \(!boss\) return arenaLoaded\(\) \? endFight\(fight\.totem \? 'victory' : 'abort'\) : undefined;/);
	assert.match(load, /if \(!arenaLoaded\(\)\) \{\n\t\trecovering = 1;\n[\s\S]*?if \(\+\+recoverWait % 10 === 0\) arenaArea\(true\);\n\t\treturn;\n\t\}[\s\S]*scoreboard players set boss_state system 0[\s\S]*arenaArea\(false\)/);
	assert.match(src, /processClears\(\);\n\tif \(recovering\) return recoverStep\(\);/);
	assert.match(src, /export const bossBusy = \(\) => !!fight \|\| recovering > 0;/);
}
assert.match(src, /function tryStart\(p\) \{\n\tif \(bossBusy\(\)\) return \{ ok: false, reason: 'busy'/, 'horn waits for recovery cleanup');
assert.match(fs.readFileSync(new URL('scripts/system/core/wipe.js', bp), 'utf8'), /'boss:disc:', WIPE_TAG\]/);
{ const mg = fs.readFileSync(new URL('scripts/system/minigames/minigames.js', bp), 'utf8');
	assert.match(mg, /getEffect\(MinecraftEffectTypes\.levitation\) \|\| p\.getEffect\(MinecraftEffectTypes\.slowFalling\)/);
	assert.match(mg, /if \(hasFeatherEffect\(player\)\) return fail\('chat\.game\.error\.feather'\);\n\tg\.players\.add/);
	assert.ok(!mg.includes('effect @s clear'), 'only the feather effects — never clear bought ones'); }
// Бой — только после того, как рог действительно забрали
assert.match(src, /run\(p, `clear @s \$\{HORN\} \$\{HORN_SOUND\} 1`\)\.then\(\(result\) => \{\n\t\tsummoning = false;\n\t\tif \(!result\) return tell\(p, 'chat\.boss\.horn_lost'\);\n\t\tif \(bossBusy\(\)\) return;\n\t\tstartFight\(/);
assert.match(src, /if \(summon \|\| summoning\) return tell\(p, 'chat\.boss\.busy'\);/);
console.log('PASS: boss start rules, phases, minion waves, discs, spots, 4-locale keys, entity/sounds, warp level gate.');
