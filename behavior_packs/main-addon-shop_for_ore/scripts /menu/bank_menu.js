// --- Меню банка: перевод денег между игроками ---
// Импортируем необходимые модули
import { world } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import { getScore } from '../DataBase.js';
import { menu } from './menu.js';

// --- Основная функция банка ---
export function bank(player) {
	// Собираем список игроков для выбора в выпадающем списке
	const playerObjects = [];
	const operations = [];
	for (let p of world.getPlayers()) {
		operations.push(p.name);
		playerObjects.push(p);
	}

	// Создаём форму банка
	const menu = new ModalFormData()
		.title('%bank.title')
		.dropdown(`\n%bank.text.8 §a${getScore(player, "money")}\n%bank.text.7`, operations, 0)
		.textField('%bank.text.1', '%bank.text.2');

	// Показываем форму игроку
	menu.show(player).then((r) => {
		let target = operations[r.formValues[0]];
		let amount = Number(r.formValues[1]);
		let playerScore = getScore(player, "money");

		// Проверка на корректность суммы
		if (isNaN(amount) || amount <= 0) {
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"%bank.text.9"}]}');
			return;
		}
		// Проверка на достаточность средств
		if (playerScore < amount) {
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"%bank.text.3"}]}');
		} else {
			// Сообщение отправителю
			player.runCommandAsync(`tellraw @s {"rawtext":[{"translate":"%bank.text.4"},{"text":"§e${target}§a,"},{"translate":"bank.text.6"},{"text":"§e${amount}"}]}`);
			// Зачисление денег получателю
			player.runCommandAsync(`scoreboard players add "${target}" money ${amount}`);
			// Сообщение получателю
			player.runCommandAsync(`tellraw "${target}" {"rawtext":[{"translate":"bank.text.5"},{"text":"§e${player.name}§a,"},{"translate":"bank.text.6"},{"text":"§e${amount}"}]}`);
			// Списание денег у отправителя
			player.runCommandAsync(`scoreboard players remove @s money ${amount}`);
			// Звук успешного перевода
			player.runCommandAsync('playsound note.bell @s');
		}
	});
}
