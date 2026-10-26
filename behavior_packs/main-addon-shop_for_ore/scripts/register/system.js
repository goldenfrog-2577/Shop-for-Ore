// --- Система регистрации и логина игроков ---
// Добавляет нужные теги при входе и блокирует действия до прохождения логина/регистрации

import { tellText, run } from '../DataBase.js';
import { world } from '@minecraft/server';
import { LoginUI } from './login.js';
import { RegisterUI } from './register.js';
import { hasPassword } from './password.js';
import { migratePlayer } from '../system/migrate.js';
import { applyOfflineReset } from '../system/offline_reset.js';

// Через сколько тиков после входа показывать форму (и повторять, пока игрок не вошёл)
const FORM_DELAY_TICKS = 40;
// Эффекты блокировки: длинные (60 с) и обновляются раз в 10 с. Раньше были 2 с с обновлением раз в секунду —
// слепота в Bedrock начинает рассеиваться в конце действия, и экран на мгновение «проглядывал».
// После входа эффекты снимает unlockPlayer()
const EFFECT_SECONDS = 60;
const EFFECT_REFRESH_TICKS = 200;

// Тики ожидания по имени игрока — вместо табло ticks, которое раньше
// создавалось командой каждый тик для каждого игрока
const waitTicks = new Map();
// Игроки, у которых сейчас открыта форма, — чтобы не открывать её поверх
const formOpen = new Set();

/**
 * Снять эффекты блокировки после входа или регистрации. Замедление у замороженного (!freeze) не трогаем:
 * это его наказание, а не блокировка входа.
 */
export function unlockPlayer(player) {
	run(player, 'effect @s blindness 0');
	if (!player.hasTag('state:frozen')) run(player, 'effect @s slowness 0');
}

/** Может ли игрок войти по паролю (иначе ему нужна регистрация) */
function canLogin(player) {
	return player.hasTag('auth:done') && hasPassword(player);
}

// При входе игрока: определяем, что ему показывать — логин или регистрацию.
// Ставим ровно один из тегов auth:login/auth:register: в мире встречались игроки
// с обоими сразу — старый код показывал им две формы одновременно
world.events.playerJoin.subscribe((data) => {
	const player = data.player;
	// Не был в сети во время !resetoffline — все теги снимаются (до проверки пароля: регистрация заново)
	applyOfflineReset(player);
	// Старые названия тегов (до 0.3.0) — сразу на новые, иначе зарегистрированный игрок попал бы на регистрацию
	migratePlayer(player);
	// Кик админ-палкой (событие server:kick в player.json) ставит тег state:kick, из-за которого
	// игрок исчезает с сервера. Раньше тег не снимался, и кик действовал как вечный бан
	player.removeTag('state:kick');
	// Старые аккаунты (эпоха Omlet Arcade): auth:done есть, а пароля нет —
	// войти невозможно, поэтому просим задать пароль заново. Прогресс не трогаем
	if (player.hasTag('auth:done') && !hasPassword(player)) {
		player.removeTag('auth:done');
		tellText(player, '\n%chat.account.legacy\n ');
	}
	if (canLogin(player)) {
		player.removeTag('auth:register');
		player.addTag('auth:login');
	} else {
		player.removeTag('auth:login');
		player.addTag('auth:register');
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
		const needLogin = player.hasTag('auth:login');
		const needRegister = player.hasTag('auth:register');
		if (!needLogin && !needRegister) {
			waitTicks.delete(player.name);
			continue;
		}

		const firstSeen = !waitTicks.has(player.name);
		const waited = (waitTicks.get(player.name) ?? 0) + 1;

		// Эффекты блокировки управления: сразу и затем раз в секунду
		if (firstSeen || tickCounter % EFFECT_REFRESH_TICKS === 0) {
			run(player, `effect @s slowness ${EFFECT_SECONDS} 255 true`);
			run(player, `effect @s blindness ${EFFECT_SECONDS} 255 true`);
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
