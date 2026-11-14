// --- Поведение бота карты (system/bot/spawnbot.js): режимы, автототем, возврат после перезахода, гид для новичков ---
// Режим один (меню администратора → Бот → Режим):
//   idle   — обычный: стоит, где поставили;
//   dummy  — груша для битья: заморожен (system/security/freeze.js), не умирает, ударившему — урон, DPS и число ударов
//            строкой над хотбаром (toast.js, showHudLine);
//   follow — ходит за игроком, отстал больше чем на FOLLOW_TP блоков или в другом измерении — телепорт;
//   stay   — держится точки, где включили режим (оттолкнули — возвращается);
//   mirror — повторяет за игроком: поворот головы, присед и перемещение (на том же расстоянии);
//   spar   — спарринг на PvP-арене: бьёт ближайшего игрока, с луком стреляет на расстоянии;
//   game   — играет в мини-игре (добор игроков): PvP — как спарринг, сплиф — копает снег под соперниками.
// Отдельно: присесть (sit), автототем (тотем во второй руке, если она пуста), возврат после перезахода.
// Бой с Хранителем (system/boss/boss.js): поверх режима follow — пока идёт бой, бот в отряде бьёт ближайшую цель
// (connectBot → assist), выбывший или не взятый в отряд ждёт на спавне (bench). Режим не меняется и не сохраняется:
// после перезагрузки скриптов бой отменяется, и бот снова просто следует за игроком.
// Состояние — в свойстве мира shop:bot_state (JSON), бот после перезахода в мир появляется на прежнем месте
// с прежним режимом и предметами из «Управления слотами».
// Победы и смерти бота в статистику и достижения не идут (achievements.js, minigames.js).

import { world, Location, Vector, BlockLocation, DynamicPropertiesDefinition, MinecraftEffectTypes } from '@minecraft/server';
import { run, findPlayer, getScore, isPending, isBot } from '../../utils.js';
import { getBot, spawnBot, removeBot, onBotSpawned, onBotRemoved } from './spawnbot.js';
import { isAir, isSolid } from '../security/anticheat_checks.js';
import { freezePlayer, unfreezePlayer } from '../security/freeze.js';
import { showHudLine } from '../ui/toast.js';
import { teleportToArena } from '../combat/pvp.js';
import { getGame, gameOf, joinGame, leaveGame } from '../minigames/minigames.js';
import { connectBot } from '../boss/boss.js';

export const MODES = ['idle', 'dummy', 'follow', 'stay', 'mirror', 'spar', 'game'];
export const SPAR_LEVELS = [1, 2, 3, 4];
// Сложность спарринга: тиков между ударами, дальность удара, скорость бега
const SPAR = {
	1: { cooldown: 12, reach: 2.6, speed: 0.8 },
	2: { cooldown: 8, reach: 3.0, speed: 1 },
	3: { cooldown: 5, reach: 3.2, speed: 1 },
	4: { cooldown: 2, reach: 3.2, speed: 1.4 }
};
const STATE_PROP = 'shop:bot_state';
const SEEK_RADIUS = 64;         // спарринг: дальше этого противника не ищет
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

// Перестраиваем путь раз в секунду. Телепорт — только между измерениями или после 10 с без движения.
// Данные о форме столкновения в API 1.19.50 недоступны: используем полные известные блоки.
const JUMP_BLOCKS = new Set(['planks','log','log2','wood','stonebrick','brick_block','wool','concrete','concretePowder',
	'hardened_clay','stained_hardened_clay','glass','stained_glass','leaves','leaves2','sponge','melon_block',
	'pumpkin','lit_pumpkin','hay_block','nether_wart_block','warped_wart_block','bone_block','dried_kelp_block',
	'chest','trapped_chest','ender_chest','crafting_table','furnace','lit_furnace'].map(id => 'minecraft:' + id));
const jumpBlock = id => isSolid(id) || JUMP_BLOCKS.has(id) || /^minecraft:double_.*slab/.test(id ?? '');
const clearBlock = id => !!id && (isAir(id) || /^minecraft:(tallgrass|double_plant|yellow_flower|red_flower|deadbush|sapling|torch|redstone_torch|unlit_redstone_torch)$/.test(id));
const blockId = (bot,x,y,z) => safe(() => bot.dimension.getBlock(new BlockLocation(Math.floor(x),Math.floor(y),Math.floor(z)))?.typeId);

