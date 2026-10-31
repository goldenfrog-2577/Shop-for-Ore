// --- Общие помощники команд чата (chat/commands/*.js) ---

import { run, findPlayer, tell, hasRole, getRole } from '../../DataBase.js';

/**
 * Отправить игроку несколько строк одним tellraw: заголовок, строки, разделитель.
 * @param {Player} player
 * @param {object} header — элемент rawtext заголовка
 * @param {object[]} lines — элементы rawtext строк
 */
export function tellList(player, header, lines) {
	const rawtext = [header];
	for (const line of lines) rawtext.push({ text: '\n' }, line);
	rawtext.push({ text: '\n§8------------------------' });
	run(player, `tellraw @s ${JSON.stringify({ rawtext })}`);
}

/**
 * Цель команды: игрок из аргумента [ник] или сам вызвавший.
 * Применить команду к другому можно только с ролью не ниже otherRole.
 * При ошибке сообщает игроку и возвращает null.
 * @param {Player} player
 * @param {string|undefined} name
 * @param {string} otherRole
 * @returns {Player|null}
 */
export function resolveTarget(player, name, otherRole, targetRole) {
	if (!name) return player;
	const target = findPlayer(name);
	if (!target) {
		tell(player, 'chat.cmd.error.offline', name);
		return null;
	}
	if (target.name !== player.name && !hasRole(player, otherRole)) {
		tell(player, 'chat.cmd.error.no_permission');
		return null;
	}
	// Права, которые даёт команда (креатив, наблюдатель, полёт, палочка админа), — только тому, чья роль
	// сама позволяет такую команду: игроку и модератору креатив не выдать даже от администратора
	if (targetRole && target.name !== player.name && !hasRole(target, targetRole)) {
		tell(player, 'chat.cmd.error.target_role', target.name, { translate: `role.${targetRole}` });
		return null;
	}
	return target;
}

/**
 * Можно ли наказать игрока (мут, предупреждение, заморозка): не себя и только роль ниже своей
 * (владелец — любого). При отказе сообщает игроку.
 * @param {Player} player
 * @param {Player} target
 * @returns {boolean}
 */
export function canPunish(player, target) {
	if (target.name === player.name) {
		tell(player, 'chat.cmd.error.self');
		return false;
	}
	if (getRole(player) !== 'owner' && hasRole(target, getRole(player))) {
		tell(player, 'chat.cmd.error.role', target.name);
		return false;
	}
	return true;
}
