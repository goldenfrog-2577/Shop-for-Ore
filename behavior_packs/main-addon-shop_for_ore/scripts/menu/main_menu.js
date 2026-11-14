// --- Меню сервера (предмет server:menu в 9-м слоте) ---
// Главное меню и разделы: О карте, Магазин, Настройки, Банк, Правила, Промокоды, Телепортации,
// Прокачка, Достижения, Мини-игры. Формы строит menu/common/forms.js: крестик закрывает окно, возврат — кнопкой «Назад».

import { world } from '@minecraft/server';
import { isJailed, tellJailed } from '../system/security/jail.js';
import { isPending, tellText, tell, run, findPlayer, getScore, isBot, transferMoney, WARPS, MAX_LEVEL, RULES_COUNT, warpAllowed, shopBalance } from '../utils.js';
import { showMenu, showModal, modal, backButton, confirm, toggleMenu } from './common/forms.js';
import { enchantsMenu } from './enchant_shop.js';
import { cosmeticsMenu } from './cosmetics_shop.js';
import { achievementsMenu } from './achievements_menu.js';
import { listGames, gameOf, joinGame, leaveGame } from '../system/minigames/minigames.js';
import { runChatCommand } from '../chat/commands/commands.js';
import { MUSIC_OFF, DISC_MODE, getVolume, setVolume, setMusicOff, unlockedDiscs, nowPlaying, playNow, playlistOf } from '../system/ui/music.js';
import { TRACK, DISCS } from '../system/ui/music_tracks.js';
import { BOSS_DISCS } from '../system/player/discs.js';
import { ChangePasswordUI } from '../registration/change.js';
import { redeemPromo } from '../system/economy/promo.js';
import { bankAmount, exchangeCoins, inventoryCoins } from '../system/economy/bank.js';

