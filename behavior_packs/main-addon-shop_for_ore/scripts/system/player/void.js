// --- Бездна: упал ниже мира — на спавн ---
// Карта висит в пустоте: кто сорвался с острова, шахты или арены, падает в бездну. Как только игрок
// опустился ниже VOID_Y (ниже дна мира — там стоять не на чем), он возвращается на спавн с сообщением.
// Урона от бездны (он начинается ещё ниже) и от падения не будет: телепорт сбрасывает высоту падения.
// Не трогаем: мини-игры (теги game:… — у сплифа и PvP свои правила выбывания), бота, замороженных,
// творческий режим и наблюдателя (персонал может летать под картой). Проверка — раз в CHECK_TICKS тиков.
// Шутка к награде «Прыжка веры» (перо): ПКМ пером — левитация на FEATHER_SECONDS секунд, потом плавное падение,
// одно перо пропадает. В мини-играх (теги game:…) перо не работает — левитация ломала бы их правила.

import { world, GameMode } from '@minecraft/server';
import { run, tell } from '../../utils.js';

export const VOID_Y = -64;
export const FEATHER_SECONDS = 10;
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
		player.addTag('stat:void');   // достижение «Прыжок веры» (system/player/achievements.js)
		tell(player, 'chat.server.void');
	}
});

world.events.itemUse.subscribe((e) => {
	const player = e.source;
	if (e.item?.typeId !== 'minecraft:feather' || player?.typeId !== 'minecraft:player') return;
	if (player.getTags().some(t => t.startsWith('game:'))) return tell(player, 'chat.server.feather_game');
	run(player, 'clear @s feather 0 1');
	run(player, `effect @s levitation ${FEATHER_SECONDS} 0`);
	// после левитации — плавное падение, чтобы шутка не стоила здоровья
	run(player, `effect @s slow_falling ${FEATHER_SECONDS + 10} 0 true`);
	tell(player, 'chat.server.feather');
});
