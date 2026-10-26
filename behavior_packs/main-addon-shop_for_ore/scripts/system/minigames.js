// --- Основа для мини-игр: очередь, отсчёт, игра, победитель, награда ---
// Мини-игра описывается объектом и регистрируется registerGame() (пример — PvP «Последний выживший»
// в конце файла). Игрок в игре — тег game:<id>. Фазы: waiting (ждём игроков) → countdown → running.
// Выбывает тот, кто умер, вышел с сервера, ушёл командой или (по правилу игры) покинул площадку.
// Остался один — он победил: награда, +1 к табло stat_wins (достижения), сообщение всем.
// Игра может держать выбывших зрителями (def.spectate — куда их отправить, тег game:watch) и запрещать
// телепорт участникам и зрителям, пока идёт игра (def.lockTeleport; владельцу можно) — так устроен сплиф.
// Идея — по мотивам карты FearCube (с разрешения автора), код свой.

import { world, system } from '@minecraft/server';
import { run, rawTranslateRich, isPending, findPlayer, tell } from '../DataBase.js';
import { teleportToArena, combatSecondsLeft } from './pvp.js';
import { showTitle } from './toast.js';

export const GAME_TAG = 'game:';
// Куда возвращать после игры — точка «Мини-игры» (!warp minigames)
export const LOBBY = [-109, 5, -60];
const COIN = '', VIP_COIN = '';

const games = new Map();          // id → { def, phase, players:Set<ник>, alive:Set<ник>, watchers:Set<ник>, count, seconds, startedWith }
export const WATCH_TAG = 'game:watch';

/**
 * Зарегистрировать мини-игру.
 * @param {object} def
 * @param {string} def.id — латиницей; название — ключ minigame.<id>.name
 * @param {number} def.minPlayers / def.maxPlayers
 * @param {number} [def.countdown=10] — секунд до начала
 * @param {number} [def.maxSeconds=600] — дольше — ничья
 * @param {(p: Player, index: number, total: number) => void} def.start — перенести игрока на площадку (index — его номер, для точек старта)
 * @param {(p: Player, seconds: number) => boolean} [def.isOut] — выбыл ли (seconds — сколько идёт игра)
 * @param {{money?: number, vip_coins?: number}} def.reward — победителю
 * @param {(g: object) => void} [def.onStart] — перед переносом игроков (подготовить площадку)
 * @param {(g: object) => void} [def.onEnd] — после игры (вернуть площадку как было)
 * @param {(p: Player) => void} [def.cleanup] — забрать у игрока выданное игрой (выбыл, вышел, игра кончилась)
 * @param {number[]} [def.spectate] — x y z: выбывшие смотрят игру отсюда до её конца, потом — в лобби
 * @param {boolean} [def.lockTeleport] — пока идёт игра, участникам и зрителям нельзя телепортироваться
 */
export function registerGame(def) {
	games.set(def.id, { def: { countdown: 10, maxSeconds: 600, ...def }, phase: 'waiting', players: new Set(), alive: new Set(), watchers: new Set(), count: 0, seconds: 0, startedWith: 0 });
}

export const listGames = () => [...games.values()];
export const getGame = (id) => games.get(String(id ?? '').toLowerCase());
/** Игра, в которой сейчас игрок, или undefined. */
export const gameOf = (player) => listGames().find(g => g.players.has(player.name));
/** Игра, которую игрок сейчас смотрит как выбывший, или undefined. */
export const watchingOf = (player) => listGames().find(g => g.watchers.has(player.name));

/**
 * Телепорт запрещён: игрок участвует или смотрит игру с def.lockTeleport, и она идёт. Владельцу можно.
 * @returns {object|undefined} игра, из-за которой нельзя
 */
export function teleportLock(player) {
	if (player.hasTag('role:owner')) return undefined;
	return listGames().find(g => g.def.lockTeleport && g.phase === 'running' && (g.alive.has(player.name) || g.watchers.has(player.name)));
}
/** Проверить телепорт и, если нельзя, написать игроку (who — кому писать, если двигают другого). @returns {boolean} можно */
export function canTeleport(target, who = target) {
	const g = teleportLock(target);
	if (!g) return true;
	if (who === target) tell(who, 'chat.game.error.teleport', gameName(g));
	else tell(who, 'chat.game.error.teleport_other', target.name, gameName(g));
	return false;
}

const tellGame = (g, key, ...args) => {
	for (const name of g.players) {
		const p = findPlayer(name);
		if (p) tell(p, key, ...args);
	}
};
const gameName = (g) => ({ translate: `minigame.${g.def.id}.name` });

