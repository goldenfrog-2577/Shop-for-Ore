// Контракт каталога, персонального плеера и миграции коллекции на Bedrock 26.60.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../../', import.meta.url);
const bp = new URL('behavior_packs/main-addon-shop_for_ore/', root), rp = new URL('resource_packs/main-rp-shop_for_ore/', root);
const read = url => fs.readFileSync(url, 'utf8');
const T = await import(new URL('scripts/system/ui/music_tracks.js', bp));
const src = read(new URL('scripts/system/ui/music.js', bp)).replace(/^import .*;\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');
const arena = await import('data:text/javascript,' + encodeURIComponent(read(new URL('scripts/system/boss/arena.js', bp)).replace(/^import .*;\r?\n/gm, '').replace(/system\.runInterval\([\s\S]*?\n\}, CHECK_TICKS\);/, '')));
const timers = [], events = {}, toasts = [], players = [];
const system = {
	currentTick: 0,
	runInterval(cb, interval) { timers.push({ cb, interval, at: interval }); },
	runTimeout(cb, ticks) { timers.push({ cb, at: this.currentTick + ticks }); }
};
function advance(ticks) {
	for (let i = 0; i < ticks; i++) {
		system.currentTick++;
		for (const timer of timers.filter(t => t.at === system.currentTick)) {
			timer.at += timer.interval || Infinity;
			timer.cb();
		}
	}
}
const afterEvents = Object.fromEntries(['soundCompleted','playerLeave','playerInventoryItemChange'].map(name => [name, { subscribe(cb, options) { events[name] = cb; if (options) assert.equal(options.includeItems.length,22); } }]));
const ctx = { ...T, inArena: arena.inArena, system, world: { afterEvents, getPlayers: () => players }, showToast: (p, raw) => toasts.push(raw), console };
vm.runInNewContext(src + '\nglobalThis.M={zoneOf,playlistFor,pickTrack,playNow,playback,playlistOf,setVolume,setMusicOff,setPaused,seek,unlockedDiscs};', ctx);
const M = ctx.M;

assert.equal(T.TRACKS.length,75);
assert.equal(new Set(T.TRACKS.map(t => t.id)).size,75);
assert.deepEqual(T.PLAYLISTS.boss,['ancestry','5','11','13','eld_unknown','deeper']);
assert.equal(T.PLAYLISTS.world.length,43);
assert.equal(T.PLAYLISTS.nether.length,7);
assert.equal(T.DISCS.length,22);
assert.ok(T.DISCS.every(d => d.icon && d.item === 'minecraft:music_disc_' + d.id));
for (const list of Object.values(T.PLAYLISTS)) {
	assert.equal(new Set(list).size,list.length);
	assert.ok(list.every(id => T.TRACK[id]));
}
const metadata = JSON.parse(read(new URL('sounds/sound_definitions.json',bp)))['minecraft:server_sound_definitions'];
assert.equal(metadata.length,75);
for (const t of T.TRACKS) {
	const d = metadata.find(d => d.sound_event_name === T.soundOf(t.id));
	assert.equal(d.music_info.title,t.title); assert.equal(d.music_info.artist,t.author);
	assert.equal(d.duration_info.mode,'real_time'); assert.ok(d.duration_info.seconds > 30);
}

