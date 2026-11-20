// --- Проверка CPS (ударов в секунду) против автокликеров ---
// Считаются только удары по сущностям (entityHit с hitEntity): копание блоков не в счёт.
// Если CPS не ниже предела ALERT_SECONDS секунд подряд — хелперам и выше в сети приходит
// предупреждение (не чаще раза в ALERT_COOLDOWN секунд на игрока). Игрока не наказывает:
// решает модератор (!cps <ник> — текущий CPS и максимум за 10 секунд).
// Предел меняется без правки кода: /scoreboard players set cps_limit settings <число> (0 — по умолчанию).
// На PvP-арене (тег player:pvp) каждый видит свой CPS и скорость (м/с, по горизонтали за последнюю секунду)
// строкой над хотбаром (system/ui/toast.js → hud_screen.json), а после удара — ещё и здоровье противника
// (последний, кого ты ударил или кто ударил тебя, 10 секунд; обновляется дважды в секунду).

import { world, system } from '@minecraft/server';
import { hasRole, tell } from '../../utils.js';
import { showHudLine } from '../ui/toast.js';

export const DEFAULT_LIMIT = 16;
const ALERT_SECONDS = 3;
const ALERT_COOLDOWN = 30;
const HISTORY = 10;               // секунд в истории для !cps

let tick = 0;
const hits = new Map();           // ник → тики ударов за последнюю секунду
const history = new Map();        // ник → CPS по секундам, последние HISTORY
const streak = new Map();         // ник → секунд подряд выше предела
const lastAlert = new Map();      // ник → тик последнего предупреждения
const lastPos = new Map();        // ник → позиция секунду назад (для скорости)
// Больше этого за секунду — телепорт, а не бег: скорость не показываем
const TELEPORT_BLOCKS = 40;

/** Скорость по горизонтали, м/с (блоков в секунду) с одним знаком; '—' — телепорт или первая секунда. */
export function speedOf(player) {
	const { x, z } = player.location;
	const prev = lastPos.get(player.name);
	lastPos.set(player.name, { x, z });
	if (!prev) return '—';
	const d = Math.hypot(x - prev.x, z - prev.z);
	return d > TELEPORT_BLOCKS ? '—' : d.toFixed(1);
}

/** Предел CPS из табло settings (cps_limit), иначе DEFAULT_LIMIT. */
export function cpsLimit() {
	try {
		const info = world.scoreboard.getObjective('settings').getScores().find(s => s.participant.displayName === 'cps_limit');
		return info && info.score > 0 ? info.score : DEFAULT_LIMIT;
	} catch {
		return DEFAULT_LIMIT;
	}
}

world.afterEvents.entityHitEntity.subscribe((e) => {
	if (e.damagingEntity?.typeId !== 'minecraft:player' || !e.hitEntity) return;
	const list = hits.get(e.damagingEntity.name) ?? [];
	list.push(tick);
	hits.set(e.damagingEntity.name, list);
});

/** CPS игрока сейчас (удары за последние 20 тиков) и максимум за HISTORY секунд. */
export function cpsOf(name) {
	const now = (hits.get(name) ?? []).filter(t => t > tick - 20).length;
	const max = Math.max(now, ...(history.get(name) ?? [0]));
	return { now, max };
}

// --- Здоровье противника на арене: последний, кого ты ударил или кто ударил тебя (до OPPONENT_SECONDS секунд) ---
const OPPONENT_SECONDS = 10;
const opponent = new Map();       // ник → { name, tick }
const shown = new Map();          // ник → [CPS с цветом, скорость] за последнюю секунду

world.afterEvents.entityHurt.subscribe((e) => {
	const a = e.damageSource.damagingEntity, v = e.hurtEntity;
	if (a?.typeId !== 'minecraft:player' || v?.typeId !== 'minecraft:player' || a === v) return;
	if (!a.hasTag('player:pvp') || !v.hasTag('player:pvp')) return;
	opponent.set(a.name, { name: v.name, tick });
	opponent.set(v.name, { name: a.name, tick });
});

function findOnlinePlayer(name) {
	for (const player of world.getPlayers()) {
		if (player.name === name) return player;
	}
	return undefined;
}

/** Здоровье противника для строки над хотбаром: '§a17' (цвет по доле от максимума) или undefined. */
export function opponentHp(player, onlineByName) {
	const o = opponent.get(player.name);
	if (!o || o.tick < tick - OPPONENT_SECONDS * 20) return undefined;
	const target = onlineByName ? onlineByName.get(o.name) : findOnlinePlayer(o.name);
	if (!target || !target.hasTag('player:pvp')) return undefined;
	try {
		const health = target.getComponent('health');
		if (!(health.currentValue > 0)) return undefined;
		const max = health.effectiveMax > 0 ? health.effectiveMax : 20;
		const color = health.currentValue > max * 0.6 ? '§a' : health.currentValue > max * 0.3 ? '§6' : '§c';
		return `${color}${Math.ceil(health.currentValue)}`;
	} catch {
		return undefined;
	}
}

/** Строка над хотбаром: CPS, скорость и — если есть противник — его здоровье. */
function renderHud(player, hp) {
	const [cps, speed] = shown.get(player.name) ?? ['§a0', '—'];
	showHudLine(player, [hp === undefined
		? { translate: 'hud.cps', with: [cps, speed] }
		: { translate: 'hud.cps.hp', with: [cps, speed, hp] }]);
}

system.runInterval(() => {
	tick++;
	if (tick % 10 !== 0) return;
	const players = [...world.getPlayers()];
	const onlineByName = new Map(players.map(player => [player.name, player]));
	// Между пересчётами CPS обновляем здоровье противника и переиспользуем его при отрисовке.
	if (tick % 20 !== 0) {
		for (const player of players) {
			if (!player.hasTag('player:pvp') || player.hasTag('role:bot')) continue;
			const hp = opponentHp(player, onlineByName);
			if (hp !== undefined) renderHud(player, hp);
		}
		return;
	}
	const limit = cpsLimit();
	let staff;
	for (const player of players) {
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
			shown.set(name, [`${color}${cps}`, speedOf(player)]);
			renderHud(player, opponentHp(player, onlineByName));
		} else { lastPos.delete(name); shown.delete(name); opponent.delete(name); }
		const s = cps >= limit ? (streak.get(name) ?? 0) + 1 : 0;
		streak.set(name, s);
		if (s < ALERT_SECONDS || player.hasTag('role:bot')) continue;
		if ((lastAlert.get(name) ?? -Infinity) > tick - ALERT_COOLDOWN * 20) continue;
		lastAlert.set(name, tick);
		staff ??= players.filter(candidate => hasRole(candidate, 'helper'));
		for (const recipient of staff) tell(recipient, 'chat.cps.alert', name, cps, s, limit);
	}
});

world.afterEvents.playerLeave.subscribe((e) => {
	for (const m of [hits, history, streak, lastAlert, lastPos, opponent, shown]) m.delete(e.playerName);
});
