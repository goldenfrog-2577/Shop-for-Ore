// Коллекция пластинок (scripts/system/player/discs.js): редкий дроп при копании, награда за мини-игру,
// только ненайденные, «5» и otherside — только за Хранителя, отметка после успешной выдачи, «Меломан» за все 15.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const root = new URL('../../', import.meta.url);
const bp = new URL('behavior_packs/main-addon-shop_for_ore/', root), rp = new URL('resource_packs/main-rp-shop_for_ore/', root);
const read = (u) => fs.readFileSync(u, 'utf8');
const T = await import(new URL('scripts/system/ui/music_tracks.js', bp));
const src = read(new URL('scripts/system/player/discs.js', bp)).replace(/^import [\s\S]*?;\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');
let breakCb, scanCb; const ran = []; const toasts = []; let giveOk = true;
const unlockedDiscs = (p) => T.DISCS.filter(d => p.hasTag('music:disc:' + d.id) || p.hasTag(`boss:disc:record_${d.id}`)).map(d => d.id);
const ctx = {
	Math, ...T, DISC_TAG: 'music:disc:', unlockedDiscs,
	run: (p, c) => { ran.push([p.name, c]); return Promise.resolve(c.startsWith('give') && !giveOk ? undefined : {}); },
	tell: (p, k, ...a) => ran.push([p.name, 'tell ' + k + ' ' + a.join(',')]),
	rawTranslateRich: (k, ...a) => JSON.stringify({ k, a }), getScore: (p) => p.lvl, isPending: () => false,
	showToast: (p, r) => toasts.push(r),
	system: { runSchedule: (cb) => { scanCb = cb; } },
	world: { getPlayers: () => [], events: { blockBreak: { subscribe: cb => { breakCb = cb; } } } }
};
vm.runInNewContext(src + '\nglobalThis.D={BOSS_DISCS,DROP_POOL,dropChance,rollDisc,giveDisc,rollWinDisc,checkCollector,WIN_CHANCE,COLLECTOR};', ctx);
const D = ctx.D;

// Пул дропа: 13 пластинок, без «5» и otherside (они — только за Хранителя)
assert.equal(D.DROP_POOL.length, 13); assert.ok(!D.DROP_POOL.includes('5') && !D.DROP_POOL.includes('otherside'));
// Шанс растёт с локацией
assert.ok(D.dropChance(1) < D.dropChance(16) && D.dropChance(16) < D.dropChance(26)); assert.equal(D.dropChance(40), 1 / 1500);
// Бросок: не выпало — ничего; выпало — только ненайденная; всё найдено — ничего
assert.equal(D.rollDisc([], 0.001, () => 0.5), undefined);
const seq = (...v) => () => v.shift();
assert.equal(D.rollDisc([], 1, seq(0, 0)), D.DROP_POOL[0]);
assert.equal(D.rollDisc([D.DROP_POOL[0]], 1, seq(0, 0)), D.DROP_POOL[1]);
assert.equal(D.rollDisc(D.DROP_POOL, 1, () => 0), undefined);

const mk = (name, lvl, tags = []) => { const s = new Set(tags); return { name, lvl, hasTag: t => s.has(t), addTag: t => s.add(t), removeTag: t => s.delete(t), getTags: () => [...s] }; };
// Выдача: отметка, сообщение и плашка — только после успешного /give
const P = mk('P', 30);
giveOk = false; await D.giveDisc(P, 'cat'); assert.ok(!P.hasTag('music:disc:cat')); assert.equal(toasts.length, 0);
giveOk = true; await D.giveDisc(P, 'cat');
assert.ok(P.hasTag('music:disc:cat')); assert.equal(toasts.length, 1);
assert.ok(ran.some(([, c]) => c === 'give @s record_cat 1') && ran.some(([, c]) => c === 'tell chat.music.disc.found cat,1,15'));
// Копание: в мини-игре и боту — никогда
const G = mk('G', 30, ['game:spleef']), B = mk('Bot', 30, ['role:bot']);
const before = ran.length; const R = Math.random; Math.random = () => 0;
breakCb({ player: G }); breakCb({ player: B }); assert.equal(ran.length, before);
breakCb({ player: mk('Q', 5) }); assert.ok(ran.slice(before).some(([n, c]) => n === 'Q' && c.startsWith('give @s record_')));
Math.random = R;
// «Меломан»: все 15 (в т. ч. за Хранителя) — префикс, след «Ноты», сообщение всем, один раз
const C = mk('C', 30, [...D.DROP_POOL.map(id => 'music:disc:' + id), 'boss:disc:record_5']);
assert.ok(!D.checkCollector(C)); C.addTag('boss:disc:record_otherside');
assert.ok(D.checkCollector(C)); assert.ok(C.hasTag('music:collector') && C.hasTag('cosmetic:trail:note')); assert.ok(!D.checkCollector(C));
// Codex (#123): вайп снял cosmetic:-теги — след «Ноты» возвращается без повторного объявления
{ const before = ran.length; C.removeTag('cosmetic:trail:note'); assert.ok(!D.checkCollector(C)); assert.ok(C.hasTag('cosmetic:trail:note')); assert.equal(ran.length, before); }
assert.ok(ran.some(([n, c]) => n === 'C' && c.includes('chat.music.collector')));

// Мини-игры: победителю с наградой — бросок пластинки; чат — префикс «Меломан»; меню — коллекция с «???»
assert.match(read(new URL('scripts/system/minigames/minigames.js', bp)), /tell\(p, 'chat\.game\.reward', reward \|\| '—'\);\s*\/\/[^\n]*\n\s*rollWinDisc\(p\);/);
assert.match(read(new URL('scripts/chat/chat.js', bp)), /sender\.hasTag\('music:collector'\)\) rawtext\.push\(\{ text: '§r§8\] \| \[§r' \}, \{ translate: 'rank\.collector' \}\)/);
const menu = read(new URL('scripts/menu/main_menu.js', bp));
assert.match(menu, /§8\?\?\?\\n%menu\.music\.hint\.\$\{BOSS_DISCS\.includes\(d\.id\) \? 'boss' : 'mine'\}/);
for (const l of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) {
	const keys = new Set(read(new URL(`texts/${l}.lang`, rp)).split(/\r?\n/).map(x => x.split('=')[0]));
	for (const k of ['menu.music.button.collection', 'menu.music.collection.title', 'menu.music.collection.body', 'menu.music.hint.mine', 'menu.music.hint.boss',
		'music.disc_found', 'chat.music.disc.found', 'chat.music.collector', 'chat.music.error.locked', 'rank.collector']) assert.ok(keys.has(k), `${l}: ${k}`);
}
assert.ok(read(new URL('scripts/system/ui/error_keys.js', bp)).includes("'chat.music.error.locked'"));
// След «Ноты» из Косметики существует (иначе награда — пустой тег)
assert.match(read(new URL('scripts/menu/cosmetics_shop.js', bp)), /\{ id: 'note', particle: 'minecraft:note_particle'/);

console.log('PASS: disc drop pool (no boss discs), chance by location, only missing discs, tag after successful give, no drops in minigames/bot, Music Lover for all 15.');
