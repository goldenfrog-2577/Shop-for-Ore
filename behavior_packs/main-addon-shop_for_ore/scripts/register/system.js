// --- Система регистрации и логина игроков ---
// Добавляет нужные теги при входе и блокирует действия до прохождения логина/регистрации

import { world } from '@minecraft/server';
import { LoginUI } from './login.js';
import { RegisterUI } from './register.js';

// Через сколько тиков после входа показывать форму (и повторять, пока игрок не вошёл)
const FORM_DELAY_TICKS = 40;
// Как часто обновлять эффекты блокировки (эффект длится 2 с = 40 тиков, обновляем раньше)
const EFFECT_REFRESH_TICKS = 20;

// Тики ожидания по имени игрока — вместо табло ticks, которое раньше
// создавалось командой каждый тик для каждого игрока
const waitTicks = new Map();
// Игроки, у которых сейчас открыта форма, — чтобы не открывать её поверх
const formOpen = new Set();

// При входе игрока: определяем, что ему показывать — логин или регистрацию
world.events.playerJoin.subscribe((data) => {
	if (data.player.hasTag("hasRegister")) {
		data.player.addTag("chekLogin")
	}
	if (!data.player.hasTag("hasRegister")) {
		data.player.addTag("chekRegister")
	}
});

// При выходе игрока забываем его состояние (иначе «открытая форма» могла бы зависнуть до перезапуска)
world.events.playerLeave.subscribe((data) => {
	waitTicks.delete(data.playerName);
	formOpen.delete(data.playerName);
});

/**
 * Показывает форму и запоминает, что она открыта, пока игрок её не закроет.
 * @param {Player} player
 * @param {(player: Player) => Promise<any>} showForm
 */
function openForm(player, showForm) {
	formOpen.add(player.name);
	showForm(player).finally(() => formOpen.delete(player.name));
}

// Каждый тик работаем только с игроками, которые ещё не вошли.
// Раньше здесь было 9 команд на каждого игрока каждый тик, включая уже вошедших.
let tickCounter = 0;
world.events.tick.subscribe(() => {
	tickCounter++;
	for (const player of world.getPlayers()) {
		const needLogin = player.hasTag('chekLogin');
		const needRegister = player.hasTag('chekRegister');
		if (!needLogin && !needRegister) {
			waitTicks.delete(player.name);
			continue;
		}

		const firstSeen = !waitTicks.has(player.name);
		const waited = (waitTicks.get(player.name) ?? 0) + 1;

		// Эффекты блокировки управления: сразу и затем раз в секунду
		if (firstSeen || tickCounter % EFFECT_REFRESH_TICKS === 0) {
			player.runCommandAsync('effect @s slowness 2 255 true');
			player.runCommandAsync('effect @s blindness 2 255 true');
		}

		// Через 40 тиков показываем форму; если игрок не вошёл — покажем снова ещё через 40
		if (waited >= FORM_DELAY_TICKS) {
			waitTicks.set(player.name, 0);
			if (!formOpen.has(player.name)) {
				openForm(player, needLogin ? LoginUI : RegisterUI);
			}
		} else {
			waitTicks.set(player.name, waited);
		}
	}
});
