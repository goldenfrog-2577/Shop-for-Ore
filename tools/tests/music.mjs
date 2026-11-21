// Контракт каталога, персонального плеера и миграции коллекции на Bedrock 26.60.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../../', import.meta.url);
const behaviorPack = new URL('behavior_packs/main-addon-shop_for_ore/', root),
	resourcePack = new URL('resource_packs/main-rp-shop_for_ore/', root);
const read = (url) => fs.readFileSync(url, 'utf8');
const catalog = await import(new URL('scripts/system/ui/music_tracks.js', behaviorPack));
const src = read(new URL('scripts/system/ui/music.js', behaviorPack))
	.replace(/^import .*;\r?\n/gm, '')
	.replace(/\bexport (?=(?:async )?function|const)/g, '');
const arena = await import(
	'data:text/javascript,' +
		encodeURIComponent(
			read(new URL('scripts/system/boss/arena.js', behaviorPack))
				.replace(/^import .*;\r?\n/gm, '')
				.replace(/system\.runInterval\([\s\S]*?\n\}, CHECK_TICKS\);/, '')
		)
);
const timers = [],
	events = {},
	toasts = [],
	players = [];
const system = {
	currentTick: 0,
	runInterval(cb, interval) {
		timers.push({ cb, interval, at: interval });
	},
	runTimeout(cb, ticks) {
		timers.push({ cb, at: this.currentTick + ticks });
	}
};
function advance(ticks) {
	for (let i = 0; i < ticks; i++) {
		system.currentTick++;
		for (const timer of timers.filter((t) => t.at === system.currentTick)) {
			timer.at += timer.interval || Infinity;
			timer.cb();
		}
	}
}
const afterEvents = Object.fromEntries(
	['soundCompleted', 'playerLeave', 'playerInventoryItemChange'].map((name) => [
		name,
		{
			subscribe(cb, options) {
				events[name] = cb;
				if (options) assert.equal(options.includeItems.length, 22);
			}
		}
	])
);
const runtime = {
	...catalog,
	inArena: arena.inArena,
	system,
	world: { afterEvents, getPlayers: () => players },
	showToast: (p, raw) => toasts.push(raw),
	console
};
vm.runInNewContext(
	src +
		'\nglobalThis.music={zoneOf,playlistFor,pickTrack,playNow,playback,playlistOf,setVolume,setMusicOff,setPaused,seek,unlockedDiscs};',
	runtime
);
const music = runtime.music;

assert.equal(catalog.TRACKS.length, 75);
assert.equal(new Set(catalog.TRACKS.map((t) => t.id)).size, 75);
assert.deepEqual(catalog.PLAYLISTS.boss, ['ancestry', '5', '11', '13', 'eld_unknown', 'deeper']);
assert.equal(catalog.PLAYLISTS.world.length, 43);
assert.equal(catalog.PLAYLISTS.nether.length, 7);
assert.equal(catalog.DISCS.length, 22);
assert.ok(catalog.DISCS.every((d) => d.icon && d.item === 'minecraft:music_disc_' + d.id));
for (const list of Object.values(catalog.PLAYLISTS)) {
	assert.equal(new Set(list).size, list.length);
	assert.ok(list.every((id) => catalog.TRACK[id]));
}
const metadata = JSON.parse(read(new URL('sounds/sound_definitions.json', behaviorPack)))[
	'minecraft:server_sound_definitions'
];
assert.equal(metadata.length, 75);
for (const t of catalog.TRACKS) {
	const d = metadata.find((d) => d.sound_event_name === catalog.soundOf(t.id));
	assert.equal(d.music_info.title, t.title);
	assert.equal(d.music_info.artist, t.author);
	assert.equal(d.duration_info.mode, 'real_time');
	assert.ok(d.duration_info.seconds > 30);
}

function player(id) {
	const tags = new Set(),
		props = new Map(),
		sounds = [],
		stopped = [];
	let scans = 0;
	return {
		id,
		name: id,
		tags,
		props,
		sounds,
		stopped,
		get scans() {
			return scans;
		},
		location: { x: 0, y: 2, z: 0 },
		dimension: { id: 'minecraft:overworld' },
		hasTag: (t) => tags.has(t),
		addTag: (t) => tags.add(t),
		removeTag: (t) => tags.delete(t),
		getTags: () => [...tags],
		getDynamicProperty: (t) => props.get(t),
		setDynamicProperty: (k, v) => props.set(k, v),
		getComponent: () => {
			scans++;
			return { container: { size: 1, getItem: () => ({ typeId: catalog.TRACK.cat.item }) } };
		},
		stopSound: (name) => stopped.push(name),
		playSound(name) {
			const sound = {
				id: id + sounds.length,
				name,
				volume: 1,
				paused: false,
				stopped: false,
				durationInfo: { duration: 100, getPlaybackPosition: () => sound.pos || 0 },
				stop() {
					this.stopped = true;
				},
				setVolume(v) {
					this.volume = v;
				},
				fade(sec, to) {
					this.fadeTo = to;
				},
				pause() {
					this.paused = true;
				},
				resume() {
					this.paused = false;
				},
				seekTo(sec) {
					this.pos = sec;
				}
			};
			sounds.push(sound);
			return sound;
		}
	};
}
// Вход после /reload: старый звук останавливается только у его владельца.
const listener = player('A'),
	neighbor = player('B'),
	bot = player('Bot');
