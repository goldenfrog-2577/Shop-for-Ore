// --- Селекторы в командах чата: @a, @s, @p, @r ---
// Ставятся на место ника игрока (PLAYER_ARG — номер аргумента-ника у команды). Команда выполняется отдельно для каждой
// цели обычным вызовом с ником, поэтому все проверки прав (canPunish, resolveTarget, роли) работают по каждой цели:
// модератор через @a не замутит администратора — получит ту же ошибку, что и с ником.
//   @s — ты сам; @p — ближайший другой игрок в твоём измерении; @r — случайный другой игрок; @a — все, кроме тебя
//   (себя — через @s: «!mute @a» не пытается замутить самого себя, «!tphere @a» собирает всех к тебе).
// Бот в @a, @p, @r не попадает. @e и * не поддерживаются, как и селекторы с параметрами (@a[r=5]).
// Команды, где несколько целей не имеют смысла или опасны (бан, роль, сброс пароля, личные сообщения, перевод монет,
// жалоба), принимают только одну цель: @s, @p, @r.

/** Номер аргумента с ником игрока у команды (имя без «!»). */
export const PLAYER_ARG = {
	msg: 0, pay: 0, stats: 0, warp: 1, report: 0, cps: 0, ac: 0, jail: 0, unjail: 0, tp: 0, gm6: 0, kick: 0, mute: 0, unmute: 0,
	warn: 0, unwarn: 0, freeze: 0, unfreeze: 0, tphere: 0, gm1: 0, gm2: 0, fly: 1, ban: 0, scoreboard: 0, tag: 0,
	achievement: 0, color: 0, prefix: 0, stick: 0, debug: 0, role: 0, resetpass: 0
};
/** Команды только с одной целью. */
export const SINGLE_TARGET = new Set(['msg', 'pay', 'report', 'ban', 'role', 'resetpass']);
export const SELECTORS = ['@a', '@s', '@p', '@r'];

/** Похоже ли слово на селектор (в том числе неподдерживаемый: @e, *, @a[…]). */
export const isSelector = (arg) => typeof arg === 'string' && /^(?:@|\*$)/.test(arg);

/**
 * Цели селектора. players — все игроки в мире. Возвращает { targets } или { error, args } (ключ ошибки и его параметры).
 * rand — для @r (в тестах детерминированный).
 */
export function selectTargets(player, selector, command, players, rand = Math.random) {
	const sel = selector.toLowerCase();
	if (!SELECTORS.includes(sel)) return { error: 'chat.cmd.error.selector', args: [selector] };
	if (sel === '@a' && SINGLE_TARGET.has(command)) return { error: 'chat.cmd.error.selector_single', args: [`!${command}`] };
	if (sel === '@s') return { targets: [player] };
	const others = players.filter(p => p.name !== player.name && !p.hasTag('role:bot'));
	let targets = others;
	if (sel === '@p') {
		const here = others.filter(p => p.dimension?.id === player.dimension?.id);
		const dist = (p) => (p.location.x - player.location.x) ** 2 + (p.location.y - player.location.y) ** 2 + (p.location.z - player.location.z) ** 2;
		targets = here.length ? [here.reduce((a, b) => (dist(b) < dist(a) ? b : a))] : [];
	} else if (sel === '@r') {
		targets = others.length ? [others[Math.min(others.length - 1, Math.floor(rand() * others.length))]] : [];
	}
	if (!targets.length) return { error: 'chat.cmd.error.selector_empty', args: [selector] };
	return { targets };
}
