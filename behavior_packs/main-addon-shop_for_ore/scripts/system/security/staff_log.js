// --- Журнал персонала: кто, кого и чем наказал (смотрит владелец: !logs в chat/commands/commands.js) ---
// Хранится в тегах служебной сущности server:floating_text с тегом sys:staff_log в постоянно загруженной зоне fallback
// (0 −60 0, functions/fallback/check). Не свойства мира — там почти нет места (tools/tests/dynamic_property_budget.mjs);
// не табло — !wipe и !resetoffline сбрасывают табло целиком. /kill карты бьют только по предметам, опыту и NPC
// запасного меню. Сущность убили вручную — при следующей записи появится новая с отметкой «журнал начат» (#start).
// Запись: тег log:<номер>|<время, мс, 36-ричное>|<кто>|<команда>|<цель>|<прочие аргументы>; хранится LIMIT последних.
// Записи, которые не удалось сохранить (зона ещё не загрузилась), ждут в очереди и пишутся раз в секунду.

import { world, system, Location } from '@minecraft/server';

export const LOG_TAG = 'sys:staff_log';
export const ENTRY = 'log:';
export const LIMIT = 200;
export const HOME = [15.5, -60, 15.5];       // угол чанка 0,0 — внутри ticking area fallback
const TYPE = 'server:floating_text';
const MAX_DETAILS = 80;                       // причина длиннее — обрезается

const clean = (s) => String(s ?? '').replace(/\|/g, '/').replace(/[\r\n]+/g, ' ').trim();

/** Строка тега для записи. */
export function encode(seq, time, by, command, target, details) {
	let rest = clean(details);
	if (rest.length > MAX_DETAILS) rest = rest.slice(0, MAX_DETAILS - 1) + '…';
	return `${ENTRY}${seq}|${time.toString(36)}|${clean(by)}|${clean(command)}|${clean(target)}|${rest}`;
}

/** Запись из тега или null. */
export function decode(tag) {
	if (!tag.startsWith(ENTRY)) return null;
	const [seq, time, by, command, target, ...rest] = tag.slice(ENTRY.length).split('|');
	if (!/^\d+$/.test(seq) || time === undefined) return null;
	return { seq: Number(seq), time: parseInt(time, 36), by, command, target, details: rest.join('|') };
}

function holders() {
	try { return [...world.getDimension('overworld').getEntities({ type: TYPE, tags: [LOG_TAG] })]; } catch { return []; }
}

/** Все записи, новые первыми (из всех сущностей журнала — на случай второй, созданной до загрузки первой). */
export function readLog() {
	const out = [];
	for (const e of holders()) for (const t of e.getTags()) { const r = decode(t); if (r) out.push(r); }
	return out.sort((a, b) => b.seq - a.seq);
}

const queue = [];

function flush() {
	if (!queue.length) return;
	let list = holders();
	if (!list.length) {
		try {
			const e = world.getDimension('overworld').spawnEntity(TYPE, new Location(...HOME));
			e.addTag(LOG_TAG);
			list = [e];
			queue.unshift({ by: '', command: '#start', target: '', details: '', time: queue[0].time });
		} catch { return; }   // зона не загружена — попробуем через секунду
	}
	const all = [];
	for (const e of list) for (const t of e.getTags()) { const r = decode(t); if (r) all.push([e, t, r.seq]); }
	let seq = all.reduce((m, x) => Math.max(m, x[2]), 0);
	const holder = list[0];
	while (queue.length) {
		const r = queue.shift();
		const tag = encode(++seq, r.time, r.by, r.command, r.target, r.details);
		holder.addTag(tag);
		all.push([holder, tag, seq]);
	}
	// Старше LIMIT последних — удалить
	all.sort((a, b) => b[2] - a[2]);
	for (const [e, t] of all.slice(LIMIT)) e.removeTag(t);
}

/**
 * Записать действие персонала.
 * @param {Player|string} by — кто (игрок или ник)
 * @param {string} command — команда без «!» (mute, ban, wipe…)
 * @param {string} [target] — ник цели
 * @param {string|string[]} [details] — срок, причина и прочее, как набрано
 */
export function logAction(by, command, target = '', details = '') {
	queue.push({ by: typeof by === 'string' ? by : by?.name, command, target, details: Array.isArray(details) ? details.join(' ') : details, time: Date.now() });
	flush();
}

system.runSchedule(flush, 20);
