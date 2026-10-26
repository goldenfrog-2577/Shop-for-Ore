// --- Достижения и испытания (как в Java Edition: зелёные — обычные, фиолетовые — испытания) ---
// Идея — по мотивам карты FearCube (с разрешения автора), код свой.
// Получено — тег ach:<id>. Счётчики для условий — табло stat_mined (сломано блоков),
// stat_kills (победы над игроками), stat_deaths (смерти на PvP-арене или от игрока — для !top kd),
// stat_playtime (минут в игре), stat_wins (победы во всех мини-играх; по играм — stat_win_<id>, minigames.js);
// перевод денег отмечает тег stat:paid (DataBase.transferMoney).
// Проверка раз в секунду; за раз игроку выдаётся не больше одного достижения, следующее — когда
// погаснет плашка (иначе старый игрок при первом входе получил бы десяток сразу).

import { world, system } from '@minecraft/server';
import { getScore, run, isPending, rawTranslateRich } from '../DataBase.js';
import { TRAILS } from '../menu/cosmetics_shop.js';
import { showToast, TOAST_TICKS } from './toast.js';

export const ACH_TAG = 'ach:';
export const STATS = ['stat_mined', 'stat_kills', 'stat_deaths', 'stat_playtime', 'stat_wins', 'stat_win_pvp_ffa', 'stat_win_spleef'];

// Глифы шрифта: кубок — достижение, звезда — испытание; монета, VIP-коин, опыт — награды
export const GLYPH = { task: '', challenge: '' };
const COIN = '', VIP_COIN = '', XP = '';

const score = (objective, goal) => ({ progress: (p) => getScore(p, objective), goal });

/**
 * Каталог. type: task (зелёное) | challenge (фиолетовое).
 * Условие: progress(p) и goal — счётчик (в меню видно «сколько из скольких»), либо done(p).
 * reward: money, vip_coins, xp, items: [[id, количество], …]
 */
export const ACHIEVEMENTS = [
	// --- Обычные ---
	{ id: 'welcome', type: 'task', done: (p) => p.hasTag('auth:done'), reward: { money: 100 } },
	{ id: 'lvl_5', type: 'task', ...score('lvl', 5), reward: { money: 1000 } },
	{ id: 'lvl_10', type: 'task', ...score('lvl', 10), reward: { money: 5000, xp: 100 } },
	{ id: 'lvl_15', type: 'task', ...score('lvl', 15), reward: { money: 15000, xp: 250 } },
	{ id: 'lvl_20', type: 'task', ...score('lvl', 20), reward: { money: 40000, vip_coins: 10 } },
	{ id: 'vip', type: 'task', ...score('lvl', 26), reward: { vip_coins: 50 } },
	{ id: 'rebirth_1', type: 'task', ...score('rebirth', 1), reward: { vip_coins: 25 } },
	{ id: 'mined_1k', type: 'task', ...score('stat_mined', 1000), reward: { money: 2000 } },
	{ id: 'mined_10k', type: 'task', ...score('stat_mined', 10000), reward: { money: 10000, xp: 500 } },
	{ id: 'rich_100k', type: 'task', ...score('money', 100000), reward: { vip_coins: 10 } },
	{ id: 'enchant', type: 'task', done: (p) => getScore(p, 'efficiency') > 0 || getScore(p, 'fortune') > 0, reward: { money: 3000 } },
	{ id: 'cosmetic', type: 'task', done: (p) => p.getTags().some(t => t.startsWith('cosmetic:')), reward: { vip_coins: 10 } },
	{ id: 'pay', type: 'task', done: (p) => p.hasTag('stat:paid'), reward: { money: 500 } },
	{ id: 'pvp_kill', type: 'task', ...score('stat_kills', 1), reward: { items: [['golden_apple', 4]] } },
	{ id: 'game_win', type: 'task', ...score('stat_wins', 1), reward: { money: 5000, vip_coins: 5 } },
	{ id: 'playtime_1h', type: 'task', ...score('stat_playtime', 60), reward: { money: 3000 } },
	// --- Испытания ---
	{ id: 'rebirth_5', type: 'challenge', ...score('rebirth', 5), reward: { vip_coins: 200 } },
	{ id: 'rich_1m', type: 'challenge', ...score('money', 1000000), reward: { vip_coins: 100 } },
	{ id: 'vip_coins_1k', type: 'challenge', ...score('vip_coins', 1000), reward: { money: 250000 } },
	{ id: 'mined_100k', type: 'challenge', ...score('stat_mined', 100000), reward: { vip_coins: 100, items: [['netherite_ingot', 4]] } },
	{ id: 'pvp_kills_25', type: 'challenge', ...score('stat_kills', 25), reward: { vip_coins: 50, items: [['enchanted_golden_apple', 1]] } },
	{ id: 'game_wins_10', type: 'challenge', ...score('stat_wins', 10), reward: { vip_coins: 75 } },
	{ id: 'all_trails', type: 'challenge', progress: (p) => TRAILS.filter(t => p.hasTag(`cosmetic:trail:${t.id}`)).length, goal: TRAILS.length, reward: { vip_coins: 150 } },
	{ id: 'playtime_24h', type: 'challenge', ...score('stat_playtime', 1440), reward: { vip_coins: 100, items: [['totem_of_undying', 1]] } }
];
const BY_ID = new Map(ACHIEVEMENTS.map(a => [a.id, a]));

export const has = (player, id) => player.hasTag(ACH_TAG + id);
export const findAchievement = (id) => BY_ID.get(String(id ?? '').toLowerCase());
const isDone = (player, a) => a.done ? a.done(player) : a.progress(player) >= a.goal;