bot.addTag('role:bot');
listener.props.set('sfo:music_current', 'home');
players.push(listener, neighbor, bot);
advance(80);
assert.deepEqual(listener.stopped, [catalog.soundOf('home')]);
assert.equal(bot.sounds.length, 0);
assert.equal(listener.scans, 1);
assert.equal(neighbor.sounds.length, 1);
assert.ok(listener.hasTag('music:disc:cat'));

// Пополнение коллекции через инвентарь и ручное управление у первого игрока.
events.playerInventoryItemChange({ player: listener, itemStack: { typeId: 'minecraft:music_disc_creator_music_box' } });
assert.ok(music.unlockedDiscs(listener).includes('creator_music_box'));
assert.ok(music.playNow(listener, 'home'));
const firstTrack = listener.sounds.at(-1);
const neighborTrack = neighbor.sounds[0];
music.setVolume(listener, 40);
assert.equal(firstTrack.volume, 0.4);
assert.equal(neighborTrack.volume, 0);
music.setPaused(listener, firstTrack.id, true);
music.seek(listener, firstTrack.id, 53);
assert.equal(music.playback(listener).position, 53);
assert.equal(firstTrack.paused, true);
music.setPaused(listener, firstTrack.id, false);
assert.equal(firstTrack.paused, false);

// Смена зон: Незер затухает при выходе, на арене приоритет у её подборки.
listener.location = { x: 0, y: 5, z: -33 };
advance(20);
assert.equal(firstTrack.fadeTo, 0);
advance(60);
assert.ok(catalog.PLAYLISTS.nether.includes(music.playback(listener).track.id));
assert.ok(firstTrack.stopped);
assert.equal(neighborTrack.stopped, false);
listener.location = { x: 528, y: -50, z: -73 };
listener.addTag('music:discs');
advance(80);
assert.equal(music.playlistOf(listener).key, 'boss');
assert.equal(music.playNow(listener, 'ward'), false);
assert.ok(music.playNow(listener, 'eld_unknown'));
const arenaTrack = listener.sounds.at(-1);
music.seek(listener, firstTrack.id, 12);
assert.equal(arenaTrack.pos, undefined);

// Запоздалое событие старого экземпляра не должно завершить новый трек.
events.soundCompleted({ soundInstanceId: firstTrack.id });
assert.equal(music.playback(listener).track.id, 'eld_unknown');
events.soundCompleted({ soundInstanceId: arenaTrack.id });
advance(2380);
assert.equal(music.playback(listener), undefined);
advance(20);
assert.ok(music.playback(listener));
music.setMusicOff(listener, true);
assert.equal(music.playback(listener), undefined);
assert.equal(neighborTrack.stopped, false);
music.setMusicOff(listener, false);
advance(80);
assert.ok(music.playback(listener));
music.setVolume(listener, 0);
assert.equal(music.playback(listener), undefined);
events.playerLeave({ playerId: listener.id });
assert.equal(music.playback(listener), undefined);
assert.equal(listener.scans, 1);
assert.ok(toasts.length);

const defs = JSON.parse(read(new URL('sounds/sound_definitions.json', resourcePack))).sound_definitions;
for (const t of catalog.TRACKS) {
	const d = defs[catalog.soundOf(t.id)];
	assert.ok(d, t.id);
	assert.equal(d.category, 'record');
	assert.deepEqual(
		[...d.sounds].map((s) => [s.name, s.is3D, s.stream]),
		[[t.file, false, true]],
		t.id
	);
}
for (const k of [
	'music.game',
	'music.game.creative',
	'music.game.deep_dark',
	'music.game.nether',
	'music.game.water'
])
	assert.deepEqual(defs[k]?.sounds, [], k);
assert.ok(!defs['music.menu'], 'музыку главного меню не трогаем');
assert.ok(
	fs.existsSync(new URL('sounds/music/main.theme.ogg', resourcePack)) || !fs.existsSync(new URL('sounds/music/', resourcePack)),
	'файлы звуков — только в мире'
);

