// --- Античит: движение, удары, копание ---
// Очки, сигналы и режим — system/anticheat.js. Здесь сами проверки:
//   speed     — путь по горизонтали за последнюю секунду больше предела (с поправкой на «Скорость» и лёд);
//   fly       — в воздухе слишком долго не падает (зависание, подъём без опоры);
//   noclip    — голова и ноги внутри твёрдых блоков дольше NOCLIP_TICKS тиков и движение там больше NOCLIP_PATH блока;
//   reach     — удар по игроку дальше REACH блоков (от глаз до ближайшей точки хитбокса);
//   killaura  — удар по цели вне поля зрения или по нескольким целям за полсекунды;
//   fastbreak — больше BREAK_PER_SECOND блоков за секунду или BREAK_PER_TICK за один тик.
// Откат (режимы 2 и 3): движение — телепорт на последнее честное место на опоре; удар — урон возвращается жертве.
// Чтобы не ловить честных игроков, проверки движения не работают:
//   после телепорта (сдвиг больше TP_BLOCKS за тик — команды, варпы, жемчуг, мини-игры) и после урона
//   (отбрасывание, взрыв кристалла) — GRACE_TICKS тиков; у замороженных (!freeze);
//   рядом с водой, лавой, лестницей, лианами, паутиной, строительными лесами, слизью, мёдом;
//   с элитрами на груди (тег ac:elytra ставится командой раз в 2 с) и с трезубцем «Тягун» в руке.
// Ограничение: в 1.19.50 скрипт не видит, едет ли игрок в лодке или вагонетке.

import { world, BlockLocation, MinecraftEffectTypes, MinecraftEnchantmentTypes } from '@minecraft/server';
import { run } from '../DataBase.js';
import { flag, isExempt, rollbackEnabled } from './anticheat.js';

export const REACH = 6;
export const KILLAURA_ANGLE = 60;          // градусов от направления взгляда (плюс угловой размер цели)
const MULTI_TARGET_TICKS = 10;
const MULTI_TARGETS = 3;
export const SPEED_LIMIT = 10;             // м/с; бег с прыжками — около 7
const ICE_FACTOR = 2.5;
export const TP_BLOCKS = 8;                // за один тик
const GRACE_TICKS = 40;
export const FLY_TICKS = 20;               // тиков в воздухе без падения (обычный прыжок — около 7)
export const NOCLIP_TICKS = 20;
export const NOCLIP_PATH = 1;              // блоков пройдено внутри твёрдых блоков
export const BREAK_PER_SECOND = 30;
export const BREAK_PER_TICK = 5;
const FLAG_EVERY = 10;                     // одно очко движения — не чаще раза в 10 тиков
const ELYTRA_TAG = 'ac:elytra';

let tick = 0;
const state = new Map();                   // ник → состояние движения

// --- Блоки ---
const AIR = new Set(['minecraft:air', 'minecraft:light_block', 'minecraft:structure_void']);
// Рядом с ними обычные правила движения не действуют
const SPECIAL = /water|lava|ladder|vine|web|scaffolding|slime|honey_block|bubble_column|powder_snow|cobweb|bed$|sweet_berry|kelp|seagrass/;
const ICE = /ice$/;
// Твёрдые полные блоки (для noclip) — только явно известные семейства, чтобы плиты, ступени, заборы и растения
// не давали ложных срабатываний
const SOLID = /(^minecraft:(stone|grass|dirt|coarse_dirt|cobblestone|mossy_cobblestone|sand|red_sand|gravel|clay|bedrock|obsidian|crying_obsidian|netherrack|end_stone|glowstone|sea_lantern|magma|ancient_debris|netherite_block|iron_block|gold_block|diamond_block|emerald_block|lapis_block|redstone_block|coal_block|quartz_block|tuff|calcite|andesite|diorite|granite|blackstone|basalt|smooth_basalt|deepslate|cobbled_deepslate|prismarine|purpur_block|snow|packed_ice|blue_ice|mud_bricks|packed_mud|bricks|nether_brick|red_nether_brick|amethyst_block|copper_block|raw_iron_block|raw_gold_block|raw_copper_block|bookshelf|barrier)$)|_ore$|_planks$|_log$|_wood$|concrete$|terracotta$|wool$|sandstone$|_bricks$/;
const NOT_FULL = /slab|stairs|wall|fence|pane|door|button|plate|carpet|layer|sign|torch|chain|lantern|rail|powder/;

export const isAir = (id) => !id || AIR.has(id);
export const isSolid = (id) => !!id && SOLID.test(id) && !NOT_FULL.test(id);

function blockAt(dim, x, y, z) {
	try { return dim.getBlock(new BlockLocation(Math.floor(x), Math.floor(y), Math.floor(z)))?.typeId; } catch { return undefined; }
}

