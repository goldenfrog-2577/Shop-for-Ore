// Персональный плеер карты. Каталог и состав зон находятся в music_tracks.js.
import { system, world } from '@minecraft/server';
import { inArena } from '../boss/arena.js';
import { showToast } from './toast.js';
import { TRACK, DISCS, PLAYLISTS, soundOf, trackTitle, trackArtist, trackPart } from './music_tracks.js';

export const MUSIC_OFF = 'player:music_off';
export const DISC_MODE = 'music:discs';
export const DISC_TAG = 'music:disc:';
const VOLUME_TAG = 'music:volume:';
const SAVED_TRACK = 'sfo:music_current';

const TICKS_PER_SECOND = 20;
const FADE_SECONDS = 1;
export const ZONE_PAUSE = 3; // Секунды после смены плейлиста.
export const GAP = 120;      // Секунды тишины после естественного окончания трека.

const sessions = new Map(); // player.id → состояние персонального плеера до выхода из мира.
const discItems = new Map(DISCS.map(disc => [disc.item, disc.id]));

// «Незер» карты — шахта в Верхнем мире. Верхняя граница входит в область целиком, до края блока.
export const NETHER = { min: [-15, 0, -52], max: [15, 30, -23] };

function inBox({ min, max }, { x, y, z }) {
	return x >= min[0] && x < max[0] + 1
		&& y >= min[1] && y < max[1] + 1
		&& z >= min[2] && z < max[2] + 1;
}

export function zoneOf(location, dimensionId = 'minecraft:overworld') {
	if (inArena(location, dimensionId)) return 'boss';
	if (dimensionId === 'minecraft:overworld' && inBox(NETHER, location)) return 'nether';
	return 'world';
}

export function playlistFor(zone, discMode, discs) {
	// На арене всегда звучит её подборка. В других зонах игрок может выбрать свою коллекцию.
	if (zone === 'boss') return { key: 'boss', list: PLAYLISTS.boss };
	if (discMode && discs.length) return { key: 'discs', list: discs };
	return { key: zone, list: PLAYLISTS[zone] };
}

export function pickTrack(list, last, rand = Math.random) {
	const candidates = list.length > 1 ? list.filter(id => id !== last) : list;
	return candidates[Math.floor(rand() * candidates.length)];
}

export function unlockedDiscs(player) {
	// Пластинки старых наград Хранителя могли сохраниться только в тегах boss:disc:record_*.
	return DISCS
		.filter(disc => player.hasTag(DISC_TAG + disc.id) || player.hasTag(`boss:disc:record_${disc.id}`))
		.map(disc => disc.id);
}

export function playlistOf(player) {
	const zone = zoneOf(player.location, player.dimension.id);
	const discMode = zone !== 'boss' && player.hasTag(DISC_MODE);
	const discs = discMode ? unlockedDiscs(player) : [];
	return playlistFor(zone, discMode, discs);
}

export function getVolume(player) {
	const tag = player.getTags().find(tag => tag.startsWith(VOLUME_TAG));
	const volume = tag ? Number(tag.slice(VOLUME_TAG.length)) : 100;
	return Number.isFinite(volume) ? Math.min(100, Math.max(0, Math.round(volume))) : 100;
}

function rememberDisc(player, item) {
	const id = discItems.get(item?.typeId);
	if (id && !player.hasTag(DISC_TAG + id)) player.addTag(DISC_TAG + id);
}

world.afterEvents.playerInventoryItemChange.subscribe(({ player, itemStack }) => {
	if (!player.hasTag('role:bot')) rememberDisc(player, itemStack);
}, {
	includeItems: [...discItems.keys()],
	ignoreQuantityChange: true
});

function sessionFor(player) {
	const existing = sessions.get(player.id);
	if (existing) return existing;

	// После /reload игра может ещё воспроизводить звук, а ссылка SoundInstance уже потеряна.
	// Сохранённый ID позволяет остановить именно музыку карты у этого игрока.
	const savedTrack = player.getDynamicProperty(SAVED_TRACK);
	if (typeof savedTrack === 'string' && TRACK[savedTrack]) {
		player.stopSound(soundOf(savedTrack));
		player.setDynamicProperty(SAVED_TRACK, undefined);
	}

	// Событие слота приходит только при изменении. Уже лежащие в инвентаре пластинки учитываем один раз.
	const inventory = player.getComponent('minecraft:inventory')?.container;
	if (inventory) {
		for (let slot = 0; slot < inventory.size; slot++) {
			rememberDisc(player, inventory.getItem(slot));
		}
	}

	const session = {
		player,
		playlistKey: null,
		active: null,
		lastTrackId: null,
		nextStartTick: 0
	};
	sessions.set(player.id, session);
	return session;
}

function clearTrack(session) {
	session.active = null;
	session.player.setDynamicProperty(SAVED_TRACK, undefined);
}

function stopTrack(session) {
	if (!session.active) return;
	try {
		session.active.sound.stop();
	} finally {
		clearTrack(session);
	}
}

function startTrack(session, id, volume, fadeIn) {
	stopTrack(session);
	const sound = session.player.playSound(soundOf(id), { volume: 1 });
	const targetVolume = volume / 100;
	try {
		sound.setVolume(fadeIn ? 0 : targetVolume);
		if (fadeIn) sound.fade(FADE_SECONDS, targetVolume);
		session.player.setDynamicProperty(SAVED_TRACK, id);
		session.active = { id, sound, paused: false, fading: false };
		session.lastTrackId = id;
	} catch (error) {
		sound.stop();
		throw error;
	}
}

