// --- UI авторизации игрока при входе ---
// Показывает форму для ввода пароля, если у игрока есть тег 'onLogin'

import { world } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';

// Проверяем игроков на наличие тега 'onLogin' каждый тик
world.events.tick.subscribe(() => {
	for (let player of world.getPlayers()) {
		if (player.hasTag('onLogin')) {
			LoginUI(player);
			player.runCommandAsync('tag @s remove onLogin')
		}
	}
});

/**
 * Показывает форму логина игроку.
 * @param {Player} player 
 */
function LoginUI(player) {
	const login = new ModalFormData()
		.title('%login.title')
		.textField('%login.text.3', '%login.text.4');
	login.show(player).then(r => {
		let password = r.formValues[0];
		// Проверка пароля по тегу
		if (player.hasTag(`password:${password}`)) {
			player.runCommandAsync('tag @s remove chekLogin');
			player.tell('\n%login.text.5\n ');
			player.runCommandAsync('playsound random.levelup @s');
		} else {
			player.tell('\n%login.text.6\n ');
			player.runCommandAsync('playsound note.bass @s');
		}
	});
}
