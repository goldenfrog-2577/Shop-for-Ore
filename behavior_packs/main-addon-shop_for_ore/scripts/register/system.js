// --- Система регистрации и логина игроков ---
// Добавляет нужные теги при входе и блокирует действия до прохождения логина/регистрации

import { tellText } from '../DataBase.js';
import { world } from '@minecraft/server';
import { LoginUI } from './login.js';
import { RegisterUI } from './register.js';
import { hasPassword } from './password.js';

// Через сколько тиков после входа показывать форму (и повторять, пока игрок не вошёл)
const FORM_DELAY_TICKS = 40;
// Как часто обновлять эффекты блокировки (эффект длится 2 с = 40 тиков, обновляем раньше)
const EFFECT_REFRESH_TICKS = 20;

// Тики ожидания по имени игрока — вместо табло ticks, которое раньше
// создавалось командой каждый тик для каждого игрока
const waitTicks = new Map();
// Игроки, у которых сейчас открыта форма, — чтобы не открывать её поверх
const formOpen = new Set();

/** Может ли игрок войти по паролю (иначе ему нужна регистрация) */
function canLogin(player) {
	return player.hasTag('hasRegister') && hasPassword(player);
}

// При входе игрока: определяем, что ему показывать — логин или регистрацию.
// Ставим ровно один из тегов chekLogin/chekRegister: в мире встречались игроки
// с обоими сразу — старый код показывал им две формы одновременно
world.events.playerJoin.subscribe((data) => {
	const player = data.player;
	// Кик админ-палкой (событие server:kick в player.json) ставит тег kick, из-за которого
	// игрок исчезает с сервера. Раньше тег не снимался, и кик действовал как вечный бан
	player.removeTag('kick');
	// Старые аккаунты (эпоха Omlet Arcade): hasRegister есть, а пароля нет —
	// войти невозможно, поэтому просим задать пароль заново. Прогресс не трогаем
	if (player.hasTag('hasRegister') && !hasPassword(player)) {
		player.removeTag('hasRegister');
		tellText(player, '\n%chat.account.legacy\n ');
	}
	if (canLogin(player)) {
		player.removeTag('chekRegister');
		player.addTag('chekLogin');
	} else {
		player.removeTag('chekLogin');
		player.addTag('chekRegister');
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
				// Форма выбирается по состоянию аккаунта, а не по тегу: даже если остались оба тега,
				// показывается одна форма
				openForm(player, canLogin(player) ? LoginUI : RegisterUI);
			}
		} else {
			waitTicks.set(player.name, waited);
		}
	}
});