/** Записаться в игру. @returns {boolean} */
export function joinGame(player, id) {
	const g = getGame(id);
	const fail = (key, ...a) => { tell(player, key, ...a); return false; };
	if (!g) return fail('chat.game.error.unknown', String(id ?? ''));
	if (isPending(player) || player.hasTag('role:bot')) return false;
	if (gameOf(player)) return fail('chat.game.error.already', gameName(gameOf(player)));
	// Зритель игры с запретом телепорта не может уйти в другую игру, пока та идёт
	if (teleportLock(player)) return fail('chat.game.error.teleport', gameName(teleportLock(player)));
	if (player.hasTag('state:frozen')) return fail('chat.cmd.freeze.active');
	if (combatSecondsLeft(player) > 0) return fail('chat.pvp.combat', combatSecondsLeft(player));
	if (g.phase === 'running') return fail('chat.game.error.running', gameName(g));
	if (g.players.size >= g.def.maxPlayers) return fail('chat.game.error.full', gameName(g));
	g.players.add(player.name);
	player.addTag(GAME_TAG + g.def.id);
	tellGame(g, 'chat.game.joined', player.name, gameName(g), String(g.players.size), String(g.def.maxPlayers));
	if (g.phase === 'waiting' && g.players.size >= g.def.minPlayers) startCountdown(g);
	else if (g.phase === 'waiting') tell(player, 'chat.game.waiting', String(g.def.minPlayers - g.players.size));
	return true;
}

/** Выйти из игры (сам или выбыл). reason: left | out | quit (вышел с сервера) */
export function leaveGame(player, reason = 'left') {
	const g = gameOf(player) ?? (reason === 'left' ? watchingOf(player) : undefined);
	if (!g) return false;
	// Игра с запретом телепорта: пока идёт, уйти нельзя ни участнику, ни зрителю (кроме владельца)
	if (reason === 'left' && teleportLock(player) === g) {
		tell(player, 'chat.game.error.teleport', gameName(g));
		return false;
	}
	if (g.watchers.has(player.name)) {
		stopWatching(g, player);
		run(player, `tp @s ${LOBBY.join(' ')}`);
		return true;
	}
	removePlayer(g, player.name, player, reason);
	return true;
}

function stopWatching(g, player) {
	g.watchers.delete(player.name);
	player.removeTag(WATCH_TAG);
}

/** Игрок выбыл из идущей игры: забрать выданное, у игры со зрителями — на место зрителя. */
function knockOut(g, player) {
	g.def.cleanup?.(player);
	if (!g.def.spectate) return;
	g.watchers.add(player.name);
	player.addTag(WATCH_TAG);
	// Последний выбывший (игра на этом кончается) сразу идёт в лобби вместе со всеми
	if (g.alive.size >= 2) {
		run(player, `tp @s ${g.def.spectate.join(' ')}`);
		tell(player, 'chat.game.spectate', gameName(g));
	}
}

function removePlayer(g, name, player, reason) {
	g.players.delete(name);
	const wasAlive = g.alive.delete(name);
	player?.removeTag(GAME_TAG + g.def.id);
	if (player && reason !== 'quit') {
		tell(player, `chat.game.${reason === 'out' ? 'out' : 'left'}`, gameName(g));
		if (g.phase === 'running' && wasAlive) {
			if (reason === 'out') knockOut(g, player);
			else { g.def.cleanup?.(player); run(player, `tp @s ${LOBBY.join(' ')}`); }
		}
	}
	if (g.phase === 'running' && wasAlive) tellGame(g, 'chat.game.out_other', name, String(g.alive.size));
	if (g.phase === 'countdown' && g.players.size < g.def.minPlayers) {
		g.phase = 'waiting';
		tellGame(g, 'chat.game.countdown_stopped', gameName(g));
	}
	if (g.phase === 'running') checkEnd(g);
}

function startCountdown(g) {
	g.phase = 'countdown';
	g.count = g.def.countdown;
	tellGame(g, 'chat.game.countdown', gameName(g), String(g.count));
}

/** Начать игру (администратор — даже если игроков меньше нужного). */
export function startGame(g) {
	if (g.phase === 'running' || !g.players.size) return false;
	g.phase = 'running';
	g.seconds = 0;
	g.alive = new Set(g.players);
	g.watchers.clear();
	g.startedWith = g.players.size;
	g.def.onStart?.(g);
	let index = 0;
	for (const name of g.players) {
		const p = findPlayer(name);
		if (!p) continue;
		g.def.start(p, index++, g.players.size);
		showTitle(p, [{ text: '§a' }, { translate: 'title.game.go' }]);
		run(p, 'playsound note.pling @s ~ ~ ~ 1 2');
	}
	tellGame(g, 'chat.game.started', gameName(g), String(g.alive.size));
	checkEnd(g);
	return true;
}

