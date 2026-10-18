// --- UI авторизации игрока при входе ---
// Форму вызывает register/system.js (раньше — отдельная проверка тега 'onLogin' каждый тик)

import { ModalFormData } from '@minecraft/server-ui';

/**
 * Показывает форму логина игроку.
 * @param {Player} player 
 * @returns {Promise<void>} завершается, когда игрок закрыл форму
 */
export function LoginUI(player) {
	const login = new ModalFormData()
		.title('%login.title')
		.textField('%login.text.3', '%login.text.4');
	return login.show(player).then(r => {
		// Форма закрыта — через ~2 с она покажется снова
		if (!r.formValues) return;
		const password = String(r.formValues[0] ?? '').trim();
		// Проверка пароля по тегу. Теги меняем синхронно (addTag/removeTag),
		// а не командой tag — иначе тег снимался с задержкой и форма открывалась повторно
		if (password && player.hasTag(`password:${password}`)) {
			player.removeTag('chekLogin');
			player.tell('\n%login.text.5\n ');
			player.runCommandAsync('playsound random.levelup @s');
		} else {
			player.tell('\n%login.text.6\n ');
			player.runCommandAsync('playsound note.bass @s');
		}
	});
}
