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
		.title('%menu.bank.title')
		.dropdown(`\n%menu.bank.balance §e${getScore(player, "money")}\n%menu.bank.player`, operations, 0)
		.textField('%menu.bank.amount', '%menu.bank.amount_placeholder');

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
			run(player, 'tellraw @s {"rawtext":[{"translate":"chat.bank.error.amount"}]}');
			return;
		}
		// Самому себе переводить нельзя
		if (target === player.name) {
			run(player, 'tellraw @s {"rawtext":[{"translate":"chat.bank.error.self"}]}');
			return;
		}
		// Получатель мог выйти, пока форма была открыта: тогда деньги ушли бы «фейковому игроку» с его ником
		const targetPlayer = findPlayer(target);
		if (!targetPlayer) {
			run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', target)}`);
			return;
		}
		// Проверка на достаточность средств
		if (playerScore < amount) {
			run(player, 'tellraw @s {"rawtext":[{"translate":"chat.bank.error.no_money"}]}');
			return;
		}
		// Сначала списание у отправителя; зачисление — только если списание прошло
		run(player, `scoreboard players remove @s money ${amount}`).then((res) => {
			if (res === undefined) return;
			run(targetPlayer, `scoreboard players add @s money ${amount}`);
			run(player, `tellraw @s ${rawTranslate('chat.bank.sent', targetPlayer.name, amount)}`);
			run(targetPlayer, `tellraw @s ${rawTranslate('chat.bank.received', player.name, amount)}`);
			run(player, 'playsound note.bell @s');
		});
	});
}