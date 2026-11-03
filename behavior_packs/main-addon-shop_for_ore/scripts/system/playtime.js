// Суммарное время онлайн: один групповой счёт раз в секунду. Старые минуты сохраняются.
import { world, system } from '@minecraft/server';
import { getScore, isPending, run } from '../DataBase.js';

export const PLAYTIME_OBJECTIVE = 'play_seconds';
export function playedSeconds(player) {
	try { return Math.max(0, world.scoreboard.getObjective(PLAYTIME_OBJECTIVE).getScore(player.scoreboard)); }
	catch { return Math.max(0, getScore(player, 'stat_playtime') * 60); }
}
const UNITS = [['year', 365 * 86400], ['month', 30 * 86400], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
export function durationParts(seconds) {
	let left = Math.max(0, Math.floor(seconds));
	return UNITS.map(([unit, size]) => { const n = Math.floor(left / size); left %= size; return [unit, n]; });
}
export const playtimeText = player => durationParts(playedSeconds(player)).map(([u,n]) => `${n} %menu.common.time.${u}`).join(' ');
export const playtimeRawtext = player => durationParts(playedSeconds(player)).flatMap(([u,n], i) => [
	{ text: (i ? ' ' : '') + n + ' ' }, { translate: 'menu.common.time.' + u }
]);

system.runSchedule(() => {
	const objective = world.scoreboard.getObjective(PLAYTIME_OBJECTIVE);
	if (!objective) return; // system/setup ещё не создал табло.
	for (const player of world.getPlayers()) {
		if (isPending(player) || player.hasTag('role:bot')) continue;
		try { objective.getScore(player.scoreboard); }
		catch { run(player, `scoreboard players set @s ${PLAYTIME_OBJECTIVE} ${Math.min(2147483646, playedSeconds(player))}`); }
	}
	run(world.getDimension('overworld'), 'scoreboard players add @a[tag=auth:done,tag=!auth:login,tag=!auth:register,tag=!role:bot,scores={play_seconds=..2147483646}] play_seconds 1');
}, 20);
