// Импортируем API Minecraft Bedrock Edition
import { world, system } from "@minecraft/server";

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
 * Форму закрыл сам игрок (крестик или «Назад» на телефоне), а не движок: при userBusy
 * (открыт чат или другое окно) форма тоже отменяется, но возвращать в меню нельзя — получится цикл.
 * @param {{ canceled?: boolean, cancelationReason?: string }} response
 * @returns {boolean}
 */
export function closedByPlayer(response) {
	return !!response.canceled && response.cancelationReason !== 'userBusy';
};

/**
 * Игрок ещё не вошёл в аккаунт (ждёт логина или регистрации).
 * @param {Player} player
 * @returns {boolean}
 */
export function isPending(player) {
	return player.hasTag('auth:login') || player.hasTag('auth:register');
};

/**
 * Перевод денег (табло money) другому игроку в сети — общий для меню банка и !pay.
 * Сумма — целое положительное число (строка из формы или чата). Сначала списание у отправителя,
 * зачисление — только если списание прошло. Ошибки сообщает отправителю.
 * @param {Player} player — отправитель
 * @param {string} targetName — ник получателя
 * @param {string} rawAmount — сумма как ввёл игрок
 * @returns {boolean} — перевод начат
 */
export function transferMoney(player, targetName, rawAmount) {
	const raw = String(rawAmount ?? '').trim();
	const amount = Number(raw);
	// Целое положительное в пределах табло (дробная или огромная сумма «уходила» только в сообщении)
	if (!/^\d+$/.test(raw) || !Number.isSafeInteger(amount) || amount <= 0 || amount > 2147483647) {
		run(player, 'tellraw @s {"rawtext":[{"translate":"chat.bank.error.amount"}]}');
		return false;
	}
	if (String(targetName).toLowerCase() === player.name.toLowerCase()) {
		run(player, 'tellraw @s {"rawtext":[{"translate":"chat.bank.error.self"}]}');
		return false;
	}
	// Получатель должен быть в сети: иначе деньги ушли бы «фейковому игроку» с его ником
	const target = findPlayer(targetName);
	if (!target) {
		run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', targetName)}`);
		return false;
	}
	if (getScore(player, "money") < amount) {
		run(player, 'tellraw @s {"rawtext":[{"translate":"chat.bank.error.no_money"}]}');
		return false;
	}
	run(player, `scoreboard players remove @s money ${amount}`).then((res) => {
		if (res === undefined) return;
		run(target, `scoreboard players add @s money ${amount}`);
		run(player, `tellraw @s ${rawTranslate('chat.bank.sent', target.name, amount)}`);
		run(target, `tellraw @s ${rawTranslate('chat.bank.received', player.name, amount)}`);
		run(player, 'playsound note.bell @s');
	});
	return true;
};

// --- Наказания: мут, предупреждения, заморозка (хранятся тегами — переживают перезаход) ---
// state:mute:<время окончания в мс>, state:warn:<1|2>, state:frozen
const MUTE_TAG = 'state:mute:';
const WARN_TAG = 'state:warn:';

/**
 * Сколько ещё минут игрок в муте (0 — не в муте). Истёкший мут снимается.
 * @param {Player} player
 * @returns {number}
 */
export function muteMinutesLeft(player) {
	const tag = player.getTags().find(t => t.startsWith(MUTE_TAG));
	if (!tag) return 0;
	const left = Number(tag.slice(MUTE_TAG.length)) - Date.now();
	if (!(left > 0)) {
		player.removeTag(tag);
		clearIssuer(player, 'mute');
		return 0;
	}
	return Math.ceil(left / 60000);
};

/**
 * Число предупреждений игрока (тег state:warn:N).
 * @param {Player} player
 * @returns {number}
 */
export function getWarns(player) {
	const tag = player.getTags().find(t => t.startsWith(WARN_TAG));
	return tag ? Number(tag.slice(WARN_TAG.length)) || 0 : 0;
};

// --- Роли: уровни доступа к командам и меню ---
// Владелец — хост мира (тег role:owner, до 0.3.0 — host), он один. Модератора и администратора назначает
// владелец командой !role, роль хранится тегом role:<id>. Префикс в чате (тег rank:,
// команда !prefix) — отдельное украшение и прав не даёт.
export const ROLES = ['player', 'moder', 'admin', 'owner'];

// Цвет ника по роли (в чате и над головой), если у игрока нет своего тега name:
export const ROLE_COLORS = { player: '§f', moder: '§9', admin: '§c', owner: '§4' };

