// Восстановление только отсутствующих счетов: после reset запись исчезает, а не становится нулём.
// Деньги, VIP и прочий уже существующий прогресс при повторной проверке не меняются.
import { world, system } from '@minecraft/server';
import { run, getScore } from '../../utils.js';

const CORE = { xp: 0, money: 0, vip_coins: 0, lvl: 1, rebirth: 0, efficiency: 0, fortune: 0, pick: 0, magnet: 0 };
const pending = new Map();

// При пакетной проверке все игроки используют один снимок онлайна.
export function ensurePlayerScores(player, onlineCount) {
	const name = player.name;
	if (pending.has(name)) return pending.get(name);
	const task = repair(player, onlineCount).catch(error => console.warn('[Shop for Ore] Score recovery: ' + error)).finally(() => pending.delete(name));
	pending.set(name, task);
	return task;
}

async function repair(player, onlineCount) {
	const level = Math.max(1, getScore(player, 'lvl'));
	// След уже выполненного вайпа: не даём старому «новичку» снова обнулить новые деньги.
	const afterWipe = level === 1 && player.getTags().some(t => t.startsWith('sys:wipe:'));
	if (afterWipe && !player.hasTag('player')) player.addTag('player');
	const defaults = { ...CORE, online: onlineCount ?? [...world.getPlayers()].length, xp_need: level === 1 ? 100 : 0 };
	let needCost = false;
	for (const [id, initial] of Object.entries(defaults)) {
		let objective = world.scoreboard.getObjective(id);
		if (!objective) objective = world.scoreboard.addObjective(id, id);
		let score;
		try { score = objective.getScore(player); } catch { /* отсутствующая запись */ }
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
system.runInterval(() => {
	if (++tick % 20 !== 0) return;
	const players = [...world.getPlayers()];
	for (const player of players) ensurePlayerScores(player, players.length);
	if (!limitsTask) ensureFunctionLimits();
});


// Миграция мира с отключёнными функциями: в level.dat оба бюджета были равны нулю.
// Это отдельные правила от commandblocksenabled — старые командные блоки не включаем.
const LIMITS_FIXED = 'shop:command_limits_v1';
let limitsTask;

export function ensureFunctionLimits() {
	if (limitsTask) return limitsTask;
	limitsTask = restoreFunctionLimits().then(ok => {
		if (!ok) limitsTask = undefined;
		return ok;
	}, error => {
		limitsTask = undefined;
		console.warn('[Shop for Ore] Function limits repair failed: ' + (error?.message ?? error));
		return false;
	});
	return limitsTask;
}
async function restoreFunctionLimits() {
	try { if (world.getDynamicProperty(LIMITS_FIXED) === true) return true; } catch {}
	// Сначала восстанавливаем player у уже сброшенного игрока, иначе system/system
	// после включения функций ещё раз обнулит его новые деньги как «новичку».
	const players = [...world.getPlayers()];
	for (const player of players) {
		if (await ensurePlayerScores(player, players.length) !== true) return false;
	}
	const dim = world.getDimension('overworld');
	try {
		dim.runCommand('gamerule functioncommandlimit 10000');
		dim.runCommand('gamerule maxcommandchainlength 65536');
	} catch (error) {
		console.warn('[Shop for Ore] Function limits repair failed: ' + (error?.message ?? error));
		return false;
	}
	try { world.setDynamicProperty(LIMITS_FIXED, true); }
	catch (error) { console.warn('[Shop for Ore] Rejoin to register command limit migration: ' + (error?.message ?? error)); }
	console.warn('[Shop for Ore] Restored functioncommandlimit=10000 and maxcommandchainlength=65536; commandblocksenabled unchanged');
	return true;
}
world.afterEvents.worldLoad.subscribe(() => {
	// На чистом мире нативный system/timers ещё не может прочитать setup system.
	for (const id of ['system', ...Object.keys(CORE), 'online', 'xp_need']) {
		if (!world.scoreboard.getObjective(id)) world.scoreboard.addObjective(id, id);
	}
	ensureFunctionLimits();
});
