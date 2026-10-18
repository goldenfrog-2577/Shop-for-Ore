// --- Меню банка: перевод денег между игроками ---
// Импортируем необходимые модули
import { world } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import { getScore, rawTranslate, run, findPlayer } from '../DataBase.js';
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
		// Форма закрыта крестиком — formValues нет
		if (!r.formValues) return;
		let target = operations[r.formValues[0]];
		const raw = String(r.formValues[1] ?? '').trim();
		let amount = Number(raw);
		let playerScore = getScore(player, "money");

		// Сумма — целое положительное число в пределах табло (раньше дробная или огромная сумма
		// «отправлялась» в сообщении, а команды scoreboard не срабатывали)
		if (!/^\d+$/.test(raw) || !Number.isSafeInteger(amount) || amount <= 0 || amount > 2147483647) {
			run(player, 'tellraw @s {"rawtext":[{"translate":"bank.error.amount"}]}');
			return;
		}
		// Самому себе переводить нельзя
		if (target === player.name) {
			run(player, 'tellraw @s {"rawtext":[{"translate":"bank.error.self"}]}');
			return;
		}
		// Получатель мог выйти, пока форма была открыта: тогда деньги ушли бы «фейковому игроку» с его ником
		const targetPlayer = findPlayer(target);
		if (!targetPlayer) {
			run(player, `tellraw @s ${rawTranslate('message.cmd.notfound', target)}`);
			return;
		}
		// Проверка на достаточность средств
		if (playerScore < amount) {
			run(player, 'tellraw @s {"rawtext":[{"translate":"bank.text.3"}]}');
			return;
		}
		// Сначала списание у отправителя; зачисление — только если списание прошло
		run(player, `scoreboard players remove @s money ${amount}`).then((res) => {
			if (res === undefined) return;
			run(targetPlayer, `scoreboard players add @s money ${amount}`);
			run(player, `tellraw @s ${rawTranslate('bank.sent', targetPlayer.name, amount)}`);
			run(targetPlayer, `tellraw @s ${rawTranslate('bank.received', player.name, amount)}`);
			run(player, 'playsound note.bell @s');
		});
	});
}