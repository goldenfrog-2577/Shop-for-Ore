// --- Музыка: выключатель в Настройках ---
// Фоновую музыку играет сама игра (событие music.game — в ресурс-паке оно заменено на
// sounds/music/main.theme). Выключить её у одного игрока можно только остановкой звука:
// раз в 2 секунды /stopsound music.game для игроков с тегом player:music_off.
// По умолчанию музыка включена (тега нет). Громкость — ползунок «Музыка» в настройках игры.

import { system, world } from '@minecraft/server';
import { run } from '../DataBase.js';

export const MUSIC_OFF = 'player:music_off';

system.runSchedule(() => {
	for (const player of world.getPlayers()) {
		if (player.hasTag(MUSIC_OFF)) run(player, 'stopsound @s music.game');
	}
}, 40);
