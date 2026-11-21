// Персональный плеер карты. Серверные определения задают реальную длительность,
// а ресурс-пак воспроизводит плоский звук в категории «Проигрыватели».
import { system, world } from '@minecraft/server';
import { inArena } from '../boss/arena.js';
import { showToast } from './toast.js';
import { TRACK, DISCS, PLAYLISTS, soundOf, trackTitle, trackArtist, trackPart } from './music_tracks.js';

export const MUSIC_OFF = 'player:music_off';
export const DISC_MODE = 'music:discs';
export const DISC_TAG = 'music:disc:';
const VOLUME_TAG = 'music:volume:';
const SAVED_TRACK = 'sfo:music_current';
const FADE_SECONDS = 1;
const TICKS = 20;
export const ZONE_PAUSE = 3;
export const GAP = 120;
export const NETHER = { min: [-15, 0, -52], max: [15, 30, -23] };
const sessions = new Map();
const discItems = new Map(DISCS.map(d => [d.item, d.id]));

const inBox = ({ min, max }, l) => l.x >= min[0] && l.x < max[0] + 1 && l.y >= min[1] && l.y < max[1] + 1 && l.z >= min[2] && l.z < max[2] + 1;
export function zoneOf(location, dimensionId = 'minecraft:overworld') {
	if (inArena(location, dimensionId)) return 'boss';
	return dimensionId === 'minecraft:overworld' && inBox(NETHER, location) ? 'nether' : 'world';
}
export function playlistFor(zone, discMode, discs) {
	if (zone === 'boss') return { key: 'boss', list: PLAYLISTS.boss };
	if (discMode && discs.length) return { key: 'discs', list: discs };
	return { key: zone, list: PLAYLISTS[zone] };
}
export function pickTrack(list, last, rand = Math.random) {
	const pool = list.length > 1 ? list.filter(id => id !== last) : list;
	return pool[Math.floor(rand() * pool.length)];
}
export const unlockedDiscs = p => DISCS.filter(d => p.hasTag(DISC_TAG + d.id) || p.hasTag(`boss:disc:record_${d.id}`)).map(d => d.id);
export function playlistOf(p) {
	const zone = zoneOf(p.location, p.dimension.id);
	const discs = zone !== 'boss' && p.hasTag(DISC_MODE) ? unlockedDiscs(p) : [];
	return playlistFor(zone, discs.length > 0, discs);
}
export function getVolume(p) {
	const tag = p.getTags().find(t => t.startsWith(VOLUME_TAG));
	const n = tag ? Number(tag.slice(VOLUME_TAG.length)) : 100;
	return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 100;
}

function rememberDisc(p, item) {
	const id = discItems.get(item?.typeId);
	if (id && !p.hasTag(DISC_TAG + id)) p.addTag(DISC_TAG + id);
}
world.afterEvents.playerInventoryItemChange.subscribe(({ player, itemStack }) => {
	if (!player.hasTag('role:bot')) rememberDisc(player, itemStack);
}, { includeItems: [...discItems.keys()], ignoreQuantityChange: true });

function session(p) {
	let s = sessions.get(p.id);
	if (s) return s;
	// При /reload ссылка SoundInstance теряется. Останавливаем только последнюю музыку карты.
	const saved = p.getDynamicProperty(SAVED_TRACK);
	if (typeof saved === 'string' && TRACK[saved]) {
		p.stopSound(soundOf(saved));
		p.setDynamicProperty(SAVED_TRACK, undefined);
	}
	// Единственная сверка старого инвентаря за сессию. Далее достаточно событий слота.
	const bag = p.getComponent('minecraft:inventory')?.container;
	if (bag) for (let i = 0; i < bag.size; i++) rememberDisc(p, bag.getItem(i));
	s = { player: p, key: null, active: null, last: null, nextAt: 0 };
	sessions.set(p.id, s);
	return s;
}

