// --- Меню сервера → Достижения ---
// Список: получено — цветом (зелёное — достижение, фиолетовое — испытание), нет — серым с прогрессом.
// Нажатие — описание, прогресс и награда.

import { metricNumbers } from '../DataBase.js';
import { showMenu, backButton } from './forms.js';
import { ACHIEVEMENTS, GLYPH, has, progressOf, countOf, rewardText } from '../system/achievements.js';

const color = (a) => a.type === 'challenge' ? '§5' : '§2';
const num = (n) => n >= 10000 ? metricNumbers(n) : String(n);

// Порядок меню: сначала достижения, затем испытания; внутри — одинаковые темы.
// Каталог ACHIEVEMENTS сохраняет прежнюю очередь проверки условий и выдачи наград.
const MENU_ORDER = [
	'welcome', 'void', // Знакомство
	'lvl_5', 'lvl_10', 'lvl_15', 'lvl_20', 'lvl_26', 'lvl_33', 'lvl_40', // Уровни
	'rebirth_1', 'rebirth_5', // Перерождения
	'enchant', 'mined_1k', 'mined_10k', 'mined_100k', // Добыча и кирка
	'pay', 'rich_100k', 'rich_1m', // Деньги
	'vip', 'amethyst_500', 'vip_coins_1k', // VIP
	'cosmetic', 'all_trails', // Косметика
	'trader', 'all_heads', // Торговец
	'pvp_kill', 'pvp_kills_25', // PvP
	'game_win', 'spleef_5', 'game_wins_10', // Мини-игры
	'tir_first', 'tir_100', 'tir_bullseye', // Тир
	'all_promos', // Промокоды
	'playtime_1h', 'playtime_24h' // Время в игре
];
const MENU_RANK = new Map(MENU_ORDER.map((id, index) => [id, index]));
// Новые пункты без заданного места остаются в конце своего типа.
const MENU_ACHIEVEMENTS = [...ACHIEVEMENTS].sort((a, b) =>
	Number(a.type === 'challenge') - Number(b.type === 'challenge') ||
	(MENU_RANK.get(a.id) ?? MENU_ORDER.length) - (MENU_RANK.get(b.id) ?? MENU_ORDER.length)
);

function statusLine(player, a) {
	if (has(player, a.id)) return `${color(a)}%menu.achievements.done`;
	const pr = progressOf(player, a);
	return pr ? `§8${num(pr[0])} / ${num(pr[1])}` : '§8%menu.achievements.locked';
}

export function achievementsMenu(player, back) {
	const again = () => achievementsMenu(player, back);
	showMenu(player, '%menu.achievements.title', `%menu.achievements.body\n%menu.achievements.count §e${countOf(player)}§7 / §e${ACHIEVEMENTS.length}`, [
		...MENU_ACHIEVEMENTS.map(a => ({
			text: `${has(player, a.id) ? color(a) : '§8'}${GLYPH[a.type]} %ach.${a.id}.name\n${statusLine(player, a)}`,
			run: () => details(player, a, again)
		})),
		backButton(back)
	], back);
}

function details(player, a, back) {
	const pr = progressOf(player, a);
	// Награда — rawtext; в теле формы — только строка, поэтому собираем текстом с %ключами
	const reward = rewardText(a.reward).map(p => p.translate ? `%${p.translate}` : p.text).join('');
	const lines = [
		`${color(a)}%menu.achievements.type.${a.type}`,
		'',
		`§7%ach.${a.id}.desc`,
		'',
		pr ? `§7%menu.achievements.progress §e${num(pr[0])}§7 / §e${num(pr[1])}` : '',
		`§7%menu.achievements.reward ${reward}`,
		'',
		has(player, a.id) ? `${color(a)}%menu.achievements.done` : '§8%menu.achievements.locked'
	].filter((l, i, arr) => l !== '' || arr[i - 1] !== '');
	// Заголовок: сначала §l, потом цвет
	showMenu(player, `§l${color(a)}${GLYPH[a.type]} %ach.${a.id}.name`, lines.join('\n'), [backButton(back)], back);
}
