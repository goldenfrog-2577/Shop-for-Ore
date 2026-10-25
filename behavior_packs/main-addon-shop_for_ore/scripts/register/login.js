// --- UI авторизации игрока при входе ---
// Форму вызывает register/system.js (раньше — отдельная проверка тега 'onLogin' каждый тик)

import { tellText } from '../DataBase.js';
import { ModalFormData } from '@minecraft/server-ui';
import { checkPassword } from './password.js';
import { unlockPlayer } from './system.js';

/**
 * Показывает форму логина игроку.
 * @param {Player} player 
 * @returns {Promise<void>} завершается, когда игрок закрыл форму
 */
export function LoginUI(player) {
	const login = new ModalFormData()
		.title('%account.login.title')
		.textField('%account.login.hint', '%account.login.placeholder');
	return login.show(player).then(r => {
		// Форма закрыта — через ~2 с она покажется снова
		if (!r.formValues) return;
		const password = String(r.formValues[0] ?? '').trim();
		// Проверка пароля по хешу (старый открытый пароль при успехе сразу переводится в хеш).
		// Теги меняем синхронно (addTag/removeTag), а не командой tag — иначе тег снимался
		// с задержкой и форма открывалась повторно
		if (password && checkPassword(player, password)) {
			player.removeTag('auth:login');
			unlockPlayer(player);
			tellText(player, '\n%chat.account.logged_in\n ');
			player.runCommandAsync('playsound random.levelup @s');
		} else {
			tellText(player, '\n%chat.account.error.wrong_password\n ');
			player.runCommandAsync('playsound note.bass @s');
		}
	});
}