/** Опора и окружение: { ground, special, ice, unknown } по блокам под углами хитбокса и на уровне ног и головы. */
export function surroundings(player, pos = player.location) {
	const dim = player.dimension;
	const out = { ground: false, special: false, ice: false, unknown: false };
	for (const dx of [-0.3, 0.3]) {
		for (const dz of [-0.3, 0.3]) {
			for (const dy of [-0.6, -0.1, 0.5, 1.5]) {
				const id = blockAt(dim, pos.x + dx, pos.y + dy, pos.z + dz);
				if (id === undefined) { out.unknown = true; continue; }
				if (SPECIAL.test(id)) out.special = true;
				if (dy < 0 && !isAir(id)) { out.ground = true; if (ICE.test(id)) out.ice = true; }
			}
		}
	}
	return out;
}

function amplifier(player, type) {
	try { const e = player.getEffect(type); return e ? e.amplifier + 1 : 0; } catch { return 0; }
}

function holdsRiptide(player) {
	try {
		const item = player.getComponent('inventory').container.getItem(player.selectedSlot);
		return item?.typeId === 'minecraft:trident' && item.getComponent('enchantments').enchantments.hasEnchantment(MinecraftEnchantmentTypes.riptide) > 0;
	} catch {
		return false;
	}
}

const copy = ({ x, y, z }) => ({ x, y, z });

function newState(pos) {
	return { last: copy(pos), valid: copy(pos), air: 0, hover: 0, inBlock: 0, inBlockPath: 0, hist: [], grace: tick + GRACE_TICKS, lastFlag: -Infinity, iceUntil: -Infinity, breaks: [] };
}

/** Не проверять движение игрока ticks тиков (после телепорта скриптом, урона и т. п.). */
export function graceMovement(name, ticks = GRACE_TICKS) {
	const st = state.get(name);
	if (st) st.grace = Math.max(st.grace, tick + ticks);
}

/** Вернуть игрока на последнее честное место (режимы «откат» и «кик»). */
function rollback(player, st) {
	if (!rollbackEnabled()) return;
	const { x, y, z } = st.valid;
	try {
		player.teleport(st.valid, player.dimension, player.rotation.x, player.rotation.y);
	} catch {
		run(player, `tp @s ${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`);
	}
	st.last = copy(st.valid);
	st.hist = [];
	st.air = st.hover = st.inBlock = st.inBlockPath = 0;
}

function movementFlag(player, st, check, detail) {
	if (tick - st.lastFlag < FLAG_EVERY) return;
	st.lastFlag = tick;
	flag(player, check, detail);
	rollback(player, st);
}

/** Один тик проверки движения игрока. */
export function checkMovement(player) {
	const name = player.name;
	const pos = player.location;
	const st = state.get(name);
	if (!st) { state.set(name, newState(pos)); return; }
	const dx = pos.x - st.last.x, dy = pos.y - st.last.y, dz = pos.z - st.last.z;
	st.last = copy(pos);
	// Телепорт (команда, варп, жемчуг, мини-игра) — всё сначала
	if (Math.hypot(dx, dy, dz) > TP_BLOCKS) { state.set(name, newState(pos)); return; }
	st.hist.push(Math.hypot(dx, dz));
	if (st.hist.length > 20) st.hist.shift();
	const env = surroundings(player, pos);
	if (env.unknown) return;
	if (env.ice) st.iceUntil = tick + 40;
	const free = tick < st.grace || player.hasTag('state:frozen') || player.hasTag(ELYTRA_TAG) || env.special || holdsRiptide(player);
	if (free) { st.air = st.hover = 0; if (env.ground) st.valid = copy(pos); return; }

	// --- noclip: голова и ноги в твёрдом блоке ---
	const dim = player.dimension;
	const head = blockAt(dim, pos.x, pos.y + 1.6, pos.z), feet = blockAt(dim, pos.x, pos.y + 0.2, pos.z);
	// Застрявшего (засыпало гравием, залило шахту) не трогаем: нарушение — это движение внутри блоков
	if (isSolid(head) && isSolid(feet)) {
		st.inBlock++;
		// Шаги до блока за тик (ходьба, полёт сквозь стену); рывок дальше — толчок или команда, не считаем
		const step = Math.hypot(dx, dy, dz);
		if (step < 1) st.inBlockPath += step;
	} else st.inBlock = st.inBlockPath = 0;
	if (st.inBlock > NOCLIP_TICKS && st.inBlockPath > NOCLIP_PATH) { movementFlag(player, st, 'noclip', head.replace('minecraft:', '')); return; }

	// --- speed: путь по горизонтали за секунду ---
	if (st.hist.length === 20) {
		const speed = st.hist.reduce((a, b) => a + b, 0);
		let limit = SPEED_LIMIT * (1 + 0.2 * amplifier(player, MinecraftEffectTypes.speed));
		if (tick < st.iceUntil) limit *= ICE_FACTOR;
		if (speed > limit) { movementFlag(player, st, 'speed', speed.toFixed(1)); return; }
	}

	// --- fly: в воздухе и не падает ---
	if (env.ground) {
		st.air = st.hover = 0;
		if (st.inBlock === 0) st.valid = copy(pos);
		return;
	}
	st.air++;
	if (amplifier(player, MinecraftEffectTypes.levitation) || amplifier(player, MinecraftEffectTypes.slowFalling)) { st.hover = 0; return; }
	if (dy > (st.air > 10 ? -0.08 : -0.03)) st.hover++;
	const limit = FLY_TICKS + 8 * amplifier(player, MinecraftEffectTypes.jumpBoost);
	if (st.hover > limit) movementFlag(player, st, 'fly', (st.air / 20).toFixed(1));
}

