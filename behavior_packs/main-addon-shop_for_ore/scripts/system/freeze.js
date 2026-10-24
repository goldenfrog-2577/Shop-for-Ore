// --- Заморозка (!freeze): игрок застывает там, где его заморозили, даже в воздухе ---
// Место хранится тегом frozenat:x,y,z (переживает перезаход). Каждый тик игрок, сдвинувшийся с места
// (шаг, прыжок, падение, толчок), возвращается обратно; поворачивать голову можно.
// Раньше было замедление 255 + прыгучесть 128: в воздухе игрок падал, а «переполненная» прыгучесть
// вела себя по-разному на разных устройствах.

import { world } from '@minecraft/server';
import { run, clearIssuer } from '../DataBase.js';

const POS_TAG = 'frozenat:';
const EPS = 0.05;

function frozenAt(player) {
	const tag = player.getTags().find(t => t.startsWith(POS_TAG));
	if (!tag) return undefined;
	const [x, y, z] = tag.slice(POS_TAG.length).split(',').map(Number);
	return [x, y, z].every(Number.isFinite) ? { x, y, z } : undefined;
}

function rememberPosition(player) {
	player.getTags().filter(t => t.startsWith(POS_TAG)).forEach(t => player.removeTag(t));
	const { x, y, z } = player.location;
	player.addTag(`${POS_TAG}${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`);
}

/** Заморозить: тег frozen, текущее место; замедление 255 — чтобы возврат на место был незаметнее. */
export function freezePlayer(player) {
	player.addTag('frozen');
	rememberPosition(player);
	run(player, 'effect @s slowness 1000000 255 true');
}

/** Разморозить: снять тег, место и эффекты (прыгучесть — от старой заморозки). */
export function unfreezePlayer(player) {
	player.removeTag('frozen');
	player.getTags().filter(t => t.startsWith(POS_TAG)).forEach(t => player.removeTag(t));
	clearIssuer(player, 'frozen');
	run(player, 'effect @s slowness 0');
	run(player, 'effect @s jump_boost 0');
}

world.events.tick.subscribe(() => {
	for (const player of world.getPlayers()) {
		if (!player.hasTag('frozen')) continue;
		const at = frozenAt(player);
		// Заморожен до этого обновления (без места) — застывает там, где он сейчас
		if (!at) {
			rememberPosition(player);
			continue;
		}
		const { x, y, z } = player.location;
		if (Math.abs(x - at.x) > EPS || Math.abs(y - at.y) > EPS || Math.abs(z - at.z) > EPS) {
			// «~ ~» — поворот головы не трогаем
			run(player, `tp @s ${at.x} ${at.y} ${at.z} ~ ~`);
		}
	}
});
