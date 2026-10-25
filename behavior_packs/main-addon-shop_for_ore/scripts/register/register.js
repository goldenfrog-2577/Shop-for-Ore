// --- UI регистрации нового игрока ---
// Форму вызывает register/system.js (раньше — отдельная проверка тега 'onRegister' каждый тик)

import { tellText, run } from '../DataBase.js';
import { modal } from '../menu/forms.js';
import { PASSWORD_MIN, PASSWORD_MAX, setPassword } from './password.js';
import { unlockPlayer } from './system.js';

/**
 * Показывает форму регистрации игроку.
 * @param {Player} player
 * @returns {Promise<void>} завершается, когда игрок закрыл форму
 */
export function RegisterUI(player) {
	const register = modal('%account.register.title')
		// В форме у ключей нет параметров: ник — в начале («Ник, приветствую…»), так порядок слов верен во всех языках
		.textField(`\n§b${player.name}§7, %account.login.intro`, '%account.login.placeholder')
		.toggle('%account.register.agree', false);
	return register.show(player).then(r => {
		// Форма закрыта — через ~2 с она покажется снова
		if (!r.formValues) return;
		const password = String(r.formValues[0] ?? '').trim();
		// Если игрок не подтвердил правила
		if (r.formValues[1] !== true) {
			tellText(player, '\n%chat.account.error.no_cheats\n ');
			run(player, 'playsound note.bass @s');
			return;
		}
		// Пустой или слишком длинный пароль не принимаем
		if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
			tellText(player, '\n%chat.account.error.password_length\n ');
			run(player, 'playsound note.bass @s');
			return;
		}
		// Теги ставим синхронно и в правильном порядке: сначала пароль (соль + хеш), потом auth:done.
		// Раньше это были отдельные команды tag: если команда с паролем падала
		// (например, из-за кавычки в пароле), игрок становился «зарегистрированным» без пароля
		setPassword(player, password);
		player.addTag('auth:done');
		player.removeTag('auth:register');
		unlockPlayer(player);
		// В чате ник и пароль — параметры ключей (%1$s): где они стоят, решает перевод
		tellText(player, '\n%account.register.greeting\n\n%account.register.welcome\n\n%account.register.info\n %account.register.password\n\n%account.register.remember\n ',
			{ 'account.register.greeting': [player.name], 'account.register.password': [password] });
		run(player, 'playsound random.levelup @s');
	});
}