// --- Меню банка: перевод денег между игроками ---
// Импортируем необходимые модули
import { world } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import { getScore, transferMoney } from '../DataBase.js';
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
		// Проверки и сам перевод — в transferMoney (общий с командой !pay)
		transferMoney(player, operations[r.formValues[0]], r.formValues[1]);
	});
}