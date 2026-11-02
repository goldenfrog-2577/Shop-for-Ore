// --- Поведение бота карты (system/spawnbot.js): режимы, автототем, возврат после перезахода, гид для новичков ---
// Режим один (меню администратора → Бот → Режим):
//   idle   — обычный: стоит, где поставили;
//   dummy  — груша для битья: заморожен (system/freeze.js), не умирает, ударившему — урон, DPS и число ударов
//            строкой над хотбаром (toast.js, showHudLine);
//   follow — ходит за игроком, отстал больше чем на FOLLOW_TP блоков или в другом измерении — телепорт;
//   stay   — держится точки, где включили режим (оттолкнули — возвращается);
//   mirror — повторяет за игроком: поворот головы, присед, прыжки и перемещение (на том же расстоянии);
//   spar   — спарринг на PvP-арене: бьёт ближайшего игрока на арене, сложность 1–4 (скорость ударов, дальность);
//   game   — играет в мини-игре (добор игроков): PvP — как спарринг, сплиф — копает снег под соперниками.
// Отдельно: присесть (sit), автототем (тотем во второй руке, если она пуста), возврат после перезахода.
// Состояние — в свойстве мира shop:bot_state (JSON), бот после перезахода в мир появляется на прежнем месте
// с прежним режимом и предметами из «Управления слотами».
// Победы и смерти бота в статистику и достижения не идут (achievements.js, minigames.js).

import { world, Location, BlockLocation, DynamicPropertiesDefinition } from '@minecraft/server';
import { run, findPlayer, getScore, isPending } from '../DataBase.js';
import { getBot, spawnBot, removeBot, onBotSpawned, onBotRemoved } from './spawnbot.js';
import { freezePlayer, unfreezePlayer } from './freeze.js';
import { showHudLine } from './toast.js';
import { teleportToArena } from './pvp.js';
import { getGame, gameOf, joinGame, leaveGame } from './minigames.js';

export const MODES = ['idle', 'dummy', 'follow', 'stay', 'mirror', 'spar', 'game'];
export const SPAR_LEVELS = [1, 2, 3, 4];
// Сложность спарринга: тиков между ударами, дальность удара, скорость бега
const SPAR = {
	1: { cooldown: 12, reach: 2.6, speed: 0.8 },
	2: { cooldown: 8, reach: 3.0, speed: 1 },
	3: { cooldown: 5, reach: 3.2, speed: 1 },
	4: { cooldown: 3, reach: 3.6, speed: 1.2 }
};
const STATE_PROP = 'shop:bot_state';
const SEEK_RADIUS = 24;         // спарринг: дальше этого противника не ищет
const FOLLOW_NEAR = 2.5, FOLLOW_FAR = 3.5, FOLLOW_TP = 24;
const DPS_WINDOW_MS = 5000;     // груша: DPS за последние 5 секунд
const RESPAWN_TICKS = 60;       // погиб (груша не погибает) — через 3 с снова в мире на прежнем месте
const LOAD_DELAY_TICKS = 100;   // после загрузки мира — подождать, пока зайдёт игрок
const GUIDE_STEP_TICKS = 70;    // гид: пауза между репликами
const GUIDE_LINES = 4;
export const GUIDED_TAG = 'sys:guided';

const DEFAULT_STATE = { mode: 'idle', target: undefined, stay: undefined, offset: undefined, level: 2, game: undefined,
	sit: false, totem: true, returnOnLoad: true, present: false, pos: undefined, items: {} };
let state = { ...DEFAULT_STATE, items: {} };
let loaded = false;

world.events.worldInitialize.subscribe((e) => {
	const def = new DynamicPropertiesDefinition();
	def.defineString(STATE_PROP, 2000);
	e.propertyRegistry.registerWorldDynamicProperties(def);
});

function loadState() {
	loaded = true;
	try {
		const raw = world.getDynamicProperty(STATE_PROP);
		if (raw) state = { ...DEFAULT_STATE, ...JSON.parse(String(raw)) };
	} catch { /* свойства нет или испорчено — по умолчанию */ }
	state.items = state.items ?? {};
}
function saveState() {
	try { world.setDynamicProperty(STATE_PROP, JSON.stringify(state)); } catch { /* не зарегистрировано */ }
}

/** Текущие настройки бота (для меню). */
export const botState = () => ({ ...state });

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const loc = (p) => new Location(p.x, p.y, p.z);
const safe = (fn) => { try { return fn(); } catch { return undefined; } };

