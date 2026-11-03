// Восстановление только отсутствующих счетов: после reset запись исчезает, а не становится нулём.
// Деньги, VIP и прочий уже существующий прогресс при повторной проверке не меняются.
import { world } from '@minecraft/server';
import { run, getScore } from '../DataBase.js';

const CORE = { xp: 0, money: 0, vip_coins: 0, lvl: 1, rebirth: 0, efficiency: 0, fortune: 0, pick: 0, magnet: 0 };
const pending = new Map();

export function ensurePlayerScores(player) {
	const name = player.name;
	if (pending.has(name)) return pending.get(name);
	const task = repair(player).catch(error => console.warn('[Shop for Ore] Score recovery: ' + error)).finally(() => pending.delete(name));
	pending.set(name, task);
	return task;
}

async function repair(player) {
	const level = Math.max(1, getScore(player, 'lvl'));
	// След уже выполненного вайпа: не даём старому «новичку» снова обнулить новые деньги.
	// У ребитха здесь ещё уровень 25+, его сигнал снятым тегом player оставляем функции.
	const afterWipe = level === 1 && player.getTags().some(t => t.startsWith('sys:wipe:'));
	if (afterWipe && !player.hasTag('player')) player.addTag('player');
	const defaults = { ...CORE, online: [...world.getPlayers()].length, xp_need: level === 1 ? 100 : 0 };
	let needCost = false;
	for (const [id, initial] of Object.entries(defaults)) {
		let objective = world.scoreboard.getObjective(id);
		if (!objective) objective = world.scoreboard.addObjective(id, id);
		let score;
		try { score = objective.getScore(player.scoreboard); } catch { /* отсутствующая запись */ }
		if (Number.isFinite(score) && (id !== 'lvl' || score >= 1)
			&& (id !== 'online' || score === initial)
			&& (id !== 'xp_need' || level !== 1 || score > 0)) continue;
		// Команды идут последовательно: массовый вход не создаёт десятки команд на игрока за один тик.
		const result = await run(player, `scoreboard players set @s ${id} ${initial}`);
		if (result === undefined) return false;
		if (id === 'xp_need' && level > 1) needCost = true;
	}
	if (needCost) await run(player, 'function system/xp_need');
	return true;
}

let tick = 0;
world.events.tick.subscribe(() => {
	if (++tick % 20 !== 0) return;
	for (const player of world.getPlayers()) ensurePlayerScores(player);
});
