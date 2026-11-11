// --- Общие помощники команд чата (chat/commands/*.js) ---

import { run, findPlayer, tell, hasRole, getRole } from '../../DataBase.js';

// Ширина символов в пикселях. Цветовые коды не занимают места в чате.
const SPACE_WIDTH = 4;
const CHAR_WIDTH = { i: 2, l: 3, t: 4, f: 5, k: 5, j: 4, '!': 2, ':': 2, ' ': SPACE_WIDTH };
const GLYPH_WIDTH = {
	'\ue1f0': 6, '\ue1f1': 6, '\ue1f2': 6, '\ue1f3': 6, '\ue1f4': 6, '\ue1f5': 6, '\ue1f6': 6, '\ue1f9': 7,
	'\ue1e0': 8, '\ue1e1': 8, '\ue1e2': 8, '\ue1e3': 7, '\ue1e4': 7,
	'\ue10e': 6, '\ue10f': 6, '\ue151': 9, '\ue152': 7, '\ue153': 7, '\ue154': 6
};
export const textWidth = (text) => [...text.replace(/§[0-9a-z]/gi, '')]
	.reduce((width, char) => width + (GLYPH_WIDTH[char] ?? CHAR_WIDTH[char] ?? 6), 0);

export function columnPadding(labels) {
	const widths = labels.map(textWidth);
	const widest = widths.reduce((max, width) => Math.max(max, width), 0);
	return widths.map(width => ' '.repeat(Math.round((widest - width) / SPACE_WIDTH)));
}

/**
 * Отправить игроку несколько строк одним tellraw: заголовок, строки, разделитель.
 * @param {Player} player
 * @param {object} header — элемент rawtext заголовка
 * @param {object[]} lines — элементы rawtext строк
 * @param {number} [dashCount=5] — число тире с каждой стороны заголовка
 */
export function tellList(player, header, lines, dashCount = 5) {
	const dashes = '-'.repeat(dashCount);
	const rawtext = [{ text: `§8${dashes}§f ` }, header, { text: ` §r§8${dashes}§f` }];
	for (const line of lines) rawtext.push({ text: '\n' }, line);
	rawtext.push({ text: `\n§8${dashes.repeat(2)}§f` });
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
