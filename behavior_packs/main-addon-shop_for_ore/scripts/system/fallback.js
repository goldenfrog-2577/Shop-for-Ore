// --- Пульс скриптов для запасного меню на NPC ---
// Раз в секунду обнуляет счёт «scripts system». Функция fallback/check каждую секунду прибавляет к нему 1:
// если скрипты не отвечают 5 секунд, включается запасное меню (dialogue/fallback_menu.json, functions/fallback/*).

import { system, world } from '@minecraft/server';
import { run } from '../DataBase.js';

export const HEARTBEAT = 'scoreboard players set scripts system 0';

system.runSchedule(() => run(world.getDimension('overworld'), HEARTBEAT), 20);
