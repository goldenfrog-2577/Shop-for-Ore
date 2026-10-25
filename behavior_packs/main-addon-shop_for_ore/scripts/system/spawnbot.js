// --- Бот карты (симулированный игрок GameTest) ---
// Призывается функцией system/spawnbot (командный блок GameTest на 1000001 -60 1000002).
// Управление — из меню администратора (раздел «Бот»). Имя бота хранится в свойстве мира
// shop:bot_name и переживает перезапуск; сам бот после перезахода в мир пропадает.

import * as GT from '@minecraft/server-gametest';
import { world, BlockLocation, DynamicPropertiesDefinition } from '@minecraft/server';

const hours = 1000;
const BOT_NAME_PROPERTY = 'shop:bot_name';
export const BOT_DEFAULT_NAME = 'Bot';

// Текущий бот и тест, в котором он живёт (нужен, чтобы убрать бота)
const state = { bot: undefined, test: undefined, summoner: undefined };

world.events.worldInitialize.subscribe((e) => {
	const def = new DynamicPropertiesDefinition();
	def.defineString(BOT_NAME_PROPERTY, 16);
	e.propertyRegistry.registerWorldDynamicProperties(def);
});

/** Имя, с которым призывается бот. */
export function getBotName() {
	try {
		return world.getDynamicProperty(BOT_NAME_PROPERTY) || BOT_DEFAULT_NAME;
	} catch {
		return BOT_DEFAULT_NAME;
	}
}

/** Сохранить имя бота (3–16 символов: буквы, цифры, _ и пробел). @returns {boolean} */
export function setBotName(name) {
	if (!/^[A-Za-z0-9_ ]{3,16}$/.test(name) || !name.trim()) return false;
	world.setDynamicProperty(BOT_NAME_PROPERTY, name);
	return true;
}

/** Бот сейчас в мире (или undefined). */
export function getBot() {
	const bot = state.bot;
	if (!bot) return undefined;
	// Убранный или исчезнувший после перезахода бот — уже не игрок мира
	for (const p of world.getPlayers()) if (p.name === bot.name) return bot;
	state.bot = undefined;
	return undefined;
}

/** Призвать бота; summoner — игрок, к которому его телепортировать. */
export function spawnBot(summoner) {
	state.summoner = summoner;
	summoner.runCommandAsync('function system/spawnbot');
}

/** Убрать бота из мира. @returns {boolean} */
export function removeBot() {
	const bot = getBot();
	if (!bot) return false;
	try {
		state.test.removeSimulatedPlayer(bot);
	} catch {
		bot.kill();
	}
	state.bot = undefined;
	return true;
}

// Регистрируем тест для спавна бота
GT.register('server', 'spawnbot', (test) => {
	const bot = test.spawnSimulatedPlayer(new BlockLocation(0, 2, 0), getBotName());
	// По тегу бота узнают чат (префикс «Бот» вместо ролей и рангов) и роли (у бота роли нет)
	bot.addTag('role:bot');
	state.bot = bot;
	state.test = test;
	// Бот появляется у тестовой площадки (далеко от карты) — переносим его к призвавшему
	const summoner = state.summoner;
	state.summoner = undefined;
	if (summoner) summoner.runCommandAsync(`tp "${bot.name}" @s`).catch(() => undefined);
})
.maxTicks(hours*72000)
.structureName('server:bot')