// Цвет ника и префикса бота карты
export const BOT_COLOR = '§f';

// --- Цвета ника и текста в чате (!color, меню администратора → Игроки → Цвет) ---
// Хранятся тегами chat:name_color:<код> и chat:text_color:<код>, код — символ после «§» (без самого «§»).
// Только цвета, которые есть в 1.19.50 (0–9, a–g); оформление (§l, §o…) не допускается
export const CHAT_COLORS = {
	black: '0', dark_blue: '1', dark_green: '2', dark_aqua: '3', dark_red: '4', dark_purple: '5', gold: '6', gray: '7',
	dark_gray: '8', blue: '9', green: 'a', aqua: 'b', red: 'c', light_purple: 'd', yellow: 'e', white: 'f', minecoin_gold: 'g'
};
const COLOR_TAG = { name: 'chat:name_color:', text: 'chat:text_color:' };

/** Цвет игрока ('§b') для kind = 'name' | 'text' или undefined, если не задан. */
export function getChatColor(player, kind) {
	const tag = player.getTags().find(t => t.startsWith(COLOR_TAG[kind]));
	const code = tag?.slice(COLOR_TAG[kind].length);
	return code && Object.values(CHAT_COLORS).includes(code) ? `§${code}` : undefined;
}

/** Задать цвет (код '0'–'g') или снять (undefined). */
export function setChatColor(player, kind, code) {
	player.getTags().filter(t => t.startsWith(COLOR_TAG[kind])).forEach(t => player.removeTag(t));
	if (code) player.addTag(COLOR_TAG[kind] + code);
}

/**
 * Роль игрока: 'player' | 'moder' | 'admin' | 'owner'.
 * @param {Player} player
 * @returns {string}
 */
export function getRole(player) {
	// Бот карты (тег bot) — всегда без роли: прав у него нет, в чате у него свой префикс «Бот»
	if (player.hasTag('role:bot')) return 'player';
	if (player.hasTag('role:owner')) return 'owner';
	if (player.hasTag('role:admin')) return 'admin';
	if (player.hasTag('role:moder')) return 'moder';
	return 'player';
};

/**
 * Есть ли у игрока роль не ниже указанной (администратор может всё, что модератор, и т. д.).
 * @param {Player} player
 * @param {string} role
 * @returns {boolean}
 */
export function hasRole(player, role) {
	return ROLES.indexOf(getRole(player)) >= ROLES.indexOf(role);
};

// --- Кто выдал ограничение (мут, заморозку, предупреждения): тег state:<вид>_by:<роль> (вид — mute, warn, frozen) ---
// Снять ограничение может только тот, чья роль не ниже роли выдавшего (владелец — любое).
const issuerTag = (kind) => `state:${kind}_by:`;

/** Роль, выдавшая ограничение, или undefined (старые ограничения — без записи). */
export function getIssuer(target, kind) {
	const tag = target.getTags().find(t => t.startsWith(issuerTag(kind)));
	return tag ? tag.slice(issuerTag(kind).length) : undefined;
}

export function clearIssuer(target, kind) {
	target.getTags().filter(t => t.startsWith(issuerTag(kind))).forEach(t => target.removeTag(t));
}

/** Запомнить роль выдавшего. keepHigher — оставить прежнюю, если она старше (предупреждения копятся). */
export function setIssuer(target, kind, role, keepHigher = false) {
	const old = getIssuer(target, kind);
	if (keepHigher && old && ROLES.indexOf(old) > ROLES.indexOf(role)) return;
	clearIssuer(target, kind);
	target.addTag(issuerTag(kind) + role);
}

/** Может ли player снять ограничение kind с target; при отказе сообщает, кто его выдал. */
export function canLift(player, target, kind) {
	const issuer = getIssuer(target, kind);
	if (!issuer || hasRole(player, issuer)) return true;
	run(player, `tellraw @s ${rawTranslateRich('chat.cmd.error.issuer', { translate: `role.${issuer}` })}`);
	return false;
}

/**
 * Как rawTranslate, но аргументом может быть и ключ перевода: { translate: 'role.admin' }.
 * Нужен, когда в сообщение подставляется переводимое слово (название роли).
 * @param {string} key
 * @param {...(string|number|{translate: string})} args
 * @returns {string}
 */
