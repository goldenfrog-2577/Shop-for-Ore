// --- PvP-арена: телепорт в случайную точку и «режим боя» ---
// Арена: x=236..363, y=-32..0, z=240..367 (тег player:pvp выдаёт functions/system/system).
// 1) На арену игрок попадает в случайную точку площадки, а не в одну и ту же — чтобы не начинать бой у входа.
//    Туда ведут !warp pvp и портал из мини-игр (system.mcfunction ставит тег sys:warp_pvp, телепорт делает этот файл).
// 2) Кто получил или нанёс урон другому игроку на арене, 15 секунд не может уйти телепортом (!warp, меню).
// 3) Портативный кристалл Энда (server:portable_ender_crystal, взрыв силы 6 без разрушения блоков) бросается
//    только на арене и участниками боя с Хранителем (тег boss:fighter — FIGHTER в system/boss/boss.js):
//    на спавне и в шахтах им можно было бы взорвать игроков, которые не в бою.

import { world, BlockLocation } from '@minecraft/server';
import { run, tell } from '../../utils.js';

export const PORTABLE_CRYSTAL = 'server:portable_ender_crystal';
// Арена боя с Хранителем — те же границы, что inFight в system/boss/boss.js (за решёткой; тоннель — уже не арена).
// Одного тега boss:fighter мало: ушедший с арены (!warp spawn) теряет тег только на следующей секундной проверке боя
export const inBossFight = (loc, dimensionId) => dimensionId === 'minecraft:overworld' && loc.x >= 480 && loc.x < 576 && loc.y >= -61 && loc.y < -20 && loc.z >= -104 && loc.z < -12;
world.events.beforeItemUse.subscribe((e) => {
	if (e.item?.typeId !== PORTABLE_CRYSTAL || e.source?.typeId !== 'minecraft:player') return;
	if (e.source.hasTag('player:pvp')) return;
	if (e.source.hasTag('boss:fighter') && inBossFight(e.source.location, e.source.dimension?.id)) return;
	e.cancel = true;
	tell(e.source, 'chat.pvp.crystal_arena_only');
});

// Где выбирать точку появления: арена круглая — каменная стена по кругу радиусом ~55 вокруг (295, 300),
// снаружи под ней тоже трава. Точка — случайная внутри круга SPAWN_RADIUS (с запасом до стены), равномерно по площади
export const ARENA_CENTER = { x: 295, z: 300 };
export const SPAWN_RADIUS = 45;
const FLOOR_Y = [-31, -2];
const START_Y = -25;          // высота, на которую телепортируем сначала (как старый портал)
const FALLBACK = [292, -25, 259];
const CHECK_DELAY = 5;        // тиков после телепорта: чанк успевает прогрузиться
const MAX_TRIES = 5;

export const COMBAT_SECONDS = 15;

// Блоки, сквозь которые можно стоять (воздух, трава, цветы, невидимый свет)
const PASSABLE = new Set([
	'minecraft:air', 'minecraft:light_block', 'minecraft:structure_void',
	'minecraft:tallgrass', 'minecraft:double_plant', 'minecraft:red_flower', 'minecraft:yellow_flower',
	'minecraft:snow_layer', 'minecraft:deadbush', 'minecraft:vine'
]);
// На этом стоять нельзя (листва — чтобы не появляться на кронах деревьев)
const UNSAFE_FLOOR = new Set(['minecraft:lava', 'minecraft:flowing_lava', 'minecraft:water', 'minecraft:flowing_water', 'minecraft:fire', 'minecraft:magma', 'minecraft:cactus',
	'minecraft:leaves', 'minecraft:leaves2', 'minecraft:azalea_leaves', 'minecraft:azalea_leaves_flowered', 'minecraft:mangrove_leaves']);

const lastCombat = new Map();   // ник → время последнего удара (мс)
const pending = [];             // { player, x, z, tries, tick }
let tick = 0;

