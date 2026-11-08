// Музыка карты (scripts/system/ui/music.js, music_tracks.js): зоны, плейлисты, смена трека, пауза, выключение,
// громкость, свои пластинки, плашка «Сейчас играет»; события shop.music.* в ресурс-паке — не объёмные, категория record,
// встроенная музыка заглушена; ключи меню на 4 языках.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const root = new URL('../../', import.meta.url);
const bp = new URL('behavior_packs/main-addon-shop_for_ore/', root), rp = new URL('resource_packs/main-rp-shop_for_ore/', root);
const read = (u) => fs.readFileSync(u, 'utf8');
const T = await import(new URL('scripts/system/ui/music_tracks.js', bp));
const src = read(new URL('scripts/system/ui/music.js', bp)).replace(/^import .*;\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');
const arena = await import('data:text/javascript,' + encodeURIComponent(read(new URL('scripts/system/boss/arena.js', bp))
	.replace(/^import .*;\r?\n/gm, '').replace(/system\.runSchedule\([\s\S]*?\n\}, CHECK_TICKS\);/, '')));
const schedules = []; let leave; const toasts = []; const players = [];
const ctx = {
	Math, Number, Object, inArena: arena.inArena, ...T,
	showToast: (p, raw) => toasts.push([p.name, raw]),
	system: { runSchedule: (cb, n) => schedules.push([n, cb]) },
	world: { getPlayers: () => players.values(), events: { playerLeave: { subscribe: cb => { leave = cb; } } } }
};
vm.runInNewContext(src + '\nglobalThis.M={zoneOf,playlistFor,pickTrack,musicStep,startTrack,NETHER,GAP,ZONE_PAUSE,getVolume,setVolume,unlockedDiscs,nowPlaying,playNow,nextTrack,setMusicOff,MUSIC_OFF,DISC_MODE,DISC_SCAN_TICKS};', ctx);
const M = ctx.M;

// Треки: у каждого файл, длина, название и автор; плейлисты из существующих треков, без повторов
for (const t of T.TRACKS) assert.ok(t.file && t.seconds > 30 && t.title && t.author, t.id);
assert.equal(new Set(T.TRACKS.map(t => t.id)).size, T.TRACKS.length);
for (const [zone, list] of Object.entries(T.PLAYLISTS)) { assert.ok(list.length > 1, zone); assert.equal(new Set(list).size, list.length); for (const id of list) assert.ok(T.TRACK[id], id); }
assert.deepEqual([T.PLAYLISTS.world.length, T.PLAYLISTS.nether.length, T.PLAYLISTS.boss.length], [22, 7, 6]);
assert.equal(T.DISCS.length, 15); assert.ok(T.DISCS.every(d => /^minecraft:record_[a-z0-9]+$/.test(d.item)));
assert.equal(T.TRACK.emerald_tycoon.author, 'Razzleberries');

// Зоны: арена Хранителя > Незер (−15 0 −23 … 15 30 −52) > мир
assert.equal(M.zoneOf({ x: 528, y: -55, z: -40 }), 'boss');
assert.equal(M.zoneOf({ x: 0, y: 5, z: -33 }), 'nether'); assert.equal(M.zoneOf({ x: 15.9, y: 30.5, z: -52 }), 'nether');
assert.equal(M.zoneOf({ x: 0, y: 5, z: -22 }), 'world'); assert.equal(M.zoneOf({ x: 16, y: 5, z: -33 }), 'world');
assert.equal(M.zoneOf({ x: 0, y: 5, z: -33 }, 'minecraft:nether'), 'world');
// Плейлист: на арене — всегда её; «Мои пластинки» — только если есть хоть одна
assert.equal(M.playlistFor('boss', true, ['cat']).key, 'boss');
assert.equal(M.playlistFor('world', true, ['cat']).key, 'discs'); assert.equal(M.playlistFor('world', true, []).key, 'world');
assert.equal(M.playlistFor('nether', false, ['cat']).key, 'nether');
// Случайный трек — не тот же
for (let i = 0; i < 50; i++) assert.notEqual(M.pickTrack(['a', 'b', 'c'], 'b', () => i / 50), 'b');
assert.equal(M.pickTrack(['a'], 'a'), 'a');

