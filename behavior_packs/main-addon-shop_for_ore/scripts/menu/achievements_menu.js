// --- Меню сервера → Достижения ---
// Список: получено — цветом (зелёное — достижение, фиолетовое — испытание), нет — серым с прогрессом.
// Нажатие — описание, прогресс и награда.

import { ActionFormData } from '@minecraft/server-ui';
import { closedByPlayer, metricNumbers } from '../DataBase.js';
import { ACHIEVEMENTS, GLYPH, has, progressOf, countOf, rewardText } from '../system/achievements.js';

const color = (a) => a.type === 'challenge' ? '§5' : '§2';
const num = (n) => n >= 10000 ? metricNumbers(n) : String(n);

function statusLine(player, a) {
	if (has(player, a.id)) return `${color(a)}%menu.achievements.done`;
	const pr = progressOf(player, a);
	return pr ? `§8${num(pr[0])} / ${num(pr[1])}` : '§8%menu.achievements.locked';
}

export function achievementsMenu(player, back) {
	const form = new ActionFormData()
	.title('%menu.achievements.title')
	.body(`%menu.achievements.body\n%menu.achievements.count §e${countOf(player)}§7 / §e${ACHIEVEMENTS.length}`);
	for (const a of ACHIEVEMENTS) {
		const got = has(player, a.id);
		form.button(`${got ? color(a) : '§8'}${GLYPH[a.type]} %ach.${a.id}.name\n${statusLine(player, a)}`);
	}
	form.button('%menu.common.back');
	form.show(player).then(r => {
		if (closedByPlayer(r) || r.selection === ACHIEVEMENTS.length) return back();
		if (r.selection === undefined) return;
		details(player, ACHIEVEMENTS[r.selection], () => achievementsMenu(player, back));
	});
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
	new ActionFormData()
	.title(`${color(a)}${GLYPH[a.type]} %ach.${a.id}.name`)
	.body(lines.join('\n'))
	.button('%menu.common.back')
	.show(player).then(r => {
		if (closedByPlayer(r) || r.selection === 0) back();
	});
}
