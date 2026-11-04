// Суммарное время онлайн: один групповой счёт раз в секунду. Старые минуты сохраняются.
import { world, system } from '@minecraft/server';
import { getScore, isPending, run } from '../DataBase.js';

export const PLAYTIME_OBJECTIVE = 'play_seconds';
export function playedSeconds(player) {
	try {
		const seconds = world.scoreboard.getObjective(PLAYTIME_OBJECTIVE).getScore(player.scoreboard);
		if (Number.isFinite(seconds)) return Math.max(0, Math.floor(seconds));
	} catch { /* цели или счёта ещё нет */ }
	const seconds = getScore(player, 'stat_playtime') * 60;
	return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
}
const UNITS = [['year', 365 * 86400], ['month', 30 * 86400], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
export function durationParts(seconds) {
	let left = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
	return UNITS.map(([unit, size]) => { const n = Math.floor(left / size); left %= size; return [unit, n]; });
}
const displayParts = seconds => durationParts(seconds).filter(([, n], i) => i >= 3 || n > 0);
export const playtimeText = player => displayParts(playedSeconds(player)).map(([u,n]) => `${n} %menu.common.time.${u}`).join(' ');
export const playtimeRawtext = player => displayParts(playedSeconds(player)).flatMap(([u,n], i) => [
	{ text: (i ? ' ' : '') + n + ' ' }, { translate: 'menu.common.time.' + u }
]);

system.runSchedule(() => {
	const objective = world.scoreboard.getObjective(PLAYTIME_OBJECTIVE);
	if (!objective) return;
	for (const player of world.getPlayers()) {
		if (isPending(player) || player.hasTag('role:bot')) continue;
		let score;
		try { score = objective.getScore(player.scoreboard); } catch { /* счёт ещё не создан */ }
		if (!Number.isFinite(score)) run(player, `scoreboard players set @s ${PLAYTIME_OBJECTIVE} ${Math.min(2147483646, playedSeconds(player))}`);
	}
	run(world.getDimension('overworld'), 'scoreboard players add @a[tag=auth:done,tag=!auth:login,tag=!auth:register,tag=!role:bot,scores={play_seconds=..2147483646}] play_seconds 1');
}, 20);
