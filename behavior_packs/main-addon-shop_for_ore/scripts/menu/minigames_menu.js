// --- Меню сервера → Мини-игры: список, запись и выход ---

import { ActionFormData } from '@minecraft/server-ui';
import { closedByPlayer } from '../DataBase.js';
import { listGames, gameOf, joinGame, leaveGame } from '../system/minigames.js';

const state = (g) => `§8%menu.games.phase.${g.phase} §7(${g.players.size}/${g.def.maxPlayers})`;

export function minigamesMenu(player, back) {
	const games = listGames();
	const mine = gameOf(player);
	const form = new ActionFormData()
	.title('%menu.games.title')
	.body(mine ? '%menu.games.body.in_game' : '%menu.games.body');
	for (const g of games) {
		const here = g === mine;
		form.button(`${here ? '§2' : '§8'}%minigame.${g.def.id}.name\n${here ? '§2%menu.games.leave' : state(g)}`);
	}
	form.button('%menu.common.back');
	form.show(player).then(r => {
		if (closedByPlayer(r) || r.selection === games.length) return back();
		if (r.selection === undefined) return;
		const g = games[r.selection];
		if (g === gameOf(player)) leaveGame(player);
		else joinGame(player, g.def.id);
	});
}
