// --- Мини-игра «Сплиф»: 4 снежных этажа в башне (центр x 501, z 502), побеждает последний устоявший ---
// Игрокам вместо кирки (слот 1) — алмазная лопата: копает только снег, переложить и зачаровать её нельзя.
// Провалился ниже нижнего этажа (y < OUT_Y) — выбыл и до конца игры смотрит со стеклянной крыши (y −3);
// телепорт участникам и зрителям, пока идёт игра, запрещён всем, кроме владельца (lockTeleport в minigames.js).
// Урона нет (сопротивление 255 на время игры): падение с этажа на этаж — 10 блоков.
// Полы — точная форма бетонных полов карты (снята с мира), перед игрой и после неё заливаются снегом
// заново (fill по рядам). Команд заливки больше сотни, а очередь команд скриптов в 1.19.50 ограничена
// («command queue is full»), поэтому они уходят порциями по FILL_PER_TICK за тик.
// Снег падает снежками: выпавшее убираем сразу у сломанного блока и раз в секунду по всей башне.
// Башню держит прогруженной ticking area «spleef».
// Идея — по мотивам карты FearCube (с разрешения автора), код свой.

import { world } from '@minecraft/server';
import { run } from '../DataBase.js';
import { registerGame, getGame } from './minigames.js';

export const CENTER = [501, 502];
export const SPECTATE = [501, -3, 502];
// Ниже нижнего пола (бетон/снег на y −43, стоят на −42) — выбыл
export const OUT_Y = -44.5;
// Этаж → ряды [z, x от, x до] снега. У третьего этажа в краю ряда z 488 встроены доски — их не трогаем
export const FLOORS = {
	'-13': [[488, 498, 505], [489, 495, 507], [490, 493, 509], [491, 493, 510], [492, 491, 511], [493, 490, 512], [494, 489, 513], [495, 489, 513], [496, 488, 514], [497, 488, 514], [498, 487, 515], [499, 487, 515], [500, 487, 515], [501, 487, 515], [502, 487, 515], [503, 487, 515], [504, 487, 515], [505, 487, 515], [506, 487, 515], [507, 488, 514], [508, 488, 514], [509, 489, 513], [510, 489, 513], [511, 490, 512], [512, 491, 511], [513, 492, 510], [514, 494, 509], [515, 495, 507], [516, 497, 505]],
	'-23': [[488, 498, 505], [489, 495, 507], [490, 493, 509], [491, 493, 510], [492, 491, 511], [493, 490, 512], [494, 489, 513], [495, 489, 513], [496, 488, 514], [497, 488, 514], [498, 487, 515], [499, 487, 515], [500, 487, 515], [501, 487, 515], [502, 487, 515], [503, 487, 515], [504, 487, 515], [505, 487, 515], [506, 487, 515], [507, 488, 514], [508, 488, 514], [509, 489, 513], [510, 489, 513], [511, 490, 512], [512, 491, 511], [513, 492, 510], [514, 494, 509], [515, 495, 507], [516, 497, 505]],
	'-33': [[488, 498, 498], [488, 500, 500], [488, 502, 502], [488, 504, 504], [489, 495, 507], [490, 493, 509], [491, 493, 510], [492, 491, 511], [493, 490, 512], [494, 489, 513], [495, 489, 513], [496, 488, 514], [497, 488, 514], [498, 487, 515], [499, 487, 515], [500, 487, 515], [501, 487, 515], [502, 487, 515], [503, 487, 515], [504, 487, 515], [505, 487, 515], [506, 487, 515], [507, 488, 514], [508, 488, 514], [509, 489, 513], [510, 489, 513], [511, 490, 512], [512, 491, 511], [513, 492, 510], [514, 494, 509], [515, 495, 507], [516, 497, 505]],
	'-43': [[488, 498, 505], [489, 495, 507], [490, 493, 509], [491, 493, 510], [492, 491, 511], [493, 490, 512], [494, 489, 513], [495, 489, 513], [496, 488, 514], [497, 488, 514], [498, 487, 515], [499, 487, 515], [500, 487, 515], [501, 487, 515], [502, 487, 515], [503, 487, 515], [504, 487, 515], [505, 487, 515], [506, 487, 515], [507, 488, 514], [508, 488, 514], [509, 489, 513], [510, 489, 513], [511, 490, 512], [512, 491, 511], [513, 492, 510], [514, 494, 509], [515, 495, 507], [516, 497, 505]]
};
const START_Y = -12;            // верхний этаж
const START_RADIUS = 8;         // игроки встают по кругу вокруг центра
const AREA = { x: 485, y: -47, z: 486, dx: 32, dy: 44, dz: 32 };
const SHOVEL = 'replaceitem entity @s slot.hotbar 0 diamond_shovel 1 0 {"minecraft:can_destroy":{"blocks":["snow"]},"minecraft:item_lock":{"mode":"lock_in_slot"}}';

