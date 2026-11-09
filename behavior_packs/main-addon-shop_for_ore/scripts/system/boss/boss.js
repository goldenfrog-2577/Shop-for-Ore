// --- Босс: Хранитель (server:warden_boss) на арене Древнего города ---
// Старт: игрок встаёт на резной сланец перед порталом (START). Нужны: нет боя, прошла общая перезарядка
// (COOLDOWN_SECONDS, отметка boss_until в табло system — секунды Unix), на арене 1–4 игрока с уровнем ≥ MIN_LEVEL.
// Остальных с арены (ниже уровня, бот) в начале боя переносит на спавн.
// Бой: решётка в тоннеле закрывается, участники получают тег boss:fighter (по нему босс выбирает цель),
// Хранитель вылезает из портала; здоровье 500/750/1000/1250 по числу участников, в левой руке — тотем бессмертия
// (у Хранителя рука не рисуется). Фазы: 1 — обычный бой; 2 (здоровье ≤ 60 %) — раз в WAVE_SECONDS «Тьма», визг
// крикуна и 2 скелета; 3 — тотем сработал (у босса появилось Поглощение): ярость (server:rage), «Тьма» постоянно,
// к скелетам добавляются скелеты-иссушители. Прислужников живых не больше MAX_MINIONS, иссушителей — MAX_WITHER.
// Смерть участника: выпавшие вещи на арене уничтожаются, после возрождения (тег boss:clear) инвентарь очищается (/clear —
// остаётся только то, что было с keep_on_death; меню и кирку уровня функции мира выдают заново), игрок выбывает.
// Ушёл за решётку (тоннель — не арена боя) или вышел из игры — выбыл. Победа — босс погиб после тотема: каждому, кто дожил, монеты, VIP-монеты,
// достижение (тег stat:boss) и пластинка: первая — случайная из двух, вторая — недостающая.
// Поражение — выбыли все или прошло FIGHT_SECONDS: Хранитель уходит. В любом конце: решётка открыта, прислужники убраны.
// После перезагрузки скриптов посреди боя (boss_state = 1 или босс в мире) бой отменяется без награды. Арена могла быть
// не загружена (все ушли): тогда tickingarea boss_arena грузит её (она же держит арену загруженной весь бой), и уборка ждёт, пока чанки загрузятся (RECOVER_CORNERS);
// до этого бой не начать, решётка закрыта.

import { system, world, Location, BlockLocation, MinecraftEffectTypes } from '@minecraft/server';
import { getScore, run, tell } from '../../DataBase.js';
import { inArena } from './arena.js';
import { SPAWN } from '../player/void.js';

export const BOSS = 'server:warden_boss';
export const FIGHTER = 'boss:fighter';
export const MINION = 'boss:minion';
export const MIN_LEVEL = 26;
export const MAX_FIGHTERS = 4;
export const HP = [500, 750, 1000, 1250];
export const COOLDOWN_SECONDS = 30 * 60;
export const FIGHT_SECONDS = 10 * 60;
export const WAVE_SECONDS = 20;
export const MAX_MINIONS = 4;
export const MAX_WITHER = 2;
export const REWARD = { money: 25000, vip_coins: 10 };
export const DISCS = ['record_5', 'record_otherside'];   // идентификаторы Bedrock (в Java — music_disc_*)

export const START = [528, -60, -68];          // резной сланец перед порталом (стоять на нём — y −59)
export const SUMMON = [528, -60, -73];         // проём портала
export const BARS = [[526, -55, -12], [530, -51, -12]];   // решётка в тоннеле
export const CLEAR = 'boss:clear';             // погиб в бою: после возрождения стереть инвентарь (тег переживает конец боя и выход)

/** Внутри арены за решёткой (тоннель с z −12 и дальше — не арена боя). */
export function inFight(loc, dimensionId = 'minecraft:overworld') {
	return dimensionId === 'minecraft:overworld' && loc.x >= 480 && loc.x < 576 && loc.y >= -61 && loc.y < -20 && loc.z >= -104 && loc.z < -12;
}
const ITEMS_BOX = 'x=480,y=-62,z=-104,dx=95,dy=42,dz=102';
// Где появляются прислужники: круг радиусом 18 в утопленной площади (пол y −61, стоять — y −60)
export const MINION_SPOTS = Array.from({ length: 8 }, (_, i) => {
	const a = i * Math.PI / 4 + Math.PI / 8;
	return [Math.round(528 + 18 * Math.cos(a)), -60, Math.round(-56 + 18 * Math.sin(a))];
});