/** Закончить игру. winner — ник или undefined (ничья / остановил администратор). */
export function endGame(g, winner, reason = 'end') {
	const p = winner ? findPlayer(winner) : undefined;
	if (p && g.startedWith >= 2) {
		const r = g.def.reward ?? {};
		if (r.money) run(p, `scoreboard players add @s money ${r.money}`);
		if (r.vip_coins) run(p, `scoreboard players add @s vip_coins ${r.vip_coins}`);
		run(p, 'scoreboard players add @s stat_wins 1');
		// По играм — для !top pvp / spleef (табло stat_win_<id>, functions/system/setup)
		run(p, `scoreboard players add @s stat_win_${g.def.id} 1`);
		run(p, 'playsound random.levelup @s');
		const reward = [r.money ? `§e+${r.money} §f${COIN}` : '', r.vip_coins ? `§e+${r.vip_coins} §f${VIP_COIN}` : ''].filter(Boolean).join('§7, ');
		run(p, `tellraw @a ${rawTranslateRich('chat.game.winner', winner, gameName(g))}`);
		tell(p, 'chat.game.reward', reward || '—');
	} else {
		tellGame(g, reason === 'stop' ? 'chat.game.stopped' : 'chat.game.draw', gameName(g));
	}
	for (const name of g.players) {
		const q = findPlayer(name);
		if (!q) continue;
		q.removeTag(GAME_TAG + g.def.id);
		g.def.cleanup?.(q);
		run(q, `tp @s ${LOBBY.join(' ')}`);
	}
	// Зрители (выбывшие) — тоже в лобби
	for (const name of g.watchers) {
		const q = findPlayer(name);
		if (!q) continue;
		q.removeTag(WATCH_TAG);
		run(q, `tp @s ${LOBBY.join(' ')}`);
	}
	g.players.clear();
	g.alive.clear();
	g.watchers.clear();
	g.phase = 'waiting';
	g.def.onEnd?.(g);
}

function checkEnd(g) {
	if (g.phase !== 'running') return;
	if (g.alive.size === 1) return endGame(g, [...g.alive][0]);
	if (g.alive.size === 0) return endGame(g, undefined);
}

// --- Раз в секунду: отсчёт, выбывшие, время ---
system.runSchedule(() => {
	for (const g of games.values()) {
		// Вышедшие с сервера
		for (const name of [...g.players]) if (!findPlayer(name)) removePlayer(g, name, undefined, 'quit');
		for (const name of [...g.watchers]) if (!findPlayer(name)) g.watchers.delete(name);
		if (g.phase === 'countdown') {
			if (g.count <= 0) { startGame(g); continue; }
			for (const name of g.players) {
				const p = findPlayer(name);
				if (p) { showTitle(p, [{ text: `§e${g.count}` }]); run(p, 'playsound note.hat @s'); }
			}
			g.count--;
		} else if (g.phase === 'running') {
			g.seconds++;
			for (const name of [...g.alive]) {
				const p = findPlayer(name);
				if (p && g.def.isOut?.(p, g.seconds)) {
					g.alive.delete(name);
					g.players.delete(name);
					p.removeTag(GAME_TAG + g.def.id);
					tell(p, 'chat.game.out', gameName(g));
					knockOut(g, p);
					tellGame(g, 'chat.game.out_other', name, String(g.alive.size));
				}
			}
			if (g.seconds >= g.def.maxSeconds) endGame(g, undefined);
			else checkEnd(g);
		}
	}
}, 20);

// Смерть во время игры — выбыл
world.events.entityHurt.subscribe((e) => {
	const p = e.hurtEntity;
	if (p?.typeId !== 'minecraft:player') return;
	const g = gameOf(p);
	if (!g || g.phase !== 'running' || !g.alive.has(p.name)) return;
	let hp;
	try { hp = p.getComponent('health').current; } catch { return; }
	if (hp <= 0) removePlayer(g, p.name, p, 'out');
});

// Победы по играм появились, когда игра была одна (PvP): прежние stat_wins переносятся в stat_win_pvp_ffa
// один раз на игрока (тег sys:wins_split; ставится, только если команда прошла — табло уже создано)
const SPLIT_TAG = 'sys:wins_split';
system.runSchedule(() => {
	for (const p of world.getPlayers()) {
		if (p.hasTag(SPLIT_TAG) || isPending(p)) continue;
		run(p, 'scoreboard players operation @s stat_win_pvp_ffa = @s stat_wins').then(r => { if (r) try { p.addTag(SPLIT_TAG); } catch { /* вышел */ } });
	}
}, 100);

// После перезагрузки скриптов игры в памяти нет — снять старые теги game:*
const clearStale = (p) => p.getTags().filter(t => t.startsWith(GAME_TAG)).forEach(t => p.removeTag(t));
system.run(() => { for (const p of world.getPlayers()) clearStale(p); });
// При входе — сразу в обработчике: в 1.19.50 e.player доступен только в момент события, а в system.run
// падал («Native object bound to prototype does not exist»), и try молча глушил ошибку — тег не снимался.
// Теги при входе так же снимает register/system.js
world.events.playerJoin.subscribe((e) => clearStale(e.player));

// ===== Мини-игры =====

// PvP «Последний выживший»: все на арену, побеждает последний. Выбывает умерший или ушедший с арены
// (тег player:pvp ставит system/system по координатам; первые 5 секунд — на телепорт)
registerGame({
	id: 'pvp_ffa',
	minPlayers: 2,
	maxPlayers: 16,
	countdown: 10,
	maxSeconds: 600,
	start: (p) => teleportToArena(p),
	isOut: (p, seconds) => seconds > 5 && !p.hasTag('player:pvp'),
	reward: { money: 5000, vip_coins: 5 }
});