// ===== Режимы =====

/** Выйти из прежнего режима: разморозить, остановить, выйти из мини-игры. */
function leaveMode(bot) {
	if (state.mode === 'dummy') unfreezePlayer(bot);
	if (state.mode === 'game' && gameOf(bot)) leaveGame(bot);
	safe(() => bot.stopMoving());
	safe(() => bot.stopBreakingBlock());
}

/**
 * Включить режим. opts: target — ник (follow, mirror), level — 1–4 (spar), game — id мини-игры (game).
 * @returns {string|undefined} ключ ошибки или undefined — включено
 */
export function setBotMode(mode, opts = {}) {
	const bot = getBot();
	if (!bot) return 'chat.admin.bot.error.absent';
	if (!MODES.includes(mode)) return 'chat.cmd.error.not_found';
	if (mode === 'game') {
		const g = getGame(opts.game);
		if (!g || g.phase === 'running' || g.players.size >= g.def.maxPlayers) return 'chat.admin.bot.error.game';
	}
	leaveMode(bot);
	state.mode = mode;
	state.target = opts.target;
	state.level = SPAR[opts.level] ? opts.level : state.level;
	state.game = undefined;
	if (mode === 'dummy') {
		freezePlayer(bot);
		safe(() => bot.getComponent('health').resetToMaxValue());
	}
	if (mode === 'stay') state.stay = { x: bot.location.x, y: bot.location.y, z: bot.location.z };
	if (mode === 'mirror') {
		const t = findPlayer(opts.target);
		state.offset = t ? { x: bot.location.x - t.location.x, y: 0, z: bot.location.z - t.location.z } : { x: 2, y: 0, z: 0 };
	}
	if (mode === 'spar' && !bot.hasTag('player:pvp')) teleportToArena(bot);
	if (mode === 'game' && !joinGame(bot, opts.game, { allowBot: true })) {
		state.mode = 'idle';
		saveState();
		return 'chat.admin.bot.error.game';
	}
	if (mode === 'game') state.game = opts.game;
	saveState();
	return undefined;
}

/** Переключить присед / автототем / возврат после перезахода. @returns {boolean} новое значение */
export function toggleBot(key) {
	if (!['sit', 'totem', 'returnOnLoad'].includes(key)) return false;
	state[key] = !state[key];
	const bot = getBot();
	if (key === 'sit' && bot && state.mode !== 'mirror') safe(() => { bot.isSneaking = state.sit; });
	saveState();
	return state[key];
}

/** Запомнить предмет в слоте (меню → Управление слотами), чтобы выдать его заново после перезахода. */
export function rememberBotItem(slot, item) {
	if (item) state.items[slot] = item;
	else delete state.items[slot];
	saveState();
}

// ===== Появление, уборка, смерть =====

onBotSpawned((bot) => {
	if (!loaded) loadState();
	state.present = true;
	saveState();
	// Предметы из «Управления слотами» и режим — как были (после перезахода или гибели)
	for (const [slot, item] of Object.entries(state.items)) run(bot, `replaceitem entity @s ${slot} ${item}`);
	const mode = state.mode;
	if (mode === 'dummy') freezePlayer(bot);
	if (mode === 'game') state.mode = 'idle';   // игра без бота уже закончилась или идёт дальше
	if (mode === 'stay' && state.stay) run(bot, `tp @s ${state.stay.x} ${state.stay.y} ${state.stay.z}`);
});

onBotRemoved(() => {
	state.present = false;
	if (state.mode === 'game') state.mode = 'idle';
	saveState();
});

let respawnAt = -1;
let tick = 0;
let healNext = false;   // груша: восстановить здоровье на следующем тике
world.events.entityHurt.subscribe((e) => {
	const bot = getBot();
	if (!bot || e.hurtEntity?.id !== bot.id) return;
	if (state.mode === 'dummy') return dummyHit(bot, e.damagingEntity, e.damage);
	const hp = safe(() => bot.getComponent('health').current);
	if (hp !== undefined && hp <= 0) respawnAt = tick + RESPAWN_TICKS;
});

// ===== Груша: урон, DPS, удары =====