// ======== Чистые правила (проверяются tools/tests/boss.mjs) ========

/** Стоит ли игрок на плите старта. */
export const onStart = (loc) => Math.floor(loc.x) === START[0] && Math.floor(loc.z) === START[2] && Math.floor(loc.y) === START[1] + 1;

/**
 * Можно ли начать бой. players — [{ name, level, bot }] на арене; now и until — секунды Unix.
 * { ok: true, fighters, kick } или { ok: false, reason: 'busy'|'cooldown'|'too_many'|'level', minutes? }.
 */
export function checkStart({ busy, now, until, players, starter }) {
	if (busy) return { ok: false, reason: 'busy' };
	if (until > now) return { ok: false, reason: 'cooldown', minutes: Math.ceil((until - now) / 60) };
	const fighters = players.filter(p => !p.bot && p.level >= MIN_LEVEL).map(p => p.name);
	if (!fighters.includes(starter)) return { ok: false, reason: 'level' };
	if (fighters.length > MAX_FIGHTERS) return { ok: false, reason: 'too_many' };
	return { ok: true, fighters, kick: players.filter(p => !fighters.includes(p.name)).map(p => p.name) };
}

/** Фаза: 3 — тотем сработал; 2 — здоровье не выше 60 %; иначе 1. */
export const phaseOf = ({ current, max, totem }) => totem ? 3 : current <= max * 0.6 ? 2 : 1;

/** Кого призвать в волне: число и типы с учётом живых прислужников. */
export function waveSpawns(phase, alive, aliveWither, random = Math.random) {
	const out = [];
	for (let i = 0; i < 2 && alive + out.length < MAX_MINIONS; i++) {
		const wither = phase === 3 && aliveWither + out.filter(t => t === 'minecraft:wither_skeleton').length < MAX_WITHER && random() < 0.5;
		out.push(wither ? 'minecraft:wither_skeleton' : 'minecraft:skeleton');
	}
	return out;
}

/** Какую пластинку выдать: первая победа — случайная, вторая — недостающая, дальше — никакой. */
export function discFor(tags, random = Math.random) {
	const missing = DISCS.filter(d => !tags.includes(`boss:disc:${d}`));
	if (!missing.length) return undefined;
	return missing.length === DISCS.length ? DISCS[random() < 0.5 ? 0 : 1] : missing[0];
}

// ======== Состояние ========

const overworld = () => world.getDimension('overworld');
const cmd = (c) => overworld().runCommandAsync(c).catch(() => {});
const now = () => Math.floor(Date.now() / 1000);
function systemScore(name) {
	try { return world.scoreboard.getObjective('system').getScores().find(s => s.participant.displayName === name)?.score ?? 0; } catch { return 0; }
}
const bosses = () => { try { return [...overworld().getEntities({ type: BOSS })]; } catch { return []; } };
const minions = () => { try { return [...overworld().getEntities({ tags: [MINION] })]; } catch { return []; } };
// getPlayers() в 1.19.50 — итератор (PlayerIterator), а не массив: без [...] у него нет find/filter
const players = () => [...world.getPlayers()];
const findOnline = (name) => players().find(p => p.name === name);

let fight;                 // { fighters: Set, dead: Set, started, max, phase, nextWave }
let until = 0;             // конец перезарядки (секунды Unix), читается из табло при загрузке
let loaded = false;
let recovering = 0;         // > 0 — бой оборвался перезагрузкой, ждём загрузки арены; число — сколько проверок подряд она загружена

export const bossBusy = () => !!fight || recovering > 0;

