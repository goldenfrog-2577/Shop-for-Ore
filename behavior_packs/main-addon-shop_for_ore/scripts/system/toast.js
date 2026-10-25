// --- Всплывающее окно над хотбаром (снизу по центру) ---
// Свой элемент HUD в resource_packs/.../ui/hud_screen.json: обычный заголовок (/title), который
// начинается с метки TOAST_MARK, рисуется не по центру экрана, а плашкой над хотбаром.
// Actionbar занят панелью слева, поэтому плашка работает через канал title.
// Время показа — как у заголовка: TOAST_TICKS (появление + показ + исчезновение).

import { run } from '../DataBase.js';

// Невидимая метка: коды форматирования §s§f§o (Shop for Ore). Та же строка — в hud_screen.json
export const TOAST_MARK = '§s§f§o';
// Появление, показ, исчезновение (тики)
const FADE_IN = 10, STAY = 60, FADE_OUT = 15;
export const TOAST_TICKS = FADE_IN + STAY + FADE_OUT;

/**
 * Показать плашку игроку.
 * @param {Player} player
 * @param {object[]} rawtext — части rawtext (text / translate); строки разделяются {text:'\n'}
 */
export function showToast(player, rawtext) {
	run(player, `title @s times ${FADE_IN} ${STAY} ${FADE_OUT}`);
	run(player, `titleraw @s title ${JSON.stringify({ rawtext: [{ text: TOAST_MARK }, ...rawtext] })}`);
}

/**
 * Обычный заголовок по центру экрана (отсчёт мини-игры и т. п.) — со своими временами,
 * чтобы не достались времена плашки.
 */
export function showTitle(player, rawtext, fadeIn = 0, stay = 20, fadeOut = 5) {
	run(player, `title @s times ${fadeIn} ${stay} ${fadeOut}`);
	run(player, `titleraw @s title ${JSON.stringify({ rawtext })}`);
}
