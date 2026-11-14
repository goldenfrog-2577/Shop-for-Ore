// --- Команды чата (!help, !warp, !tp, !ban …) ---
// Список команд и роли — commandsList в DataBase.js; runChatCommand вызывают и чат, и меню администратора.
// Обработчики — по ролям в chat/commands/: player.js (игрок), moderation.js (хелпер, модератор),
// admin.js (администратор; там же !gm6). Команды владельца — ниже в этом файле; общие помощники — commands/common.js.
// Новая команда: строка в commandsList и метод в объекте своей роли (имя — без «!»).

import { world } from '@minecraft/server';
import { commandsList, isPending, tell, hasRole, findPlayer, getRole, ROLES, run, menuFeedback, settleCommands, toldErrorCount, toldSuccessCount } from '../../utils.js';
import { PLAYER_COMMANDS } from './ranks/player.js';
import { MODERATION_COMMANDS } from './ranks/moderator.js';
import { ADMIN_COMMANDS } from './ranks/admin.js';
import { worldEditCommand } from '../../system/worldedit.js';
import { resetOffline, offlineCounts } from '../../system/core/offline_reset.js';
import { wipeAll, wipeCounts } from '../../system/core/wipe.js';
import { resetPassword } from '../../registration/change.js';
import { playerArgPos, isSelector, selectTargets } from './selectors.js';
import { logAction } from '../../system/security/staff_log.js';
import { columnPadding, tellList } from './common.js';

// Помощники, которые нужны меню администратора и тестам
export { textWidth, emoteGrid } from './ranks/player.js';
export { isCoord } from './ranks/moderator.js';
export { debugLines, giveOreMagnet, setMoney } from './ranks/admin.js';

// --- Команды владельца и подтверждения сбросов ---
// Запросы на вайп, ждущие «!wipe confirm»: имя → время запроса
const wipeRequests = new Map();
// То же для !resetoffline
const resetRequests = new Map();
const WIPE_CONFIRM_MS = 30000;

// Игрок вышел — его записи больше не нужны
world.events.playerLeave.subscribe((data) => {
	wipeRequests.delete(data.playerName);
	resetRequests.delete(data.playerName);
});

