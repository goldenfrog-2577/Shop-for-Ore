// Добыча пластинок и награда «Меломан».
// BOSS_DISCS выдаёт Хранитель. Остальные пластинки можно получить при добыче блока
// или за победу в мини-игре. В обоих случаях выбирается только недостающая пластинка.
// Плеер в system/ui/music.js также запоминает пластинки, полученные через инвентарь.

import { system, world } from '@minecraft/server';
import { run, tell, getScore, isPending, rawTranslateRich } from '../../utils.js';
import { DISC_TAG, unlockedDiscs } from '../ui/music.js';
import { DISCS, TRACK, trackTitle, trackPart } from '../ui/music_tracks.js';
import { showToast } from '../ui/toast.js';

export const BOSS_DISCS = ['5', 'otherside'];
export const DROP_POOL = DISCS.map(d => d.id).filter(id => !BOSS_DISCS.includes(id));
export const COLLECTOR = 'music:collector';
export const COLLECTOR_TRAIL = 'cosmetic:trail:note';
export const WIN_CHANCE = 0.25;
/** Шанс пластинки за сломанный блок: чем дальше локация, тем чаще. */
export function dropChance(level) {
	if (level >= 26) return 1 / 1500;
	if (level >= 16) return 1 / 2000;
	return 1 / 3000;
}

/** Какую пластинку выдать: случайная из ещё не найденных в DROP_POOL, если выпал шанс; иначе undefined. */
export function rollDisc(owned, chance, rand = Math.random) {
	if (rand() >= chance) return undefined;
	const missing = DROP_POOL.filter(id => !owned.includes(id));
	if (!missing.length) return undefined;
	const index = Math.min(missing.length - 1, Math.floor(rand() * missing.length));
	return missing[index];
}

/** Выдать пластинку; отметка и сообщение — только если /give сработал. */
export function giveDisc(p, id) {
	return run(p, `give @s ${TRACK[id].item} 1`).then((result) => {
		if (!result) return;
		p.addTag(DISC_TAG + id);
		const title = trackPart(trackTitle(TRACK[id]));
		tell(p, 'chat.music.disc.found', title, String(unlockedDiscs(p).length), String(DISCS.length));
		showToast(p, [{ translate: 'music.disc_found', with: { rawtext: [title] } }]);
		run(p, 'playsound random.levelup @s');
		checkCollector(p);
	});
}

/** Победа в мини-игре (system/minigames/minigames.js): с шансом WIN_CHANCE — ненайденная пластинка. */
export function rollWinDisc(p, rand = Math.random) {
	const id = rollDisc(unlockedDiscs(p), WIN_CHANCE, rand);
	if (id) giveDisc(p, id);
}

/** Вся коллекция — один раз: префикс «Меломан», след «Ноты», сообщение всем. */
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

world.afterEvents.playerBreakBlock.subscribe((e) => {
	const p = e.player;
	// Снег в сплифе и прочие мини-игры — не добыча; бот не собирает
	if (!p || isPending(p) || p.hasTag('role:bot') || p.getTags().some(t => t.startsWith('game:'))) return;
	const id = rollDisc(unlockedDiscs(p), dropChance(getScore(p, 'lvl')));
	if (id) giveDisc(p, id);
});

system.runInterval(() => {
	// Пластинка могла попасть в инвентарь через обмен с игроком, минуя giveDisc.
	for (const player of world.getPlayers()) {
		if (!player.hasTag('role:bot')) checkCollector(player);
	}
}, 100);
