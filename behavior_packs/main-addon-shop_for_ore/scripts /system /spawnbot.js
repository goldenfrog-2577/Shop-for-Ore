// --- Спавн тестового бота для отладки и автоматизации ---
// Используется только для спавна бота, без меню и дополнительных обработчиков

import * as GT from '@minecraft/server-gametest';
import { BlockLocation } from '@minecraft/server';

const hours = 1000;

// Регистрируем тест для спавна бота
GT.register('server', 'spawnbot', (test) => {
    const bot = test.spawnSimulatedPlayer(new BlockLocation(0, 2, 0), 'Bot');
    // Здесь только спавн бота, без меню и обработчиков
})
.maxTicks(hours*72000)
.structureName('server:bot')