// Меню и ключи: все chat.music.* / menu.music.* / music.* из скриптов — на 4 языках, ошибки — в ERROR_KEYS
const menu = read(new URL('scripts/menu/main_menu.js', behaviorPack));
const used = new Set(
	[...(menu + src).matchAll(/['%](?:chat\.music|menu\.music|music)\.[a-z_.]+[a-z]/g)].map((m) => m[0].slice(1))
);
used.delete('menu.music.choose');
used.delete('menu.music.hint'); // шаблонные ключи — проверяются по вариантам
for (const key of ['world', 'nether', 'boss', 'discs']) used.add(`menu.music.choose.${key}`);
assert.ok(used.has('music.now_playing') && used.has('menu.music.button.choose') && used.size >= 20);
// Открываем настоящую форму выбора с подменённым выводом Bedrock.
// Список кнопок и нажатие проверяются независимо от форматирования исходника.
let form;
let selectedId;
let returned = false;
const menuPlayer = { hasTag: () => false };
const subscribe = { subscribe() {} };
const menuContext = {
	...catalog,
	MUSIC_OFF: 'player:music_off',
	DISC_MODE: 'music:discs',
	BOSS_DISCS: ['5', 'otherside'],
	unlockedDiscs: () => ['cat'],
	getVolume: () => 100,
	playlistOf: () => ({ key: 'boss', list: catalog.PLAYLISTS.boss }),
	nowPlaying: () => catalog.TRACK.ancestry,
	backButton: (run) => ({ text: 'Назад', run }),
	playNow: (_, id) => {
		selectedId = id;
		return true;
	},
	showMenu: (_, title, body, items) => {
		form = { title, body, items };
	},
	world: {
		afterEvents: { playerLeave: subscribe, playerSpawn: subscribe, playerInventoryItemChange: subscribe }
	},
	system: { runInterval() {} }
};
vm.runInNewContext(
	menu.replace(/^import .*;\r?\n/gm, '')
		.replace(/^export \{[^}]+\};$/gm, '')
		.replace(/\bexport (?=function|const)/g, ''),
	menuContext
);
menuContext.musicChoose(menuPlayer, () => {
	returned = true;
});
assert.equal(form.title, '%menu.music.choose.title');
assert.ok(form.body.includes('%menu.music.choose.boss'));
const trackButtons = form.items.slice(0, -1);
assert.equal(trackButtons.length, catalog.PLAYLISTS.boss.length);
for (const [index, button] of trackButtons.entries()) {
	const id = catalog.PLAYLISTS.boss[index];
	assert.ok(button.text.includes(catalog.trackTitle(catalog.TRACK[id])));
	selectedId = undefined;
	returned = false;
	button.run();
	assert.equal(selectedId, id);
	assert.ok(returned);
}
// У открытой пластинки видны имя и иконка. Для закрытой подсказка зависит от места добычи.
menuContext.musicCollection(menuPlayer, () => {});
assert.equal(form.title, '%menu.music.collection.title');
const discButtons = form.items.slice(0, -1);
assert.equal(discButtons.length, catalog.DISCS.length);
for (const [index, button] of discButtons.entries()) {
	const disc = catalog.DISCS[index];
	if (disc.id === 'cat') {
		assert.equal(button.icon, disc.icon);
		assert.ok(button.text.includes('cat'));
	} else {
		const source = ['5', 'otherside'].includes(disc.id) ? 'boss' : 'mine';
		assert.equal(button.text, `§8???\n%menu.music.hint.${source}`);
		assert.equal(button.icon, 'textures/ui/lock');
	}
}

for (const l of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) {
	const keys = new Set(
		read(new URL(`texts/${l}.lang`, resourcePack))
			.split(/\r?\n/)
			.map((x) => x.split('=')[0])
	);
	for (const k of used) assert.ok(keys.has(k), `${l}: нет ${k}`);
}
const errors = read(new URL('scripts/system/ui/error_keys.js', behaviorPack));
for (const k of ['chat.music.error.no_discs', 'chat.music.error.off', 'chat.music.error.arena'])
	assert.ok(errors.includes(`'${k}'`), k);
assert.ok(!menu.includes('stopsound @s music.game'));
assert.match(read(new URL('dialogue/fallback_menu.json', behaviorPack)), /stopsound @initiator"/);

console.log(
	'PASS: music zones (boss > nether > world), playlists, gap/pause/stop/volume, discs and toast, RP events 2D record, built-in music muted, 4-locale keys.'
);
