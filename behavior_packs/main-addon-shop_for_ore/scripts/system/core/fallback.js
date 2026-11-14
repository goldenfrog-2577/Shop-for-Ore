// --- Пульс скриптов для запасного меню на NPC ---
// Раз в секунду обнуляет счёт «scripts system». Функция fallback/check каждую секунду прибавляет к нему 1:
// если скрипты не отвечают 5 секунд, включается запасное меню (dialogue/fallback_menu.json, functions/fallback/*).

import { system, world } from '@minecraft/server';
import { run } from '../../utils.js';

export const HEARTBEAT = 'scoreboard players set scripts system 0';

export let heartbeatConfirmed = false;

let heartbeatFailureLogged = false;

system.runSchedule(() => {
	const pulse = run(world.getDimension('overworld'), HEARTBEAT, error => {
		if (heartbeatFailureLogged) return;
		heartbeatFailureLogged = true;
		console.warn('[Shop for Ore] Command legacy heartbeat: ' + (error?.message ?? error));
	});
	pulse.then(result => {
		if (result?.successCount > 0) heartbeatFailureLogged = false;
	});
	if (!heartbeatConfirmed) pulse.then(result => {
		heartbeatConfirmed ||= result?.successCount > 0;
	});
}, 20);