// Шаги: вход — всё глушится, через ZONE_PAUSE трек; до конца трека тихо; после — GAP тишины; потом другой трек
const W = { key: 'world', list: T.PLAYLISTS.world, off: false, volume: 100, rand: () => 0 };
let r = M.musicStep(undefined, { ...W, now: 0 });
assert.deepEqual([...r.commands], ['stopsound @s']);
r = M.musicStep(r.state, { ...W, now: M.ZONE_PAUSE });
assert.equal(r.commands.length, 1); assert.match(r.commands[0], /^playsound shop\.music\.emerald_tycoon @s ~ ~ ~ 1\.00$/);
const end = r.state.endsAt; assert.equal(end, M.ZONE_PAUSE + 75);
assert.equal(M.musicStep(r.state, { ...W, now: end - 1 }).commands.length, 0);
r = M.musicStep(r.state, { ...W, now: end }); assert.equal(r.commands.length, 0); assert.equal(r.state.track, null);
assert.equal(M.musicStep(r.state, { ...W, now: end + M.GAP - 1 }).commands.length, 0);
r = M.musicStep(r.state, { ...W, now: end + M.GAP }); assert.match(r.commands[0], /^playsound shop\.music\.stand_tall /);
// Смена зоны: стоп старого, пауза, трек новой зоны (громкость 40 % — 0.40)
const N = { key: 'nether', list: T.PLAYLISTS.nether, off: false, volume: 40, rand: () => 0 };
let t0 = end + M.GAP + 10;
r = M.musicStep(r.state, { ...N, now: t0 }); assert.deepEqual([...r.commands], ['stopsound @s shop.music.stand_tall']);
r = M.musicStep(r.state, { ...N, now: t0 + M.ZONE_PAUSE }); assert.match(r.commands[0], /^playsound shop\.music\.rubedo @s ~ ~ ~ 0\.40$/);
// Выключили — стоп; включили — снова пауза и трек; громкость 0 — как выключено
let off = M.musicStep(r.state, { ...N, now: t0 + 5, off: true }); assert.deepEqual([...off.commands], ['stopsound @s shop.music.rubedo']);
assert.equal(M.musicStep(off.state, { ...N, now: t0 + 6, off: true }).commands.length, 0);
let on = M.musicStep(off.state, { ...N, now: t0 + 7 }); assert.equal(on.commands.length, 0);
on = M.musicStep(on.state, { ...N, now: t0 + 7 + M.ZONE_PAUSE }); assert.match(on.commands[0], /^playsound shop\.music\.chrysopoeia /);   // не повтор rubedo
assert.deepEqual([...M.musicStep(on.state, { ...N, now: t0 + 20, volume: 0 }).commands], ['stopsound @s shop.music.chrysopoeia']);

// Цикл и ручные действия на «игроке»
const mk = (name, loc, tags = []) => { const s = new Set(tags), cmds = [];
	return { name, location: loc, dimension: { id: 'minecraft:overworld' }, cmds, getTags: () => [...s], hasTag: t => s.has(t), addTag: t => s.add(t), removeTag: t => s.delete(t),
		runCommandAsync: c => { cmds.push(c); return Promise.resolve(); },
		getComponent: () => ({ container: { size: 3, getItem: i => i === 1 ? { typeId: 'minecraft:record_ward' } : undefined } }) }; };
