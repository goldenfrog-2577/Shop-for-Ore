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

import { world, system, ItemStack, ItemLockMode } from '@minecraft/server';
import { run } from '../../utils.js';
import { isMineTool } from '../player/tools.js';
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
// Лопата старого сохранения имеет тот же замок и разрешение копать снег.
function gameShovel(item) {
	return item?.typeId === 'minecraft:diamond_shovel' && item.lockMode === ItemLockMode.slot &&
		item.getCanDestroy().some(block => block === 'minecraft:snow' || block === 'snow');
}

function hasShovelSpace(player) {
	const inv = player.getComponent('minecraft:inventory')?.container;
	if (!inv) return false;
	const current = inv.getItem(0);
	return !current || gameShovel(current) || isMineTool(current) || inv.emptySlotsCount > 0;
}

function equipShovel(player) {
	const inv = player.getComponent('minecraft:inventory')?.container;
	if (!inv) return false;
	const current = inv.getItem(0);
	if (gameShovel(current)) return true;
	const shovel = new ItemStack('minecraft:diamond_shovel');
	shovel.setCanDestroy(['minecraft:snow']);
	shovel.lockMode = ItemLockMode.slot;
	if (current && !isMineTool(current)) {
		let free = 1;
		while (free < inv.size && inv.getItem(free)) free++;
		if (free === inv.size) return false;
		inv.moveItem(0, free, inv);
	}
	inv.setItem(0, shovel);
	return true;
}

const overworld = () => world.getDimension('overworld');
const FILL_PER_TICK = 8;
const queue = [];               // команды заливки, ждущие своего тика
function clearSnowballs({ x, y, z, dx, dy, dz } = AREA) {
	for (const entity of overworld().getEntities({
		type: 'minecraft:item', location: { x, y, z }, volume: { x: dx, y: dy, z: dz }
	})) {
		if (entity.getComponent('minecraft:item')?.itemStack.typeId === 'minecraft:snowball') entity.remove();
	}
}

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
	queue.push(...arenaFillCommands());
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
	const inv = p.getComponent('minecraft:inventory')?.container;
	if (inv && gameShovel(inv.getItem(0))) inv.setItem(0);
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
	canEquip: hasShovelSpace,
	prepare: equipShovel,
	onStart: () => resetArena(),
	start: (p, index, total) => {
		const [x, y, z] = startPoint(index, total);
		run(p, `tp @s ${x} ${y} ${z} facing ${CENTER[0] + 0.5} ${y} ${CENTER[1] + 0.5}`);
		run(p, 'effect @s resistance 3600 255 true');
		try { p.selectedSlotIndex = 0; } catch { /* в 1.19.50 может быть только для чтения */ }
	},
	isOut: (p) => p.location.y < OUT_Y,
	cleanup,
	onEnd: () => resetArena(),
	reward: { money: 5000, vip_coins: 5 }
});

// Пока идёт игра — выпавший при копании снег (снежки) убираем раз в секунду: не мусорит и не летит магнитом
let tick = 0;
system.runInterval(() => {
	tick++;
	if (queue.length) for (const c of queue.splice(0, FILL_PER_TICK)) run(overworld(), c);
	// Один раз после загрузки: держим башню прогруженной и заливаем полы снегом (бетон → снег)
	if (tick === 40) run(overworld(), `tickingarea add ${AREA.x} ${AREA.y} ${AREA.z} ${AREA.x + AREA.dx} ${AREA.y + AREA.dy} ${AREA.z + AREA.dz} spleef`);
	if (tick === 100) resetArena();
	if (tick % 20 !== 0 || getGame('spleef')?.phase !== 'running') return;
	clearSnowballs();
});

// Сломал снег в игре — снежки у этого блока убираем сразу (событие приходит, когда они уже выпали)
world.afterEvents.playerBreakBlock.subscribe((e) => {
	const g = getGame('spleef');
	if (!e.player || g?.phase !== 'running' || !g.alive.has(e.player.name)) return;
	const { x, y, z } = e.block.location;
	clearSnowballs({ x: x - 1, y: y - 1, z: z - 1, dx: 2, dy: 2, dz: 2 });
});