// --- Удары: дальность и направление ---
const hitLog = new Map();                  // ник нападающего → [{ tick, target }]

/** Расстояние от глаз до ближайшей точки хитбокса игрока (0,6 × 1,8). */
export function reachDistance(eye, target) {
	const t = target.location;
	const cx = Math.max(t.x - 0.3, Math.min(eye.x, t.x + 0.3));
	const cy = Math.max(t.y, Math.min(eye.y, t.y + 1.8));
	const cz = Math.max(t.z - 0.3, Math.min(eye.z, t.z + 0.3));
	return Math.hypot(eye.x - cx, eye.y - cy, eye.z - cz);
}

/** Угол (градусы) между взглядом и направлением на центр цели и допустимый угол с поправкой на её размер. */
export function aimAngle(eye, view, target) {
	const t = target.location;
	const vx = t.x - eye.x, vy = t.y + 0.9 - eye.y, vz = t.z - eye.z;
	const dist = Math.hypot(vx, vy, vz);
	const vl = Math.hypot(view.x, view.y, view.z) || 1;
	const cos = (vx * view.x + vy * view.y + vz * view.z) / (dist * vl || 1);
	const angle = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
	const allowed = KILLAURA_ANGLE + Math.atan2(1, dist) * 180 / Math.PI;
	return { angle, allowed, dist };
}

/** Удар игрока по игроку: дальность, направление, несколько целей. Возвращает true, если удар засчитан нарушением. */
export function checkHit(attacker, victim, damage) {
	if (isExempt(attacker)) return false;
	let eye;
	try { eye = attacker.headLocation; } catch { return false; }
	if (!eye) return false;
	const reach = reachDistance(eye, victim);
	let bad = false;
	if (reach > REACH) { flag(attacker, 'reach', reach.toFixed(1)); bad = true; }
	const { angle, allowed, dist } = aimAngle(eye, attacker.viewVector, victim);
	if (!bad && dist > 1.5 && angle > allowed) { flag(attacker, 'killaura', `${Math.round(angle)}°`); bad = true; }
	const log = (hitLog.get(attacker.name) ?? []).filter(h => h.tick > tick - MULTI_TARGET_TICKS);
	log.push({ tick, target: victim.name });
	hitLog.set(attacker.name, log);
	const targets = new Set(log.map(h => h.target)).size;
	if (targets >= MULTI_TARGETS) { flag(attacker, 'killaura', `×${targets}`); hitLog.set(attacker.name, []); bad = true; }
	if (bad && rollbackEnabled() && damage > 0) {
		try {
			const health = victim.getComponent('health');
			if (health.current > 0) health.setCurrent(Math.min(health.value, health.current + damage));
		} catch { /* нет компонента */ }
	}
	return bad;
}

world.events.entityHurt.subscribe((e) => {
	const victim = e.hurtEntity, attacker = e.damagingEntity;
	if (victim?.typeId !== 'minecraft:player') return;
	// Отбрасывание, взрыв, падение после жемчуга — не считать движение читерским
	graceMovement(victim.name);
	if (attacker?.typeId !== 'minecraft:player' || attacker === victim || e.projectile) return;
	if (e.cause !== undefined && e.cause !== 'entityAttack') return;
	checkHit(attacker, victim, e.damage);
});

// --- Копание ---
/** Блок сломан игроком; возвращает true, если это нарушение. */
export function checkBreak(player) {
	if (isExempt(player)) return false;
	const st = state.get(player.name) ?? newState(player.location);
	state.set(player.name, st);
	st.breaks = st.breaks.filter(t => t > tick - 20);
	st.breaks.push(tick);
	const now = st.breaks.filter(t => t === tick).length;
	if (now >= BREAK_PER_TICK || st.breaks.length > BREAK_PER_SECOND) {
		flag(player, 'fastbreak', now >= BREAK_PER_TICK ? `${now}/tick` : `${st.breaks.length}/s`);
		st.breaks = [];
		return true;
	}
	return false;
}

world.events.blockBreak.subscribe((e) => { if (e.player) checkBreak(e.player); });

world.events.tick.subscribe(() => {
	tick++;
	// Элитры на груди скрипту в 1.19.50 не видны — тегом по hasitem раз в 2 секунды
	if (tick % 40 === 0) {
		const dim = world.getDimension('overworld');
		run(dim, `tag @a remove ${ELYTRA_TAG}`);
		run(dim, `tag @a[hasitem={item=elytra,location=slot.armor.chest}] add ${ELYTRA_TAG}`);
	}
	for (const player of world.getPlayers()) {
		if (isExempt(player)) { state.delete(player.name); continue; }
		try { checkMovement(player); } catch { /* игрок вышел или чанк не загружен */ }
	}
});

world.events.playerLeave.subscribe((e) => { state.delete(e.playerName); hitLog.delete(e.playerName); });
