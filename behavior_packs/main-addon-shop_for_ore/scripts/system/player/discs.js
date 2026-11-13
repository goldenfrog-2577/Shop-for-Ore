// --- Коллекция пластинок: где их найти и награда за все 15 ---
// Источники: «5» и otherside — только за Хранителя (system/boss/boss.js); остальные 13 (DROP_POOL) —
// редкий дроп при копании (шанс за сломанный блок по уровню: шахты у спавна, Незер, Пещера) и награда за победу в мини-игре
// (WIN_CHANCE). Выпадает всегда пластинка, которой у игрока ещё нет; если нет таких — ничего.
// Найдена — /give record_<id>, после успешной выдачи тег music:disc:<id> (как у пластинок из инвентаря в system/ui/music.js),
// сообщение и плашка. Все 15 — тег music:collector: префикс «Меломан» в чате (chat/chat.js) и бесплатный след «Ноты»
// из Косметики (cosmetic:trail:note), сообщение всем. Проверка раз в 5 с — так же засчитываются пластинки из инвентаря.

import { system, world } from '@minecraft/server';
import { run, tell, getScore, isPending, rawTranslateRich } from '../../utils.js';
import { DISC_TAG, unlockedDiscs } from '../ui/music.js';
import { DISCS, TRACK } from '../ui/music_tracks.js';
import { showToast } from '../ui/toast.js';

export const BOSS_DISCS = ['5', 'otherside'];
export const DROP_POOL = DISCS.map(d => d.id).filter(id => !BOSS_DISCS.includes(id));
export const COLLECTOR = 'music:collector';
export const COLLECTOR_TRAIL = 'cosmetic:trail:note';
export const WIN_CHANCE = 0.25;
/** Шанс пластинки за сломанный блок: чем дальше локация, тем чаще. */
export const dropChance = (level) => level >= 26 ? 1 / 1500 : level >= 16 ? 1 / 2000 : 1 / 3000;

/** Какую пластинку выдать: случайная из ещё не найденных в DROP_POOL, если выпал шанс; иначе undefined. */
export function rollDisc(owned, chance, rand = Math.random) {
	if (rand() >= chance) return undefined;
	const missing = DROP_POOL.filter(id => !owned.includes(id));
	return missing.length ? missing[Math.min(missing.length - 1, Math.floor(rand() * missing.length))] : undefined;
}

/** Выдать пластинку; отметка и сообщение — только если /give сработал. */
export function giveDisc(p, id) {
	return run(p, `give @s record_${id} 1`).then((result) => {
		if (!result) return;
		p.addTag(DISC_TAG + id);
		tell(p, 'chat.music.disc.found', TRACK[id].title, String(unlockedDiscs(p).length), String(DISCS.length));
		showToast(p, [{ translate: 'music.disc_found', with: { rawtext: [{ text: TRACK[id].title }] } }]);
		run(p, 'playsound random.levelup @s');
		checkCollector(p);
	});
}

/** Победа в мини-игре (system/minigames/minigames.js): с шансом WIN_CHANCE — ненайденная пластинка. */
export function rollWinDisc(p, rand = Math.random) {
	const id = rollDisc(unlockedDiscs(p), WIN_CHANCE, rand);
	if (id) giveDisc(p, id);
}

/** Все 15 — один раз: префикс «Меломан», след «Ноты», сообщение всем. */
export function checkCollector(p) {
	// Вайп снимает все cosmetic:-теги, а пластинки и «Меломан» остаются — бесплатный след «Ноты» вернуть (без повторного объявления)
	if (p.hasTag(COLLECTOR)) {
		if (!p.hasTag(COLLECTOR_TRAIL)) p.addTag(COLLECTOR_TRAIL);
		return false;
	}
	if (unlockedDiscs(p).length < DISCS.length) return false;
	p.addTag(COLLECTOR);
	p.addTag(COLLECTOR_TRAIL);
	run(p, `tellraw @a ${rawTranslateRich('chat.music.collector', p.name)}`);
	run(p, 'playsound random.totem @s');
	return true;
}

world.events.blockBreak.subscribe((e) => {
	const p = e.player;
	// Снег в сплифе и прочие мини-игры — не добыча; бот не собирает
	if (!p || isPending(p) || p.hasTag('role:bot') || p.getTags().some(t => t.startsWith('game:'))) return;
	const id = rollDisc(unlockedDiscs(p), dropChance(getScore(p, 'lvl')));
	if (id) giveDisc(p, id);
});

system.runSchedule(() => {
	for (const p of world.getPlayers()) if (!p.hasTag('role:bot')) checkCollector(p);
}, 100);
