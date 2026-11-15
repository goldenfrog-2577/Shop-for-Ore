import { world } from '@minecraft/server';
import { experienceForLevel, maxLevel } from './level-costs.js';

const initialScores = {
	xp: 0, money: 0, vip_coins: 0, lvl: 1, rebirth: 0, efficiency: 0,
	fortune: 0, pick: 0, magnet: 0, play_seconds: 0,
};

export function readScore(player, id) {
	return world.scoreboard.getObjective(id)?.getScore(player) ?? 0;
}

export function updatePlayerScores(players) {
	const scoreboard = world.scoreboard;
	const defaults = { ...initialScores, xp_need: 0, online: 0 };
	const objectives = {};
	for (const id of Object.keys(defaults)) {
		objectives[id] = scoreboard.getObjective(id) ?? scoreboard.addObjective(id, id);
	}

	const online = players.length;
	for (const player of players) {
		let level = objectives.lvl.getScore(player);
		if (level === undefined || level < 1) {
			level = initialScores.lvl;
			objectives.lvl.setScore(player, level);
		}

		for (const [id, initial] of Object.entries(initialScores)) {
			const objective = objectives[id];
			if (id !== 'lvl' && objective.getScore(player) === undefined) {
				objective.setScore(player, initial);
			}
		}

		const need = objectives.xp_need.getScore(player);
		if (need === undefined || (need === 0 && level < maxLevel)) {
			objectives.xp_need.setScore(player, experienceForLevel(level));
		}
		if (objectives.online.getScore(player) !== online) {
			objectives.online.setScore(player, online);
		}
	}
}
