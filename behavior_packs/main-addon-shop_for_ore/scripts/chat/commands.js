// --- Команды чата (!help, !warp, !tp, !ban …) ---
// Список команд и роли — commandsList в DataBase.js; runChatCommand вызывают и чат, и меню администратора.
// Обработчики — по ролям в chat/commands/: player.js (игрок), moderation.js (хелпер, модератор),
// admin.js (администратор; там же !gm6), owner.js (владелец); общие помощники — commands/common.js.
// Новая команда: строка в commandsList и метод в объекте своей роли (имя — без «!»).

import { world } from '@minecraft/server';
import { commandsList, isPending, tell, hasRole } from '../DataBase.js';
import { PLAYER_COMMANDS } from './commands/player.js';
import { MODERATION_COMMANDS } from './commands/moderation.js';
import { ADMIN_COMMANDS } from './commands/admin.js';
import { OWNER_COMMANDS } from './commands/owner.js';

// Помощники, которые нужны меню администратора и тестам
export { textWidth, emoteGrid } from './commands/player.js';
export { isCoord } from './commands/moderation.js';
export { debugLines, giveOreMagnet, setMoney } from './commands/admin.js';

const HANDLERS = { ...PLAYER_COMMANDS, ...MODERATION_COMMANDS, ...ADMIN_COMMANDS, ...OWNER_COMMANDS };

// --- Главный обработчик команд чата ---
world.events.beforeChat.subscribe((data) => {
	const player = data.sender;
	const message = data.message.trim();

	// Если не команда (не начинается с "!") — не обрабатываем
	if (!message.startsWith('!')) return;
	data.cancel = true;
	// До входа в аккаунт команды недоступны (сообщение игроку показывает chat.js)
	if (isPending(player)) return;

	// Парсим команду и аргументы
	const args = message.slice(1).split(/\s+/);
	const command = args.shift().toLowerCase();
	runChatCommand(player, command, args);
});

/**
 * Выполнить !-команду от имени игрока — из чата или из меню администратора.
 * Права проверяются здесь же, по роли игрока.
 * @param {Player} player
 * @param {string} command — имя без «!», строчными
 * @param {string[]} args — аргументы; из меню ник с пробелом передаётся одним элементом
 */
export function runChatCommand(player, command, args) {
	// Поиск команды в списке — по точному имени: «!f» не находит «!fly»
	const findCommand = commandsList.find(cmd => cmd.command.split(' ')[0] === `!${command}`);
	const handler = Object.prototype.hasOwnProperty.call(HANDLERS, command) ? HANDLERS[command] : undefined;
	if (!findCommand || !handler) {
		tell(player, 'chat.cmd.error.unknown', `!${command}`);
		return;
	}
	// Проверка роли: команда доступна, если роль игрока не ниже нужной
	if (!hasRole(player, findCommand.role)) {
		tell(player, 'chat.cmd.error.no_permission');
		return;
	}
	handler(player, args, command);
}
