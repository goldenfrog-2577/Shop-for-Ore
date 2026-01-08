// Импортируем API Minecraft Bedrock Edition
import { world } from "@minecraft/server";

/**
 * Получить значение очков игрока по определённому objective.
 * @param {Entity} entity - Игрок или сущность.
 * @param {string} objective - Название цели (objective) в scoreboard.
 * @returns {number} - Значение очков или 0, если не найдено/ошибка.
 */
export function getScore(entity, objective) {
	try {
		return world.scoreboard.getObjective(objective).getScore(entity.scoreboard);
	} catch (error) {
		return 0;
	}
};

/**
 * Преобразует число в сокращённый формат (K, M, B и т.д.).
 * @param {number} value - Исходное число.
 * @returns {string|number} - Сокращённое число с суффиксом или исходное число.
 */
export function metricNumbers(value) {
	const types = ["","K","M","B","T","P","E","Z","Y"];
	const selectType = (Math.log10(value) / 3) | 0;
	if (selectType == 0) return value;
	let scaled = value / Math.pow(10, selectType * 3);
	return scaled.toFixed(1) + types[selectType];
};

// Список эмодзи для чата и интерфейса
export const emotes = {
	":smile:": "\ue1f0",
	":rock:": "\ue1f2",
	":sad:": "\ue1f3",
	":angry:": "\ue1f4",
	":happy:": "\ue1f5",
	":trash:": "\ue1f6",
	":clown:": "\ue1f1",
	":cat:": "\ue1f9",
	":hi:": "\ue1e2",
	":ok:": "\ue1e3",
	":feck:": "\ue1e4",
	":like:": "\ue1e0",
	":dislike:": "\ue1e1",
	":skull:": "\ue10e",
	":rskull:": "\ue10f",
	":coin:": "\ue152",
	":lvl:": "\ue153",
	":xp:": "\ue154",
	":rebirth:": "\ue151"
};

// Список доступных команд с описаниями и флагом "только для хоста"
export const commandsList = [
	// ===== Общедоступные команды =====
	{
		command: "!help",
		description: "%commands.help.desc",
		hostOnly: false
	},
	{
		command: "!spawn",
		description: "%commands.spawn.desc",
		hostOnly: false
	},
	{
		command: "!emotes",
		description: "%commands.emotes.desc",
		hostOnly: false
	},
	{
		command: "!msg §7<§fplayer§7> <§fmessage§7>",
		description: "%commands.msg.desc",
		hostOnly: false
	},

	// ===== Админские: режимы и способности =====
	{
		command: "!gm1",
		description: "%commands.gm1.desc",
		hostOnly: true
	},
	{
		command: "!gm2",
		description: "%commands.gm2.desc",
		hostOnly: true
	},
	{
		command: "!gm6",
		description: "%commands.gm6.desc",
		hostOnly: true
	},
	{
		command: "!fly §7<§fon§8/§foff§7>",
		description: "%commands.fly.desc",
		hostOnly: true
	},
	{
		command: "!invis §7<§fon§8/§foff§7>",
		description: "%commands.invis.desc",
		hostOnly: true
	},

	// ===== Админские: визуал и чат =====
	{
		command: "!clearchat",
		description: "%commands.clearchat.desc",
		hostOnly: true
	},

	// ===== Админские: мир =====
	{
		command: "!timeset §7<§ftime§7>",
		description: "%commands.timeset.desc",
		hostOnly: true
	},
	{
		command: "!tp §7<§fplayer§7>",
		description: "%commads.tp.desc",
		hostOnly: true
	},

	// ===== Админские: сущности и предметы =====
	{
		command: "!bot",
		description: "%commands.bot.desc",
		hostOnly: true
	},
	{
		command: "!stick",
		description: "%commands.stick.desc",
		hostOnly: true
	},

	// ===== Админские: управление игроками =====
	{
		command: "!prefix §7<§fplayer§7> <§fset§8/§ftake§7> <§fprefix§7>",
		description: "%commands.prefix.desc",
		hostOnly: true
	},
	{
		command: "!tag §7<§fplayer§7> <§fadd§8/§fremove§7> <§ftag§7>",
		description: "%commands.tag.desc",
		hostOnly: true
	},
	{
		command: "!scoreboard §7<§fplayer§7> <§fadd§8/§fremove§7> <§fobjective§7> <§famount§7>",
		description: "%commands.scoreboard.desc",
		hostOnly: true
	},
	{
		command: "!kick §7<§fplayer§7> <§freason§7>",
		description: "%commands.kick.desc",
		hostOnly: true
	},

	// ===== Админские: системные =====
	{
		command: "!wipe",
		description: "%commads.wipe.desc",
		hostOnly: true
	}
];

// Список эмодзи в виде массива объектов для вывода в интерфейсе
export const emotesList = Object.entries(emotes).map(([name, symbol]) => ({ name, symbol }));
