// --- Порталы и другие измерения закрыты ---
// В Bedrock нет настройки, которая отключает Незер и Энд (allow-nether есть только в Java), поэтому закрываем их сами,
// одинаково для всех, включая персонал. Зона «Незер» на карте — часть верхнего мира, её это не касается.
// Три слоя:
//   1. Поджечь нельзя: огниво или огненный заряд по обсидиану, око Края в рамку портала — действие отменяется, игроку сообщение.
//   2. Портал, который всё же появился (лава у рамки, раздатчик с огнивом, огненный шар), ломается: раз в BREAK_TICKS тиков
//      вокруг каждого игрока (куб со стороной 2 × RADIUS + 1, меньше лимита /fill в 32 768 блоков) блоки порталов → воздух.
//      Войти в портал без игрока рядом нельзя, а в выживании переход занимает ~4 с — портал исчезает раньше.
//   3. Кто всё же оказался в Незере или Энде (/tp, execute in), раз в секунду возвращается на спавн верхнего мира.
// Декоративных порталов на карте нет (владелец, 0.3.0) — исключений по координатам не нужно.

import { world } from '@minecraft/server';
import { tell } from '../../utils.js';
import { SPAWN } from '../player/void.js';

export const RADIUS = 15;
export const BREAK_TICKS = 5;
export const RETURN_TICKS = 20;
export const PORTAL_BLOCKS = ['portal', 'end_portal', 'end_gateway'];
const MSG_COOLDOWN = 40;                 // ПКМ зажатой кнопкой шлёт событие много раз — сообщение не чаще раза в 2 с
const OVERWORLD = 'minecraft:overworld';
// Высота мира по измерениям: /fill за пределами мира не выполняется целиком, поэтому куб обрезаем
const HEIGHT = { 'minecraft:overworld': [-64, 319], 'minecraft:nether': [0, 127], 'minecraft:the_end': [0, 255] };

/** Предмет поджигает портал на этом блоке. */
export function ignitesPortal(itemId, blockId) {
	if (blockId === 'minecraft:obsidian') return itemId === 'minecraft:flint_and_steel' || itemId === 'minecraft:fire_charge';
	return blockId === 'minecraft:end_portal_frame' && itemId === 'minecraft:ender_eye';
}

/** Команды /fill, которые убирают порталы вокруг точки в измерении. */
export function breakCommands(location, dimensionId) {
	const [low, high] = HEIGHT[dimensionId] ?? HEIGHT[OVERWORLD];
	const x = Math.floor(location.x), y = Math.floor(location.y), z = Math.floor(location.z);
	const y1 = Math.max(low, y - RADIUS), y2 = Math.min(high, y + RADIUS);
	if (y1 > y2) return [];
	return PORTAL_BLOCKS.map(b => `fill ${x - RADIUS} ${y1} ${z - RADIUS} ${x + RADIUS} ${y2} ${z + RADIUS} air 0 replace ${b} -1`);
}

let tick = 0;
const lastMessage = new Map();

world.events.beforeItemUseOn.subscribe((e) => {
	const player = e.source;
	if (player?.typeId !== 'minecraft:player') return;
	let blockId;
	try { blockId = player.dimension.getBlock(e.blockLocation)?.typeId; } catch { return; }
	if (!ignitesPortal(e.item?.typeId, blockId)) return;
	e.cancel = true;
	if (tick - (lastMessage.get(player.name) ?? -MSG_COOLDOWN) < MSG_COOLDOWN) return;
	lastMessage.set(player.name, tick);
	tell(player, 'chat.server.portal_blocked');
});

world.events.playerLeave.subscribe((e) => lastMessage.delete(e.playerName));

world.events.tick.subscribe(() => {
	++tick;
	const breakNow = tick % BREAK_TICKS === 0, returnNow = tick % RETURN_TICKS === 0;
	if (!breakNow && !returnNow) return;
	for (const player of world.getPlayers()) {
		const dimension = player.dimension;
		if (breakNow) for (const command of breakCommands(player.location, dimension.id)) dimension.runCommandAsync(command).catch(() => {});
		if (returnNow && dimension.id !== OVERWORLD) {
			try {
				player.teleport({ x: SPAWN[0] + 0.5, y: SPAWN[1], z: SPAWN[2] + 0.5 }, world.getDimension('overworld'), 0, 0);
				tell(player, 'chat.server.dimension_closed');
			} catch {}
		}
	}
});
