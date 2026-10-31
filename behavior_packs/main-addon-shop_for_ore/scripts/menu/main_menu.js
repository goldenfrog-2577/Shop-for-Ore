// --- Меню сервера (предмет server:menu в 9-м слоте) ---
// Главное меню и разделы: О карте, Магазин, Настройки, Банк, Правила, Промокоды, Телепортации,
// Прокачка, Достижения, Мини-игры. Формы строит menu/forms.js: крестик — на уровень вверх.

import { world } from '@minecraft/server';
import { isPending, rawTranslate, tellText, tell, run, WARPS } from '../DataBase.js';
import { showMenu, showModal, modal, backButton, toggleMenu } from './forms.js';
import { bank } from './bank_menu.js';
import { enchantsMenu } from './enchant_shop.js';
import { cosmeticsMenu } from './cosmetics_shop.js';
import { achievementsMenu } from './achievements_menu.js';
import { minigamesMenu } from './minigames_menu.js';
import { runChatCommand } from '../chat/commands.js';
import { MUSIC_OFF } from '../system/music.js';
import { ChangePasswordUI } from '../register/change.js';

const OPEN = '\n%menu.common.tap_to_open';
const COIN = '', LVL = '';
// Номер сборки в «Версия карты»
const BUILD = '0.3.0_20261025_dev';

/** Строки описания из ключей prefix.1 … prefix.N через перенос. */
const lines = (prefix, n, from = 1) => Array.from({ length: n - from + 1 }, (_, i) => `%${prefix}.${from + i}`).join('\n');

// --- Открытие предметом ---
world.events.beforeItemUse.subscribe((data) => {
	if (data.item.typeId !== 'server:menu') return;
	const player = data.source;
	// До входа в аккаунт меню недоступно
	if (isPending(player)) {
		data.cancel = true;
		tell(player, 'chat.account.error.login_required');
		return;
	}
	// Замороженный игрок не может уйти варпом из меню
	if (player.hasTag('state:frozen')) {
		data.cancel = true;
		tell(player, 'chat.cmd.freeze.active');
		return;
	}
	menu(player);
});

// --- Главное меню ---
export function menu(player) {
	showMenu(player, '%menu.main.title', '%menu.main.body', [
		{ text: '%menu.main.button.about' + OPEN, run: () => mapInfo(player) },
		{ text: '%menu.main.button.shop' + OPEN, run: () => shop(player) },
		{ text: '%menu.main.button.settings' + OPEN, run: () => settings(player) },
		{ text: '%menu.main.button.bank' + OPEN, run: () => bank(player) },
		{ text: '%menu.main.button.rules' + OPEN, run: () => rules(player) },
		{ text: '%menu.main.button.promo' + OPEN, run: () => promocodes(player) },
		{ text: '%menu.main.button.warps' + OPEN, run: () => warps(player) },
		{ text: '%menu.main.button.upgrades' + OPEN, run: () => upgrading(player) },
		{ text: '%menu.main.button.achievements' + OPEN, run: () => achievementsMenu(player, () => menu(player)) },
		{ text: '%menu.main.button.games' + OPEN, run: () => minigamesMenu(player, () => menu(player)) }
	]);
}

// ===== О карте =====

function mapInfo(player) {
	const back = () => menu(player);
	showMenu(player, '%menu.about.title', '%menu.about.body', [
		{ text: '%menu.about.button.levels', run: () => textPage(player, '%menu.levels.title', lines('menu.levels.line', 25), () => mapInfo(player)) },
		{ text: '%menu.about.button.howtoplay', run: () => textPage(player, '%menu.howtoplay.title', HOWTOPLAY, () => mapInfo(player)) },
		{ text: '%menu.about.button.creators', run: () => creators(player) },
		{ text: '%menu.about.button.version', run: () => textPage(player, '%menu.version.title', VERSION, () => mapInfo(player)) },
		backButton(back)
	], back);
}

// «Как играть?»: абзацы разделены пустой строкой, у первых трёх — отступ
// Значки разделов — escape-последовательностями: так их не потеряет ни один редактор
const HOWTOPLAY = ['\ue101 ' + lines('menu.howtoplay.line', 5), '\ue152 ' + lines('menu.howtoplay.line', 9, 6), '\ue151 ' + lines('menu.howtoplay.line', 13, 10),
	...Array.from({ length: 8 }, (_, i) => `%menu.howtoplay.line.${14 + i}`)].join('\n\n');
const VERSION = `%menu.version.line.1\n\n§r%menu.version.label §a${BUILD}§r\n%menu.version.line.2\n\n${lines('menu.version.line', 21, 3)}`;

