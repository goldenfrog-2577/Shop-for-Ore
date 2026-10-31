// --- Тир: стрельба из своего лука по мишеням за монеты ---
// Зона тира — поляна за каменными стенами (x 399…493, z 272…360, пол — трава на y −50), спавн 435 −45 338.
// Вошёл в зону — кирка уровня из слота 1 убирается (тег zone:tir; functions/system/pickaxe_lvl её не выдаёт,
// system/tools.js не трогает слот). Вышел (телепорт на спавн, !warp, портал, перезаход в другом месте) —
// что лежало в слоте 1, переносим в свободный слот (или бросаем под ноги), а pickaxe_lvl выдаёт кирку заново.
// Попадание стрелой в мишень (minecraft:target) из зоны: награда по меткости — центр 50, край 10 монет —
// и множитель за дальность (×1 на 8 блоках, ×2 с 40 и дальше). Защита от фарма: ближе MIN_DISTANCE блоков
// награды нет, одна и та же мишень одному игроку платит не чаще раза в COOLDOWN_MS.
// Сообщение — строкой над хотбаром (system/toast.js), звук — колокольчик (в яблочко — уровень).

import { world } from '@minecraft/server';
import { run, tell } from '../DataBase.js';
import { showHudLine } from './toast.js';

export const TIR_TAG = 'zone:tir';
// Зона тира по координатам игрока: x и z — поляна со стенами, y — от пола до верхушек деревьев
export const ZONE = { x1: 399, x2: 494, y1: -52, y2: -15, z1: 272, z2: 361 };
export const MIN_DISTANCE = 8;
export const COOLDOWN_MS = 3000;
export const CENTER_REWARD = 50, EDGE_REWARD = 10;
const FAR_DISTANCE = 40;        // с этой дальности множитель ×2
const CHECK_EVERY = 10;         // тиков между проверками входа и выхода
const HOTBAR_FIRST = 0, INVENTORY_SIZE = 36;

/** Точка внутри зоны тира. */
export function inZone({ x, y, z }) {
	return x >= ZONE.x1 && x < ZONE.x2 && y >= ZONE.y1 && y < ZONE.y2 && z >= ZONE.z1 && z < ZONE.z2;
}

/**
 * Смещение точки попадания от центра грани мишени: 0 — центр, 1 — край (и дальше).
 * Берём точку удара стрелы в мире и проецируем на плоскость грани — так не зависим от того,
 * в каких единицах игра отдаёт faceLocationX/Y.
 */
export function offCenter(block, location, face) {
	const c = { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };
	const d = { x: location.x - c.x, y: location.y - c.y, z: location.z - c.z };
	// Нормаль грани отбрасываем: из события (face), иначе — ось с самым большим смещением
	const ax = Math.abs(d.x), ay = Math.abs(d.y), az = Math.abs(d.z);
	const f = String(face ?? '').toLowerCase();
	const axis = /up|down/.test(f) ? 'y' : /east|west/.test(f) ? 'x' : /north|south/.test(f) ? 'z'
		: ay >= ax && ay >= az ? 'y' : ax >= az ? 'x' : 'z';
	const [u, v] = axis === 'y' ? [d.x, d.z] : axis === 'x' ? [d.z, d.y] : [d.x, d.y];
	return Math.min(1, Math.hypot(u, v) / 0.5);
}

/** Награда: off — смещение 0…1 (offCenter), distance — блоков от стрелка до мишени. */
export function reward(off, distance) {
	const base = CENTER_REWARD - (CENTER_REWARD - EDGE_REWARD) * Math.min(1, Math.max(0, off));
	const mult = 1 + Math.min(1, Math.max(0, (distance - MIN_DISTANCE) / (FAR_DISTANCE - MIN_DISTANCE)));
	return Math.round(base * mult);
}

// «ник|x,y,z» → время последней оплаты (мс)
const lastPaid = new Map();

/** Оплатить попадание: undefined — без награды (близко, откат). */
export function scoreHit(player, block, location, face, now = Date.now()) {
	const p = player.location;
	const distance = Math.hypot(block.x + 0.5 - p.x, block.y + 0.5 - p.y, block.z + 0.5 - p.z);
	if (distance < MIN_DISTANCE) return { error: 'close', distance };
	const key = `${player.name}|${block.x},${block.y},${block.z}`;
	if (now - (lastPaid.get(key) ?? 0) < COOLDOWN_MS) return { error: 'cooldown', distance };
	lastPaid.set(key, now);
	const off = offCenter(block, location, face);
	return { money: reward(off, distance), accuracy: Math.round((1 - off) * 100), distance };
}

world.events.projectileHit.subscribe((e) => {
	const shooter = e.source;
	const hit = e.blockHit;
	if (shooter?.typeId !== 'minecraft:player' || !hit || !shooter.hasTag(TIR_TAG)) return;
	if (hit.block?.typeId !== 'minecraft:target') return;
	const b = hit.block.location;
	const r = scoreHit(shooter, b, e.location ?? { x: b.x + hit.faceLocationX, y: b.y + hit.faceLocationY, z: b.z + 0.5 }, hit.face);
	if (r.error === 'close') { showHudLine(shooter, [{ translate: 'hud.tir.close', with: [String(MIN_DISTANCE)] }]); return; }
	if (r.error) return;
	run(shooter, `scoreboard players add @s money ${r.money}`);
	showHudLine(shooter, [{ translate: 'hud.tir.hit', with: [String(r.money), `${r.accuracy}%`, String(Math.round(r.distance))] }]);
	run(shooter, r.accuracy >= 90 ? 'playsound random.levelup @s ~ ~ ~ 0.6 1.6' : 'playsound note.bell @s ~ ~ ~ 0.8 1.2');
});

/** Убрать предмет из слота 1 на свободное место инвентаря (или под ноги), чтобы кирка его не затёрла. */
function freeFirstSlot(player) {
	try {
		const inv = player.getComponent('inventory').container;
		const item = inv.getItem(HOTBAR_FIRST);
		if (!item) return;
		inv.setItem(HOTBAR_FIRST, undefined);
		for (let i = HOTBAR_FIRST + 1; i < Math.min(INVENTORY_SIZE, inv.size); i++) {
			if (!inv.getItem(i)) { inv.setItem(i, item); return; }
		}
		player.dimension.spawnItem(item, player.location);
	} catch { /* игрок вышел */ }
}

/** Вход в тир: кирку уровня — в сторону. */
export function enterTir(player) {
	player.addTag(TIR_TAG);
	run(player, 'replaceitem entity @s slot.hotbar 0 air');
	tell(player, 'chat.tir.enter');
}

/** Выход из тира: слот 1 освободить, кирку вернёт pickaxe_lvl (табло pick = 0). */
export function leaveTir(player) {
	player.removeTag(TIR_TAG);
	freeFirstSlot(player);
	run(player, 'scoreboard players set @s pick 0');
}

let tick = 0;
world.events.tick.subscribe(() => {
	if (++tick % CHECK_EVERY !== 0) return;
	for (const player of world.getPlayers()) {
		const inside = inZone(player.location);
		const tagged = player.hasTag(TIR_TAG);
		if (inside && !tagged) enterTir(player);
		else if (!inside && tagged) leaveTir(player);
	}
	// Старые откаты не копим
	if (tick % 1200 === 0) {
		const now = Date.now();
		for (const [k, t] of lastPaid) if (now - t > COOLDOWN_MS) lastPaid.delete(k);
	}
});
