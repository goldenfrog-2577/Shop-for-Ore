// --- Бан: !ban / !unban / !banlist ---
// Банить по устройству Script API 1.19.50 не умеет: идентификатора устройства, XUID или IP скриптам не дают.
// Бан записывает ник и player.id (номер игрока в мире). Проверено в игре: на пиратском клиенте номер меняется
// вместе с ником, так что фактически это бан по нику — сменой ника он обходится. Номер оставлен: он не мешает,
// а если номер где-то окажется постоянным — бан заодно сработает и по нему.
// Список хранится в свойствах мира shop:bans0…3 (JSON по частям: одно свойство — до 1000 символов).
// Срок: until — время окончания в мс (0 — навсегда); истёкший бан не действует и убирается из списка при проверке.

import { world } from '@minecraft/server';
import { DynamicPropertiesDefinition } from '@minecraft/server';
import { run } from '../DataBase.js';

const PARTS = 4;
const PART_LEN = 1000;
const KEY = (i) => `shop:bans${i}`;
const REASON_MAX = 40;
const NAMES_MAX = 5;   // сколько ников помнить в одном бане (последние)

world.events.worldInitialize.subscribe((e) => {
	const def = new DynamicPropertiesDefinition();
	for (let i = 0; i < PARTS; i++) def.defineString(KEY(i), PART_LEN);
	e.propertyRegistry.registerWorldDynamicProperties(def);
});

/** Список банов: [{ id, names: [ники], by, reason, t, until }] (until 0 / нет — навсегда) */
export function getBans() {
	let json = '';
	try {
		for (let i = 0; i < PARTS; i++) json += world.getDynamicProperty(KEY(i)) ?? '';
		return json ? JSON.parse(json) : [];
	} catch {
		return [];
	}
}

/** Сохранить список. @returns {boolean} false — не помещается */
function saveBans(bans) {
	const json = JSON.stringify(bans);
	if (json.length > PARTS * PART_LEN) return false;
	for (let i = 0; i < PARTS; i++) world.setDynamicProperty(KEY(i), json.slice(i * PART_LEN, (i + 1) * PART_LEN));
	return true;
}

/** Бан игрока, который сейчас в сети (номер + ник) или не в сети (только ник). @returns {boolean} */
export function addBan({ id, name }, by, reason, minutes = Infinity, now = Date.now()) {
	const lower = name.toLowerCase();
	const bans = getBans().filter(b => !(id && b.id === id) && !b.names.some(n => n.toLowerCase() === lower));
	bans.push({ id: id ?? '', names: [name], by, reason: String(reason ?? '').slice(0, REASON_MAX), t: now, until: minutes === Infinity ? 0 : now + minutes * 60000 });
	return saveBans(bans);
}

/** Разбан по нику или номеру в списке (1…). @returns {object|undefined} снятый бан */
export function removeBan(nameOrIndex) {
	const bans = getBans();
	let i = /^\d+$/.test(nameOrIndex) ? Number(nameOrIndex) - 1 : -1;
	if (i < 0 || i >= bans.length) i = bans.findIndex(b => b.names.some(n => n.toLowerCase() === nameOrIndex.toLowerCase()));
	if (i < 0) return undefined;
	const [removed] = bans.splice(i, 1);
	saveBans(bans);
	return removed;
}

/** Бан ещё действует: навсегда или срок не вышел. */
export const banActive = (b, now = Date.now()) => !b.until || b.until > now;
/** Сколько минут бана осталось: Infinity — навсегда. */
export const banMinutesLeft = (b, now = Date.now()) => b.until ? Math.max(0, Math.ceil((b.until - now) / 60000)) : Infinity;

/** Бан, под который попадает игрок (по номеру или нику), или undefined. Владельца не банят. Истёкшие — убираются. */
export function findBan(player) {
	if (player.hasTag('role:owner')) return undefined;
	const name = player.name.toLowerCase();
	const bans = getBans();
	const alive = bans.filter(b => banActive(b));
	if (alive.length !== bans.length) saveBans(alive);
	return alive.find(b => (b.id && b.id === player.id) || b.names.some(n => n.toLowerCase() === name));
}

/** Выгнать забаненного. Причина бана — в тексте кика (его показывает сама игра, без перевода). */
export function kickBanned(player, ban) {
	// Зашёл под новым ником — запоминаем ник в том же бане; бан по нику — запоминаем номер игрока
	const bans = getBans();
	const entry = bans.find(b => b.t === ban.t);
	if (entry) {
		if (!entry.names.some(n => n.toLowerCase() === player.name.toLowerCase())) entry.names = [...entry.names, player.name].slice(-NAMES_MAX);
		if (!entry.id) entry.id = player.id;
		saveBans(bans);
	}
	// Срок — в тексте кика (игра показывает его без перевода): «Ban 90 min: причина»
	const left = banMinutesLeft(ban);
	run(world.getDimension('overworld'), `kick "${player.name}" Ban${left === Infinity ? '' : ` ${left} min`}${ban.reason ? ': ' + ban.reason : ''}`);
}

// Проверка при входе: игрок появляется в списке не сразу, поэтому — со следующих тиков, плюс раз в 5 секунд всех
const justJoined = new Set();
world.events.playerJoin.subscribe((e) => justJoined.add(e.player.name));
let tick = 0;
world.events.tick.subscribe(() => {
	tick++;
	if (!justJoined.size && tick % 100 !== 0) return;
	for (const p of world.getPlayers()) {
		if (!justJoined.has(p.name) && tick % 100 !== 0) continue;
		justJoined.delete(p.name);
		const ban = findBan(p);
		if (ban) kickBanned(p, ban);
	}
});