/** Страница текста с одной кнопкой «Назад». */
function textPage(player, title, body, back) {
	showMenu(player, title, body, [backButton(back)], back);
}

// Создатели: любая кнопка возвращает в «О карте»
function creators(player) {
	const back = () => mapInfo(player);
	showMenu(player, '%menu.creators.title', '', [
		['§8Сreator\n§8kapycta1231484', 'textures/server_icons/steve'],
		// Соавтор карты: иконки шрифта (glyph_E1) подписаны «BY'NASTYA»
		['§5Сo-creator\n§8NastyaXs00', 'textures/server_icons/alex'],
		['§6Оmlet Arcade\n§8@waxenjaguar2209', 'textures/server_icons/omlet'],
		['§9Discоrd\n§8GoldenFrog#2577', 'textures/server_icons/discord'],
		['§3Тelegram\n§8@goldenfrog_2577', 'textures/server_icons/telegram'],
		['§2Хbox\n§8kapycta123#1484', 'textures/server_icons/xbox']
	].map(([text, icon]) => ({ text, icon, run: back })), back);
}

// ===== Магазин =====

function shop(player) {
	const back = () => menu(player);
	showMenu(player, '%menu.shop.title', '%menu.shop.body', [
		{ text: '%menu.shop.button.enchants', icon: 'textures/items/book_enchanted', run: () => enchantsMenu(player, () => shop(player)) },
		{ text: '%menu.shop.button.kits', icon: 'textures/items/diamond_chestplate', run: () => pvpKits(player) },
		{ text: '%menu.shop.button.boosts', icon: 'textures/items/experience_bottle', run: () => boosts(player) },
		{ text: '%menu.shop.button.cosmetics', icon: 'textures/items/dye_powder_pink', run: () => cosmeticsMenu(player, () => shop(player)) },
		backButton(back)
	], back);
}

/** Товар магазина: покупку и проверку денег делает функция .mcfunction от имени игрока. */
const product = (player, text, price, glyph, fn, icon) => ({ text: `${text}\n§8${price} ${glyph}`, icon, run: () => run(player, `function ${fn}`) });

function pvpKits(player) {
	const back = () => shop(player);
	showMenu(player, '%menu.shop.kits.title', '%menu.shop.kits.body', [
		product(player, '%menu.shop.kits.button.iron', '15.0K', COIN, 'shop/pvp_kits/iron', 'textures/items/iron_chestplate'),
		product(player, '%menu.shop.kits.button.diamond', '35.0K', COIN, 'shop/pvp_kits/diamond', 'textures/items/diamond_chestplate'),
		product(player, '%menu.shop.kits.button.netherite', '50.0K', COIN, 'shop/pvp_kits/netherite', 'textures/items/netherite_chestplate'),
		backButton(back)
	], back);
}

function boosts(player) {
	const back = () => shop(player);
	showMenu(player, '%menu.shop.boosts.title', '%menu.shop.boosts.body\n\n%menu.shop.boosts.x2\n%menu.shop.boosts.x4\n%menu.shop.boosts.magnet', [
		product(player, '%menu.shop.boosts.button.x2', '10.0K', COIN, 'boost/x2_boost'),
		product(player, '%menu.shop.boosts.button.x4', '50.0K', COIN, 'boost/x4_boost'),
		// «Магнит руды» — личный, на 5 минут
		product(player, '%menu.shop.boosts.button.ore_magnet', '20.0K', COIN, 'shop/ore_magnet/ore_magnet'),
		backButton(back)
	], back);
}

// ===== Настройки =====
// В описании каждой настройки — что она делает и как стоит сейчас

function settings(player) {
	const back = () => menu(player);
	const again = () => settings(player);
	showMenu(player, '%menu.settings.title', '%menu.settings.body', [
		{ text: '%menu.settings.button.board', icon: 'textures/items/sign', run: () => boardSetting(player, again) },
		{ text: '%menu.settings.button.particles', icon: 'textures/items/emerald', run: () => tagSetting(player, 'particles', 'player:particle', again) },
		{ text: '%menu.settings.button.sounds', icon: 'textures/blocks/noteblock', run: () => tagSetting(player, 'sounds', 'player:sound', again) },
		{ text: '%menu.settings.button.music', icon: 'textures/items/record_cat', run: () => musicSetting(player, again) },
		{ text: '%menu.settings.button.password', icon: 'textures/ui/icon_lock', run: () => ChangePasswordUI(player, again) },
		backButton(back)
	], back);
}

const changed = (player, on) => tellText(player, on ? '%chat.settings.enabled' : '%chat.settings.disabled');

