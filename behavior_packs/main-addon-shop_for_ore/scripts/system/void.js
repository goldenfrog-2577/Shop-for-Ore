// --- Бездна: упал ниже мира — на спавн ---
// Карта висит в пустоте: кто сорвался с острова, шахты или арены, падает в бездну. Как только игрок
// опустился ниже VOID_Y (ниже дна мира — там стоять не на чем), он возвращается на спавн с сообщением.
// Урона от бездны (он начинается ещё ниже) и от падения не будет: телепорт сбрасывает высоту падения.
// Не трогаем: мини-игры (теги game:… — у сплифа и PvP свои правила выбывания), бота, замороженных,
// творческий режим и наблюдателя (персонал может летать под картой). Проверка — раз в CHECK_TICKS тиков.

import { world, GameMode } from '@minecraft/server';
import { run, tell } from '../DataBase.js';

export const VOID_Y = -64;
export const SPAWN = [0, 5, 0];
const CHECK_TICKS = 5;

/** Игрок падает в бездну, и его пора вернуть. */
export function fellIntoVoid(player) {
	if (player.dimension?.id !== undefined && player.dimension.id !== 'minecraft:overworld') return false;
	if (player.location.y >= VOID_Y) return false;
	if (player.hasTag('role:bot') || player.hasTag('state:frozen')) return false;
	return !player.getTags().some(t => t.startsWith('game:'));
}

function survivalPlayers() {
	try {
		return world.getPlayers({ excludeGameModes: [GameMode.creative, GameMode.spectator] });
	} catch {
		return world.getPlayers();
	}
}

let tick = 0;
world.events.tick.subscribe(() => {
	if (++tick % CHECK_TICKS !== 0) return;
	for (const player of survivalPlayers()) {
		if (!fellIntoVoid(player)) continue;
		run(player, `tp @s ${SPAWN.join(' ')}`);
		player.addTag('stat:void');   // достижение «Прыжок веры» (system/achievements.js)
		tell(player, 'chat.server.void');
	}
});
