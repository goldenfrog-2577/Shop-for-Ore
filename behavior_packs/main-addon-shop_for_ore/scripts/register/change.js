// --- Смена и сброс пароля ---
// Смена: игрок знает старый пароль — Меню сервера → Настройки → «Сменить пароль» или !password.
// Сброс: игрок забыл пароль — только владелец (!resetpass <ник> или меню администратора) и только
// игроку в сети: ему сразу показывается форма регистрации, поэтому аккаунт ни секунды не остаётся
// без пароля (карту играют и с пиратских клиентов, ник может занять кто угодно).

import { world } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import { tellText, run, rawTranslate, showWhenFree } from '../DataBase.js';
import { PASSWORD_MIN, PASSWORD_MAX, setPassword, checkPassword, clearPassword } from './password.js';

// После 3 неверных старых паролей подряд — пауза, чтобы не подбирать пароль через эту форму
const MAX_WRONG = 3;
const LOCK_MS = 60 * 1000;
const wrong = new Map();   // ник → { count, until }


/** Форма смены пароля. onBack — куда вернуться по крестику (из меню — в Настройки). */
export function ChangePasswordUI(player, onBack) {
	const lock = wrong.get(player.name);
	if (lock && lock.until > Date.now()) {
		run(player, `tellraw @s ${rawTranslate('chat.account.error.locked', Math.ceil((lock.until - Date.now()) / 1000))}`);
		return Promise.resolve();
	}
	const form = new ModalFormData()
		.title('%account.change.title')
		.textField('%account.change.old', '%account.login.placeholder')
		.textField('%account.change.new', '%account.login.placeholder')
		.textField('%account.change.repeat', '%account.login.placeholder');
	return showWhenFree(player, form).then(r => {
		if (!r.formValues) {
			if (r.canceled && r.cancelationReason !== 'userBusy' && onBack) onBack();
			return;
		}
		const [oldPass, newPass, repeat] = r.formValues.map(v => String(v ?? '').trim());
		if (!oldPass || !checkPassword(player, oldPass)) {
			const w = wrong.get(player.name) ?? { count: 0, until: 0 };
			w.count++;
			if (w.count >= MAX_WRONG) { w.count = 0; w.until = Date.now() + LOCK_MS; }
			wrong.set(player.name, w);
			tellText(player, '\n%chat.account.error.wrong_password\n ');
			run(player, 'playsound note.bass @s');
			return;
		}
		wrong.delete(player.name);
		if (newPass.length < PASSWORD_MIN || newPass.length > PASSWORD_MAX) {
			tellText(player, '\n%chat.account.error.password_length\n ');
			run(player, 'playsound note.bass @s');
			return;
		}
		if (newPass !== repeat) {
			tellText(player, '\n%chat.account.error.mismatch\n ');
			run(player, 'playsound note.bass @s');
			return;
		}
		setPassword(player, newPass);
		// Новый пароль показываем один раз, как при регистрации, — чтобы его можно было запомнить
		tellText(player, `\n%chat.account.changed\n %account.register.password §b${newPass}\n\n%account.register.remember\n `);
		run(player, 'playsound random.levelup @s');
	});
}

/**
 * Сброс пароля игроку в сети (владелец). Пароль стирается, игрок сразу получает форму регистрации
 * (register/system.js по тегу chekRegister). Прогресс, роль и предметы не трогаются.
 * @returns {boolean}
 */
export function resetPassword(owner, target) {
	clearPassword(target);
	target.removeTag('hasRegister');
	target.removeTag('chekLogin');
	target.addTag('chekRegister');
	tellText(target, '\n%chat.account.reset\n ');
	run(target, 'playsound note.pling @s');
	// Персоналу в сети — кто кому сбросил
	for (const p of world.getPlayers()) {
		if (p.hasTag('host') || p.hasTag('role:admin') || p.hasTag('role:moder')) {
			run(p, `tellraw @s ${rawTranslate('chat.account.reset.staff', owner.name, target.name)}`);
		}
	}
	return true;
}
