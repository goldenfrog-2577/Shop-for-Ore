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
	let selectType = (Math.log10(value) / 3) | 0;
	if (selectType == 0) return value;
	let scaled = value / Math.pow(10, selectType * 3);
	// 999 999 → «1.0M», а не «1000.0K»
	if (scaled.toFixed(1) === "1000.0" && selectType < types.length - 1) {
		selectType++;
		scaled /= 1000;
	}
	return scaled.toFixed(1) + types[selectType];
};

/**
 * Собирает JSON для tellraw с переводимым ключом и параметрами.
 * Параметры подставляются в %1$s, %2$s… строки .lang — так каждый язык сам
 * выбирает порядок слов, а кавычки в нике/тексте не ломают JSON.
 * @param {string} key - Ключ из .lang (без %).
 * @param {...(string|number)} args - Значения для %1$s, %2$s…
 * @returns {string}
 */
export function rawTranslate(key, ...args) {
	return JSON.stringify({ rawtext: [{ translate: key, with: args.map(String) }] });
};

/**
 * Отправить игроку строку, где ключи перевода записаны как %ключ (например '\n%chat.account.logged_in\n ').
 * Раньше это делал player.tell(): после переименования ключей (#24) такие сообщения перестали
 * появляться в игре, а tellraw с translate для тех же ключей работает (проверено на 1.19.51).
 * Поэтому строка разбирается на куски {text} и {translate} и уходит через tellraw.
 * @param {Player} player
 * @param {string} message
 */
export function tellText(player, message) {
	const rawtext = [];
	const re = /%([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)/g;
	let last = 0, m;
	while ((m = re.exec(message)) !== null) {
		if (m.index > last) rawtext.push({ text: message.slice(last, m.index) });
		rawtext.push({ translate: m[1] });
		last = re.lastIndex;
	}
	if (last < message.length) rawtext.push({ text: message.slice(last) });
	return run(player, `tellraw @s ${JSON.stringify({ rawtext })}`);
};

/**
 * Выполнить команду и не ронять ошибку в ContentLog, если она не сработала
 * (например, tellraw игроку, который уже вышел). Промис: результат команды или undefined при ошибке.
 * @param {Entity} entity
 * @param {string} command
 */
export function run(entity, command) {
	return entity.runCommandAsync(command).then((r) => r ?? {}, () => undefined);
};

/**
 * Найти игрока онлайн по имени (без учёта регистра).
 * @param {string} name
 * @returns {Player|undefined}
 */
export function findPlayer(name) {
	if (!name) return undefined;
	const lower = name.toLowerCase();
	for (const p of world.getPlayers()) {
		if (p.name.toLowerCase() === lower) return p;
	}
	return undefined;
};

/**
 * JSON для tellraw из готового текста: кавычки и обратные слэши экранируются.
 * @param {string} text
 * @returns {string}
 */
export function rawText(text) {
	return JSON.stringify({ rawtext: [{ text: String(text) }] });
};

/**
 * Игрок ещё не вошёл в аккаунт (ждёт логина или регистрации).
 * @param {Player} player
 * @returns {boolean}
 */
export function isPending(player) {
	return player.hasTag('chekLogin') || player.hasTag('chekRegister');
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
		description: "%chat.help.help",
		hostOnly: false
	},
	{
		command: "!spawn",
		description: "%chat.help.spawn",
		hostOnly: false
	},
	{
		command: "!emotes",
		description: "%chat.help.emotes",
		hostOnly: false
	},
	{
		command: "!msg §7<§fplayer§7> <§fmessage§7>",
		description: "%chat.help.msg",
		hostOnly: false
	},

	// ===== Админские: режимы и способности =====
	{
		command: "!gm1",
		description: "%chat.help.gm1",
		hostOnly: true
	},
	{
		command: "!gm2",
		description: "%chat.help.gm2",
		hostOnly: true
	},
	{
		command: "!gm6",
		description: "%chat.help.gm6",
		hostOnly: true
	},
	{
		command: "!fly §7<§fon§8/§foff§7>",
		description: "%chat.help.fly",
		hostOnly: true
	},
	{
		command: "!invis §7<§fon§8/§foff§7>",
		description: "%chat.help.invis",
		hostOnly: true
	},

	// ===== Админские: визуал и чат =====
	{
		command: "!clearchat",
		description: "%chat.help.clearchat",
		hostOnly: true
	},

	// ===== Админские: мир =====
	{
		command: "!timeset §7<§ftime§7>",
		description: "%chat.help.timeset",
		hostOnly: true
	},
	{
		command: "!tp §7<§fplayer§7>",
		description: "%chat.help.tp",
		hostOnly: true
	},

	// ===== Админские: сущности и предметы =====
	{
		command: "!bot",
		description: "%chat.help.bot",
		hostOnly: true
	},
	{
		command: "!stick",
		description: "%chat.help.stick",
		hostOnly: true
	},

	// ===== Админские: управление игроками =====
	{
		command: "!prefix §7<§fplayer§7> <§fset§8/§ftake§7> <§fprefix§7>",
		description: "%chat.help.prefix",
		hostOnly: true
	},
	{
		command: "!tag §7<§fplayer§7> <§fadd§8/§fremove§7> <§ftag§7>",
		description: "%chat.help.tag",
		hostOnly: true
	},
	{
		command: "!scoreboard §7<§fplayer§7> <§fadd§8/§fremove§7> <§fobjective§7> <§famount§7>",
		description: "%chat.help.scoreboard",
		hostOnly: true
	},
	{
		command: "!kick §7<§fplayer§7> <§freason§7>",
		description: "%chat.help.kick",
		hostOnly: true
	},

	// ===== Админские: системные =====
	{
		command: "!wipe",
		description: "%chat.help.wipe",
		hostOnly: true
	}
];

// Список эмодзи в виде массива объектов для вывода в интерфейсе
export const emotesList = Object.entries(emotes).map(([name, symbol]) => ({ name, symbol }));