const OWNER_COMMANDS = {
	worldedit: (player, args) => worldEditCommand(player, args),
	resetoffline(player, args) {
		// Как !wipe: сводка, выполнение — только «!resetoffline confirm» в течение 30 секунд
		const asked = resetRequests.get(player.name);
		if ((args[0] || '').toLowerCase() === 'confirm') {
			resetRequests.delete(player.name);
			if (!asked || Date.now() - asked > WIPE_CONFIRM_MS) {
				tell(player, 'chat.cmd.error.confirm_expired', '!resetoffline');
				return;
			}
			resetOffline(player);
		} else {
			resetRequests.set(player.name, Date.now());
			const { offline, online } = offlineCounts();
			tell(player, 'chat.cmd.resetoffline.summary', String(offline), String(online));
			tell(player, 'chat.cmd.resetoffline.confirm');
		}
	},

	async wipe(player, args) {
		// Самая опасная команда: сначала предупреждение, выполнение — только «!wipe confirm» в течение 30 секунд
		const asked = wipeRequests.get(player.name);
		if ((args[0] || '').toLowerCase() === 'confirm') {
			wipeRequests.delete(player.name);
			if (!asked || Date.now() - asked > WIPE_CONFIRM_MS) {
				tell(player, 'chat.cmd.error.confirm_expired', '!wipe');
				return;
			}
			await wipeAll(player);
		} else {
			// Сводка: что сбросится, что останется и скольких игроков затронет
			wipeRequests.set(player.name, Date.now());
			const { all, online } = wipeCounts();
			tell(player, 'chat.cmd.wipe.summary', String(all), String(online));
			tell(player, 'chat.cmd.wipe.confirm');
		}
	},

	role(player, args) {
		// Назначение роли — только владелец (проверено выше по commandsList)
		const roleTargetName = args[0];
		const newRole = (args[1] || '').toLowerCase();
		if (!roleTargetName || !['player', 'helper', 'moder', 'admin'].includes(newRole)) {
			tell(player, 'chat.cmd.role.use');
			return;
		}
		const roleTarget = findPlayer(roleTargetName);
		if (!roleTarget) {
			tell(player, 'chat.cmd.error.offline', roleTargetName);
			return;
		}
		// Боту роль не выдаётся: у него всегда префикс «Бот»
		if (roleTarget.hasTag('role:bot')) {
			tell(player, 'chat.cmd.role.error.bot');
			return;
		}
		// Владелец один — его роль командой не меняется
		if (roleTarget.hasTag('role:owner')) {
			tell(player, 'chat.cmd.role.error.owner');
			return;
		}
		roleTarget.removeTag('role:helper');
		roleTarget.removeTag('role:moder');
		roleTarget.removeTag('role:admin');
		if (newRole !== 'player') roleTarget.addTag(`role:${newRole}`);
		logAction(player, 'role', roleTarget.name, newRole);
		tell(player, 'chat.cmd.role.done', roleTarget.name, { translate: `role.${newRole}` });
		if (roleTarget.name !== player.name) {
			tell(roleTarget, 'chat.cmd.role.received', { translate: `role.${newRole}` });
		}
	},

	resetpass(player, args) {
		// Сброс забытого пароля — только владелец и только игроку в сети: ему сразу показывается регистрация
		const name = args.join(' ');
		if (!name) {
			tell(player, 'chat.cmd.resetpass.use');
			return;
		}
		const target = findPlayer(name);
		if (!target) {
			tell(player, 'chat.cmd.resetpass.error.offline', name);
			return;
		}
		if (target.name === player.name || target.hasTag('role:bot')) {
			tell(player, 'chat.cmd.error.self');
			return;
		}
		resetPassword(player, target);
	},

	roles(player, args) {
		// Роли игроков в сети: сначала старшие.
		// В 1.19.50 getPlayers() возвращает итератор, а не массив — у него нет .map, поэтому [...]
		const players = [...world.getPlayers()]
			.map(p => ({ name: p.name, role: getRole(p) }))
			.sort((a, b) => ROLES.indexOf(b.role) - ROLES.indexOf(a.role) || a.name.localeCompare(b.name));
		const padding = columnPadding(players.map(p => p.name));
		tellList(player, { translate: 'chat.cmd.roles.header' },
			players.map((p, i) => ({ translate: 'chat.cmd.roles.line', with: { rawtext: [{ text: p.name + padding[i] }, { translate: `role.${p.role}` }] } })));
	}
};

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
	// Звук результата, как в меню: ошибка (ключ из ERROR_KEYS) — «ошибка», сообщение об успехе (…done…) — «успех»;
	// справка и списки (!help, !online) без звука. Выключается там же: Настройки → Звуки в меню
	const before = { errors: toldErrorCount(player), success: toldSuccessCount(player) };
	runChatCommand(player, command, args);
	settleCommands(player).then(() => {
		const error = toldErrorCount(player) > before.errors;
		if (error || toldSuccessCount(player) > before.success) menuFeedback(player, error);
	}).catch(() => {});
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
	// Селектор на месте ника (@a, @s, @p, @r — chat/commands/selectors.js): команда — по разу на каждую цель,
	// с её ником, поэтому проверки прав работают для каждой цели отдельно
	const pos = playerArgPos(command, args);
	if (pos !== undefined && isSelector(args[pos])) {
		const result = selectTargets(player, args[pos], command, [...world.getPlayers()]);
		if (result.error) return tell(player, result.error, ...result.args);
		for (const target of result.targets) {
			const own = [...args];
			own[pos] = target.name;
			handler(player, own, command);
		}
		return;
	}
	handler(player, args, command);
}
