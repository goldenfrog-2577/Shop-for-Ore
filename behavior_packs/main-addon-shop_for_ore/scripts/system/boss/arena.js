// --- Арена Хранителя: эмбиент ---
// Пещера Древнего города: X 480..575, Y -61..-21, Z -104..-9, тоннель входа с юга до Z -2.
// Раз в секунду (CHECK_TICKS) проверяем, кто внутри коробки ARENA.
// 1) Музыка арены (Ancestry, «5», «11», «13», mellohi, ward) — в общей музыке карты: system/ui/music.js по inArena.
// 2) Эмбиент — только ванильные звуки 1.19.50: щелчки скалка рядом, редкий далёкий визг крикуна,
//    сердцебиение Хранителя у портала, низкий гул Долины душ на пониженном тоне.
// 3) Синее пламя душ над кострами и бирюзовые искры скалка в проёме портала — пока на арене есть хоть один игрок.
//    soul_particle и sculk_soul_particle не подходят: им нужна variable.direction, которую /particle не передаёт
//    (в ContentLog — ошибки Molang «variable.direction», «.x/.y/.z»).

import { system, world } from '@minecraft/server';

export const ARENA = { min: [480, -61, -104], max: [575, -21, -2] };
export const PORTAL = [528, -50, -73];          // проём портала (передняя грань z = -74)
// Костры душ: 12 жаровен вокруг площади и 4 на верхушках столбов (координаты блока костра)
export const BRAZIERS = [
	[503, -58, -58], [506, -58, -69], [506, -58, -43], [516, -58, -78], [516, -58, -34], [528, -58, -81],
	[528, -58, -29], [540, -58, -78], [540, -58, -34], [550, -58, -69], [550, -58, -43], [553, -58, -58],
	[500, -48, -25], [510, -47, -88], [546, -47, -88], [556, -41, -25]
];

export const CHECK_TICKS = 20;
const HEART_RADIUS = 28;                        // сердцебиение слышно ближе этого расстояния до портала

/** Игрок внутри коробки арены (с тоннелем). */
export function inArena(loc, dimensionId = 'minecraft:overworld') {
	if (dimensionId !== 'minecraft:overworld') return false;
	const { min, max } = ARENA;
	return loc.x >= min[0] && loc.x < max[0] + 1 && loc.y >= min[1] && loc.y < max[1] + 1 && loc.z >= min[2] && loc.z < max[2] + 1;
}

/** Случайная точка на расстоянии r0..r1 от игрока на высоте пола пещеры. */
function around(loc, r0, r1, random) {
	const r = r0 + (r1 - r0) * random(), a = 2 * Math.PI * random();
	return `${Math.round(loc.x + r * Math.cos(a))} -58 ${Math.round(loc.z + r * Math.sin(a))}`;
}
const pitch = (lo, hi, random) => (lo + (hi - lo) * random()).toFixed(2);
/** Громкость, при которой точка на расстоянии до far блоков (с запасом на высоту) внутри радиуса слышимости. */
export const reach = far => ((far + 4) / 16).toFixed(2);

/** Звуки эмбиента для игрока на этой секунде (вероятности в секунду): «звук точка громкость тон minimumVolume». */
export function ambientCommands(loc, random = Math.random) {
	const out = [];
	if (random() < 0.30) out.push(`playsound ${random() < 0.5 ? 'power.on.sculk_sensor' : 'power.off.sculk_sensor'} @s ${around(loc, 4, 14, random)} ${reach(14)} ${pitch(0.8, 1.2, random)} 0`);
	if (random() < 0.10) out.push(`playsound ${random() < 0.6 ? 'spread.sculk' : 'bloom.sculk_catalyst'} @s ${around(loc, 3, 10, random)} ${reach(10)} ${pitch(0.8, 1.1, random)} 0`);
	if (random() < 0.03) out.push(`playsound shriek.sculk_shrieker @s ${around(loc, 18, 30, random)} ${reach(30)} ${pitch(0.85, 1, random)} 0.15`);
	if (random() < 0.04) out.push(`playsound ambient.soulsand_valley.mood @s ${around(loc, 6, 12, random)} ${reach(12)} ${pitch(0.5, 0.65, random)} 0`);
	// ambient.cave не используем: в ресурс-паке карты он намеренно пустой (пещерный фон отключён)
	const d = Math.hypot(loc.x - PORTAL[0], loc.y - PORTAL[1], loc.z - PORTAL[2]);
	// у портала громко, к краю радиуса тише — затухание даёт сам радиус слышимости
	if (d < HEART_RADIUS && random() < 0.5) out.push(`playsound mob.warden.heartbeat @s ${PORTAL.join(' ')} ${reach(HEART_RADIUS)} 0.8 0`);
	return out;
}

/** Частицы на арене за одну проверку (выполняются от имени измерения). */
export function particleCommands(random = Math.random) {
	const out = [];
	for (const [x, y, z] of BRAZIERS) if (random() < 0.35) out.push(`particle minecraft:blue_flame_particle ${x} ${y + 1} ${z}`);
	for (let i = 0; i < 3; i++) {
		const x = PORTAL[0] - 7 + Math.round(14 * random()), y = -59 + Math.round(10 * random());
		out.push(`particle minecraft:sculk_sensor_redstone_particle ${x} ${y} ${PORTAL[2]}`);
	}
	return out;
}

system.runSchedule(() => {
	let anyone = false;
	for (const player of world.getPlayers()) {
		if (!inArena(player.location, player.dimension?.id) || player.hasTag('role:bot')) continue;
		anyone = true;
		// напрямую, а не через run(): run() глушит playsound игрока, пока у него открыто меню с выключенным звуком ответа
		for (const command of ambientCommands(player.location)) player.runCommandAsync(command).catch(() => {});
	}
	if (anyone) {
		const dimension = world.getDimension('overworld');
		for (const command of particleCommands()) dimension.runCommandAsync(command).catch(() => {});
	}
}, CHECK_TICKS);