export function rawTranslateRich(key, ...args) {
	const parts = args.map(a => (a !== null && typeof a === 'object') ? a : { text: String(a) });
	return JSON.stringify({ rawtext: [{ translate: key, with: { rawtext: parts } }] });
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

// --- Точки телепортации для !warp ---
// role — с какой роли точка доступна себе; отправить другого игрока — модератор и выше
// (и не ниже роли точки). mine — шахта по уровню игрока, как кнопка «Спавн» в меню телепортаций.
export const WARPS = [
	{ id: 'spawn', role: 'player', pos: [0, 2, 0] },
	{ id: 'mine', role: 'player', pos: (p) => {
		const lvl = getScore(p, 'lvl');
		if (lvl >= 26) return [-60, 5, -60];
		if (lvl >= 16) return [0, 5, -33];
		return [0, 5, 0];
	} },
	{ id: 'minigames', role: 'player', pos: [-109, 5, -60] },
	// Арена: случайная точка площадки (system/pvp.js), чтобы игроки не появлялись друг у друга
	{ id: 'pvp', role: 'player', arena: true },
	{ id: 'spleef', role: 'player', pos: [500, 3, 500] },
	{ id: 'vip', role: 'admin', pos: [-60, 5, -60] },
	{ id: 'cmd', role: 'admin', pos: [50, 5, 50] }
];

// Список команд: описание для !help и минимальная роль (см. ROLES).
// Порядок = порядок в !help: по ролям (игрок → владелец), внутри роли — по смыслу
export const commandsList = [
	// ===== Игрок: справка и общение =====
	{
		command: "!help §7[§fcommand§7]",
		description: "%chat.help.help",
		role: 'player'
	},
	{
		command: "!rules",
		description: "%chat.help.rules",
		role: 'player'
	},
	{
		command: "!password",
		description: "%chat.help.password",
		role: 'player'
	},
	{
		command: "!emotes",
		description: "%chat.help.emotes",
		role: 'player'
	},
	{
		command: "!msg §7<§fplayer§7> <§fmessage§7>",
		description: "%chat.help.msg",
		role: 'player'
	},
	{
		command: "!reply §7<§fmessage§7>",
		description: "%chat.help.reply",
		role: 'player'
	},
	{
		command: "!clearchat §7[§fall§7]",
		description: "%chat.help.clearchat",
		role: 'player'
	},

	// ===== Игрок: деньги и статистика =====
	{
		command: "!balance",
		description: "%chat.help.balance",
		role: 'player'
	},
	{
		command: "!pay §7<§fplayer§7> <§famount§7>",
		description: "%chat.help.pay",
		role: 'player'
	},
	{
		command: "!stats §7[§fplayer§7]",
		description: "%chat.help.stats",
		role: 'player'
	},
	{
		command: "!top §7[§fmoney§8/§flvl§8/§frebirth§7]",
		description: "%chat.help.top",
		role: 'player'
	},
	{
		command: "!online",
		description: "%chat.help.online",
		role: 'player'
	},

	// ===== Игрок: прочее =====
	{
		command: "!warp §7[§fpoint§7] [§fplayer§7]",
		description: "%chat.help.warp",
		role: 'player'
	},
	{
		command: "!report §7<§fplayer§7> <§freason§7>",
		description: "%chat.help.report",
		role: 'player'
	},

	// ===== Модератор: наказания =====
	{
		command: "!kick §7<§fplayer§7> [§freason§7]",
		description: "%chat.help.kick",
		role: 'moder'
	},
	{
		command: "!mute §7<§fplayer§7> <§fminutes§7> [§freason§7]",
		description: "%chat.help.mute",
		role: 'moder'
	},
	{
		command: "!unmute §7<§fplayer§7>",
		description: "%chat.help.unmute",
		role: 'moder'
	},
	{
		command: "!warn §7<§fplayer§7> <§freason§7>",
		description: "%chat.help.warn",
		role: 'moder'
	},
	{
		command: "!unwarn §7<§fplayer§7> [§famount§8/§fall§7]",
		description: "%chat.help.unwarn",
		role: 'moder'
	},
	{
		command: "!freeze §7<§fplayer§7>",
		description: "%chat.help.freeze",
		role: 'moder'
	},
	{
		command: "!unfreeze §7<§fplayer§7>",
		description: "%chat.help.unfreeze",
		role: 'moder'
	},

	// ===== Модератор: перемещение и наблюдение =====
	{
		command: "!tp §7<§fplayer§7>",
		description: "%chat.help.tp",
		role: 'moder'
	},
	{
		command: "!tphere §7<§fplayer§7>",
		description: "%chat.help.tphere",
		role: 'moder'
	},
	{
		command: "!invis §7[§fon§8/§foff§7]",
		description: "%chat.help.invis",
		role: 'moder'
	},
	{
		command: "!gm6 §7[§fplayer§7]",
		description: "%chat.help.gm6",
		role: 'moder'
	},

	// ===== Администратор: режимы =====
	{
		command: "!gm1 §7[§fplayer§7]",
		description: "%chat.help.gm1",
		role: 'admin'
	},
	{
		command: "!gm2 §7[§fplayer§7]",
		description: "%chat.help.gm2",
		role: 'admin'
	},
	{
		command: "!fly §7[§fon§8/§foff§7] [§fplayer§7]",
		description: "%chat.help.fly",
		role: 'admin'
	},

	// ===== Администратор: мир и сервер =====
	{
		command: "!timeset §7<§ftime§8/§f0-24000§7>",
		description: "%chat.help.timeset",
		role: 'admin'
	},
	{
		command: "!event §7<§fhaste§8/§frain§8/§fgift§8/§fmythic§7>",
		description: "%chat.help.event",
		role: 'admin'
	},
	{
		command: "!boost §7<§fx2§8/§fx4§7> [§fminutes§7] §8| §fmagnet §7[§fplayer§7] [§fminutes§7]",
		description: "%chat.help.boost",
		role: 'admin'
	},
	{
		command: "!say §7<§fmessage§7>",
		description: "%chat.help.say",
		role: 'admin'
	},
	{
		command: "!ban §7<§fplayer§7> [§freason§7]",
		description: "%chat.help.ban",
		role: 'admin'
	},
	{
		command: "!unban §7<§fplayer§8/§fnumber§7>",
		description: "%chat.help.unban",
		role: 'admin'
	},
	{
		command: "!banlist",
		description: "%chat.help.banlist",
		role: 'admin'
	},

	// ===== Администратор: игроки и данные =====
	{
		command: "!scoreboard §7<§fplayer§7> <§fadd§8/§fremove§8/§fset§8/§fget§8/§flist§8/§freset§7> [§fobjective§7] [§famount§7] §8| §fobjectives",
		description: "%chat.help.scoreboard",
		role: 'admin'
	},
	{
		command: "!tag §7<§fplayer§7> <§fadd§8/§fremove§8/§flist§7> [§ftag§7]",
		description: "%chat.help.tag",
		role: 'admin'
	},
	{
		command: "!color §7<§fplayer§7> <§fname§8/§ftext§7> <§fcolor§8/§freset§7>",
		description: "%chat.help.color",
		role: 'admin'
	},
	{
		command: "!prefix §7<§fplayer§7> <§fset§8/§ftake§8/§flist§8/§fclear§7> [§fprefix§7]",
		description: "%chat.help.prefix",
		role: 'admin'
	},

	// ===== Администратор: предметы и бот =====
	{
		command: "!stick §7[§fplayer§7]",
		description: "%chat.help.stick",
		role: 'admin'
	},
	{
		command: "!bot §7[§fsettings§7]",
		description: "%chat.help.bot",
		role: 'admin'
	},

	// ===== Владелец =====
	{
		command: "!role §7<§fplayer§7> <§fplayer§8/§fmoder§8/§fadmin§7>",
		description: "%chat.help.role",
		role: 'owner'
	},
	{
		command: "!roles",
		description: "%chat.help.roles",
		role: 'owner'
	},
	{
		command: "!resetpass §7<§fplayer§7>",
		description: "%chat.help.resetpass",
		role: 'owner'
	},
	{
		command: "!wipe §7[§fconfirm§7]",
		description: "%chat.help.wipe",
		role: 'owner'
	}
];

// Список эмодзи в виде массива объектов для вывода в интерфейсе
export const emotesList = Object.entries(emotes).map(([name, symbol]) => ({ name, symbol }));

/**
 * Показать форму, когда игрок сможет её увидеть. Из чата (!password) форма сразу не откроется:
 * пока открыт чат, show() отменяется с userBusy — повторяем раз в 10 тиков, до 30 секунд.
 */
export function showWhenFree(player, form, tries = 60) {
	return form.show(player).then(r => {
		if (r.canceled && r.cancelationReason === 'userBusy' && tries > 0) {
			return new Promise(res => {
				const id = system.runSchedule(() => {
					system.clearRunSchedule(id);
					res(showWhenFree(player, form, tries - 1));
				}, 10);
			});
		}
		return r;
	});
}