export function jumpableObstacle(bot, goal) {
	const p = bot.location, v = safe(() => bot.velocity);
	const moving = v && Number.isFinite(v.x) && Number.isFinite(v.z) && Math.hypot(v.x,v.z) > 0.05;
	const dx = moving ? v.x : goal.x - p.x, dz = moving ? v.z : goal.z - p.z, length = Math.hypot(dx,dz);
	if (length < 0.1) return false;
	const y = Math.floor(p.y + 0.05);
	// Подъём до полублока проходит шагом; неизвестные/незагруженные блоки не считаем опорой.
	if (y + 1 - p.y <= 0.6001 || !jumpBlock(blockId(bot,p.x,p.y-0.05,p.z))) return false;
	if (!clearBlock(blockId(bot,p.x,y+2,p.z))) return false;
	const ux = dx / length, uz = dz / length;
	for (const side of [0,-0.22,0.22]) {
		const x = p.x + ux * 0.8 - uz * side, z = p.z + uz * 0.8 + ux * side;
		if (jumpBlock(blockId(bot,x,y,z)) && clearBlock(blockId(bot,x,y+1,z)) && clearBlock(blockId(bot,x,y+2,z))) return true;
	}
	return false;
}
let lastJump = -100;
function tryJump(bot, goal, runJump = false) {
	if (bot.isSneaking || tick - lastJump < 8 || Math.abs(safe(() => bot.velocity.y) ?? 0) >= 0.03) return;
	if (!runJump && !jumpableObstacle(bot,goal)) return;
	lastJump = tick;
	safe(() => bot.jump());
}

let motion;
function walkTo(bot, goal, { target, speed = 1, near = 1.2, recover = true } = {}) {
	if (tick % 10 !== 0) return;
	if (target && target.dimension.id !== bot.dimension.id) {
		if (recover) run(bot, `tp @s "${target.name}"`);
		motion = undefined; return;
	}
	const d = dist(bot.location, goal);
	if (d <= near) { safe(() => bot.stopMoving()); motion = undefined; return; }
	if (!motion) motion = { last: { ...bot.location }, at: tick, pathAt: -100 };
	if (dist(bot.location, motion.last) >= 0.35) { motion.last = { ...bot.location }; motion.at = tick; }
	const stuck = tick - motion.at;
	tryJump(bot,goal);
	if (stuck >= 200 && recover && d > 6) {
		if (target) run(bot, `tp @s "${target.name}"`); else run(bot, `tp @s ${goal.x} ${goal.y} ${goal.z}`);
		motion = undefined; return;
	}
	if (tick - motion.pathAt >= 20 && Math.abs(safe(() => bot.velocity.y) ?? 0) < 0.03) {
		speed = Math.min(1, Math.max(0, speed));
		motion.pathAt = tick;
		if (target) safe(() => bot.navigateToEntity(target, speed)); else safe(() => bot.navigateToLocation(loc(goal), speed));
	}
}

// ===== Режимы =====

