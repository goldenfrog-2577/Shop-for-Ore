// --- Ивент «Мистик»: сундук в центре PvP-арены наполняется редким лутом ---
// Сундук стоит в столбце x=300, z=300 (высоту скрипт находит сам: ищет блок сундука от y=0 вниз до -32).
// По таймеру — раз в 10 минут, если включено: /scoreboard players set mythic settings 1
// (или переключатель в меню администратора). Сразу — командой !event mythic.
// Столбец сундука держит прогруженным ticking area «mythic», иначе без игроков на арене сундук не заполнить.

import { world, BlockLocation } from '@minecraft/server';
import { run } from '../DataBase.js';

const CHEST_X = 300, CHEST_Z = 300;
const SEARCH_Y = [0, -32];
const CHEST_SLOTS = 27;
const PERIOD_TICKS = 10 * 60 * 20;   // 10 минут
const ITEMS_MIN = 4, ITEMS_MAX = 6;

// Лут: вес (чем больше, тем чаще), предмет, количество [от, до], data (для зелий и стрел).
// Зелья с полезными эффектами — взрывные (splash_potion, античит их больше не удаляет), id зелий Bedrock:
// 22 — исцеление II, 30 — регенерация II, 33 — сила II, 16 — скорость II.
// Стрелы с эффектом: data = id зелья + 1 — 18 медлительность, 25 моментальный урон II, 26 отравление,
// 35 слабость, 37 иссушение, 41 замедленное падение.
export const MYTHIC_LOOT = [
	{ w: 2, item: 'enchanted_golden_apple', count: [1, 1] },
	{ w: 3, item: 'totem_of_undying', count: [1, 1] },
	{ w: 2, item: 'netherite_ingot', count: [1, 1] },
	{ w: 8, item: 'golden_apple', count: [3, 6] },
	{ w: 6, item: 'ender_pearl', count: [4, 8] },
	{ w: 6, item: 'diamond', count: [4, 10] },
	{ w: 4, item: 'emerald_block', count: [2, 4] },
	{ w: 5, item: 'experience_bottle', count: [16, 32] },
	{ w: 6, item: 'splash_potion', count: [2, 3], data: 22 },
	{ w: 4, item: 'splash_potion', count: [1, 1], data: 30 },
	{ w: 5, item: 'splash_potion', count: [1, 2], data: 33 },
	{ w: 4, item: 'splash_potion', count: [1, 2], data: 16 },
	{ w: 4, item: 'bow', count: [1, 1] },
	{ w: 5, item: 'arrow', count: [16, 32] },
	{ w: 3, item: 'arrow', count: [4, 8], data: 18 },
	{ w: 2, item: 'arrow', count: [2, 4], data: 25 },
	{ w: 3, item: 'arrow', count: [4, 8], data: 26 },
	{ w: 3, item: 'arrow', count: [4, 8], data: 35 },
	{ w: 2, item: 'arrow', count: [2, 4], data: 37 },
	{ w: 3, item: 'arrow', count: [4, 8], data: 41 },
	{ w: 4, item: 'shield', count: [1, 1] },
	{ w: 2, item: 'trident', count: [1, 1] },
	{ w: 3, item: 'crossbow', count: [1, 1] }
];

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const overworld = () => world.getDimension('overworld');

/** Взвешенный выбор count разных записей лута. */
export function rollLoot(count) {
	const pool = MYTHIC_LOOT.slice();
	const out = [];
	while (out.length < count && pool.length) {
		const total = pool.reduce((s, e) => s + e.w, 0);
		let r = Math.random() * total;
		const i = pool.findIndex(e => (r -= e.w) < 0);
		out.push(pool.splice(i === -1 ? pool.length - 1 : i, 1)[0]);
	}
	return out;
}

/** Высота сундука в столбце (или undefined: нет сундука или столбец не прогружен). */
function findChestY() {
	try {
		for (let y = SEARCH_Y[0]; y >= SEARCH_Y[1]; y--) {
			if (overworld().getBlock(new BlockLocation(CHEST_X, y, CHEST_Z)).typeId === 'minecraft:chest') return y;
		}
	} catch { /* столбец не прогружен */ }
	return undefined;
}

/** Наполнить сундук и объявить ивент. @returns {boolean} false — сундук не найден */
export function startMythic() {
	const y = findChestY();
	if (y === undefined) return false;
	const dim = overworld();
	const pos = `${CHEST_X} ${y} ${CHEST_Z}`;
	// Старый лут, если его не забрали, сгорает
	for (let i = 0; i < CHEST_SLOTS; i++) run(dim, `replaceitem block ${pos} slot.container ${i} air`);
	const slots = Array.from({ length: CHEST_SLOTS }, (_, i) => i).sort(() => Math.random() - 0.5);
	rollLoot(rand(ITEMS_MIN, ITEMS_MAX)).forEach((e, k) => {
		const amount = rand(e.count[0], e.count[1]);
		run(dim, `replaceitem block ${pos} slot.container ${slots[k]} ${e.item} ${amount}${e.data !== undefined ? ' ' + e.data : ''}`);
	});
	run(dim, 'tellraw @a {"rawtext":[{"translate":"chat.event.mythic_chest"}]}');
	run(dim, 'execute as @a at @s run playsound random.levelup @s ~~~ 1.0 0.6');
	run(dim, `particle minecraft:totem_particle ${CHEST_X} ${y + 1} ${CHEST_Z}`);
	return true;
}

function mythicEnabled() {
	try {
		const info = world.scoreboard.getObjective('settings').getScores().find(s => s.participant.displayName === 'mythic');
		return info?.score === 1;
	} catch {
		return false;
	}
}

let tick = 0;
world.events.tick.subscribe(() => {
	tick++;
	// Один раз после загрузки: держим столбец сундука прогруженным (если зона уже есть — команда просто не сработает)
	if (tick === 40) run(overworld(), `tickingarea add ${CHEST_X} ${SEARCH_Y[1]} ${CHEST_Z} ${CHEST_X} ${SEARCH_Y[0]} ${CHEST_Z} mythic`);
	if (tick % PERIOD_TICKS !== 0 || !mythicEnabled()) return;
	if (![...world.getPlayers()].length) return;
	startMythic();
});
