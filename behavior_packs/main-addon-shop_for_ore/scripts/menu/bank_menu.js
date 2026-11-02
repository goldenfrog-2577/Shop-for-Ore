// --- Меню сервера → Банк: перевод монет игроку в сети ---
// Проверки и сам перевод — transferMoney (DataBase.js), общий с командой !pay.

import { world } from '@minecraft/server';
import { getScore, transferMoney, tell } from '../DataBase.js';
import { showModal, modal } from './forms.js';
import { menu } from './main_menu.js';

export function bank(player) {
	// Получатели — игроки в сети, кроме себя и бота (себе перевести нельзя, у бота денег нет)
	const names = [...world.getPlayers()].filter(p => p.name !== player.name && !p.hasTag('role:bot')).map(p => p.name);
	if (!names.length) return tell(player, 'chat.bank.error.no_players');
	const form = modal('%menu.bank.title')
		.dropdown(`\n%menu.bank.balance §e${getScore(player, 'money')} §f\ue152\n%menu.bank.player`, names, 0)
		.textField('%menu.bank.amount', '%menu.bank.amount_placeholder');
	showModal(player, form, ([target, amount]) => transferMoney(player, names[target], amount), () => menu(player));
}