/** Прогресс для меню: [сейчас, цель] или undefined (условие без счётчика). */
export function progressOf(player, a) {
	if (!a.progress) return undefined;
	return [Math.min(a.progress(player), a.goal), a.goal];
}

/** Награда как части rawtext: «+500 , +10 , 4× Золотое яблоко». */
export function rewardText(reward) {
	const parts = [];
	const add = (...p) => { if (parts.length) parts.push({ text: '§7, ' }); parts.push(...p); };
	if (reward.money) add({ text: `§e+${reward.money} §f${COIN}` });
	if (reward.vip_coins) add({ text: `§e+${reward.vip_coins} §f${VIP_COIN}` });
	if (reward.xp) add({ text: `§e+${reward.xp} §f${XP}` });
	for (const [id, n] of reward.items ?? []) add({ text: `§e${n}× §f` }, { translate: `ach.item.${id}` });
	return parts;
}

function giveReward(player, reward) {
	if (reward.money) run(player, `scoreboard players add @s money ${reward.money}`);
	if (reward.vip_coins) run(player, `scoreboard players add @s vip_coins ${reward.vip_coins}`);
	if (reward.xp) run(player, `scoreboard players add @s xp ${reward.xp}`);
	for (const [id, n] of reward.items ?? []) run(player, `give @s ${id} ${n}`);
}

// Ник → тик, после которого можно показать следующую плашку
const nextToast = new Map();
let tick = 0;

/**
 * Выдать достижение: тег, награда, плашка, звук и сообщение всем (как в Java).
 * @param {boolean} [notify=true] — false: без плашки и сообщений (выдача администратором тихо не нужна — оставлено для тестов)
 * @returns {boolean} выдано сейчас (false — уже было или такого нет)
 */
export function unlock(player, id, notify = true) {
	const a = findAchievement(id);
	if (!a || has(player, a.id)) return false;
	player.addTag(ACH_TAG + a.id);
	giveReward(player, a.reward);
	nextToast.set(player.name, tick + TOAST_TICKS);
	if (!notify) return true;
	const color = a.type === 'challenge' ? '§d' : '§a';
	showToast(player, [
		{ text: `${color}${GLYPH[a.type]} ` }, { translate: `ach.toast.${a.type}` }, { text: '\n§f' },
		{ translate: `ach.${a.id}.name` }, { text: '\n' }, ...rewardText(a.reward)
	]);
	if (a.type === 'challenge') run(player, 'playsound minecraft.challenge.complete @s');
	else run(player, 'playsound random.levelup @s ~ ~ ~ 0.7 1.4');
	// «kapy получил достижение [Шахтёр]» — всем в чате
	run(player, `tellraw @a ${rawTranslateRich(`chat.ach.${a.type}`, player.name, { rawtext: [{ text: `${color}[` }, { translate: `ach.${a.id}.name` }, { text: ']' }] })}`);
	return true;
}

/** Снять достижение (только тег; награда не забирается). */
export function revoke(player, id) {
	const a = findAchievement(id);
	if (!a || !has(player, a.id)) return false;
	player.removeTag(ACH_TAG + a.id);
	return true;
}

export const countOf = (player) => ACHIEVEMENTS.filter(a => has(player, a.id)).length;

// --- Проверка условий: раз в секунду, одно новое достижение за раз ---
const CHECK_TICKS = 20;
world.events.tick.subscribe(() => {
	if (++tick % CHECK_TICKS !== 0) return;
	for (const player of world.getPlayers()) {
		if (isPending(player) || player.hasTag('role:bot')) continue;
		if ((nextToast.get(player.name) ?? 0) > tick) continue;
		const a = ACHIEVEMENTS.find(x => !has(player, x.id) && isDone(player, x));
		if (a) unlock(player, a.id);
	}
});

// --- Счётчики ---
// Сломанные блоки копятся в памяти и раз в секунду уходят в табло одной командой на игрока
const mined = new Map();
world.events.blockBreak.subscribe((e) => {
	const p = e.player;
	if (!p || isPending(p)) return;
	mined.set(p.name, (mined.get(p.name) ?? 0) + 1);
});
system.runSchedule(() => {
	if (!mined.size) return;
	for (const player of world.getPlayers()) {
		const n = mined.get(player.name);
		if (n) run(player, `scoreboard players add @s stat_mined ${n}`);
	}
	mined.clear();
}, 20);

// Время в игре — минуты, только вошедшим в аккаунт
system.runSchedule(() => {
	for (const player of world.getPlayers()) {
		if (!isPending(player) && !player.hasTag('role:bot')) run(player, 'scoreboard players add @s stat_playtime 1');
	}
}, 1200);

// Смерть (удар добил: здоровье ≤ 0). Одна смерть — один раз.
// Убил другой игрок — ему +1 к stat_kills. Смерть для K/D (stat_deaths) — от игрока или любая на PvP-арене
const lastDeath = new Map();
world.events.entityHurt.subscribe((e) => {
	const victim = e.hurtEntity, killer = e.damagingEntity;
	if (victim?.typeId !== 'minecraft:player' || victim.hasTag('role:bot')) return;
	const byPlayer = killer?.typeId === 'minecraft:player' && killer !== victim;
	if (!byPlayer && !victim.hasTag('player:pvp')) return;
	let hp;
	try { hp = victim.getComponent('health').current; } catch { return; }
	if (hp > 0) return;
	if ((lastDeath.get(victim.name) ?? -100) > tick - 40) return;
	lastDeath.set(victim.name, tick);
	run(victim, 'scoreboard players add @s stat_deaths 1');
	if (byPlayer) run(killer, 'scoreboard players add @s stat_kills 1');
});