const OPEN = '\n%menu.common.tap_to_open';
const COIN = '', LVL = '';
// Номер сборки в «Версия карты»
const BUILD = '0.3.0_20261110_rc';

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
	// В тюрьме (!jail) — тоже: меню телепортаций вывело бы из камеры
	if (isJailed(player)) {
		data.cancel = true;
		tellJailed(player);
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
		{ text: '%menu.about.button.levels', run: () => textPage(player, '%menu.levels.title', lines('menu.levels.line', MAX_LEVEL), () => mapInfo(player)) },
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
// Строк «что нового» в .lang: menu.version.line.3…VERSION_LINES
const VERSION_LINES = 40;
const VERSION = `%menu.version.line.1\n\n§r %menu.version.label §a${BUILD}§r\n%menu.version.line.2\n\n${lines('menu.version.line', VERSION_LINES, 3)}`;

/** Страница текста с одной кнопкой «Назад». */
function textPage(player, title, body, back) {
	showMenu(player, title, body, [backButton(back)], back);
}

// Создатели: любая кнопка возвращает в «О карте»
function creators(player) {
	const back = () => mapInfo(player);
	showMenu(player, '%menu.creators.title', '', [
		['§8Creator\n§8kapycta1231484', 'textures/server_icons/steve'],
		// Соавтор карты: иконки шрифта (glyph_E1) подписаны «BY'NASTYA»
		['§5Co-creator\n§8NastyaXs00', 'textures/server_icons/alex'],
		['§6Omlet Arcade\n§8@waxenjaguar2209', 'textures/server_icons/omlet'],
		['§9Discord\n§8GoldenFrog#2577', 'textures/server_icons/discord'],
		['§3Telegram\n§8@goldenfrog_2577', 'textures/server_icons/telegram'],
		['§2Xbox\n§8kapycta123#1484', 'textures/server_icons/xbox']
	].map(([text, icon]) => ({ text, icon, run: back })), back);
}

// ===== Магазин =====

function shop(player) {
	const back = () => menu(player);
	showMenu(player, '%menu.shop.title', () => shopBalance(player, '%menu.shop.body'), [
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
	showMenu(player, '%menu.shop.kits.title', () => shopBalance(player, '%menu.shop.kits.body'), [
		product(player, '%menu.shop.kits.button.iron', '15.0K', COIN, 'shop/pvp_kits/iron', 'textures/items/iron_chestplate'),
		product(player, '%menu.shop.kits.button.diamond', '35.0K', COIN, 'shop/pvp_kits/diamond', 'textures/items/diamond_chestplate'),
		product(player, '%menu.shop.kits.button.netherite', '50.0K', COIN, 'shop/pvp_kits/netherite', 'textures/items/netherite_chestplate'),
		backButton(back)
	], back);
}

function boosts(player) {
	const back = () => shop(player);
	showMenu(player, '%menu.shop.boosts.title', () => shopBalance(player, '%menu.shop.boosts.body\n\n%menu.shop.boosts.x2\n%menu.shop.boosts.x4\n%menu.shop.boosts.magnet'), [
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
		{ text: '%menu.settings.button.sounds', icon: 'textures/server_icons/note_block', run: () => tagSetting(player, 'sounds', 'player:sound', again) },
		{ text: '%menu.settings.button.menu_sounds', icon: 'textures/server_icons/note_block', run: () => menuSounds(player, again) },
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

// Музыка (system/ui/music.js): вкл/выкл, громкость 0–100, источник — музыка сервера по зонам или свои пластинки,
// следующий трек и выбор пластинки (плашка «Сейчас играет»). В описании — что играет и как всё настроено
function musicSetting(player, back) {
	const again = () => musicSetting(player, back);
	const off = player.hasTag(MUSIC_OFF), discMode = player.hasTag(DISC_MODE), discs = unlockedDiscs(player);
	const body = () => {
		const t = nowPlaying(player);
		return ['%menu.settings.music.body', '',
			`%menu.settings.state ${off ? '%menu.settings.state.off' : '%menu.settings.state.on'}`,
			`%menu.music.now ${t ? `§f${t.title} §8— §f${t.author}§7` : '§8—'}`,
			`%menu.music.source ${discMode ? '%menu.music.source.discs' : '%menu.music.source.server'}`,
			`%menu.music.volume §f${getVolume(player)}§7 / 100`,
			`%menu.music.discs §f${discs.length}§7 / ${DISCS.length}`].join('\n');
	};
	showMenu(player, '%menu.settings.music.title', body, [
		{ text: off ? '\ue139 %menu.settings.button.enable' : '\ue130 %menu.settings.button.disable', run: () => { setMusicOff(player, !off); changed(player, off); again(); } },
		{ text: '%menu.music.button.volume', icon: 'textures/server_icons/note_block', run: () => musicVolume(player, again) },
		{ text: discMode ? '%menu.music.button.to_server' : '%menu.music.button.to_discs', icon: 'textures/items/record_cat', run: () => {
			if (!discMode && !discs.length) return tell(player, 'chat.music.error.no_discs');
			if (discMode) player.removeTag(DISC_MODE); else player.addTag(DISC_MODE);
			tell(player, discMode ? 'chat.music.source.server' : 'chat.music.source.discs');
			again();
		} },
		{ text: '%menu.music.button.choose', icon: 'textures/server_icons/note_block', run: () => musicChoose(player, again) },
		{ text: '%menu.music.button.collection', icon: 'textures/items/record_13', run: () => musicCollection(player, again) },
		backButton(back)
	], back);
}

function musicVolume(player, back) {
	const form = modal('%menu.music.volume.title').slider('%menu.music.volume.label', 0, 100, 10, getVolume(player));
	showModal(player, form, ([v]) => { setVolume(player, v); tell(player, 'chat.music.volume', String(getVolume(player))); back(); }, back);
}

// Коллекция: все 15 пластинок. Найденная — нажал, и она играет (источник переключается на «Мои пластинки»);
// ненайденная — «???» с подсказкой, где искать (system/player/discs.js)
function musicCollection(player, back) {
	const owned = unlockedDiscs(player);
	const items = DISCS.map(d => owned.includes(d.id)
		? { text: `§8${d.title}\n§7${d.author}`, icon: `textures/items/record_${d.id}`, run: () => {
			if (player.hasTag(MUSIC_OFF)) return tell(player, 'chat.music.error.off');
			player.addTag(DISC_MODE);
			if (!playNow(player, d.id)) return tell(player, 'chat.music.error.arena');
			back();
		} }
		: { text: `§8???\n%menu.music.hint.${BOSS_DISCS.includes(d.id) ? 'boss' : 'mine'}`, icon: 'textures/ui/lock', run: () => tell(player, 'chat.music.error.locked') });
	showMenu(player, '%menu.music.collection.title', `%menu.music.collection.body\n\n%menu.music.discs §f${owned.length}§7 / ${DISCS.length}`, [...items, backButton(back)], back);
}

// Выбрать трек из текущего плейлиста: музыка зоны (мир, Незер, арена Хранителя) или свои пластинки. Нажал — играет сразу,
// с плашкой «Сейчас играет»; играющий сейчас отмечен
function musicChoose(player, back) {
	if (player.hasTag(MUSIC_OFF)) return tell(player, 'chat.music.error.off');
	const { key, list } = playlistOf(player), now = nowPlaying(player)?.id;
	const items = list.map(id => ({
		text: `${id === now ? '§2' : '§8'}${TRACK[id].title}\n§7${TRACK[id].author}`,
		icon: TRACK[id].item ? `textures/items/record_${id}` : 'textures/server_icons/note_block',
		run: () => { if (!playNow(player, id)) return tell(player, 'chat.music.error.off'); back(); }
	}));
	showMenu(player, '%menu.music.choose.title', `%menu.music.choose.body\n\n%menu.music.choose.${key}`, [...items, backButton(back)], back);
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

function menuSounds(player, back) {
	const toggle = (kind) => toggleMenu(player, '%menu.settings.menu_sounds.' + kind + '.title',
		'%menu.settings.menu_sounds.body', !player.hasTag('player:menu_' + kind + '_off'), on => {
			if (on) player.removeTag('player:menu_' + kind + '_off'); else player.addTag('player:menu_' + kind + '_off');
			tell(player, on ? 'chat.settings.enabled' : 'chat.settings.disabled');
			menuSounds(player, back);
		}, () => menuSounds(player, back));
	// Галочка и крест используют ванильные текстуры, у кнопки «Клик» своя иконка.
	showMenu(player, '%menu.settings.menu_sounds.title', '%menu.settings.menu_sounds.body', [
		{ text: '%menu.settings.menu_sounds.success', icon: 'textures/ui/confirm', run: () => toggle('success') },
		{ text: '%menu.settings.menu_sounds.error', icon: 'textures/ui/cancel', run: () => toggle('error') },
		{ text: '%menu.settings.menu_sounds.click', icon: 'textures/server_icons/menu_click', run: () => toggle('click') },
		backButton(back)
	], back);
}

// ===== Банк и мини-игры =====

export function bank(player) {
	const reopen = () => bank(player);
	const body = () => '%menu.bank.welcome\n\n%menu.bank.description\n\n%menu.bank.balance §e' + getScore(player, 'money') + ' §r' + COIN
		+ '\n%menu.bank.inventory §e' + inventoryCoins(player) + ' §r' + COIN;
	return showMenu(player, '%menu.bank.title', body, [
		{ text: '%menu.bank.deposit', icon: 'textures/items/gold_ingot', run: () => bankExchange(player, true, reopen) },
		{ text: '%menu.bank.withdraw', icon: 'textures/items/gold_ingot', run: () => bankExchange(player, false, reopen) },
		{ text: '%menu.bank.transfer', icon: 'textures/server_icons/steve', run: () => bankTransfer(player, reopen) },
		backButton(() => menu(player))
	]);
}

function bankExchange(player, deposit, back) {
	const key = deposit ? 'deposit' : 'withdraw';
	const title = '%menu.bank.' + key + '.title';
	const form = modal(title).textField('%menu.bank.' + key + '.amount', '%menu.bank.amount_placeholder');
	return showModal(player, form, ([raw]) => {
		const amount = bankAmount(raw);
		if (!amount) return exchangeCoins(player, raw, deposit);
		const summary = '%menu.bank.' + key + '.confirm §e' + amount + ' §r' + COIN + '§7?';
		return confirm(player, title, summary, () => exchangeCoins(player, amount, deposit), back);
	}, back);
}

function bankTransfer(player, back) {
	const eligible = target => target && target.name !== player.name && !isBot(target) && !isPending(target);
	const names = [...world.getPlayers()].filter(eligible).map(target => target.name);
	if (!names.length) return tell(player, 'chat.bank.error.no_players');
	const form = modal('%menu.bank.transfer.title')
		.dropdown('\n%menu.bank.balance §e' + getScore(player, 'money') + ' §r' + COIN + '\n%menu.bank.player', names, 0)
		.textField('%menu.bank.amount', '%menu.bank.amount_placeholder');
	return showModal(player, form, ([index, amount]) => {
		const name = names[index];
		if (!eligible(findPlayer(name))) return tell(player, 'chat.cmd.error.offline', name ?? '—');
		return transferMoney(player, name, amount);
	}, back);
}

const gameStateLine = (g) => `§8 %menu.games.phase.${g.phase} §7(${g.players.size}/${g.def.maxPlayers})`;

export function minigamesMenu(player, back) {
	const mine = gameOf(player);
	showMenu(player, '%menu.games.title', mine ? '%menu.games.body.in_game' : '%menu.games.body', [
		...listGames().map(g => g === mine
			? { text: `§2 %minigame.${g.def.id}.name\n§2 %menu.games.leave`, run: () => leaveGame(player) }
			: { text: `§8 %minigame.${g.def.id}.name\n${gameStateLine(g)}`, run: () => joinGame(player, g.def.id) }),
		backButton(back)
	], back);
}

// ===== Правила, промокоды, телепортации, прокачка =====

// Пункты правил: menu.rules.line.1…RULES_COUNT в .lang (число — в utils.js, его же берёт !rules)
export { RULES_COUNT };
function rules(player) {
	textPage(player, '%menu.rules.title', `%menu.rules.header\n\n${lines('menu.rules.line', RULES_COUNT)}\n\n%menu.rules.footer`, () => menu(player));
}

// Промокоды: список, условия и награды — system/economy/promo.js
function promocodes(player) {
	const form = modal('%menu.promo.title').textField('%menu.promo.body\n\n%menu.promo.hint', '%menu.promo.placeholder');
	showModal(player, form, ([code]) => redeemPromo(player, code), () => menu(player));
}

// Телепортации: те же точки, что у !warp (WARPS в utils.js), кроме точек персонала; VIP-остров — только VIP.
// Телепорт — командой !warp: те же проверки (заморозка, режим боя, мини-игры) и сообщения
function warps(player) {
	const back = () => menu(player);
	const list = WARPS.filter(w => w.role === 'player' && warpAllowed(player, w));
	const vipIndex = list.findIndex(w => w.id === 'vip');
	if (vipIndex !== -1) {
		const [vip] = list.splice(vipIndex, 1);
		list.splice(list.findIndex(w => w.id === 'mine') + 1, 0, vip);
	}
	showMenu(player, '%menu.warps.title', '%menu.warps.body', [
		...list.map(w => ({ text: `\ue179 %menu.warps.button.${w.id}`, run: () => runChatCommand(player, 'warp', [w.id]) })),
		backButton(back)
	], back);
}

function upgrading(player) {
	const back = () => menu(player);
	showMenu(player, '%menu.upgrades.title', '%menu.upgrades.body', [
		product(player, '%menu.upgrades.button.vip', '125.0K', COIN, 'upgrade/upgrade_vip'),
		product(player, '%menu.upgrades.button.rebirth', `25 - ${MAX_LEVEL}`, LVL, 'upgrade/upgrade_rebirth'),
		backButton(back)
	], back);
}