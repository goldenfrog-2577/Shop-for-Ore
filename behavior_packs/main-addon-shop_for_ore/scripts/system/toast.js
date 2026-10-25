// --- Всплывающее окно над хотбаром (снизу по центру) ---
// Свой элемент HUD в resource_packs/.../ui/hud_screen.json: обычный заголовок (/title), который
// начинается с метки TOAST_MARK, рисуется не по центру экрана, а плашкой над хотбаром.
// Actionbar занят панелью слева, поэтому плашка работает через канал title.
// Время показа — как у заголовка: TOAST_TICKS (появление + показ + исчезновение).
// Вторая метка HUD_MARK — строка CPS на PvP-арене (system/cps.js), ниже плашки. Канал один, поэтому
// пока видна плашка или заголовок по центру, строка CPS не отправляется (isBusy).

import { run } from '../DataBase.js';

// Невидимая метка: коды форматирования §s§f§o (Shop for Ore). Та же строка — в hud_screen.json
export const TOAST_MARK = '§s§f§o';
// Появление, показ, исчезновение (тики)
const FADE_IN = 10, STAY = 60, FADE_OUT = 15;
export const TOAST_TICKS = FADE_IN + STAY + FADE_OUT;
// Метка строки над хотбаром (CPS) — тоже в hud_screen.json
export const HUD_MARK = '§s§f§c';

// Ник → время (мс), до которого канал title занят плашкой или заголовком
const busyUntil = new Map();
const markBusy = (player, ticks) => busyUntil.set(player.name, Date.now() + ticks * 50);
/** Канал title сейчас занят (плашка или заголовок по центру). */
export const isBusy = (player) => (busyUntil.get(player.name) ?? 0) > Date.now();

/**
 * Показать плашку игроку.
 * @param {Player} player
 * @param {object[]} rawtext — части rawtext (text / translate); строки разделяются {text:'\n'}
 */
export function showToast(player, rawtext) {
	markBusy(player, TOAST_TICKS);
	run(player, `title @s times ${FADE_IN} ${STAY} ${FADE_OUT}`);
	run(player, `titleraw @s title ${JSON.stringify({ rawtext: [{ text: TOAST_MARK }, ...rawtext] })}`);
}

/**
 * Обычный заголовок по центру экрана (отсчёт мини-игры и т. п.) — со своими временами,
 * чтобы не достались времена плашки.
 */
export function showTitle(player, rawtext, fadeIn = 0, stay = 20, fadeOut = 5) {
	markBusy(player, fadeIn + stay + fadeOut);
	run(player, `title @s times ${fadeIn} ${stay} ${fadeOut}`);
	run(player, `titleraw @s title ${JSON.stringify({ rawtext })}`);
}

/**
 * Строка над хотбаром (CPS на арене): держится 1,5 с, обновляется каждую секунду без мигания.
 * Если канал занят плашкой или заголовком — не отправляется.
 * @returns {boolean} отправлена
 */
export function showHudLine(player, rawtext) {
	if (isBusy(player)) return false;
	run(player, 'title @s times 0 30 5');
	run(player, `titleraw @s title ${JSON.stringify({ rawtext: [{ text: HUD_MARK }, ...rawtext] })}`);
	return true;
}