const hits = new Map();   // ник ударившего → [{ t, dmg }]
function dummyHit(bot, attacker, damage) {
	// Здоровье — сразу полное (на следующий тик: в этом урон ещё не применён)
	healNext = true;
	if (attacker?.typeId !== 'minecraft:player') return;
	const now = Date.now();
	const list = (hits.get(attacker.name) ?? []).filter(h => now - h.t <= DPS_WINDOW_MS);
	list.push({ t: now, dmg: damage });
	hits.set(attacker.name, list);
	const total = list.reduce((s, h) => s + h.dmg, 0);
	const span = Math.max(1, (now - list[0].t) / 1000);
	showHudLine(attacker, [{ translate: 'hud.bot.dummy', with: [damage.toFixed(1), (total / span).toFixed(1), String(list.length)] }]);
}
world.events.playerLeave.subscribe((e) => hits.delete(e.playerName));

// ===== Спарринг и мини-игры =====

let lastHit = -100;
/** Ближайший противник: игрок на арене (тег player:pvp), не бот; в мини-игре — только её участники. */
function nearestOpponent(bot, among) {
	let best, bestD = SEEK_RADIUS;
	for (const p of world.getPlayers()) {
		if (p.id === bot.id || p.hasTag('role:bot') || isPending(p)) continue;
		if (among ? !among.has(p.name) : !p.hasTag('player:pvp')) continue;
		const d = dist(p.location, bot.location);
		if (d < bestD) { best = p; bestD = d; }
	}
	return best;
}

function fight(bot, among) {
	const t = nearestOpponent(bot, among);
	if (!t) { if (tick % 20 === 0) safe(() => bot.stopMoving()); return; }
	const cfg = SPAR[state.level] ?? SPAR[2];
	safe(() => bot.lookAtEntity(t));
	const d = dist(t.location, bot.location);
	if (d > cfg.reach - 0.4 && tick % 10 === 0) safe(() => bot.navigateToEntity(t, cfg.speed));
	if (d <= cfg.reach && tick - lastHit >= cfg.cooldown) {
		lastHit = tick;
		safe(() => bot.attackEntity(t));
	}
}

// Сплиф: подойти к сопернику и сломать снег у него под ногами (лопату выдаёт system/spleef.js)
function spleef(bot, among) {
	const t = nearestOpponent(bot, among);
	if (!t) return;
	const under = new BlockLocation(Math.floor(t.location.x), Math.floor(t.location.y) - 1, Math.floor(t.location.z));
	const d = dist(t.location, bot.location);
	if (d > 4 && tick % 10 === 0) safe(() => bot.navigateToEntity(t, 1));
	if (d <= 4.5 && tick % 6 === 0) {
		safe(() => bot.lookAtBlock(under));
		safe(() => bot.breakBlock(under));
	}
}

// ===== Каждый тик =====

