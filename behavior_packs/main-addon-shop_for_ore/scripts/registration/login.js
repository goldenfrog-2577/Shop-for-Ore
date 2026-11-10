// --- UI авторизации игрока при входе ---
// Форму вызывает registration/system.js

import { tellText, run, tell, menuFeedback } from '../DataBase.js';
import { modal } from '../menu/common/forms.js';
import { checkPassword } from './password.js';
import { unlockPlayer } from './system.js';

// Защита от подбора пароля: после MAX_WRONG неверных паролей подряд форма входа не показывается LOCK_MS.
// Счётчик — по нику и в памяти: перезаход паузу не снимает, перезагрузка скриптов — снимает
export const MAX_WRONG = 5;
export const LOCK_MS = 60 * 1000;
const wrong = new Map();   // ник → { count, until }

/** Сколько секунд ещё нельзя вводить пароль (0 — можно). */
export function loginLockSeconds(player, now = Date.now()) {
	const w = wrong.get(player.name);
	return w && w.until > now ? Math.ceil((w.until - now) / 1000) : 0;
}

/**
 * Показывает форму логина игроку.
 * @param {Player} player
 * @returns {Promise<void>} завершается, когда игрок закрыл форму
 */
export function LoginUI(player) {
	const login = modal('%account.login.title')
		.textField('%account.login.hint', '%account.login.placeholder');
	return login.show(player).then(r => {
		// Форма закрыта — через ~2 с она покажется снова
		if (!r.formValues) return;
		const password = String(r.formValues[0] ?? '').trim();
		// Проверка пароля по хешу (старый открытый пароль при успехе сразу переводится в хеш).
		// Теги меняем синхронно (addTag/removeTag), а не командой tag — иначе тег снимался
		// с задержкой и форма открывалась повторно
		if (password && checkPassword(player, password)) {
			wrong.delete(player.name);
			player.removeTag('auth:login');
			unlockPlayer(player);
			tellText(player, '\n%chat.account.logged_in\n ');
			if (!player.hasTag('player:menu_success_off')) run(player, 'playsound random.levelup @s');
		} else {
			const w = wrong.get(player.name) ?? { count: 0, until: 0 };
			w.count++;
			menuFeedback(player, true);
			if (w.count >= MAX_WRONG) {
				w.count = 0;
				w.until = Date.now() + LOCK_MS;
				tell(player, 'chat.account.error.locked', Math.ceil(LOCK_MS / 1000));
			} else tellText(player, '\n%chat.account.error.wrong_password\n ');
			wrong.set(player.name, w);
		}
	});
}
