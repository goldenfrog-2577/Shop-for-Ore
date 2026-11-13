// GameTest запускается в загруженной площадке Верхнего мира; успех — только после появления бота.
import * as GT from '@minecraft/server-gametest';
import { world, system, BlockLocation, DynamicPropertiesDefinition } from '@minecraft/server';
import { run } from '../../utils.js';
import { ensureFunctionLimits } from '../core/player_scores.js';

const BOT_NAME_PROPERTY = 'shop:bot_name';
export const BOT_DEFAULT_NAME = 'Bot';
const state = { bot: undefined, test: undefined };
let pending;
const spawnListeners = [], removeListeners = [];
export const onBotSpawned = fn => spawnListeners.push(fn);
export const onBotRemoved = fn => removeListeners.push(fn);
world.events.worldInitialize.subscribe(e => {
	const def = new DynamicPropertiesDefinition();
	def.defineString(BOT_NAME_PROPERTY, 16);
	e.propertyRegistry.registerWorldDynamicProperties(def);
});
export function getBotName() {
	try { return world.getDynamicProperty(BOT_NAME_PROPERTY) || BOT_DEFAULT_NAME; }
	catch { return BOT_DEFAULT_NAME; }
}
export function setBotName(name) {
	if (!/^[A-Za-z0-9_ ]{3,16}$/.test(name) || !name.trim()) return false;
	world.setDynamicProperty(BOT_NAME_PROPERTY, name);
	return true;
}
export function getBot() {
	try {
		if (state.bot) for (const p of world.getPlayers()) if (p.name === state.bot.name) return state.bot;
	} catch { /* исчезнувший native-объект после смерти/перезахода */ }
	state.bot = undefined;
	for (const p of world.getPlayers()) {
		if (p.hasTag('sys:bot') && p.hasTag('role:bot')) { state.bot = p; return p; }
	}
	return undefined;
}

/** Общий промис исключает повторный GameTest, пока первый ещё загружается. */
export function spawnBot(summoner, at) {
	const existing = getBot();
	if (existing) return Promise.resolve(existing);
	if (pending) return pending.promise;
	let resolve;
	const request = { summoner, at, ticks: 0, promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) };
	pending = request;
	const dim = world.getDimension('overworld');
	const finish = (bot, reason) => {
		if (pending !== request) return;
		system.clearRunSchedule(request.timer);
		pending = undefined;
		if (reason) {
			console.warn('[Shop for Ore] Bot spawn failed: ' + reason);
			if (!state.bot) run(dim, 'tickingarea remove shop_bot');
		}
		request.resolve(bot);
	};
	request.finish = finish;
	request.timer = system.runSchedule(() => {
		if (++request.ticks >= 100) { finish(undefined, 'GameTest did not spawn a player within 100 ticks'); return; }
		if (!request.areaReady || request.started) return;
		try {
			if (!dim.getBlock(new BlockLocation(1000000, -60, 1000000))) return;
		} catch { return; }
		request.started = true;
		Promise.resolve().then(() => dim.runCommandAsync('function system/spawn_bot')).catch(error => {
			finish(undefined, 'function system/spawn_bot: ' + (error?.message ?? error));
		});
	}, 1);
	// Четыре чанка вокруг площадки; остаются загружены, пока живёт GameTest.
	ensureFunctionLimits().then(async ready => {
		if (pending !== request) return;
		if (!ready) { finish(undefined, 'function command limits could not be restored'); return; }
		await run(dim, 'tickingarea add 999984 -64 999984 1000015 0 1000015 shop_bot true');
		request.areaReady = true;
	}).catch(error => finish(undefined, error?.message ?? error));
	return request.promise;
}

export function removeBot() {
	if (pending) pending.finish(undefined, 'spawn cancelled');
	const bot = getBot();
	if (!bot) return false;
	for (const fn of removeListeners) fn(bot);
	try { state.test.removeSimulatedPlayer(bot); } catch { bot.kill(); }
	state.bot = undefined;
	run(world.getDimension('overworld'), 'tickingarea remove shop_bot');
	return true;
}

GT.register('server', 'spawnbot', test => {
	const request = pending;
	if (!request || getBot()) return;
	let bot;
	try {
		bot = test.spawnSimulatedPlayer(new BlockLocation(0, 2, 0), getBotName());
		bot.addTag('sys:bot'); bot.addTag('role:bot'); bot.addTag('auth:done');
		bot.removeTag('auth:login'); bot.removeTag('auth:register');
		state.bot = bot; state.test = test;
		const target = request.at ?? { x: 0, y: 5, z: 0 };
		const toSummoner = !request.at && request.summoner?.name !== undefined;
		run(toSummoner ? request.summoner : bot, toSummoner ? `tp "${bot.name}" @s` : `tp @s ${target.x} ${target.y} ${target.z}`).then(result => {
			if (pending !== request) { try { test.removeSimulatedPlayer(bot); } catch {} return; }
			if (result === undefined) {
				try { test.removeSimulatedPlayer(bot); } catch {}
				state.bot = undefined; request.finish(undefined, 'teleport failed'); return;
			}
			run(bot, 'effect @s blindness 0'); run(bot, 'effect @s slowness 0');
			for (const fn of spawnListeners) fn(bot);
			request.finish(bot);
		}).catch(error => { state.bot = undefined; request.finish(undefined, error); });
	} catch (error) { state.bot = undefined; request.finish(undefined, error); }
}).maxTicks(1000 * 72000).structureName('server:bot');