// Частицы и звуки при продаже: включено, пока есть тег (по умолчанию выключено)
function tagSetting(player, kind, tag, back) {
	toggleMenu(player, `%menu.settings.${kind}.title`, `%menu.settings.${kind}.body`, player.hasTag(tag), (on) => {
		if (on) player.addTag(tag); else player.removeTag(tag);
		changed(player, on);
	}, back);
}

// Музыка: выключена, пока есть тег player:music_off (system/music.js)
function musicSetting(player, back) {
	toggleMenu(player, '%menu.settings.music.title', '%menu.settings.music.body', !player.hasTag(MUSIC_OFF), (on) => {
		if (on) player.removeTag(MUSIC_OFF);
		else {
			player.addTag(MUSIC_OFF);
			run(player, 'stopsound @s music.game');
		}
		changed(player, on);
	}, back);
}

// Панель слева: три состояния (теги player:board_icons, player:board_no — functions/settings/*)
function boardSetting(player, back) {
	const state = player.hasTag('player:board_no') ? 'off' : player.hasTag('player:board_icons') ? 'icons' : 'on';
	const pick = (fn, msg) => () => { run(player, `function settings/${fn}`); tellText(player, msg); };
	showMenu(player, '%menu.settings.board.title', `%menu.settings.board.body\n\n%menu.settings.state %menu.settings.state.${state}`, [
		{ text: ' %menu.settings.button.enable', run: pick('scoreboard_on', '%chat.settings.enabled') },
		{ text: ' %menu.settings.button.icons_only', run: pick('scoreboard_icons', '%chat.settings.icons_only') },
		{ text: ' %menu.settings.button.disable', run: pick('scoreboard_off', '%chat.settings.disabled') },
		backButton(back)
	], back);
}

// ===== Правила, промокоды, телепортации, прокачка =====

function rules(player) {
	textPage(player, '%menu.rules.title', `%menu.rules.header\n\n${lines('menu.rules.line', 6)}\n\n%menu.rules.footer`, () => menu(player));
}

// Промокод — один раз на игрока: отметка в табло promoN (0 — не вводил)
const PROMOCODES = {
	kapycta: { scoreboard: 'promo1', objective: 'xp', amount: 500, message: 'chat.promo.reward.1' },
	parkour: { scoreboard: 'promo2', objective: 'money', amount: 500, message: 'chat.promo.reward.2' },
	hellbonus: { scoreboard: 'promo3', objective: 'xp', amount: 25000, message: 'chat.promo.reward.3' },
	VIPbonus: { scoreboard: 'promo4', objective: 'vip_coins', amount: 100, message: 'chat.promo.reward.4' }
};

function promocodes(player) {
	const form = modal('%menu.promo.title').textField('%menu.promo.body\n\n%menu.promo.hint', '%menu.promo.placeholder');
	showModal(player, form, ([code]) => redeemPromo(player, String(code ?? '').trim()), () => menu(player));
}

/** Без учёта регистра: «Kapycta» и «vipbonus» тоже подходят. */
function redeemPromo(player, code) {
	const key = Object.keys(PROMOCODES).find(k => k.toLowerCase() === code.toLowerCase());
	if (!key) return tellText(player, '%chat.promo.error.invalid');
	const promo = PROMOCODES[key];
	// execute if … падает, если промокод уже вводили
	player.runCommandAsync(`execute if score @s ${promo.scoreboard} matches 0`).then(() => {
		run(player, `scoreboard players add @s ${promo.objective} ${promo.amount}`);
		run(player, `scoreboard players set @s ${promo.scoreboard} 1`);
		run(player, `tellraw @a ${rawTranslate(promo.message, player.name)}`);
	}, () => tellText(player, '%chat.promo.error.used'));
}

// Телепортации: те же точки, что у !warp (WARPS в DataBase.js), кроме точек персонала.
// Телепорт — командой !warp: те же проверки (заморозка, режим боя, мини-игры) и сообщения
function warps(player) {
	const back = () => menu(player);
	const list = WARPS.filter(w => w.role === 'player');
	showMenu(player, '%menu.warps.title', '%menu.warps.body', [
		...list.map(w => ({ text: `\ue179 %menu.warps.button.${w.id}`, run: () => runChatCommand(player, 'warp', [w.id]) })),
		backButton(back)
	], back);
}

function upgrading(player) {
	const back = () => menu(player);
	showMenu(player, '%menu.upgrades.title', '%menu.upgrades.body', [
		product(player, '%menu.upgrades.button.vip', '125.0K', COIN, 'upgrade/upgrade_vip'),
		product(player, '%menu.upgrades.button.rebirth', '16 - 25', LVL, 'upgrade/upgrade_rebirth'),
		backButton(back)
	], back);
}