function clearTrack(s) {
	s.active = null;
	s.player.setDynamicProperty(SAVED_TRACK, undefined);
}
function stop(s) {
	if (!s.active) return;
	const a = s.active;
	try { a.sound.stop(); } finally { clearTrack(s); }
}
function start(s, id, volume, fadeIn) {
	stop(s);
	const sound = s.player.playSound(soundOf(id), { volume: 1 });
	try {
		sound.setVolume(fadeIn ? 0 : volume / 100);
		if (fadeIn) sound.fade(FADE_SECONDS, volume / 100);
		s.player.setDynamicProperty(SAVED_TRACK, id);
		s.active = { id, sound, paused: false, fading: false };
		s.last = id;
	} catch (error) { sound.stop(); throw error; }
}
function finish(s) {
	clearTrack(s);
	s.nextAt = system.currentTick + GAP * TICKS;
}
world.afterEvents.soundCompleted.subscribe(({ soundInstanceId }) => {
	for (const s of sessions.values()) {
		const a = s.active;
		if (a?.sound.id !== soundInstanceId) continue;
		if (a.fading) clearTrack(s); else finish(s);
		break;
	}
});

function update(p) {
	const s = session(p);
	const volume = getVolume(p);
	if (!volume || p.hasTag(MUSIC_OFF)) {
		stop(s);
		s.key = null;
		return;
	}
	const { key, list } = playlistOf(p);
	if (s.key !== key) {
		s.key = key;
		s.nextAt = system.currentTick + ZONE_PAUSE * TICKS;
		const a = s.active;
		if (a && !a.paused && !a.fading) {
			const playerId = p.id;
			a.fading = true;
			a.sound.fade(FADE_SECONDS, 0);
			system.runTimeout(() => { if (s.active === a && sessions.get(playerId) === s) stop(s); }, TICKS);
		} else if (a?.paused) stop(s);
		return;
	}
	if (s.active || system.currentTick < s.nextAt) return;
	s.nextAt = system.currentTick + GAP * TICKS;
	start(s, pickTrack(list, s.last), volume, true);
}
system.runInterval(() => {
	for (const p of world.getPlayers()) {
		if (p.hasTag('role:bot')) continue;
		try { update(p); } catch (e) { console.warn(`[Shop for Ore] Music (${p.name}): ${e}`); }
	}
}, TICKS);
world.afterEvents.playerLeave.subscribe(e => sessions.delete(e.playerId));

export function setVolume(p, value) {
	if (!Number.isFinite(value)) return;
	const v = Math.max(0, Math.min(100, Math.round(value)));
	for (const t of p.getTags()) if (t.startsWith(VOLUME_TAG)) p.removeTag(t);
	p.addTag(VOLUME_TAG + v);
	const s = sessions.get(p.id);
	if (!s) return;
	if (!v) { stop(s); s.key = null; }
	else if (s.active && !s.active.fading) s.active.sound.setVolume(v / 100);
}
export function setMusicOff(p, off) {
	if (off) p.addTag(MUSIC_OFF); else p.removeTag(MUSIC_OFF);
	const s = sessions.get(p.id);
	if (off && s) { stop(s); s.key = null; }
}
export function playback(p) {
	const a = sessions.get(p.id)?.active;
	if (!a || a.fading) return undefined;
	const info = a.sound.durationInfo;
	return { track: TRACK[a.id], instanceId: a.sound.id, paused: a.paused, position: info?.getPlaybackPosition(), duration: info?.duration };
}
export const nowPlaying = p => playback(p)?.track;
/** Формы могут оставаться открытыми после смены трека или зоны. */
function selected(p, instanceId) {
	const s = sessions.get(p.id), a = s?.active;
	if (!a || a.fading || a.sound.id !== instanceId || s.key !== playlistOf(p).key) return undefined;
	return a;
}
export function setPaused(p, instanceId, pause) {
	const a = selected(p, instanceId);
	if (!a || a.paused === pause) return;
	if (pause) a.sound.pause(); else a.sound.resume();
	a.paused = pause;
}
export function seek(p, instanceId, seconds) {
	const a = selected(p, instanceId), duration = a?.sound.durationInfo?.duration;
	if (duration > 0 && Number.isFinite(seconds)) a.sound.seekTo(Math.max(0, Math.min(seconds, duration - 0.01)));
}
export function playNow(p, id) {
	const s = session(p), { key, list } = playlistOf(p), volume = getVolume(p);
	if (!volume || p.hasTag(MUSIC_OFF) || !list.includes(id)) return false;
	s.key = key;
	start(s, id, volume, false);
	const track = TRACK[id];
	showToast(p, [{ translate: 'music.now_playing', with: { rawtext: [trackPart(trackTitle(track)), trackPart(trackArtist(track))] } }]);
	return true;
}