function player(id) {
	const tags = new Set(), props = new Map(), sounds = [], stopped = [];
	let scans = 0;
	return { id, name:id, tags, props, sounds, stopped, get scans(){return scans;},
		location:{x:0,y:2,z:0}, dimension:{id:'minecraft:overworld'},
		hasTag:t=>tags.has(t),addTag:t=>tags.add(t),removeTag:t=>tags.delete(t),getTags:()=>[...tags],
		getDynamicProperty:t=>props.get(t),setDynamicProperty:(k,v)=>props.set(k,v),
		getComponent:()=>{scans++;return {container:{size:1,getItem:()=>({typeId:T.TRACK.cat.item})}};},
		stopSound:name=>stopped.push(name),playSound(name){
			const a = { id:id+sounds.length,name,volume:1,paused:false,stopped:false,
				durationInfo:{duration:100,getPlaybackPosition:()=>a.pos || 0},
				stop(){this.stopped=true;},setVolume(v){this.volume=v;},fade(sec,to){this.fadeTo=to;},
				pause(){this.paused=true;},resume(){this.paused=false;},seekTo(sec){this.pos=sec;}
			};sounds.push(a);return a;
		} };
}
const a=player('A'), b=player('B'), bot=player('Bot');
bot.addTag('role:bot');a.props.set('sfo:music_current','home');players.push(a,b,bot);
advance(80);
assert.deepEqual(a.stopped,[T.soundOf('home')]);assert.equal(bot.sounds.length,0);
assert.equal(a.scans,1);assert.equal(b.sounds.length,1);
assert.ok(a.hasTag('music:disc:cat'));
events.playerInventoryItemChange({player:a,itemStack:{typeId:'minecraft:music_disc_creator_music_box'}});
assert.ok(M.unlockedDiscs(a).includes('creator_music_box'));
assert.ok(M.playNow(a,'home'));const act=a.sounds.at(-1);const other=b.sounds[0];
M.setVolume(a,40);assert.equal(act.volume,.4);assert.equal(other.volume,0);
M.setPaused(a,act.id,true);M.seek(a,act.id,53);assert.equal(M.playback(a).position,53);assert.equal(act.paused,true);
M.setPaused(a,act.id,false);assert.equal(act.paused,false);
a.location={x:0,y:5,z:-33};advance(20);assert.equal(act.fadeTo,0);advance(60);
assert.ok(T.PLAYLISTS.nether.includes(M.playback(a).track.id));
assert.ok(act.stopped);assert.equal(other.stopped,false);
a.location={x:528,y:-50,z:-73};a.addTag('music:discs');advance(80);
assert.equal(M.playlistOf(a).key,'boss');assert.equal(M.playNow(a,'ward'),false);
assert.ok(M.playNow(a,'eld_unknown'));const chosen=a.sounds.at(-1);M.seek(a,act.id,12);assert.equal(chosen.pos,undefined);
events.soundCompleted({soundInstanceId:act.id});assert.equal(M.playback(a).track.id,'eld_unknown');
events.soundCompleted({soundInstanceId:chosen.id});advance(2380);assert.equal(M.playback(a),undefined);advance(20);assert.ok(M.playback(a));
M.setMusicOff(a,true);assert.equal(M.playback(a),undefined);assert.equal(other.stopped,false);
M.setMusicOff(a,false);advance(80);assert.ok(M.playback(a));M.setVolume(a,0);assert.equal(M.playback(a),undefined);
events.playerLeave({playerId:a.id});assert.equal(M.playback(a),undefined);
assert.equal(a.scans,1);assert.ok(toasts.length);

const defs = JSON.parse(read(new URL('sounds/sound_definitions.json', rp))).sound_definitions;
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
used.delete('menu.music.choose'); used.delete('menu.music.hint');   // шаблонные ключи — проверяются по вариантам                       // `%menu.music.choose.${key}` — ключ на каждый плейлист
for (const key of ['world', 'nether', 'boss', 'discs']) used.add(`menu.music.choose.${key}`);
assert.ok(used.has('music.now_playing') && used.has('menu.music.button.choose') && used.size >= 20);
// «Выбрать трек» — весь текущий плейлист (музыка зоны или свои пластинки), а не только «Следующий трек»
assert.match(menu, /const \{ key, list \} = playlistOf\(player\)/); assert.match(menu, /run: \(\) => \{ if \(!playNow\(player, id\)\)/);
for (const l of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) {
	const keys = new Set(read(new URL(`texts/${l}.lang`, rp)).split(/\r?\n/).map(x => x.split('=')[0]));
	for (const k of used) assert.ok(keys.has(k), `${l}: нет ${k}`);
}
const errors = read(new URL('scripts/system/ui/error_keys.js', bp));
for (const k of ['chat.music.error.no_discs', 'chat.music.error.off', 'chat.music.error.arena']) assert.ok(errors.includes(`'${k}'`), k);
assert.ok(!menu.includes('stopsound @s music.game'));
assert.match(read(new URL('dialogue/fallback_menu.json', bp)), /stopsound @initiator"/);

console.log('PASS: music zones (boss > nether > world), playlists, gap/pause/stop/volume, discs and toast, RP events 2D record, built-in music muted, 4-locale keys.');
