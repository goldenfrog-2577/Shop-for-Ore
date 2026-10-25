// --- Меню сервера → Банк: перевод монет игроку в сети ---
// Проверки и сам перевод — transferMoney (DataBase.js), общий с командой !pay.

import { world } from '@minecraft/server';
import { getScore, transferMoney } from '../DataBase.js';
import { showModal, modal } from './forms.js';
import { menu } from './menu.js';

export function bank(player) {
	const names = [...world.getPlayers()].map(p => p.name);
	const form = modal('%menu.bank.title')
		.dropdown(`\n%menu.bank.balance §e${getScore(player, 'money')} §f\ue152\n%menu.bank.player`, names, 0)
		.textField('%menu.bank.amount', '%menu.bank.amount_placeholder');
	showModal(player, form, ([target, amount]) => transferMoney(player, names[target], amount), () => menu(player));
}
