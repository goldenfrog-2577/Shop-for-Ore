// --- Проверка CPS (ударов в секунду) против автокликеров ---
// Считаются только удары по сущностям (entityHit с hitEntity): копание блоков не в счёт.
// Если CPS не ниже предела ALERT_SECONDS секунд подряд — модераторам и выше в сети приходит
// предупреждение (не чаще раза в ALERT_COOLDOWN секунд на игрока). Игрока не наказывает:
// решает модератор (!cps <ник> — текущий CPS и максимум за 10 секунд).
// Предел меняется без правки кода: /scoreboard players set cps_limit settings <число> (0 — по умолчанию).
// На PvP-арене (тег player:pvp) каждый видит свой CPS строкой над хотбаром (system/toast.js → hud_screen.json).

import { world } from '@minecraft/server';
import { hasRole, tell } from '../DataBase.js';
import { showHudLine } from './toast.js';

export const DEFAULT_LIMIT = 16;
const ALERT_SECONDS = 3;
const ALERT_COOLDOWN = 30;
const HISTORY = 10;               // секунд в истории для !cps

let tick = 0;
const hits = new Map();           // ник → тики ударов за последнюю секунду
const history = new Map();        // ник → CPS по секундам, последние HISTORY
const streak = new Map();         // ник → секунд подряд выше предела
const lastAlert = new Map();      // ник → тик последнего предупреждения

/** Предел CPS из табло settings (cps_limit), иначе DEFAULT_LIMIT. */
export function cpsLimit() {
	try {
		const info = world.scoreboard.getObjective('settings').getScores().find(s => s.participant.displayName === 'cps_limit');
		return info && info.score > 0 ? info.score : DEFAULT_LIMIT;
	} catch {
		return DEFAULT_LIMIT;
	}
}

world.events.entityHit.subscribe((e) => {
	if (e.entity?.typeId !== 'minecraft:player' || !e.hitEntity) return;
	const list = hits.get(e.entity.name) ?? [];
	list.push(tick);
	hits.set(e.entity.name, list);
});

/** CPS игрока сейчас (удары за последние 20 тиков) и максимум за HISTORY секунд. */
export function cpsOf(name) {
	const now = (hits.get(name) ?? []).filter(t => t > tick - 20).length;
	const max = Math.max(now, ...(history.get(name) ?? [0]));
	return { now, max };
}

world.events.tick.subscribe(() => {
	tick++;
	if (tick % 20 !== 0) return;
	const limit = cpsLimit();
	for (const player of world.getPlayers()) {
		const name = player.name;
		const list = (hits.get(name) ?? []).filter(t => t > tick - 20);
		hits.set(name, list);
		const cps = list.length;
		const h = history.get(name) ?? [];
		h.push(cps);
		if (h.length > HISTORY) h.shift();
		history.set(name, h);
		// Свой CPS — только на арене; цвет: обычный, близко к пределу, предел
		if (player.hasTag('player:pvp') && !player.hasTag('role:bot')) {
			const color = cps >= limit ? '§c' : cps >= limit * 0.75 ? '§6' : '§a';
			showHudLine(player, [{ translate: 'hud.cps', with: [`${color}${cps}`] }]);
		}
		const s = cps >= limit ? (streak.get(name) ?? 0) + 1 : 0;
		streak.set(name, s);
		if (s < ALERT_SECONDS || player.hasTag('role:bot')) continue;
		if ((lastAlert.get(name) ?? -Infinity) > tick - ALERT_COOLDOWN * 20) continue;
		lastAlert.set(name, tick);
		for (const staff of world.getPlayers()) {
			if (hasRole(staff, 'moder')) tell(staff, 'chat.cps.alert', name, cps, s, limit);
		}
	}
});

world.events.playerLeave.subscribe((e) => {
	for (const m of [hits, history, streak, lastAlert]) m.delete(e.playerName);
});
