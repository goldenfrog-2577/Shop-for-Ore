// --- Чат-логика и антиспам для Shop for Ore ---
// Импортируем необходимые функции и данные
import { world } from '@minecraft/server';
import { getScore, metricNumbers, emotes, isPending, getRole, ROLE_COLORS, muteMinutesLeft } from '../DataBase.js';

// --- Значения по умолчанию для тегов игрока ---
const rank = "rank:";
const rankDefault = "§7Player";
const text = "text:";
const textDefault = "§f";
const name = "name:";
const nameDefault = "§f";

// --- Настройки антиспама и антифлуда ---
const MAX_MESSAGE_LENGTH = 200; // Максимальная длина сообщения
const FLOOD_LIMIT = 5;          // Максимум сообщений за период
const FLOOD_TIME = 10000;       // Период для антифлуда (мс)

const playerMessages = new Map(); // Хранилище сообщений игроков

// Игрок вышел — его история сообщений больше не нужна
world.events.playerLeave.subscribe((data) => playerMessages.delete(data.playerName));

/**
 * Проверка на спам и флуд.
 * @param {string} playerName - Имя игрока.
 * @param {string} message - Сообщение игрока.
 * @returns {boolean} - true если спам/флуд, иначе false.
 */
function isSpamming(playerName, message) {
	const now = Date.now();
	if (!playerMessages.has(playerName)) {
		playerMessages.set(playerName, {
			lastMessage: message,
			timestamps: [now],
		});
		return false;
	}

	const data = playerMessages.get(playerName);
	data.timestamps = data.timestamps.filter((ts) => now - ts <= FLOOD_TIME);
	// Повтор того же сообщения запрещён только в пределах FLOOD_TIME
	// (раньше — навсегда, пока игрок не напишет что-то другое)
	if (data.lastMessage === message && data.timestamps.length > 0) {
		return true;
	}

	data.lastMessage = message;
	data.timestamps.push(now);

	if (data.timestamps.length > FLOOD_LIMIT) {
		return true;
	}

	playerMessages.set(playerName, data);
	return false;
}

// --- Получение рангов игрока из тегов ---
function getRanks(player) {
	const ranks = player
	.getTags()
	.map((v) => {
		if (!v.startsWith(rank)) return null;
		return v.substring(rank.length);
	})
	.filter((x) => x);
	return ranks.length === 0 ? [rankDefault]: ranks;
}

// --- Получение цвета текста из тегов ---
function getTexts(player) {
	const texts = player
	.getTags()
	.map((v) => {
		if (!v.startsWith(text)) return null;
		return v.substring(text.length);
	})
	.filter((x) => x);
	return texts.length === 0 ? [textDefault]: texts;
}

// --- Получение цвета имени из тегов ---
// Без тега name: ник окрашивается в цвет роли (у игрока — белый)
function getNames(player) {
	const names = player
	.getTags()
	.map((v) => {
		if (!v.startsWith(name)) return null;
		return v.substring(name.length);
	})
	.filter((x) => x);
	return names.length === 0 ? [ROLE_COLORS[getRole(player)] ?? nameDefault]: names;
}

// --- Замена эмодзи в сообщении на символы ---
function replaceEmotes(message) {
	return message.replace(/:([a-zA-Z0-9_]+):/g,
		(match) => {
			return emotes[match] || "\ue128";
		});
}

// --- Основной обработчик чата ---
world.events.beforeChat.subscribe((data) => {
	const playerName = data.sender.name;
	const message = data.message.trim();
	let player = data.sender;

	// До входа в аккаунт чат и !-команды недоступны (команды отменяет commands.js)
	if (isPending(player)) {
		data.cancel = true;
		player.runCommandAsync(`tellraw @s {"rawtext":[{"translate":"chat.account.error.login_required"}]}`);
		return;
	}

	// Не обрабатывать команды (начинаются с '!')
	if (message.startsWith('!')) {
		return;
	}

	// Мут: писать в общий чат нельзя до окончания (ЛС блокирует commands.js)
	const muted = muteMinutesLeft(player);
	if (muted > 0) {
		data.cancel = true;
		player.runCommandAsync(`tellraw @s ${JSON.stringify({ rawtext: [{ translate: 'chat.cmd.mute.active', with: [String(muted)] }] })}`);
		return;
	}

	// Проверка на длину сообщения
	if (message.length > MAX_MESSAGE_LENGTH) {
		data.cancel = true;
		player.runCommandAsync(`tellraw @s {"rawtext":[{"translate":"chat.error.too_long"}]}`);
		return;
	}

	// Проверка на спам/флуд
	if (isSpamming(playerName, message)) {
		data.cancel = true;
		player.runCommandAsync(`tellraw @s {"rawtext":[{"translate":"chat.error.spam"}]}`);
		return;
	}

	// Формирование и отправка форматированного сообщения
	data.sendToTargets = true;
	data.targets = [];

	const ranks = getRanks(data.sender).join("§r§8] | [§r");
	const nameColor = getNames(data.sender);
	const textColor = getTexts(data.sender);
	// Московское время (UTC+3) считаем от UTC, чтобы не зависеть от часового пояса движка/устройства
	const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
	const time = `${now.getUTCHours()}:${now.getUTCMinutes().toString().padStart(2, '0')}`;
	const formatMessage = replaceEmotes(message);
	// Префикс роли (кроме обычного игрока) — переводимое слово, поэтому не world.say, а tellraw с translate
	const role = getRole(data.sender);
	const rawtext = [{ text: ` §7${time} §8[` }];
	if (role !== 'player') rawtext.push({ translate: `role.tag.${role}` }, { text: '§r§8] | [§r' });
	rawtext.push({ text: `${ranks}§8]§r ${nameColor}${playerName}  ${textColor}${formatMessage}` });
	world.getDimension('overworld').runCommandAsync(`tellraw @a ${JSON.stringify({ rawtext })}`).catch(() => undefined);
});

// --- Обновление nameTag игрока (отображение информации над головой) ---
// Раз в секунду и только если текст изменился (раньше — каждый тик для всех игроков)
const NAMETAG_REFRESH_TICKS = 20;
let nameTagTick = 0;
world.events.tick.subscribe(() => {
	if (++nameTagTick % NAMETAG_REFRESH_TICKS !== 0) return;
	for (let player of world.getPlayers()) {
		const role = getRole(player);
		// Ник над головой: у игрока серый, у персонала — цвет роли
		const nameTag = `${role === 'player' ? '§7' : ROLE_COLORS[role]}${player.name}\n§f - ${metricNumbers(getScore(player,"lvl"))}\n§f - ${metricNumbers(getScore(player,"xp"))}/${metricNumbers(getScore(player,"qx"))}\n§f - ${metricNumbers(getScore(player,"money"))}\n§f - ${metricNumbers(getScore(player,"rebirth"))}`;
		if (player.nameTag !== nameTag) player.nameTag = nameTag;
	}
});