world.events.tick.subscribe(() => {
	tick++;
	if (!loaded && tick >= 2) loadState();
	if (!loaded) return;
	const bot = getBot();

	// Возврат после перезахода в мир и после гибели
	if (!bot && state.present && state.returnOnLoad && (tick === LOAD_DELAY_TICKS || tick === respawnAt || (tick > LOAD_DELAY_TICKS && tick % 200 === 0))) {
		const someone = [...world.getPlayers()].find(p => !isPending(p) && !p.hasTag('role:bot'));
		if (someone) spawnBot(someone, state.pos);
		return;
	}
	if (bot && tick === respawnAt) {
		// Погиб — убрать тело и призвать заново на прежнем месте (режим и предметы вернёт onBotSpawned)
		const pos = state.pos, mode = state.mode;
		removeBot();
		state.mode = mode;
		const someone = [...world.getPlayers()].find(p => !isPending(p) && !p.hasTag('role:bot'));
		if (someone) spawnBot(someone, pos);
		return;
	}
	if (!bot) return;

	if (healNext) {
		healNext = false;
		safe(() => bot.getComponent('health').resetToMaxValue());
	}
	// Автототем: только в пустую вторую руку (keep), раз в секунду
	if (state.totem && tick % 20 === 0) run(bot, 'replaceitem entity @s slot.weapon.offhand 0 keep totem_of_undying');
	// Где стоит — для возврата после перезахода (раз в 5 с)
	if (tick % 100 === 0) {
		const { x, y, z } = bot.location;
		state.pos = { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), z: Number(z.toFixed(2)) };
		saveState();
	}
	if (state.mode !== 'mirror') safe(() => { if (bot.isSneaking !== state.sit) bot.isSneaking = state.sit; });

	switch (state.mode) {
		case 'follow': {
			const t = findPlayer(state.target);
			if (!t) break;
			const d = t.dimension.id === bot.dimension.id ? dist(t.location, bot.location) : Infinity;
			if (d > FOLLOW_TP) run(bot, `tp @s "${t.name}"`);
			else if (d > FOLLOW_FAR && tick % 10 === 0) safe(() => bot.navigateToEntity(t, 1));
			else if (d <= FOLLOW_NEAR && tick % 10 === 0) safe(() => bot.stopMoving());
			if (tick % 4 === 0) safe(() => bot.lookAtEntity(t));
			break;
		}
		case 'stay': {
			if (!state.stay || tick % 10 !== 0) break;
			if (dist(bot.location, state.stay) > 1.2) safe(() => bot.navigateToLocation(loc(state.stay), 1));
			else safe(() => bot.stopMoving());
			break;
		}
		case 'mirror': {
			const t = findPlayer(state.target);
			if (!t) break;
			const o = state.offset ?? { x: 2, y: 0, z: 0 };
			const goal = { x: t.location.x + o.x, y: t.location.y, z: t.location.z + o.z };
			if (dist(goal, bot.location) > FOLLOW_TP) run(bot, `tp @s ${goal.x} ${goal.y} ${goal.z}`);
			else if (dist(goal, bot.location) > 0.4) safe(() => bot.moveToLocation(loc(goal), 1));
			else safe(() => bot.stopMoving());
			safe(() => bot.setRotation(t.rotation.x, t.rotation.y));
			safe(() => { bot.isSneaking = t.isSneaking; });
			if (t.velocity.y > 0.2 && tick % 4 === 0) safe(() => bot.jump());
			break;
		}
		case 'spar':
			fight(bot);
			break;
		case 'game': {
			const g = gameOf(bot);
			if (!g) { state.mode = 'idle'; state.game = undefined; saveState(); break; }
			if (g.phase !== 'running' || !g.alive.has(bot.name)) break;
			if (g.def.id === 'spleef') spleef(bot, g.alive);
			else fight(bot, g.alive);
			break;
		}
		default:
			break;
	}

	// Гид для новичков — раз в 2 секунды ищем, кому показать
	if (tick % 40 === 0) guideTick(bot);
	guideStep(bot);
});

// ===== Гид для новичков =====
// Новичок — вошёл в аккаунт, 1 уровень, меньше 5 минут в игре и без тега sys:guided. Бот (если он в обычном
// режиме, стоит или ходит за кем-то) подходит к нему, говорит GUIDE_LINES реплик (bot.guide.1…4 на языке
// игрока) и возвращается на место. Остальным игрокам тег ставится молча — гид им уже не нужен.

let guide;   // { name, step, at, back }
const busyModes = ['dummy', 'mirror', 'spar', 'game'];

function guideTick(bot) {
	for (const p of world.getPlayers()) {
		if (p.hasTag(GUIDED_TAG) || p.hasTag('role:bot') || isPending(p) || !p.hasTag('auth:done')) continue;
		const newbie = getScore(p, 'lvl') <= 1 && getScore(p, 'rebirth') === 0 && getScore(p, 'stat_playtime') < 5;
		if (!newbie) { p.addTag(GUIDED_TAG); continue; }
		if (guide || busyModes.includes(state.mode)) continue;
		p.addTag(GUIDED_TAG);
		const { x, y, z } = bot.location;
		guide = { name: p.name, step: 0, at: tick, back: { x, y, z } };
		// Встать в двух блоках перед игроком, лицом к нему
		run(p, `tp "${bot.name}" ^ ^ ^2 facing @s`);
	}
}

function guideStep(bot) {
	if (!guide || tick < guide.at) return;
	const p = findPlayer(guide.name);
	if (!p || guide.step >= GUIDE_LINES) {
		// Готово (или игрок вышел) — обратно на место
		if (!busyModes.includes(state.mode)) run(bot, `tp @s ${guide.back.x} ${guide.back.y} ${guide.back.z}`);
		guide = undefined;
		return;
	}
	guide.step++;
	safe(() => bot.lookAtEntity(p));
	const rawtext = [{ text: ' §8[' }, { translate: 'role.tag.bot' }, { text: `§r§8]§r §f${bot.name}  §f` },
		{ translate: `bot.guide.${guide.step}`, with: [p.name, bot.name] }];
	run(p, `tellraw @s ${JSON.stringify({ rawtext })}`);
	run(p, 'playsound random.pop @s');
	guide.at = tick + GUIDE_STEP_TICKS;
}
