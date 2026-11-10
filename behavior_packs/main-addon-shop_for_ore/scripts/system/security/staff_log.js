// --- Журнал персонала: кто, кого и чем наказал — в журнал содержимого Minecraft ---
// Решение владельца: вместо !logs и хранилища в игре — строка в журнале содержимого (console.warn; console.log туда
// не попадает — проверено в 1.19.51). На сервере должны быть включены «Включить интерфейс журнала содержимого» и
// «Включить файл журнала содержимого» (уровень — не выше «Предупреждение»). Файлы — LocalState\logs\ContentLog__*.txt
// на ПК хоста, по одному на запуск. Пишут все команды персонала и функции, которые меню администратора вызывает
// напрямую (сброс пароля, вайп, сброс офлайн). Время — по Москве.
// Строка: «[Журнал персонала] 09.11 19:24 Moder » !mute Bob 30m спам».

export const PREFIX = '[Журнал персонала]';
const MAX_DETAILS = 80;   // причина длиннее — обрезается

/** Время по Москве: «09.11 19:24». */
export function logTime(ms) {
	const d = new Date(ms + 3 * 60 * 60 * 1000);
	const p = (n) => String(n).padStart(2, '0');
	return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const clean = (s) => String(s ?? '').replace(/§./g, '').replace(/[\r\n]+/g, ' ').trim();

/** Строка журнала. */
export function formatEntry(time, by, command, target, details) {
	let rest = clean(Array.isArray(details) ? details.join(' ') : details);
	if (rest.length > MAX_DETAILS) rest = rest.slice(0, MAX_DETAILS - 1) + '…';
	return `${PREFIX} ${logTime(time)} ${clean(by)} » !${clean(command)}${target ? ' ' + clean(target) : ''}${rest ? ' ' + rest : ''}`;
}

/**
 * Записать действие персонала.
 * @param {Player|string} by — кто (игрок или ник)
 * @param {string} command — команда без «!» (mute, ban, wipe…)
 * @param {string} [target] — ник цели
 * @param {string|string[]} [details] — срок, причина и прочее, как набрано
 */
export function logAction(by, command, target = '', details = '') {
	try { console.warn(formatEntry(Date.now(), typeof by === 'string' ? by : by?.name, command, target, details)); } catch {}
}
