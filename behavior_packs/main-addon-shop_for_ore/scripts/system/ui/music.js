// --- Музыка карты: скрипт ставит каждому игроку свой трек ---
// Фоновую музыку игры (music.game и музыку биомов) ресурс-пак глушит: в sound_definitions.json у них пустые sounds.
// Вместо неё раз в секунду для каждого игрока (кроме бота) выбирается плейлист и играет /playsound shop.music.<id> @s:
// звук не объёмный ("is3D": false), категория record (ползунок «Проигрыватели»), поэтому ползунок «Музыка» на него не влияет.
// Плейлист: арена Хранителя (system/boss/arena.js, inArena) → её треки всегда; адская шахта (NETHER) → треки Незера;
// иначе — «Мои пластинки», если игрок их выбрал и у него есть хоть одна, или музыка мира (system/ui/music_tracks.js).
// Смена плейлиста (зона, источник, музыку включили): старый трек останавливается, через ZONE_PAUSE секунд — новый.
// Плавно приглушить уже играющий звук в 1.19.50 нельзя: /music fade действует на всех игроков сразу.
// После трека — GAP секунд тишины, следующий — случайный, не тот же. Громкость (0–100 %) — со следующего трека.
// Настройки — теги: player:music_off (выключена), music:volume:<0–100>, music:discs (источник «Мои пластинки»),
// music:disc:<id> — пластинка хоть раз была в инвентаре (проверка раз в DISC_SCAN_TICKS) или выдана за Хранителя (boss:disc:record_<id>).
// Состояние трека — только в памяти: после /reload или входа в мир у игрока сначала глушатся все звуки (stopsound @s),
// иначе старый трек наложится на новый.

import { system, world } from '@minecraft/server';
import { inArena } from '../boss/arena.js';
import { showToast } from './toast.js';
import { TRACK, DISCS, PLAYLISTS, soundOf } from './music_tracks.js';

export const MUSIC_OFF = 'player:music_off';
export const DISC_MODE = 'music:discs';
export const DISC_TAG = 'music:disc:';
export const VOLUME_TAG = 'music:volume:';
export const VOLUME_DEFAULT = 100;
export const ZONE_PAUSE = 3;
export const GAP = 120;
export const DISC_SCAN_TICKS = 100;
// Локация «Незер» (16–25 уровень, точка 0 5 −33): углы −15 0 −23 и 15 30 −52 (замер владельца)
export const NETHER = { min: [-15, 0, -52], max: [15, 30, -23] };

// ======== Чистые правила (tools/tests/music.mjs) ========

const inBox = ({ min, max }, l) => l.x >= min[0] && l.x < max[0] + 1 && l.y >= min[1] && l.y < max[1] + 1 && l.z >= min[2] && l.z < max[2] + 1;
/** Зона игрока: boss — арена Хранителя, nether — адская шахта, world — остальное. */
export function zoneOf(loc, dimensionId = 'minecraft:overworld') {
	if (inArena(loc, dimensionId)) return 'boss';
	if (dimensionId === 'minecraft:overworld' && inBox(NETHER, loc)) return 'nether';
	return 'world';
}
/** Какой плейлист играть: { key, list }. На арене — всегда её треки; «Мои пластинки» — только если есть хоть одна. */
export function playlistFor(zone, discMode, discs) {
	if (zone === 'boss') return { key: 'boss', list: PLAYLISTS.boss };
	if (discMode && discs.length) return { key: 'discs', list: discs };
	return { key: zone, list: PLAYLISTS[zone] };
}
/** Случайный трек из списка, не повторяя предыдущий (если в списке больше одного). */
export function pickTrack(list, last, rand = Math.random) {
	const pool = list.length > 1 ? list.filter(id => id !== last) : list;
	return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}
const play = (id, volume) => `playsound ${soundOf(id)} @s ~ ~ ~ ${(volume / 100).toFixed(2)}`;
const stop = (id) => `stopsound @s ${soundOf(id)}`;
/** Запустить трек сейчас: новое состояние и команда. */
export function startTrack(state, id, now, volume) {
	const commands = state?.track ? [stop(state.track)] : [];
	commands.push(play(id, volume));
	const endsAt = now + TRACK[id].seconds;
	return { state: { ...state, track: id, endsAt, nextAt: endsAt + GAP, last: id }, commands };
}

/**
 * Одна секунда музыки игрока. state — { key, track, endsAt, nextAt, last } или undefined (ещё ничего не играло).
 * Возвращает { state, commands }.
 */