const overworld = () => world.getDimension('overworld');
const FILL_PER_TICK = 8;
const queue = [];               // команды заливки, ждущие своего тика
const killItems = (a = AREA) => `kill @e[type=item,x=${a.x},y=${a.y},z=${a.z},dx=${a.dx},dy=${a.dy},dz=${a.dz}]`;

/** Команды заливки всех этажей снегом. */
export function arenaFillCommands() {
	const out = [];
	for (const [y, rows] of Object.entries(FLOORS)) {
		for (const [z, x1, x2] of rows) out.push(`fill ${x1} ${y} ${z} ${x2} ${y} ${z} snow`);
	}
	return out;
}

/** Залить этажи снегом заново (перед игрой, после неё и при загрузке — так бетон и стал снегом). Порциями по тикам. */
export function resetArena() {
	if (queue.length) return;      // заливка уже идёт
	queue.push(...arenaFillCommands(), killItems());
}
/** Сколько команд заливки ещё ждёт. */
export const pendingFill = () => queue.length;

/** Точка старта игрока index из total — по кругу на верхнем этаже, лицом к центру. */
export function startPoint(index, total) {
	const a = (2 * Math.PI * index) / Math.max(1, total);
	const x = CENTER[0] + 0.5 + START_RADIUS * Math.cos(a);
	const z = CENTER[1] + 0.5 + START_RADIUS * Math.sin(a);
	return [Number(x.toFixed(2)), START_Y, Number(z.toFixed(2))];
}

/** Забрать лопату и сопротивление; кирку уровня вернёт functions/system/pickaxe_lvl (табло pick = 0). */
function cleanup(p) {
	run(p, 'replaceitem entity @s slot.hotbar 0 air');
	run(p, 'scoreboard players set @s pick 0');
	run(p, 'effect @s resistance 0');
}

registerGame({
	id: 'spleef',
	minPlayers: 2,
	maxPlayers: 16,
	countdown: 10,
	maxSeconds: 600,
	lockTeleport: true,
	spectate: SPECTATE,
	onStart: () => resetArena(),
	start: (p, index, total) => {
		const [x, y, z] = startPoint(index, total);
		run(p, `tp @s ${x} ${y} ${z} facing ${CENTER[0] + 0.5} ${y} ${CENTER[1] + 0.5}`);
		run(p, SHOVEL);
		run(p, 'effect @s resistance 3600 255 true');
		try { p.selectedSlot = 0; } catch { /* в 1.19.50 может быть только для чтения */ }
	},
	isOut: (p) => p.location.y < OUT_Y,
	cleanup,
	onEnd: () => resetArena(),
	reward: { money: 5000, vip_coins: 5 }
});

// Пока идёт игра — выпавший при копании снег (снежки) убираем раз в секунду: не мусорит и не летит магнитом
let tick = 0;
world.events.tick.subscribe(() => {
	tick++;
	if (queue.length) for (const c of queue.splice(0, FILL_PER_TICK)) run(overworld(), c);
	// Один раз после загрузки: держим башню прогруженной и заливаем полы снегом (бетон → снег)
	if (tick === 40) run(overworld(), `tickingarea add ${AREA.x} ${AREA.y} ${AREA.z} ${AREA.x + AREA.dx} ${AREA.y + AREA.dy} ${AREA.z + AREA.dz} spleef`);
	if (tick === 100) resetArena();
	if (tick % 20 !== 0 || getGame('spleef')?.phase !== 'running') return;
	run(overworld(), killItems());
});

// Сломал снег в игре — снежки у этого блока убираем сразу (событие приходит, когда они уже выпали)
world.events.blockBreak.subscribe((e) => {
	const g = getGame('spleef');
	if (!e.player || g?.phase !== 'running' || !g.alive.has(e.player.name)) return;
	const { x, y, z } = e.block.location;
	run(overworld(), killItems({ x: x - 1, y: y - 1, z: z - 1, dx: 2, dy: 2, dz: 2 }));
});
