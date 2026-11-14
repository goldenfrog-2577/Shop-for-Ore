import { world, system } from '@minecraft/server';
import { getRole, getWarns, isBot, isPending, isVip, ROLES, run } from '../../utils.js';

const REGISTRY = 'sfo_registry';
const SCORE_IDS = ['lvl', 'xp', 'xp_need', 'money', 'vip_coins', 'rebirth'];
export const DEBUG_SCORES = ['money', 'vip_coins', 'lvl', 'xp', 'rebirth'];

function score(participant, objective) {
	try {
		const value = world.scoreboard.getObjective(objective)?.getScore(participant);
		return Number.isFinite(value) ? value : undefined;
	} catch { return undefined; }
}

export function profileScores(participant) {
	return Object.fromEntries(SCORE_IDS.map(id => [id, score(participant, id)]));
}

export function profilePosition(player) {
	const { x, y, z } = player.location;
	return [Math.floor(x) + ' ' + Math.floor(y) + ' ' + Math.floor(z), player.dimension.id.replace('minecraft:', '')];
}

export function groupProfileTags(player) {
	const groups = new Map();
	const tags = player.getTags().filter(t => !/^(auth:(salt|hash):|password:)/i.test(t)).sort((a, b) => a.localeCompare(b));
	for (const tag of tags) {
		const colon = tag.indexOf(':');
		const group = tag === 'player' ? 'player' : colon > 0 ? tag.slice(0, colon) : '';
		if (!groups.has(group)) groups.set(group, []);
		groups.get(group).push(tag);
	}
	const names = [...groups.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b));
	if (groups.has('')) names.push('');
	return { count: tags.length, groups: names.map(name => [name, groups.get(name)]) };
}

function participants(id) {
	try {
		return world.scoreboard.getObjective(id)?.getParticipants()
			.filter(entry => String(entry.type).toLowerCase() === 'player') ?? [];
	} catch { return []; }
}

export function offlineProfiles(online) {
	const records = new Map();
	for (const id of ['money', REGISTRY]) {
		for (const identity of participants(id)) {
			const name = identity.displayName;
			// Bedrock может вернуть ключ локализации вместо ника участника табло.
			if (!name || /^%?commands\.scoreboard\.players\.offlinePlayerName\b/.test(name) || online.has(name)) continue;
			records.set(name, identity);
		}
	}
	return records;
}

export function offlineProfile(identity) {
	const scores = profileScores(identity);
	const packed = score(identity, REGISTRY);
	// Единицы — роль (1…5), десятки — VIP, сотни — предупреждения.
	const role = ROLES[packed % 10 - 1];
	const hasSnapshot = role !== undefined && scores.lvl !== undefined;
	return {
		scores,
		role: hasSnapshot ? role : undefined,
		vip: hasSnapshot && Math.floor(packed / 10) % 10 === 1,
		warns: hasSnapshot ? Math.floor(packed / 100) : undefined,
		seconds: score(identity, 'play_seconds') ?? (score(identity, 'stat_playtime') ?? 0) * 60
	};
}

// Сохраняем только поля, которых нет в игровых табло, после успешного входа.
export function saveRegistryProfile(player) {
	if (isBot(player) || isPending(player) || !player.hasTag('auth:done')) return;
	try {
		if (!world.scoreboard.getObjective(REGISTRY)) world.scoreboard.addObjective(REGISTRY, REGISTRY);
		const warns = Math.max(0, Math.min(3, Math.floor(getWarns(player))));
		const packed = ROLES.indexOf(getRole(player)) + 1 + (isVip(player) ? 10 : 0) + warns * 100;
		if (score(player.scoreboard, REGISTRY) !== packed) run(player, 'scoreboard players set @s ' + REGISTRY + ' ' + packed);
	} catch (error) {
		console.warn('[Shop for Ore] Player registry: ' + (error?.message ?? error));
	}
}

system.runSchedule(() => {
	for (const player of world.getPlayers()) saveRegistryProfile(player);
}, 100);