// Арена держится загруженной (tickingarea) весь бой и при уборке после перезагрузки: незагруженного Хранителя
// getEntities не видит — его нельзя ни посчитать живым, ни убрать
const ARENA_AREA = 'boss_arena';
const arenaArea = (on) => cmd(on ? `tickingarea add 480 -62 -104 575 -20 -12 ${ARENA_AREA}` : `tickingarea remove ${ARENA_AREA}`);
// Углы и центр арены: если все эти блоки читаются, чанки (и сущности в них) загружены
const RECOVER_CORNERS = [[480, -104], [575, -104], [480, -12], [575, -12], [528, -58]];
const arenaLoaded = () => {
	try { return RECOVER_CORNERS.every(([x, z]) => !!overworld().getBlock(new BlockLocation(x, -60, z))); } catch { return false; }
};

function setBars(open) {
	const [[x0, y0, z0], [x1, y1, z1]] = BARS;
	cmd(`fill ${x0} ${y0} ${z0} ${x1} ${y1} ${z1} ${open ? 'air' : 'iron_bars'} 0`);
}

function clearArena() {
	for (const e of minions()) { try { e.kill(); } catch {} }
	cmd(`kill @e[type=item,${ITEMS_BOX}]`);
}

function startFight(fighters, kick) {
	const n = fighters.length;
	fight = { fighters: new Set(fighters), dead: new Set(), started: now(), max: HP[n - 1], phase: 1, nextWave: 0, totem: false };
	cmd('scoreboard players set boss_state system 1');
	for (const name of kick) {
		const p = findOnline(name);
		if (!p) continue;
		run(p, `tp @s ${SPAWN.join(' ')}`);
		tell(p, 'chat.boss.kicked');
	}
	setBars(false);
	for (const name of fighters) {
		const p = findOnline(name);
		if (!p) continue;
		p.addTag(FIGHTER);
		run(p, 'effect @s darkness 8 0 true');
		run(p, 'playsound mob.warden.emerge @s ~ ~ ~ 2 1');
		tell(p, 'chat.boss.start', String(n));
	}
	arenaArea(true);
	cmd(`summon ${BOSS} ${SUMMON.join(' ')} server:spawn_emerging`);
	// событие здоровья и тотем — тиком позже, когда сущность уже есть
	system.run(() => {
		cmd(`event entity @e[type=${BOSS}] server:hp_${n}`);
		cmd(`replaceitem entity @e[type=${BOSS}] slot.weapon.offhand 0 totem_of_undying`);
	});
}

function endFight(result) {
	if (!fight) return;
	const winners = result === 'victory' ? [...fight.fighters].filter(n => !fight.dead.has(n)) : [];
	for (const name of fight.fighters) {
		const p = findOnline(name);
		if (!p) continue;
		p.removeTag(FIGHTER);
		if (winners.includes(name)) reward(p);
		else tell(p, result === 'timeout' ? 'chat.boss.timeout' : result === 'abort' ? 'chat.boss.abort' : 'chat.boss.defeat');
	}
	for (const b of bosses()) {
		// уход: звук закапывания и телепорт под мир (без анимации смерти и без добычи)
		cmd(`playsound mob.warden.dig @a ${SUMMON.join(' ')} 4 1`);
		try { b.teleport({ x: SUMMON[0], y: -200, z: SUMMON[2] }, overworld(), 0, 0); } catch {}
	}
	clearArena();
	arenaArea(false);
	setBars(true);
	until = now() + COOLDOWN_SECONDS;
	cmd(`scoreboard players set boss_until system ${until}`);
	cmd('scoreboard players set boss_state system 0');
	fight = undefined;
}

function reward(p) {
	run(p, `scoreboard players add @s money ${REWARD.money}`);
	run(p, `scoreboard players add @s vip_coins ${REWARD.vip_coins}`);
	p.addTag('stat:boss');
	tell(p, 'chat.boss.victory', String(REWARD.money), String(REWARD.vip_coins));
	const disc = discFor(p.getTags());
	// отметку о пластинке ставим только после успешной выдачи: run() при ошибке команды возвращает undefined
	if (disc) run(p, `give @s ${disc} 1`).then((result) => {
		if (!result) return;
		p.addTag(`boss:disc:${disc}`);
		tell(p, 'chat.boss.disc');
	});
}

function knockOut(name, key) {
	if (!fight?.fighters.has(name)) return;
	fight.fighters.delete(name);
	const p = findOnline(name);
	if (p) {
		p.removeTag(FIGHTER);
		if (key) tell(p, key);
	}
}