/** Случайная точка внутри круга появления: { x, z }. */
export function randomSpawnPoint(random = Math.random) {
	const r = SPAWN_RADIUS * Math.sqrt(random()), a = 2 * Math.PI * random();
	return { x: Math.round(ARENA_CENTER.x + r * Math.cos(a)), z: Math.round(ARENA_CENTER.z + r * Math.sin(a)) };
}

/** Сколько секунд игрок ещё «в бою» (0 — можно телепортироваться). */
export function combatSecondsLeft(player) {
	const t = lastCombat.get(player.name);
	if (!t) return 0;
	const left = Math.ceil((t + COMBAT_SECONDS * 1000 - Date.now()) / 1000);
	if (left <= 0) {
		lastCombat.delete(player.name);
		return 0;
	}
	return left;
}

/** Телепорт на арену в случайную точку площадки; безопасную высоту подбирает после прогрузки чанка. */
export function teleportToArena(player) {
	const { x, z } = randomSpawnPoint();
	run(player, `tp @s ${x} ${START_Y} ${z}`);
	pending.push({ player, x, z, tries: 1, tick: tick + CHECK_DELAY });
}

/** Высота, на которой можно стоять в столбце x,z (ближайшая к START_Y), или undefined. */
function findStandY(dimension, x, z) {
	const type = (y) => dimension.getBlock(new BlockLocation(x, y, z)).typeId;
	let best;
	for (let y = FLOOR_Y[0] + 1; y <= FLOOR_Y[1]; y++) {
		const floor = type(y - 1);
		if (PASSABLE.has(floor) || UNSAFE_FLOOR.has(floor)) continue;
		if (!PASSABLE.has(type(y)) || !PASSABLE.has(type(y + 1))) continue;
		if (best === undefined || Math.abs(y - START_Y) < Math.abs(best - START_Y)) best = y;
	}
	return best;
}

world.events.tick.subscribe(() => {
	tick++;
	// Портал из мини-игр: тег ставит system.mcfunction
	if (tick % 2 === 0) {
		for (const p of world.getPlayers()) {
			if (!p.hasTag('sys:warp_pvp')) continue;
			p.removeTag('sys:warp_pvp');
			// Пока идёт телепорт, игрок ещё стоит в портале — второй раз не телепортируем
			if (pending.some(j => j.player.name === p.name)) continue;
			teleportToArena(p);
		}
	}
	// Проверка точки после телепорта
	for (let i = pending.length - 1; i >= 0; i--) {
		const job = pending[i];
		if (job.tick > tick) continue;
		pending.splice(i, 1);
		const { player } = job;
		let y;
		try {
			y = findStandY(player.dimension, job.x, job.z);
		} catch {
			y = undefined;   // игрок вышел или чанк ещё не загружен
		}
		if (y !== undefined) {
			run(player, `tp @s ${job.x} ${y} ${job.z}`);
		} else if (job.tries < MAX_TRIES) {
			const { x, z } = randomSpawnPoint();
			run(player, `tp @s ${x} ${START_Y} ${z}`);
			pending.push({ player, x, z, tries: job.tries + 1, tick: tick + CHECK_DELAY });
		} else {
			run(player, `tp @s ${FALLBACK.join(' ')}`);
		}
	}
});

// Режим боя: урон от игрока игроку на арене (стрела тоже — damagingEntity у неё стрелок)
world.events.entityHurt.subscribe((e) => {
	const hurt = e.hurtEntity, attacker = e.damagingEntity;
	if (!hurt || !attacker || hurt.typeId !== 'minecraft:player' || attacker.typeId !== 'minecraft:player') return;
	if (hurt.id === attacker.id || !hurt.hasTag('player:pvp')) return;
	const now = Date.now();
	lastCombat.set(hurt.name, now);
	lastCombat.set(attacker.name, now);
});

world.events.playerLeave.subscribe((e) => lastCombat.delete(e.playerName));
