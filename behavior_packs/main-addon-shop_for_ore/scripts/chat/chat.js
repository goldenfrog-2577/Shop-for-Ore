// --- Чат-логика и антиспам для Shop for Ore ---
import { world, system } from '@minecraft/server';
import { getScore, metricNumbers, emotes, isPending, isBot, getRole, ROLE_COLORS, BOT_COLOR, muteMinutesLeft, getChatColor, impersonatedRole, tell, run, isVip } from '../utils.js';
import { censor } from './censor.js';
import { LEVEL_RANK_RE } from '../system/player/ranks.js';

// --- Значения по умолчанию для тегов игрока ---
const rank = 'rank:';

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
	return ranks;
}

// --- Цвет ника и текста в чате: тег chat:name_color / chat:text_color (команда !color), иначе ник — цвет роли ---
const botNameColor = player => ROLE_COLORS[['owner', 'admin', 'moder', 'helper'].find(role => player.hasTag('role:' + role))] ?? BOT_COLOR;
const nameColorOf = (player) => getChatColor(player, 'name') ?? ROLE_COLORS[getRole(player)] ?? '§f';
const textColorOf = (player) => getChatColor(player, 'text') ?? '§f';

// --- Замена эмодзи в сообщении на символы ---
// Имя эмодзи начинается с буквы: «счёт 1:2:3» и время «12:30:» — не эмодзи
export function replaceEmotes(message) {
	return message.replace(/:([a-zA-Z_][a-zA-Z0-9_]*):/g,
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
		if (muted === Infinity) tell(player, 'chat.cmd.mute.active.permanent');
		else tell(player, 'chat.cmd.mute.active', String(muted));
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
	// Префиксы тоже через цензуру — на случай, если префикс выдан до фильтра.
	// Порядок (владелец): роль → свои префиксы (Меломан, !prefix, !tag rank:) → в самом конце уровень или VIP
	const all = getRanks(sender);
	const isLevel = (r) => LEVEL_RANK_RE.test(rank + r);
	const ranks = [...all.filter(r => !isLevel(r)).map(censor), ...all.filter(isLevel)];
	const nameColor = nameColorOf(sender);
	const textColor = textColorOf(sender);
	// Московское время (UTC+3) считаем от UTC, чтобы не зависеть от часового пояса движка/устройства
	const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
	const time = `${now.getUTCHours()}:${now.getUTCMinutes().toString().padStart(2, '0')}`;
	// Ругательства → «***» (chat/censor.js) — до эмодзи, чтобы коды эмодзи не мешали
	const formatMessage = replaceEmotes(censor(message));
	// Бот карты: только префикс «Бот» — роли и ранги (rank:) его не перебивают
	if (isBot(sender)) {
		const rawtext = [{ text: ` §7${time} §8[` }];
		rawtext.push({ translate: 'role.tag.bot' }, { text: `§r§8] | [§r${Math.max(1, getScore(sender, 'lvl'))}§8]§r ${botNameColor(sender)}${sender.name}  §f${formatMessage}` });
		run(world.getDimension('overworld'), `tellraw @a ${JSON.stringify({ rawtext })}`);
		return;
	}
	// Префикс роли — переводимое слово (у обычного игрока — «Игрок» на языке читателя), поэтому не world.say, а tellraw с translate.
	// Дальше — «Меломан», свои префиксы из тегов rank:, последним уровень или VIP; если их нет — только роль
	const role = getRole(sender);
	const rawtext = [{ text: ` §7${time} §8[` }, { translate: `role.tag.${role}` }];
	// Собрал все 15 пластинок (system/player/discs.js) — префикс «Меломан» на языке читателя
	if (sender.hasTag('music:collector')) rawtext.push({ text: '§r§8] | [§r' }, { translate: 'rank.collector' });
	if (ranks.length) rawtext.push({ text: `§r§8] | [§r${ranks.join('§r§8] | [§r')}` });
	rawtext.push({ text: `§r§8]§r ${nameColor}${sender.name}  ${textColor}${formatMessage}` });
	run(world.getDimension('overworld'), `tellraw @a ${JSON.stringify({ rawtext })}`);
}

// --- Обновление nameTag игрока (отображение информации над головой) ---
// Раз в секунду и только если текст изменился
const NAMETAG_REFRESH_TICKS = 20;
let nameTagTick = 0;
world.events.tick.subscribe(() => {
	if (++nameTagTick % NAMETAG_REFRESH_TICKS !== 0) return;
	for (const player of world.getPlayers()) {
		// Бот: над головой только ник в цвете бота (уровня и денег у него нет)
		if (isBot(player)) {
			if (player.nameTag !== botNameColor(player) + player.name) player.nameTag = botNameColor(player) + player.name;
			continue;
		}
		const role = getRole(player);
		// Опыт: «350/72.0K»; на последнем уровне (xp_need 0) — только опыт, без «/0»
		const need = getScore(player, 'xp_need');
		const xp = `${metricNumbers(getScore(player, 'xp'))}${need > 0 ? `/${metricNumbers(need)}` : ''}`;
		// Ник над головой: цвет из !color, иначе у игрока белый, у персонала — цвет роли. У VIP вместо монет — VIP-коины
		const nameTag = `${getChatColor(player, 'name') ?? (role === 'player' ? '§f' : ROLE_COLORS[role])}${player.name}\n§f - ${isVip(player) ? 'VIP' : metricNumbers(getScore(player,'lvl'))}\n§f - ${isVip(player) ? '\ue128' : xp}\n${isVip(player) ? `§f - ${metricNumbers(getScore(player, 'vip_coins'))}` : `§f - ${metricNumbers(getScore(player, 'money'))}`}\n§f - ${metricNumbers(getScore(player,'rebirth'))}`;
		if (player.nameTag !== nameTag) player.nameTag = nameTag;
	}
});

// Мут истекает сам: раз в секунду проверяем замученных — muteMinutesLeft снимет тег и напишет игроку,
// что писать снова можно
system.runSchedule(() => {
	for (const player of world.getPlayers()) {
		if (player.getTags().some(t => t.startsWith('state:mute:'))) muteMinutesLeft(player);
	}
}, 20);