function wave(phase) {
	const alive = minions();
	const wither = alive.filter(e => e.typeId === 'minecraft:wither_skeleton').length;
	for (const type of waveSpawns(phase, alive.length, wither)) {
		const [x, y, z] = MINION_SPOTS[Math.floor(Math.random() * MINION_SPOTS.length)];
		try { overworld().spawnEntity(type, new Location(x + 0.5, y, z + 0.5)).addTag(MINION); } catch {}
	}
	for (const name of fight.fighters) {
		const p = findOnline(name);
		if (!p) continue;
		run(p, 'effect @s darkness 6 0 true');
		run(p, `playsound shriek.sculk_shrieker @s ${SUMMON.join(' ')} 4 0.9 0.3`);
	}
}

/** Тотем сработал: ярость и сообщение (один раз). Пишется сразу из entityHurt — между проверками раз в секунду босса могут добить. */
function markTotem(boss) {
	if (fight.totem) return;
	fight.totem = true;
	try { boss?.triggerEvent('server:rage'); } catch {}
	for (const name of fight.fighters) { const p = findOnline(name); if (p) tell(p, 'chat.boss.totem'); }
}

function fightStep() {
	const t = now();
	const [boss] = bosses();
	// тотем: после него у босса Поглощение — других источников у Хранителя нет
	if (boss && !fight.totem) {
		let absorbed = false;
		try { absorbed = !!boss.getEffect(MinecraftEffectTypes.absorption); } catch {}
		if (absorbed) markTotem(boss);
	}
	// Сначала — кто всё ещё в бою: ушедший с арены (или вышедший) выбывает до награды, даже если босса добили в эту же секунду
	for (const name of [...fight.fighters]) {
		const p = findOnline(name);
		if (!p) { knockOut(name); continue; }
		if (!fight.dead.has(name) && !inFight(p.location, p.dimension?.id)) knockOut(name, 'chat.boss.left');
	}
	// босса не видно: конец боя, только если арена загружена (иначе он просто в незагруженном чанке)
	if (!boss) return arenaLoaded() ? endFight(fight.totem ? 'victory' : 'abort') : undefined;
	let current = fight.max;
	try { current = boss.getComponent('minecraft:health').current; } catch {}
	const phase = phaseOf({ current, max: fight.max, totem: fight.totem });
	if (phase === 2 && fight.phase === 1) {
		for (const name of fight.fighters) { const p = findOnline(name); if (p) tell(p, 'chat.boss.phase2'); }
	}
	fight.phase = phase;
	if (phase >= 2 && t >= fight.nextWave) {
		wave(phase);
		fight.nextWave = t + WAVE_SECONDS;
	}
	// ярость: «Тьма» оставшимся (ушедшие уже выбыли выше; погибший выбывает после возрождения — respawned)
	if (phase === 3) for (const name of fight.fighters) {
		const p = findOnline(name);
		if (p && !fight.dead.has(name)) run(p, 'effect @s darkness 3 0 true');
	}
	cmd(`kill @e[type=item,${ITEMS_BOX}]`);
	if (![...fight.fighters].some(n => !fight.dead.has(n))) return endFight('defeat');
	if (t - fight.started >= FIGHT_SECONDS) endFight('timeout');
}

/** Погибшие в бою возродились: стереть оставшееся (keep_on_death) и вывести из боя — даже если бой уже кончился. */
function processClears() {
	for (const p of world.getPlayers()) {
		if (!p.hasTag(CLEAR)) continue;
		let hp = 0;
		try { hp = p.getComponent('minecraft:health').current; } catch {}
		if (hp <= 0) continue;
		run(p, 'clear @s');
		p.removeTag(CLEAR);
		if (fight?.fighters.has(p.name)) {
			fight.dead.delete(p.name);
			knockOut(p.name, 'chat.boss.died');
		} else tell(p, 'chat.boss.died');
	}
}

function load() {
	loaded = true;
	until = systemScore('boss_until');
	for (const p of world.getPlayers()) p.removeTag(FIGHTER);
	if (systemScore('boss_state') === 1 || bosses().length) {
		// Хранитель и прислужники могут быть в незагруженных чанках — getEntities их не видит. Грузим арену и ждём
		recovering = 1;
		arenaArea(true);
		return;
	}
	setBars(true);
}