world.afterEvents.soundCompleted.subscribe(({ soundInstanceId }) => {
	for (const session of sessions.values()) {
		const active = session.active;
		if (active?.sound.id !== soundInstanceId) continue;

		// У старой зоны уже назначена короткая пауза. Две минуты отсчитываем лишь при обычном окончании.
		clearTrack(session);
		if (!active.fading) session.nextStartTick = system.currentTick + GAP * TICKS_PER_SECOND;
		break;
	}
});

function changePlaylist(session, key) {
	session.playlistKey = key;
	session.nextStartTick = system.currentTick + ZONE_PAUSE * TICKS_PER_SECOND;

	const active = session.active;
	if (!active) return;
	if (active.paused) {
		stopTrack(session);
		return;
	}
	if (active.fading) return;

	const playerId = session.player.id;
	active.fading = true;
	active.sound.fade(FADE_SECONDS, 0);
	system.runTimeout(() => {
		// За время затухания игрок может выйти или вручную запустить другой трек.
		if (sessions.get(playerId) === session && session.active === active) stopTrack(session);
	}, FADE_SECONDS * TICKS_PER_SECOND);
}

function updatePlayer(player) {
	const session = sessionFor(player);
	const volume = getVolume(player);
	if (!volume || player.hasTag(MUSIC_OFF)) {
		stopTrack(session);
		session.playlistKey = null;
		return;
	}

	const { key, list } = playlistOf(player);
	if (session.playlistKey !== key) {
		changePlaylist(session, key);
		return;
	}
	if (session.active || system.currentTick < session.nextStartTick) return;

	// Если движок отклонит запуск, следующая попытка будет после паузы между треками.
	session.nextStartTick = system.currentTick + GAP * TICKS_PER_SECOND;
	startTrack(session, pickTrack(list, session.lastTrackId), volume, true);
}

system.runInterval(() => {
	for (const player of world.getPlayers()) {
		if (player.hasTag('role:bot')) continue;
		try {
			updatePlayer(player);
		} catch (error) {
			console.warn(`[Shop for Ore] Music (${player.name}): ${error}`);
		}
	}
}, TICKS_PER_SECOND);

world.afterEvents.playerLeave.subscribe(({ playerId }) => sessions.delete(playerId));

export function setVolume(player, value) {
	if (!Number.isFinite(value)) return;
	const volume = Math.max(0, Math.min(100, Math.round(value)));
	for (const tag of player.getTags()) {
		if (tag.startsWith(VOLUME_TAG)) player.removeTag(tag);
	}
	player.addTag(VOLUME_TAG + volume);

	const session = sessions.get(player.id);
	if (!session) return;
	if (volume === 0) {
		stopTrack(session);
		session.playlistKey = null;
	} else if (session.active && !session.active.fading) {
		session.active.sound.setVolume(volume / 100);
	}
}

export function setMusicOff(player, off) {
	if (off) player.addTag(MUSIC_OFF);
	else player.removeTag(MUSIC_OFF);

	const session = sessions.get(player.id);
	if (off && session) {
		stopTrack(session);
		session.playlistKey = null;
	}
}

// Меню запоминает instanceId вместе с позицией в момент открытия формы.
export function playback(player) {
	const active = sessions.get(player.id)?.active;
	if (!active || active.fading) return undefined;
	const info = active.sound.durationInfo;
	return {
		track: TRACK[active.id],
		instanceId: active.sound.id,
		paused: active.paused,
		position: info?.getPlaybackPosition(),
		duration: info?.duration
	};
}

export const nowPlaying = player => playback(player)?.track;

// Нажатие в старой форме относится только к тому экземпляру звука и той зоне, где её открыли.
function selectedTrack(player, instanceId) {
	const session = sessions.get(player.id);
	const active = session?.active;
	if (!active || active.fading || active.sound.id !== instanceId) return undefined;
	if (session.playlistKey !== playlistOf(player).key) return undefined;
	return active;
}

export function setPaused(player, instanceId, pause) {
	const active = selectedTrack(player, instanceId);
	if (!active || active.paused === pause) return;
	if (pause) active.sound.pause();
	else active.sound.resume();
	active.paused = pause;
}

export function seek(player, instanceId, seconds) {
	const active = selectedTrack(player, instanceId);
	const duration = active?.sound.durationInfo?.duration;
	if (duration > 0 && Number.isFinite(seconds)) {
		// Последнее положение ползунка должно оставаться внутри записи.
		active.sound.seekTo(Math.max(0, Math.min(seconds, duration - 0.01)));
	}
}

// При ручном выборе играем сразу и показываем название. Автоподбор использует startTrack напрямую.
export function playNow(player, id) {
	const session = sessionFor(player);
	const { key, list } = playlistOf(player);
	const volume = getVolume(player);
	if (!volume || player.hasTag(MUSIC_OFF) || !list.includes(id)) return false;

	session.playlistKey = key;
	startTrack(session, id, volume, false);
	const track = TRACK[id];
	const rawtext = [trackPart(trackTitle(track)), trackPart(trackArtist(track))];
	showToast(player, [{ translate: 'music.now_playing', with: { rawtext } }]);
	return true;
}
