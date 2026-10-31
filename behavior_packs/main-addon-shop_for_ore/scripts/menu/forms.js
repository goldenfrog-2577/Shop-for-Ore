// --- Формы: один способ строить меню во всех скриптах ---
// Меню — список пунктов { text, icon, run }: номер нажатой кнопки сам находит действие, поэтому
// пункты можно показывать не всем. Крестик (закрыл сам игрок) — onBack, как кнопка «Назад».
// Если форма не открылась из-за открытого чата (userBusy), она покажется, когда чат закроют.
// В 1.19.50 формы принимают только строки: ключи перевода пишутся как «%ключ», после ключа —
// пробел или перенос строки (сразу после ключа не ставим ни скобок, ни §-кодов). Параметров
// (with, %1$s) у ключей в формах нет — порядок слов с ником собирается так, чтобы подходил всем языкам.
// После нажатия игроку пришло сообщение в чат:
//  • ошибка (ключ из system/error_keys.js: «⩕ ERROR!») — закрывается вся цепочка окон: формы, которые действие
//    открыло бы следом, не показываются;
//  • успех («Настройка изменена», «Деньги переведены»…) — остаётся только последнее окно: если действие само
//    открывает следующую форму (обновлённое меню, родительский раздел), показывается она одна; если нет —
//    меню, в котором нажали, открывается снова (окно с полями и «Да / Нет» — возвращают в своё меню, onBack).
// Покупки через функции (.mcfunction) пишут в чат сами, скрипт этих сообщений не видит — после них окно закрывается.

import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { closedByPlayer, showWhenFree, toldCount, toldErrorCount } from '../DataBase.js';

// Ник → { told, errors } до нажатия и opened — действие уже открыло форму после сообщения
const acting = new Map();
/**
 * Выполнить действие кнопки.
 * @param {Player} player
 * @param {() => void} fn
 * @param {() => void} [reopen] — что открыть, если пришло сообщение об успехе, а действие само ничего не открыло
 */
function act(player, fn, reopen) {
	const state = { told: toldCount(player), errors: toldErrorCount(player), opened: false };
	acting.set(player.name, state);
	try {
		fn?.();
	} finally {
		acting.delete(player.name);
	}
	const success = toldCount(player) > state.told && toldErrorCount(player) === state.errors;
	if (success && !state.opened && reopen) reopen();
}
/**
 * Можно ли показать форму, которую открывает действие кнопки:
 * после ошибки — нет; после успеха — только одну (она и станет последним окном).
 */
function allowed(player) {
	const state = acting.get(player.name);
	if (!state) return true;
	if (toldErrorCount(player) > state.errors) return false;
	if (toldCount(player) > state.told) {
		if (state.opened) return false;
		state.opened = true;
	}
	return true;
}
// null — форма не показана (обработчики ничего не делают, «Назад» тоже не срабатывает)
const show = (player, form) => allowed(player) ? showWhenFree(player, form) : Promise.resolve(null);

/**
 * Кнопка «Назад».
 * @param {() => void} run
 * @param {string} [text] — у меню администратора свой ключ и значок
 * @param {string} [icon]
 */
export const backButton = (run, text = '%menu.common.back', icon) => ({ text, icon, run });

/**
 * Меню-список.
 * @param {Player} player
 * @param {string} title
 * @param {string} body
 * @param {({ text: string, icon?: string, run: () => void } | false | null | undefined)[]} items — ложные пропускаются
 * @param {() => void} [onBack] — крестик; в главном меню не задаётся (просто закрыть)
 */
export function showMenu(player, title, body, items, onBack) {
	const list = items.filter(Boolean);
	const form = new ActionFormData().title(title).body(body);
	for (const item of list) form.button(item.text, item.icon);
	return show(player, form).then(r => {
		if (!r) return;
		if (closedByPlayer(r)) return act(player, onBack);
		if (r.canceled || r.selection === undefined) return;
		act(player, list[r.selection]?.run, () => showMenu(player, title, body, items, onBack));
	});
}

/**
 * Форма с полями (ModalFormData): onSubmit(значения) или onBack по крестику.
 * @param {Player} player
 * @param {ModalFormData} form
 * @param {(values: (string|number|boolean)[]) => void} onSubmit
 * @param {() => void} [onBack]
 */
export function showModal(player, form, onSubmit, onBack) {
	return show(player, form).then(r => {
		if (!r) return;
		if (!r.formValues) return closedByPlayer(r) ? act(player, onBack) : undefined;
		act(player, () => onSubmit(r.formValues), onBack);
	});
}

/** Новая форма с полями — чтобы не импортировать ModalFormData в каждом меню. */
export const modal = (title) => new ModalFormData().title(title);

/**
 * Окно «Да / Нет». В 1.19.50 button1 — selection 1, button2 — selection 0.
 * @param {Player} player
 * @param {string} title
 * @param {string} body
 * @param {() => void} onYes
 * @param {() => void} [onNo] — «Нет» и крестик
 */
export function confirm(player, title, body, onYes, onNo) {
	const form = new MessageFormData()
		.title(title)
		.body(body)
		.button1(' %menu.common.yes')
		.button2(' %menu.common.no');
	return show(player, form).then(r => {
		if (!r) return;
		if (r.selection === 1) act(player, onYes, onNo);
		else if (onNo && (r.selection === 0 || closedByPlayer(r))) act(player, onNo);
	});
}

/**
 * Подтверждение опасного действия администратора (вайп, сброс игроков не в сети, отключение бустов):
 * заголовок «Предупреждение» со знаком «!» из шрифта карты, кнопки «Да / Нет».
 * @param {Player} player
 * @param {string} body
 * @param {() => void} onYes
 * @param {() => void} [onNo] — «Нет» и крестик
 */
export const WARN_TITLE = '\ue1f8 %admin.wipe.title';
export function wipeConfirm(player, body, onYes, onNo) {
	return confirm(player, WARN_TITLE, body, onYes, onNo);
}

/**
 * Окно «Включить / Выключить» с текущим состоянием в описании (Настройки).
 * @param {Player} player
 * @param {string} title
 * @param {string} body — описание настройки
 * @param {boolean} isOn — включено сейчас
 * @param {(on: boolean) => void} onChange
 * @param {() => void} onBack
 */
export function toggleMenu(player, title, body, isOn, onChange, onBack) {
	const state = isOn ? '%menu.settings.state.on' : '%menu.settings.state.off';
	return showMenu(player, title, `${body}\n\n%menu.settings.state ${state}`, [
		{ text: '\ue139 %menu.settings.button.enable', run: () => onChange(true) },
		{ text: '\ue130 %menu.settings.button.disable', run: () => onChange(false) },
		backButton(onBack)
	], onBack);
}
