// --- UI регистрации нового игрока ---
// Форму вызывает register/system.js (раньше — отдельная проверка тега 'onRegister' каждый тик)

import { ModalFormData } from '@minecraft/server-ui';

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
		let password = r.formValues[0];
		// Если игрок подтвердил регистрацию
		if (r.formValues[1] == true) {
			player.runCommandAsync(`tag @s add "password:${password}"`);
			player.runCommandAsync('tag @s add hasRegister');
			player.runCommandAsync('tag @s remove chekRegister');
			player.tell(`\n%reg.text.2 §b${player.name}\n\n%reg.text.3\n\n%reg.text.4\n %reg.text.5 §b${password}\n\n%reg.text.6\n `);
			player.runCommandAsync('playsound random.levelup @s');
		} else {
			player.tell('\n%reg.text.1\n ');
			player.runCommandAsync('playsound note.bass @s');
		}
	});
}