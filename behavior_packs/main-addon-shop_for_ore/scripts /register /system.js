// --- Система регистрации и логина игроков ---
// Добавляет нужные теги при входе и блокирует действия до прохождения логина/регистрации

import { world } from '@minecraft/server';

// При входе игрока: определяем, что ему показывать — логин или регистрацию
world.events.playerJoin.subscribe((data) => {
	if (data.player.hasTag("hasRegister")) {
		data.player.addTag("chekLogin")
	}
	if (!data.player.hasTag("hasRegister")) {
		data.player.addTag("chekRegister")
	}
});

// Каждый тик: блокируем действия и отслеживаем время до показа UI
world.events.tick.subscribe((tick) => {
	for (let player of world.getPlayers()) {
		// Эффекты для блокировки управления
		player.runCommandAsync(`effect @s[tag=chekLogin] slowness 2 255 true`)
		player.runCommandAsync(`effect @s[tag=chekRegister] slowness 2 255 true`)
		player.runCommandAsync(`effect @s[tag=chekLogin] blindness 2 255 true`)
		player.runCommandAsync(`effect @s[tag=chekRegister] blindness 2 255 true`)
		// Счётчик тиков для задержки показа UI
		player.runCommandAsync(`scoreboard objectives add ticks dummy`)
		player.runCommandAsync(`scoreboard players add @s[tag=chekLogin] ticks 1`)
		player.runCommandAsync(`scoreboard players add @s[tag=chekRegister] ticks 1`)
		// После 40 тиков добавляем тег для показа UI
		player.runCommandAsync(`tag @s[tag=chekLogin,scores={ticks=40..}] add onLogin`)
		player.runCommandAsync(`tag @s[tag=chekRegister,scores={ticks=40..}] add onRegister`)
		// Сброс счётчика после показа UI
		player.runCommandAsync(`scoreboard players reset @s[scores={ticks=41..}] ticks`)
	}
});
