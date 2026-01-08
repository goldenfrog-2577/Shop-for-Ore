// --- UI регистрации нового игрока ---
// Показывает форму для создания пароля и подтверждения регистрации

import { world } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';

// Проверяем игроков на наличие тега 'onRegister' каждый тик
world.events.tick.subscribe(() => {
	for (let player of world.getPlayers()) {
		if (player.hasTag('onRegister')) {
			RegisterUI(player);
			player.runCommandAsync('tag @s remove onRegister')
		}
	}
});

/**
 * Показывает форму регистрации игроку.
 * @param {Player} player 
 */
function RegisterUI(player) {
	const register = new ModalFormData()
		.title('%reg.title')
		.textField(`\n%login.text.1 ${player.name} %login.text.2`,'%login.text.4')
		.toggle('%reg.toggle', false);
	register.show(player).then(r => {
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
