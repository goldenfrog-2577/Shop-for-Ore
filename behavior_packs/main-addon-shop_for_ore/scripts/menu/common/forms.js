// --- Формы: один способ строить меню во всех скриптах ---
// Меню — список пунктов { text, icon, run }: номер нажатой кнопки сам находит действие, поэтому
// пункты можно показывать не всем. Крестик закрывает окно; возврат — отдельной кнопкой (кроме формы с полями).
// Если форма не открылась из-за открытого чата (userBusy), она покажется, когда чат закроют.
// В 1.19.50 формы принимают только строки: ключи перевода пишутся как «%ключ», после ключа —
// пробел или перенос строки (сразу после ключа не ставим ни скобок, ни §-кодов). Параметров
// (with, %1$s) у ключей в формах нет — порядок слов с ником собирается так, чтобы подходил всем языкам.
// После нажатия игроку пришло сообщение в чат:
//  • ошибка (ключ из system/ui/error_keys.js: «⩕ ERROR!») — закрывается вся цепочка окон: формы, которые действие
//    открыло бы следом, не показываются;
//  • успех («Настройка изменена», «Деньги переведены»…) — остаётся только последнее окно: если действие само
//    открывает следующую форму (обновлённое меню, родительский раздел), показывается она одна; если нет —
//    меню, в котором нажали, открывается снова (окно с полями и «Да / Нет» — возвращают в своё меню, onBack).
// Покупки через функции (.mcfunction) пишут в чат сами, скрипт этих сообщений не видит — после них окно закрывается.

import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { closedByPlayer, showWhenFree, toldCount, toldErrorCount, settleCommands, hasPendingCommands, menuFeedback, menuCommandCount, menuSoundCount, failedCommandCount, beginMenuAction, endMenuAction } from '../../DataBase.js';

// Отдельные текстуры оформления кнопок; предметы и системный интерфейс используют свои ресурсы.
const MENU_ICONS = new Set([
	"textures/blocks/barrier",
	"textures/blocks/iron_bars",
	"textures/blocks/noteblock",
	"textures/items/amethyst_shard",
	"textures/items/apple_golden",
	"textures/items/armor_stand",
	"textures/items/blaze_powder",
	"textures/items/book_enchanted",
	"textures/items/book_writable",
	"textures/items/bucket_lava",
	"textures/items/bucket_milk",
	"textures/items/compass_item",
	"textures/items/diamond_chestplate",
	"textures/items/diamond_pickaxe",
	"textures/items/diamond_shovel",
	"textures/items/diamond_sword",
	"textures/items/dragons_breath",
	"textures/items/dye_powder_pink",
	"textures/items/echo_shard",
	"textures/items/egg_npc",
	"textures/items/emerald",
	"textures/items/end_crystal",
	"textures/items/ender_pearl",
	"textures/items/experience_bottle",
	"textures/items/feather",
	"textures/items/iron_chestplate",
	"textures/items/iron_sword",
	"textures/items/lead",
	"textures/items/light_block_15",
	"textures/items/mirror_glass",
	"textures/items/name_tag",
	"textures/items/nether_star",
	"textures/items/netherite_chestplate",
	"textures/items/potion_bottle_confusion",
	"textures/items/record_cat",
	"textures/items/sign",
	"textures/items/snowball",
	"textures/items/stick",
	"textures/items/totem",
	"textures/ui/ErrorGlyph",
	"textures/ui/FriendsIcon",
	"textures/ui/WarningGlyph",
	"textures/ui/World",
	"textures/ui/absorption_heart",
	"textures/ui/anvil_icon",
	"textures/ui/cancel",
	"textures/ui/check",
	"textures/ui/comment",
	"textures/ui/fire_resistance_effect",
	"textures/ui/freeze_heart",
	"textures/ui/friend_glyph_desaturated",
	"textures/ui/haste_effect",
	"textures/ui/health_boost_effect",
	"textures/ui/heart_new",
	"textures/ui/icon_import",
	"textures/ui/icon_lock",
	"textures/ui/icon_setting",
	"textures/ui/icon_timer",
	"textures/ui/invisibility_effect",
	"textures/ui/jump_boost_effect",
	"textures/ui/magnifyingGlass",
	"textures/ui/mute_off",
	"textures/ui/mute_on",
	"textures/ui/night_vision_effect",
	"textures/ui/permissions_op_crown",
	"textures/ui/permissions_visitor_hand",
	"textures/ui/refresh_light",
	"textures/ui/regeneration_effect",
	"textures/ui/resistance_effect",
	"textures/ui/slow_falling_effect",
	"textures/ui/sneak_button_default",
	"textures/ui/speed_effect",
	"textures/ui/strength_effect",
	"textures/ui/time_1sunrise",
	"textures/ui/time_2day",
	"textures/ui/time_3noon",
	"textures/ui/time_4sunset",
	"textures/ui/time_5night",
	"textures/ui/time_6midnight",
	"textures/ui/water_breathing_effect"
]);
const menuIcon = icon => MENU_ICONS.has(icon)
	? `textures/menu_icons/${icon.slice("textures/".length).replace(/\//g, "_")}`
	: icon;

// Ник → { told, errors } до нажатия и opened — действие уже открыло форму после сообщения
const acting = new Map();
/**
 * Выполнить действие кнопки.
 * @param {Player} player
 * @param {() => void} fn
 * @param {() => void} [reopen] — что открыть, если пришло сообщение об успехе, а действие само ничего не открыло
 */
async function act(player, fn, reopen) {
	const state = { told: toldCount(player), errors: toldErrorCount(player), commands: menuCommandCount(player), sounds: menuSoundCount(player), failed: failedCommandCount(player), opened: false };
	acting.set(player.name, state);
	beginMenuAction(player);
	try {
		const result = fn?.();
		if (!state.opened && result?.then) await result;
		await settleCommands(player);
	} finally {
		if (acting.get(player.name) === state) { acting.delete(player.name); endMenuAction(player); }
	}
	const error = toldErrorCount(player) > state.errors || failedCommandCount(player) > state.failed;
	const success = (toldCount(player) > state.told || menuCommandCount(player) > state.commands) && !error;
	if ((error || success) && menuSoundCount(player) === state.sounds) menuFeedback(player, error);
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
	if (state.opened) return false;
	state.opened = true;
	return true;
}
// null — форма не показана (обработчики ничего не делают, «Назад» тоже не срабатывает)
const show = (player, form) => {
	const state = acting.get(player.name);
	if (!allowed(player)) return Promise.resolve(null);
	const open = () => state && toldErrorCount(player) > state.errors ? null : showWhenFree(player, typeof form === 'function' ? form() : form);
	return hasPendingCommands(player) ? settleCommands(player).then(open) : Promise.resolve(open());
};

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
 * @param {() => void} [onBack] — кнопка «Назад»; в главном меню не задаётся
 */
export function showMenu(player, title, body, items, onBack) {
	const list = items.filter(Boolean);
	if (onBack && !list.some(item => /%[a-z._]*\.back(?:\s|$)/.test(item.text))) list.push(backButton(onBack));
	const form = () => {
		const result = new ActionFormData().title(title).body(typeof body === 'function' ? body() : body);
		for (const item of list) result.button(item.text, menuIcon(item.icon));
		return result;
	};
	return show(player, form).then(r => {
		if (!r) return;
		if (closedByPlayer(r)) return;
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
 * @param {() => void} [onNo] — кнопка «Нет»
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
		else if (!r.canceled && onNo && r.selection === 0) act(player, onNo);
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
