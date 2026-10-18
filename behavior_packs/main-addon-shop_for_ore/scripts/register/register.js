// --- UI регистрации нового игрока ---
// Форму вызывает register/system.js (раньше — отдельная проверка тега 'onRegister' каждый тик)

import { ModalFormData } from '@minecraft/server-ui';
import { PASSWORD_MIN, PASSWORD_MAX, setPassword } from './password.js';

/**
 * Показывает форму регистрации игроку.
 * @param {Player} player 
 * @returns {Promise<void>} завершается, когда игрок закрыл форму
 */
export function RegisterUI(player) {
	const register = new ModalFormData()
		.title('%reg.title')
		.textField(`\n%login.text.1 ${player.name} %login.text.2`,'%login.text.4')
		.toggle('%reg.toggle', false);
	return register.show(player).then(r => {
		// Форма закрыта — через ~2 с она покажется снова
		if (!r.formValues) return;
		const password = String(r.formValues[0] ?? '').trim();
		// Если игрок не подтвердил правила
		if (r.formValues[1] != true) {
			player.tell('\n%reg.text.1\n ');
			player.runCommandAsync('playsound note.bass @s');
			return;
		}
		// Пустой или слишком длинный пароль не принимаем
		if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
			player.tell('\n%reg.text.length\n ');
			player.runCommandAsync('playsound note.bass @s');
			return;
		}
		// Теги ставим синхронно и в правильном порядке: сначала пароль (соль + хеш), потом hasRegister.
		// Раньше это были отдельные команды tag: если команда с паролем падала
		// (например, из-за кавычки в пароле), игрок становился «зарегистрированным» без пароля
		setPassword(player, password);
		player.addTag('hasRegister');
		player.removeTag('chekRegister');
		player.tell(`\n%reg.text.2 §b${player.name}\n\n%reg.text.3\n\n%reg.text.4\n %reg.text.5 §b${password}\n\n%reg.text.6\n `);
		player.runCommandAsync('playsound random.levelup @s');
	});
}