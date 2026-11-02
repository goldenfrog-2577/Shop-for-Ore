// --- Тюрьма (!jail / !unjail): игрок не может выйти из камеры у спавна до конца срока ---
// Камера построена в мире: стены из каменного кирпича x −20…−16, z −4…0, внутри 3×3 (x −19…−17, z −3…−1, y 1–3),
// спереди решётка. Срок — тег state:jail:<окончание в мс> или state:jail:permanent (до !unjail); переживает
// перезаход. Раз в 5 тиков вышедшего из камеры (телепорт, гибель, перезаход в другом месте) возвращает обратно;
// раз в секунду проверяет срок — истёк: на спавн и сообщение. В тюрьме недоступны меню, !warp и мини-игры
// (как при заморозке). Кто посадил — тег state:jail_by:<роль>: выпустить раньше может только роль не ниже.

import { world } from '@minecraft/server';
import { run, tell, clearIssuer } from '../DataBase.js';

export const JAIL_TAG = 'state:jail:';
// Внутренность камеры (блоки x −19…−17, z −3…−1, y 1…3) — проверка по координатам игрока
export const CELL = { x1: -19, x2: -16, y1: 0, y2: 4, z1: -3, z2: 0 };
export const CELL_POINT = [-17.5, 1, -1.5];
export const RELEASE_POINT = [0, 5, 0];

const jailTag = (player) => player.getTags().find(t => t.startsWith(JAIL_TAG));

/** Игрок в тюрьме. */
export const isJailed = (player) => !!jailTag(player);

/** Сколько минут осталось: Infinity — навсегда, 0 — не в тюрьме или срок вышел. */
export function jailMinutesLeft(player, now = Date.now()) {
	const tag = jailTag(player);
	if (!tag) return 0;
	const end = tag.slice(JAIL_TAG.length);
	if (end === 'permanent') return Infinity;
	const left = Number(end) - now;
	return left > 0 ? Math.ceil(left / 60000) : 0;
}

/** Внутри камеры. */
export function inCell({ x, y, z }) {
	return x >= CELL.x1 && x < CELL.x2 && y >= CELL.y1 && y < CELL.y2 && z >= CELL.z1 && z < CELL.z2;
}

/** Посадить: minutes — число или Infinity (навсегда). */
export function jail(player, minutes, now = Date.now()) {
	for (const t of player.getTags()) if (t.startsWith(JAIL_TAG)) player.removeTag(t);
	player.addTag(JAIL_TAG + (minutes === Infinity ? 'permanent' : now + minutes * 60000));
	run(player, `tp @s ${CELL_POINT.join(' ')}`);
}

/** Выпустить: на спавн; message — ключ сообщения игроку. */
export function release(player, message = 'chat.jail.released') {
	for (const t of player.getTags()) if (t.startsWith(JAIL_TAG)) player.removeTag(t);
	clearIssuer(player, 'jail');
	run(player, `tp @s ${RELEASE_POINT.join(' ')}`);
	tell(player, message);
}

/** Сообщение «ты в тюрьме» с оставшимся сроком. */
export function tellJailed(player) {
	const left = jailMinutesLeft(player);
	if (left === Infinity) tell(player, 'chat.jail.active.permanent');
	else tell(player, 'chat.jail.active', String(left));
}

let tick = 0;
world.events.tick.subscribe(() => {
	tick++;
	if (tick % 5 !== 0) return;
	for (const player of world.getPlayers()) {
		if (!isJailed(player)) continue;
		if (tick % 20 === 0 && jailMinutesLeft(player) === 0) { release(player); continue; }
		if (!inCell(player.location)) run(player, `tp @s ${CELL_POINT.join(' ')}`);
	}
});