/** Уборка после оборванного боя — когда арена загружена две проверки подряд (сущности появляются вслед за чанками). */
function recoverStep() {
	if (!arenaLoaded()) { recovering = 1; return; }
	if (++recovering < 3) return;
	for (const b of bosses()) { try { b.teleport({ x: SUMMON[0], y: -200, z: SUMMON[2] }, overworld(), 0, 0); } catch {} }
	clearArena();
	cmd('scoreboard players set boss_state system 0');
	arenaArea(false);
	recovering = 0;
	setBars(true);
}

const hinted = new Set();   // кому уже подсказали, как разбудить Хранителя (до выхода с арены)

system.runSchedule(() => {
	if (!loaded) return load();
	processClears();
	if (recovering) return recoverStep();
	if (fight) {
		for (const p of world.getPlayers()) if (p.hasTag(FIGHTER) && !fight.fighters.has(p.name)) p.removeTag(FIGHTER);
		for (const name of [...fight.dead]) if (!findOnline(name)) { fight.dead.delete(name); knockOut(name); }
		return fightStep();
	}
	// тег участника мог остаться у того, кто вышел из игры посреди боя
	for (const p of world.getPlayers()) if (p.hasTag(FIGHTER)) p.removeTag(FIGHTER);
	const inside = players().filter(p => inArena(p.location, p.dimension?.id));
	for (const name of [...hinted]) if (!inside.some(p => p.name === name)) hinted.delete(name);
	for (const p of inside) {
		if (!hinted.has(p.name) && !p.hasTag('role:bot')) {
			hinted.add(p.name);
			tell(p, 'chat.boss.hint');
			// решётку открываем, когда рядом игрок: при загрузке скриптов чанк тоннеля может быть не загружен
			setBars(true);
		}
	}
	const starter = inside.find(p => onStart(p.location) && !p.hasTag('role:bot'));
	if (!starter) return;
	// участники — только за решёткой; всех остальных на арене и в тоннеле переносит на спавн
	const arena = inside.filter(p => inFight(p.location, p.dimension?.id));
	const check = checkStart({
		busy: false, now: now(), until, starter: starter.name,
		players: arena.map(p => ({ name: p.name, level: getScore(p, 'lvl'), bot: p.hasTag('role:bot') }))
	});
	if (check.ok) return startFight(check.fighters, inside.map(p => p.name).filter(n => !check.fighters.includes(n)));
	// отказ: шаг назад с плиты, чтобы сообщение не повторялось каждую секунду
	run(starter, `tp @s ${START[0] + 0.5} ${START[1] + 1} ${START[2] + 2.5}`);
	tell(starter, `chat.boss.${check.reason}`, ...(check.minutes ? [String(check.minutes)] : check.reason === 'level' ? [String(MIN_LEVEL)] : check.reason === 'too_many' ? [String(MAX_FIGHTERS)] : []));
}, 20);

// Смерть участника: отметить; выпавшее уничтожится в fightStep, остальное — после возрождения
world.events.entityHurt.subscribe((e) => {
	// Удар по боссу: тотем отмечаем сразу (Поглощение или смертельный удар — умереть он может только после тотема)
	if (fight && !fight.totem && e.hurtEntity?.typeId === BOSS) {
		let absorbed = false, hp = 1;
		try { absorbed = !!e.hurtEntity.getEffect(MinecraftEffectTypes.absorption); } catch {}
		try { hp = e.hurtEntity.getComponent('minecraft:health').current; } catch {}
		if (absorbed || hp <= 0) markTotem(e.hurtEntity);
	}
	if (!fight || e.hurtEntity?.typeId !== 'minecraft:player' || !fight.fighters.has(e.hurtEntity.name)) return;
	let hp = 1;
	try { hp = e.hurtEntity.getComponent('minecraft:health').current; } catch {}
	if (hp <= 0) {
		fight.dead.add(e.hurtEntity.name);
		e.hurtEntity.addTag(CLEAR);
		system.run(() => cmd(`kill @e[type=item,${ITEMS_BOX}]`));
	}
});

world.events.playerLeave.subscribe((e) => {
	hinted.delete(e.playerName);
	if (fight?.fighters.has(e.playerName)) { fight.fighters.delete(e.playerName); fight.dead.delete(e.playerName); }
});
