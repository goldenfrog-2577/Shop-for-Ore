// --- Чат-логика и антиспам для Shop for Ore ---
import { world, system } from '@minecraft/server';
import { getScore, metricNumbers, emotes, isPending, getRole, ROLE_COLORS, BOT_COLOR, muteMinutesLeft, getChatColor, impersonatedRole, tell, run } from '../DataBase.js';

// --- Значения по умолчанию для тегов игрока ---
const rank = 'rank:';
const rankDefault = '§7Player';

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
			timestamps: [now]
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
	// Префикс с цветом или названием роли, которой у игрока нет (выдан до проверки или роль сняли), не показываем
		.filter((x) => x && !impersonatedRole(player, x));
	return ranks.length === 0 ? [rankDefault]: ranks;
}

// --- Цвет ника и текста в чате: тег chat:name_color / chat:text_color (команда !color), иначе ник — цвет роли ---
const nameColorOf = (player) => getChatColor(player, 'name') ?? ROLE_COLORS[getRole(player)] ?? '§f';
const textColorOf = (player) => getChatColor(player, 'text') ?? '§f';

// --- Замена эмодзи в сообщении на символы ---
function replaceEmotes(message) {
	return message.replace(/:([a-zA-Z0-9_]+):/g,
		(match) => {
			return emotes[match] || '\ue128';
		});
}

// --- Основной обработчик чата ---
world.events.beforeChat.subscribe((data) => {
	const playerName = data.sender.name;
	const message = data.message.trim();
	const player = data.sender;

	// До входа в аккаунт чат и !-команды недоступны (команды отменяет commands.js)
	if (isPending(player)) {
		data.cancel = true;
		tell(player, 'chat.account.error.login_required');
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
		tell(player, 'chat.cmd.mute.active', String(muted));
		return;
	}

	// Проверка на длину сообщения
	if (message.length > MAX_MESSAGE_LENGTH) {
		data.cancel = true;
		tell(player, 'chat.error.too_long');
		return;
	}

	// Проверка на спам/флуд
	if (isSpamming(playerName, message)) {
		data.cancel = true;
		tell(player, 'chat.error.spam');
		return;
	}

	// Формирование и отправка форматированного сообщения
	data.sendToTargets = true;
	data.targets = [];

	sendChatMessage(data.sender, message);
});

/**
 * Отправить в общий чат сообщение в формате чата карты: время, роль, префиксы, ник, текст (эмодзи заменяются).
 * Тот же формат у сообщения от имени бота из меню администратора.
 * @param {Player} sender
 * @param {string} message
 */
export function sendChatMessage(sender, message) {
	const ranks = getRanks(sender).join('§r§8] | [§r');
	const nameColor = nameColorOf(sender);
	const textColor = textColorOf(sender);
	// Московское время (UTC+3) считаем от UTC, чтобы не зависеть от часового пояса движка/устройства
	const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
	const time = `${now.getUTCHours()}:${now.getUTCMinutes().toString().padStart(2, '0')}`;
	const formatMessage = replaceEmotes(message);
	// Бот карты: только префикс «Бот» — роли и ранги (rank:) его не перебивают
	if (sender.hasTag('role:bot')) {
		const rawtext = [{ text: ` §7${time} §8[` }];
		rawtext.push({ translate: 'role.tag.bot' }, { text: `§r§8]§r ${BOT_COLOR}${sender.name}  §f${formatMessage}` });
		run(world.getDimension('overworld'), `tellraw @a ${JSON.stringify({ rawtext })}`);
		return;
	}
	// Префикс роли (кроме обычного игрока) — переводимое слово, поэтому не world.say, а tellraw с translate
	const role = getRole(sender);
	const rawtext = [{ text: ` §7${time} §8[` }];
	if (role !== 'player') rawtext.push({ translate: `role.tag.${role}` }, { text: '§r§8] | [§r' });
	rawtext.push({ text: `${ranks}§8]§r ${nameColor}${sender.name}  ${textColor}${formatMessage}` });
	run(world.getDimension('overworld'), `tellraw @a ${JSON.stringify({ rawtext })}`);
}

// --- Обновление nameTag игрока (отображение информации над головой) ---
// Раз в секунду и только если текст изменился (раньше — каждый тик для всех игроков)
const NAMETAG_REFRESH_TICKS = 20;
let nameTagTick = 0;
world.events.tick.subscribe(() => {
	if (++nameTagTick % NAMETAG_REFRESH_TICKS !== 0) return;
	for (const player of world.getPlayers()) {
		// Бот: над головой только ник в цвете бота (уровня и денег у него нет)
		if (player.hasTag('role:bot')) {
			if (player.nameTag !== BOT_COLOR + player.name) player.nameTag = BOT_COLOR + player.name;
			continue;
		}
		const role = getRole(player);
		// Ник над головой: цвет из !color, иначе у игрока серый, у персонала — цвет роли. У VIP вместо монет — VIP-коины
		const nameTag = `${getChatColor(player, 'name') ?? (role === 'player' ? '§7' : ROLE_COLORS[role])}${player.name}\n§f - ${metricNumbers(getScore(player,'lvl'))}\n§f - ${metricNumbers(getScore(player,'xp'))}/${metricNumbers(getScore(player,'xp_need'))}\n${getScore(player, 'lvl') >= 26 ? `§f - ${metricNumbers(getScore(player, 'vip_coins'))}` : `§f - ${metricNumbers(getScore(player, 'money'))}`}\n§f - ${metricNumbers(getScore(player,'rebirth'))}`;
		if (player.nameTag !== nameTag) player.nameTag = nameTag;
	}
});

// Мут истекает сам: раз в секунду проверяем замученных — muteMinutesLeft снимет тег и напишет игроку,
// что писать снова можно (раньше тег снимался молча, только при следующей попытке написать)
system.runSchedule(() => {
	for (const player of world.getPlayers()) {
		if (player.getTags().some(t => t.startsWith('state:mute:'))) muteMinutesLeft(player);
	}
}, 20);