/** Выйти из прежнего режима: разморозить, остановить, выйти из мини-игры. */
function leaveMode(bot) {
	cancelBow(bot);
	if (state.mode === 'dummy') unfreezePlayer(bot);
	if (gameOf(bot)) leaveGame(bot, 'bot');
	motion = undefined; guide = undefined;
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
	if (mode === 'game' && gameOf(bot)?.def.id === opts.game) { state.mode = 'game'; state.game = opts.game; saveState(); return undefined; }
	if (mode === 'game') {
		const g = getGame(opts.game);
		if (!g || (gameOf(bot) !== g && g.players.size >= g.def.maxPlayers)) return 'chat.admin.bot.error.game';
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

onBotRemoved((bot) => {
	cancelBow(bot);
	guide = undefined;
	motion = undefined;
	if (bot && gameOf(bot)) leaveGame(bot, 'bot');
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
	showHudLine(attacker, [{ translate: 'hud.bot.dummy', with: [damage.toFixed(1), (total / span).toFixed(1), String(list.length)] }], { priority: 10, source: 'dummy' });
}
world.events.playerLeave.subscribe((e) => hits.delete(e.playerName));

// ===== Спарринг и мини-игры =====

let lastHit = -100;
/** Ближайший противник: игрок на арене (тег player:pvp), не бот; в мини-игре — только её участники. */
function nearestOpponent(bot, among) {
	let best, bestD = SEEK_RADIUS;
	for (const p of world.getPlayers()) {
		if (p.id === bot.id || isBot(p) || p.dimension.id !== bot.dimension.id || isPending(p)) continue;
		if (among ? !among.has(p.name) : !p.hasTag('player:pvp')) continue;
		const d = dist(p.location, bot.location);
		if (d < bestD) { best = p; bestD = d; }
	}
	return best;
}

const BOW_MIN_RANGE = 4, BOW_MAX_RANGE = 16;
const BOW_DRAW_TICKS = 20, BOW_RETRY_TICKS = 10;
let bowDraw;
let nextBowAt = 0;

function hasSelectedBow(bot, slot) {
	return safe(() => bot.getComponent('inventory').container.getItem(slot)?.typeId) === 'minecraft:bow';
}

function bowLineClear(bot, target) {
	return safe(() => {
		const from = bot.headLocation, to = target.headLocation;
		const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
		const length = Math.hypot(dx, dy, dz);
		if (length < 1) return false;
		const direction = new Vector(dx / length, dy / length, dz / length);
		return !bot.dimension.getBlockFromRay(from, direction, { maxDistance: length - 0.1 });
	}) === true;
}

function cancelBow(bot) {
	const draw = bowDraw;
	bowDraw = undefined;
	if (!draw || !bot) return;
	nextBowAt = tick + BOW_RETRY_TICKS;
	// Смена слота прерывает натяжение. Отпускать натянутый лук в прежнем слоте здесь нельзя.
	safe(() => {
		const slot = bot.selectedSlot;
		if (slot !== draw.slot) {
			bot.stopUsingItem();
			return;
		}
		bot.selectedSlot = (slot + 1) % 9;
		try { bot.stopUsingItem(); } finally { bot.selectedSlot = slot; }
	});
}

function shootBow(bot, target, distance) {
	const inRange = distance >= BOW_MIN_RANGE && distance <= BOW_MAX_RANGE;
	const slot = bot.selectedSlot;
	if (bowDraw) {
		if (!inRange || bowDraw.target !== target.id || bowDraw.slot !== slot) {
			cancelBow(bot);
			return false;
		}
		if (!safe(() => { bot.lookAtEntity(target); return true; })) {
			cancelBow(bot);
			return false;
		}
		if (tick < bowDraw.releaseAt) return true;
		if (!hasSelectedBow(bot, slot) || !bowLineClear(bot, target)) {
			cancelBow(bot);
			return false;
		}
		bowDraw = undefined;
		nextBowAt = tick + BOW_RETRY_TICKS;
		safe(() => bot.stopUsingItem());
		return true;
	}
	if (!inRange || tick < nextBowAt) return false;
	// Опрос инвентаря и луча ограничен. Подход и ближний бой работают и без стрел.
	nextBowAt = tick + BOW_RETRY_TICKS;
	if (!hasSelectedBow(bot, slot) || !bowLineClear(bot, target)) return false;
	const started = safe(() => {
		bot.lookAtEntity(target);
		return bot.useItemInSlot(slot);
	});
	if (started !== true) return false;
	bowDraw = { target: target.id, slot, releaseAt: tick + BOW_DRAW_TICKS };
	safe(() => bot.stopMoving());
	motion = undefined;
	return true;
}

function fight(bot, among) {
	const t = nearestOpponent(bot, among);
	if (!t) {
		cancelBow(bot);
		if (tick % 20 === 0) safe(() => bot.stopMoving());
		return;
	}
	if (state.mode === 'spar' && shootBow(bot, t, dist(t.location, bot.location))) return;
	attack(bot, t);
}

/** Подойти и бить цель со сложностью спарринга. */
function attack(bot, t) {
	const cfg = SPAR[state.level] ?? SPAR[2];
	if (state.level === 4 && tick % 20 === 0) {
		const effect = safe(() => bot.getEffect(MinecraftEffectTypes.speed));
		if (!effect || effect.amplifier < 1 || effect.duration < 20) run(bot, 'effect @s speed 2 1 true');
	}
	safe(() => bot.lookAtEntity(t));
	const d = dist(t.location, bot.location);
	if (state.level === 4 && d <= cfg.reach + 0.5) {
		const angle = tick / 12, goal = { x: t.location.x + Math.cos(angle) * 2, y: t.location.y, z: t.location.z + Math.sin(angle) * 2 };
		walkTo(bot, goal, { speed: cfg.speed, near: 0.4, recover: false });
	} else walkTo(bot, t.location, { target: t, speed: cfg.speed, near: cfg.reach - 0.5, recover: false });
	if (state.level === 4 && d > 1.5 && tick % 8 === 0) tryJump(bot,t.location,true);
	if (d <= cfg.reach && tick - lastHit >= cfg.cooldown) {
		lastHit = tick;
		safe(() => bot.attackEntity(t));
	}
}

// Сплиф: подойти к сопернику и сломать снег у него под ногами (лопату выдаёт system/minigames/spleef.js)
function spleef(bot, among) {
	const t = nearestOpponent(bot, among);
	if (!t) return;
	const under = new BlockLocation(Math.floor(t.location.x), Math.floor(t.location.y) - 1, Math.floor(t.location.z));
	const d = dist(t.location, bot.location);
	if (d > 4) walkTo(bot, t.location, { target: t, near: 4, recover: false });
	if (d <= 4.5 && tick % 6 === 0) {
		safe(() => bot.lookAtBlock(under));
		safe(() => bot.breakBlock(under));
	}
}

// ===== Бой с Хранителем =====

let assist;   // { targets: () => сущности, spawn: { x, y, z }, out } — только пока идёт бой
connectBot({
	name: () => getBot()?.name,
	/** За кем следует бот (режим follow), иначе undefined. */
	follows: () => state.mode === 'follow' ? state.target : undefined,
	/** Начало боя: бить ближайшую из targets(); погибнет — появится в spawn и будет ждать конца боя. */
	assist(targets, spawn) { assist = { targets, spawn, out: false }; motion = undefined; guide = undefined; },
	/** Выбыл (или не взят в отряд): стоять, пока бой не кончится. */
	bench() {
		if (!assist) return;
		assist.out = true;
		const bot = getBot();
		if (bot) safe(() => bot.stopMoving());
	},
	/** Бой кончился — снова обычный режим. */
	end() { assist = undefined; motion = undefined; }
});

function bossFight(bot) {
	let best, bestD = SEEK_RADIUS;
	for (const e of safe(() => assist.targets()) ?? []) {
		const d = safe(() => dist(e.location, bot.location));
		if (d !== undefined && d < bestD) { best = e; bestD = d; }
	}
	if (best) attack(bot, best);
	else if (tick % 20 === 0) safe(() => bot.stopMoving());
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
		// Погиб — убрать тело и призвать заново на прежнем месте (режим и предметы вернёт onBotSpawned); в бою с боссом — на спавне
		const pos = assist ? assist.spawn : state.pos, mode = state.mode;
		if (assist) assist.out = true;
		removeBot();
		state.mode = mode;
		const someone = [...world.getPlayers()].find(p => !isPending(p) && !p.hasTag('role:bot'));
		if (someone) spawnBot(someone, pos);
		return;
	}
	if (!bot) return;
	if (!bot.hasTag('sys:bot')) bot.addTag('sys:bot');
	if (!bot.hasTag('role:bot')) bot.addTag('role:bot');

	if (healNext) {
		healNext = false;
		safe(() => bot.getComponent('health').resetToMaxValue());
	}
	// Автототем: только в пустую вторую руку (keep), раз в секунду; в бою с боссом — нет (иначе бот почти бессмертен)
	if (state.totem && !(assist && !assist.out) && tick % 20 === 0) run(bot, 'replaceitem entity @s slot.weapon.offhand 0 keep totem_of_undying');
	// Где стоит — для возврата после перезахода (раз в 5 с)
	if (tick % 100 === 0) {
		const { x, y, z } = bot.location;
		state.pos = { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), z: Number(z.toFixed(2)) };
		saveState();
	}
	if (state.mode !== 'mirror') safe(() => { if (bot.isSneaking !== state.sit) bot.isSneaking = state.sit; });

	if (state.mode !== 'spar' || assist) cancelBow(bot);
	if (assist && (assist.out || state.mode === 'follow')) {
		if (!assist.out) bossFight(bot);
		else if (tick % 20 === 0) safe(() => bot.stopMoving());
		return;
	}
	if (tick % 40 === 0) guideTick(bot);
	if (guide) { guideStep(bot); return; }

	switch (state.mode) {
		case 'follow': {
			const t = findPlayer(state.target);
			if (!t) break;
			const d = t.dimension.id === bot.dimension.id ? dist(t.location, bot.location) : Infinity;
			walkTo(bot, t.location, { target: t, near: FOLLOW_NEAR, speed: 1.1 });
			if (tick % 4 === 0) safe(() => bot.lookAtEntity(t));
			break;
		}
		case 'stay': {
			if (!state.stay || tick % 10 !== 0) break;
			walkTo(bot, state.stay, { near: 1.2 });
			break;
		}
		case 'mirror': {
			const t = findPlayer(state.target);
			if (!t) break;
			const o = state.offset ?? { x: 2, y: 0, z: 0 };
			const goal = { x: t.location.x + o.x, y: t.location.y, z: t.location.z + o.z };
			walkTo(bot, goal, { speed: 1.1, near: 0.4 });
			safe(() => bot.setRotation(t.rotation.x, t.rotation.y));
			safe(() => { bot.isSneaking = t.isSneaking; });
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


});

// ===== Гид для новичков =====
// Новичок — вошёл в аккаунт, 1 уровень, меньше 5 минут в игре и без тега sys:guided. Бот (если он в обычном
// режиме, стоит или ходит за кем-то) подходит к нему, говорит GUIDE_LINES реплик (bot.guide.1…4 на языке
// игрока) и возвращается на место. Остальным игрокам тег ставится молча — гид им уже не нужен.

let guide;
const busyModes = ['dummy', 'mirror', 'spar', 'game'];
const GUIDE_TRAVEL_TICKS = 400;

export function canGuidePlayer(player, bot) {
	return !!player && !!bot && !isBot(player) && !isPending(player) &&
		player.hasTag('auth:done') && player.dimension.id === bot.dimension.id;
}

function beginGuide(bot, player) {
	player.addTag(GUIDED_TAG);
	guide = { name: player.name, dimension: bot.dimension.id, step: 0, at: tick, back: { ...bot.location }, returning: false };
	motion = undefined;
	safe(() => bot.stopMoving());
}

/** Запустить знакомство с картой вручную, в том числе повторно. */
export function startBotGuide(player) {
	const bot = getBot();
	if (!bot) return 'chat.admin.bot.error.absent';
	if (guide || assist || busyModes.includes(state.mode)) return 'chat.admin.bot.error.guide_busy';
	if (!canGuidePlayer(player, bot)) return 'chat.admin.bot.error.guide_target';
	beginGuide(bot, player);
}

function guideTick(bot) {
	for (const p of world.getPlayers()) {
		if (p.hasTag(GUIDED_TAG) || !canGuidePlayer(p, bot)) continue;
		const newbie = getScore(p, 'lvl') <= 1 && getScore(p, 'rebirth') === 0 && getScore(p, 'stat_playtime') < 5;
		if (!newbie) { p.addTag(GUIDED_TAG); continue; }
		if (guide || busyModes.includes(state.mode)) continue;
		beginGuide(bot, p);
		break;
	}
}

function finishGuide(bot) {
	guide = undefined;
	motion = undefined;
	safe(() => bot.stopMoving());
}

function guideStep(bot) {
	if (bot.dimension.id !== guide.dimension) return finishGuide(bot);
	const player = guide.returning ? undefined : findPlayer(guide.name);
	if (!guide.returning && (!canGuidePlayer(player, bot) || guide.step >= GUIDE_LINES || tick >= guide.at + GUIDE_TRAVEL_TICKS)) {
		guide.returning = true;
		guide.at = tick;
		motion = undefined;
	}
	if (guide.returning) {
		if (dist(bot.location, guide.back) <= 1.5 || tick >= guide.at + GUIDE_TRAVEL_TICKS) return finishGuide(bot);
		walkTo(bot, guide.back);
		return;
	}
	walkTo(bot, player.location, { target: player, near: 2.8 });
	if (dist(bot.location, player.location) > 4 || tick < guide.at) return;
	guide.step++;
	safe(() => bot.lookAtEntity(player));
	const rawtext = [{ text: ' §8[' }, { translate: 'role.tag.bot' }, { text: `§r§8]§r §f${bot.name}  §f` },
		{ translate: `bot.guide.${guide.step}`, with: [player.name, bot.name] }];
	run(player, `tellraw @s ${JSON.stringify({ rawtext })}`);
	run(player, 'playsound random.pop @s');
	guide.at = tick + GUIDE_STEP_TICKS;
}