export function musicStep(state, { now, key, list, off, volume, rand = Math.random }) {
	const commands = [];
	if (!state) {
		commands.push('stopsound @s');                          // хвосты после /reload и прошлого входа
		state = { key, track: null, endsAt: 0, nextAt: now + ZONE_PAUSE, last: null };
	}
	if (off || volume <= 0) {
		if (state.track) commands.push(stop(state.track));
		return { state: { ...state, key: null, track: null }, commands };
	}
	if (state.key !== key) {
		if (state.track) commands.push(stop(state.track));
		state = { ...state, key, track: null, nextAt: now + ZONE_PAUSE };
	}
	if (state.track && now < state.endsAt) return { state, commands };
	if (state.track) state = { ...state, track: null };            // трек кончился — ждём до nextAt
	if (now < state.nextAt) return { state, commands };
	const started = startTrack(state, pickTrack(list, state.last, rand), now, volume);
	return { state: started.state, commands: [...commands, ...started.commands] };
}

// ======== Настройки игрока ========

export const getVolume = (p) => {
	const tag = p.getTags().find(t => t.startsWith(VOLUME_TAG));
	const v = tag ? Number(tag.slice(VOLUME_TAG.length)) : VOLUME_DEFAULT;
	return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : VOLUME_DEFAULT;
};
export function setVolume(p, volume) {
	for (const t of p.getTags()) if (t.startsWith(VOLUME_TAG)) p.removeTag(t);
	p.addTag(VOLUME_TAG + Math.max(0, Math.min(100, Math.round(volume))));
}
/** Пластинки игрока: были в инвентаре (music:disc:<id>) или выданы за победу над Хранителем (boss:disc:record_<id>). */
export const unlockedDiscs = (p) => DISCS.filter(d => p.hasTag(DISC_TAG + d.id) || p.hasTag(`boss:disc:record_${d.id}`)).map(d => d.id);

// ======== Состояние и цикл ========

const music = new Map();    // ник → состояние musicStep
let seconds = 0;
const send = (p, commands) => { for (const c of commands) p.runCommandAsync(c).catch(() => {}); };
const isBot = (p) => p.hasTag('role:bot');
/** Текущий плейлист игрока { key, list } — что можно выбрать в меню «Выбрать трек». */
export const playlistOf = (p) => playlistFor(zoneOf(p.location, p.dimension?.id), p.hasTag(DISC_MODE), unlockedDiscs(p));

/** Что играет у игрока сейчас (трек из music_tracks.js) или undefined — пауза, выключено, ещё не начиналось. */
export function nowPlaying(p) {
	const s = music.get(p.name);
	return s?.track && seconds < s.endsAt ? TRACK[s.track] : undefined;
}
/** Плашка «Сейчас играет: <название> от <автор>» — только при ручном выборе. */
export function toastTrack(p, id) {
	const t = TRACK[id];
	showToast(p, [{ translate: 'music.now_playing', with: { rawtext: [{ text: t.title }, { text: t.author }] } }]);
}
/** Включить конкретный трек сейчас (выбор пластинки в меню). false — музыка выключена или трека нет в плейлисте. */
export function playNow(p, id) {
	const { key, list } = playlistOf(p);
	if (p.hasTag(MUSIC_OFF) || getVolume(p) <= 0 || !list.includes(id)) return false;
	const was = music.get(p.name);
	const started = startTrack({ ...(was ?? { last: null }), key }, id, seconds, getVolume(p));
	music.set(p.name, started.state);
	send(p, was ? started.commands : ['stopsound @s', ...started.commands]);
	toastTrack(p, id);
	return true;
}
/** Следующий трек текущего плейлиста. */
export function nextTrack(p) {
	const { list } = playlistOf(p);
	return playNow(p, pickTrack(list, music.get(p.name)?.track ?? music.get(p.name)?.last));
}
/** Выключатель в Настройках: выключение сразу останавливает трек. */
export function setMusicOff(p, off) {
	if (off) p.addTag(MUSIC_OFF); else p.removeTag(MUSIC_OFF);
	const s = music.get(p.name);
	if (off && s?.track) { send(p, [stop(s.track)]); music.set(p.name, { ...s, track: null, key: null }); }
}

system.runSchedule(() => {
	seconds++;
	for (const p of world.getPlayers()) {
		if (isBot(p)) continue;
		const { key, list } = playlistOf(p);
		const { state, commands } = musicStep(music.get(p.name), { now: seconds, key, list, off: p.hasTag(MUSIC_OFF), volume: getVolume(p) });
		music.set(p.name, state);
		// напрямую, а не через run(): run() глушит playsound игрока, пока у него открыто меню с выключенным звуком ответа
		send(p, commands);
	}
}, 20);

// Пластинки в инвентаре запоминаются навсегда: потом их можно убрать в сундук
system.runSchedule(() => {
	for (const p of world.getPlayers()) {
		if (isBot(p)) continue;
		let inv;
		try { inv = p.getComponent('minecraft:inventory')?.container; } catch { continue; }
		if (!inv) continue;
		for (let i = 0; i < inv.size; i++) {
			const type = inv.getItem(i)?.typeId;
			const d = type && DISCS.find(x => x.item === type);
			if (d && !p.hasTag(DISC_TAG + d.id)) p.addTag(DISC_TAG + d.id);
		}
	}
}, DISC_SCAN_TICKS);

world.events.playerLeave.subscribe((e) => music.delete(e.playerName));