const P = mk('P', { x: 0, y: 5, z: 0 }), B = mk('Bot', { x: 0, y: 5, z: 0 }, ['role:bot']);
players.push(P, B);
const [sec] = schedules.filter(([n]) => n === 20).map(([, cb]) => cb), [scan] = schedules.filter(([n]) => n === M.DISC_SCAN_TICKS).map(([, cb]) => cb);
for (let i = 0; i < M.ZONE_PAUSE + 1; i++) sec();
assert.ok(P.cmds.includes('stopsound @s') && P.cmds.some(c => c.startsWith('playsound shop.music.'))); assert.equal(B.cmds.length, 0);
assert.ok(M.nowPlaying(P) && T.PLAYLISTS.world.includes(M.nowPlaying(P).id)); assert.equal(toasts.length, 0);   // сам выбранный — без плашки
// Следующий трек — плашка «Сейчас играет: <название> от <автор>»
const before = M.nowPlaying(P).id; assert.ok(M.nextTrack(P)); assert.notEqual(M.nowPlaying(P).id, before);
assert.equal(toasts.length, 1); const raw = toasts[0][1][0];
assert.equal(raw.translate, 'music.now_playing'); assert.deepEqual([...raw.with.rawtext.map(x => x.text)], [M.nowPlaying(P).title, M.nowPlaying(P).author]);
// Громкость: тег music:volume:N, по умолчанию 100, в пределах 0–100
assert.equal(M.getVolume(P), 100); M.setVolume(P, 37); assert.equal(M.getVolume(P), 37); M.setVolume(P, 250); assert.equal(M.getVolume(P), 100);
assert.equal(P.getTags().filter(t => t.startsWith('music:volume:')).length, 1);
// Пластинки: из инвентаря запоминаются тегом, за Хранителя — по boss:disc:*; в режиме пластинок играет выбранная
assert.deepEqual([...M.unlockedDiscs(P)], []); scan(); assert.deepEqual([...M.unlockedDiscs(P)], ['ward']);
P.addTag('boss:disc:record_5'); assert.deepEqual([...M.unlockedDiscs(P)], ['ward', '5']);
assert.ok(!M.playNow(P, 'ward'));                      // в режиме «музыка сервера» пластинки нет в плейлисте
P.addTag(M.DISC_MODE); assert.ok(M.playNow(P, 'ward')); assert.equal(M.nowPlaying(P).id, 'ward');
P.addTag('music:disc:cat'); P.location = { x: 528, y: -55, z: -40 };
assert.ok(!M.playNow(P, 'cat') && M.playNow(P, 'ward'));   // на арене — только её музыка (ward в ней есть)
// Выключили в меню — трек останавливается сразу
P.location = { x: 0, y: 5, z: 0 }; M.playNow(P, '5'); P.cmds.length = 0; M.setMusicOff(P, true);
assert.deepEqual([...P.cmds], ['stopsound @s shop.music.5']); assert.equal(M.nowPlaying(P), undefined); assert.ok(!M.nextTrack(P));
leave({ playerName: 'P' }); assert.equal(M.nowPlaying(P), undefined);

// Ресурс-пак: на каждый трек — shop.music.<id>, категория record, не объёмный, поток; встроенная музыка заглушена
const defs = JSON.parse(read(new URL('sounds/sound_definitions.json', rp)));
for (const t of T.TRACKS) {
	const d = defs[T.soundOf(t.id)]; assert.ok(d, t.id); assert.equal(d.category, 'record');
	assert.deepEqual([...d.sounds].map(s => [s.name, s.is3D, s.stream]), [[t.file, false, true]], t.id);
}
for (const k of ['music.game', 'music.game.creative', 'music.game.deep_dark', 'music.game.nether', 'music.game.water']) assert.deepEqual(defs[k]?.sounds, [], k);
assert.ok(!defs['music.menu'], 'музыку главного меню не трогаем');
assert.ok(fs.existsSync(new URL('sounds/music/main.theme.ogg', rp)) || !fs.existsSync(new URL('sounds/music/', rp)), 'файлы звуков — только в мире');

// Меню и ключи: все chat.music.* / menu.music.* / music.* из скриптов — на 4 языках, ошибки — в ERROR_KEYS
const menu = read(new URL('scripts/menu/main_menu.js', bp));
const used = new Set([...(menu + src).matchAll(/['%](?:chat\.music|menu\.music|music)\.[a-z_.]+[a-z]/g)].map(m => m[0].slice(1)));
assert.ok(used.has('music.now_playing') && used.has('menu.music.button.next') && used.size >= 20);
for (const l of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) {
	const keys = new Set(read(new URL(`texts/${l}.lang`, rp)).split(/\r?\n/).map(x => x.split('=')[0]));
	for (const k of used) assert.ok(keys.has(k), `${l}: нет ${k}`);
}
const errors = read(new URL('scripts/system/ui/error_keys.js', bp));
for (const k of ['chat.music.error.no_discs', 'chat.music.error.off', 'chat.music.error.arena']) assert.ok(errors.includes(`'${k}'`), k);
assert.ok(!menu.includes('stopsound @s music.game'));
assert.match(read(new URL('dialogue/fallback_menu.json', bp)), /stopsound @p\[r=4\]"/);

console.log('PASS: music zones (boss > nether > world), playlists, gap/pause/stop/volume, discs and toast, RP events 2D record, built-in music muted, 4-locale keys.');
