// --- «Я забыл пароль» на экране входа ---
// Автосброса нет: на пиратском клиенте под чужим ником может зайти кто угодно, и пароль — единственная защита аккаунта.
// Игрок включает переключатель в форме входа → у него ставится заявка (тег auth:reset_request) и открывается окно
// с ником владельца в Telegram в поле ввода (формы 1.19.50 не открывают ссылки — ник можно выделить и скопировать).
// Владельцу в сети — сообщение сразу (один раз на заявку); вошёл позже — при входе, пока игрок с заявкой в игре.
// Сброс делает владелец сам (!resetpass или карточка игрока), заявка снимается там же (change.js) или при удачном входе.

import { world } from '@minecraft/server';
import { tell } from '../DataBase.js';
import { modal } from '../menu/common/forms.js';

export const RESET_REQUEST = 'auth:reset_request';
export const OWNER_TELEGRAM = '@goldenfrog_2577';

const loggedIn = (p) => !p.hasTag('auth:login') && !p.hasTag('auth:register');
const owners = () => [...world.getPlayers()].filter(p => p.hasTag('role:owner') && loggedIn(p));

/** Поставить заявку; владельцам в сети — сообщение (только для новой заявки). Возвращает, есть ли владелец в сети. */
export function requestReset(player) {
	const fresh = !player.hasTag(RESET_REQUEST);
	player.addTag(RESET_REQUEST);
	const list = owners();
	if (fresh) for (const o of list) tell(o, 'chat.account.reset_request', player.name);
	return list.length > 0;
}

/** Владелец вошёл в аккаунт — показать заявки игроков, которые сейчас в игре. */
export function notifyRequests(owner) {
	for (const p of world.getPlayers()) if (p.hasTag(RESET_REQUEST)) tell(owner, 'chat.account.reset_request', p.name);
}

/** Окно «Забыл пароль»: что делать и ник в Telegram для копирования. */
export function ForgotUI(player) {
	const online = requestReset(player);
	const form = modal('%account.forgot.title')
		.textField(`%account.forgot.body\n\n%account.forgot.${online ? 'online' : 'offline'}`, OWNER_TELEGRAM, OWNER_TELEGRAM);
	return form.show(player).then(() => {});
}
