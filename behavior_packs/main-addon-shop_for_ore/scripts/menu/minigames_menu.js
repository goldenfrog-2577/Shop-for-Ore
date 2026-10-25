// --- Меню сервера → Мини-игры: список, запись и выход ---

import { showMenu, backButton } from './forms.js';
import { listGames, gameOf, joinGame, leaveGame } from '../system/minigames.js';

const state = (g) => `§8%menu.games.phase.${g.phase} §7(${g.players.size}/${g.def.maxPlayers})`;

export function minigamesMenu(player, back) {
	const mine = gameOf(player);
	showMenu(player, '%menu.games.title', mine ? '%menu.games.body.in_game' : '%menu.games.body', [
		...listGames().map(g => g === mine
			? { text: `§2%minigame.${g.def.id}.name\n§2%menu.games.leave`, run: () => leaveGame(player) }
			: { text: `§8%minigame.${g.def.id}.name\n${state(g)}`, run: () => joinGame(player, g.def.id) }),
		backButton(back)
	], back);
}
