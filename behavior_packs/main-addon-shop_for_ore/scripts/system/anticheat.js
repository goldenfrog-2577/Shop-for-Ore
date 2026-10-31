// --- Античит: основа (очки нарушений, сигналы персоналу, режим) и проверка инвентаря ---
// Каждая проверка (список CHECKS) начисляет игроку очки нарушений (VL). Очки тают: −1 раз в DECAY_SECONDS секунд.
// Когда очки проверки доходят до её порога — хелперам и выше в сети приходит сигнал (не чаще раза в
// ALERT_COOLDOWN секунд на игрока и проверку). Игрокам сигналы не видны.
// Режим — табло settings, участник ac_mode (/scoreboard players set ac_mode settings <число>):
//   1 — только сигналы; 2 (и 0 / не задан) — сигнал + откат; 3 — откат и кик, когда очки втрое выше порога.
// Откат: движение (скорость, полёт, сквозь блоки) — возврат на последнее честное место (system/anticheat_checks.js),
// удар (дальность, удар не глядя) — урон возвращается жертве; быстрое копание — только сигнал
// (поставить блок обратно нельзя: добыча и деньги уже начислены).
// Запрещённые предметы и читерские зачарования удаляются из инвентаря в любом режиме.
// Очки не сбрасываются выходом из мира (перезаход не помогает), только тают.
// Не проверяются: владелец и администраторы, бот, творческий режим и режим наблюдателя.
// !ac <ник> — очки игрока по проверкам; !ac — режим и игроки с очками (хелпер и выше).

import { world, system, Items, ItemStack, GameMode, EnchantmentList, Enchantment } from '@minecraft/server';
import { hasRole, run } from '../DataBase.js';

// --- Проверки: порог сигнала (VL) ---
export const CHECKS = {
	item: 1,       // запрещённый предмет
	enchant: 1,    // невозможное зачарование, неверное количество в стопке
	reach: 3,      // удар дальше REACH блоков
	killaura: 4,   // удар по цели вне поля зрения, удары по нескольким целям сразу
	speed: 5,      // слишком быстрое движение по горизонтали
	fly: 5,        // зависание и подъём в воздухе
	noclip: 3,     // голова и ноги внутри твёрдого блока дольше секунды
	fastbreak: 3   // слишком быстрое копание (порог высокий: VIP-кирки копают мгновенно)
};
const DECAY_SECONDS = 5;
const ALERT_COOLDOWN = 15;
export const KICK_FACTOR = 3;

export const MODE = { alerts: 1, rollback: 2, kick: 3 };
const MODE_NAMES = { 1: 'alerts', 2: 'rollback', 3: 'kick' };

let tick = 0;
const vl = new Map();          // ник → { проверка: очки }
const lastAlert = new Map();   // 'ник|проверка' → тик последнего сигнала

/** Режим из табло settings (ac_mode), по умолчанию — сигнал + откат. */
export function acMode() {
	try {
		const info = world.scoreboard.getObjective('settings').getScores().find(s => s.participant.displayName === 'ac_mode');
		return info && MODE_NAMES[info.score] ? info.score : MODE.rollback;
	} catch {
		return MODE.rollback;
	}
}
export const modeName = (mode = acMode()) => MODE_NAMES[mode];
/** Откатывать ли нарушение (режимы «откат» и «кик»). */
export const rollbackEnabled = () => acMode() >= MODE.rollback;

/** Игрок не проверяется: владелец, администратор, бот, творческий режим, наблюдатель. */
export function isExempt(player) {
	if (player.hasTag('role:bot') || hasRole(player, 'admin')) return true;
	return !checkedNames().has(player.name);
}

// Игроки не в творческом режиме и не наблюдатели — один запрос на тик
let checkedTick = -1, checked = new Set();
function checkedNames() {
	if (checkedTick === tick) return checked;
	checkedTick = tick;
	try {
		checked = new Set([...world.getPlayers({ excludeGameModes: [GameMode.creative, GameMode.spectator] })].map(p => p.name));
	} catch {
		checked = new Set([...world.getPlayers()].map(p => p.name));
	}
	return checked;
}

/** Очки игрока по проверкам: { проверка: очки } (только ненулевые). */
export function violationsOf(name) {
	const out = {};
	for (const [check, points] of Object.entries(vl.get(name) ?? {})) if (points > 0) out[check] = Math.ceil(points);
	return out;
}

/** Ники игроков с ненулевыми очками и их сумма. */
export function flaggedPlayers() {
	const out = [];
	for (const name of vl.keys()) {
		const total = Object.values(violationsOf(name)).reduce((a, b) => a + b, 0);
		if (total > 0) out.push({ name, total });
	}
	return out.sort((a, b) => b.total - a.total);
}

/** Сигнал персоналу (хелпер и выше): tellraw по нику, а не @s, — чтобы не закрывать им открытое меню. */
function alertStaff(json) {
	const dim = world.getDimension('overworld');
	for (const p of world.getPlayers()) {
		if (p.hasTag('role:bot') || !hasRole(p, 'helper')) continue;
		run(dim, `tellraw "${p.name.replace(/"/g, '')}" ${json}`);
	}
}

/**
 * Нарушение: очки проверке, сигнал персоналу на пороге, кик в режиме «кик».
 * @param {Player} player
 * @param {keyof CHECKS} check
 * @param {string|number} detail — значение для anticheat.detail.<проверка> (метры, м/с, предмет…)
 * @param {number} [points]
 * @returns {number} очки проверки после начисления
 */
export function flag(player, check, detail, points = 1) {
	const name = player.name;
	const rec = vl.get(name) ?? {};
	rec[check] = (rec[check] ?? 0) + points;
	vl.set(name, rec);
	const level = Math.ceil(rec[check]);
	const threshold = CHECKS[check] ?? 1;
	const key = `${name}|${check}`;
	if (level >= threshold && (lastAlert.get(key) ?? -Infinity) <= tick - ALERT_COOLDOWN * 20) {
		lastAlert.set(key, tick);
		alertStaff(JSON.stringify({ rawtext: [{ translate: 'chat.anticheat.alert', with: { rawtext: [
			{ text: name },
			{ translate: `anticheat.check.${check}` },
			{ text: String(level) },
			{ translate: `anticheat.detail.${check}`, with: [String(detail)] }
		] } }] }));
	}
	if (acMode() === MODE.kick && level >= threshold * KICK_FACTOR) {
		rec[check] = 0;
		alertStaff(JSON.stringify({ rawtext: [{ translate: 'chat.anticheat.kicked', with: { rawtext: [{ text: name }, { translate: `anticheat.check.${check}` }] } }] }));
		run(world.getDimension('overworld'), `kick "${name.replace(/"/g, '')}" Anti-Cheat: ${check}`);
	}
	return rec[check];
}

/** Сбросить очки игрока (все или одной проверки). */
export function clearViolations(name, check) {
	if (!check) { vl.delete(name); return; }
	const rec = vl.get(name);
	if (rec) delete rec[check];
}

// --- Запрещённые предметы ---
// Взрывные зелья и арбалет разрешены с 0.3.0: они выпадают в мистике (system/mythic.js); оседающие — по-прежнему нет
export const bannedItems = new Set([
	'minecraft:beehive',
	'minecraft:bee_nest',
	'minecraft:salmon_bucket',
	'minecraft:cod_bucket',
	'minecraft:pufferfish_bucket',
	'minecraft:tropical_fish_bucket',
	'minecraft:axolotl_bucket',
	'minecraft:tadpole_bucket',
	'minecraft:portal',
	'minecraft:end_portal',
	'minecraft:moving_block',
	'minecraft:movingblock',
	'minecraft:info_update',
	'minecraft:info_update2',
	'minecraft:stickyPinstonArmCollision',
	'minecraft:lingering_potion',
	'minecraft:fire',
	'minecraft:soul_fire',
	'minecraft:bedrock',
	'minecraft:invisiblebedrock',
	'minecraft:glowlingobsidian',
	'minecraft:flowing_water',
	'minecraft:flowing_lava',
	'minecraft:command_block_minecart',
	// С 0.3.0 (#63): блоки, которые выдаёт только меню администратора
	'minecraft:command_block',
	'minecraft:repeating_command_block',
	'minecraft:chain_command_block',
	'minecraft:structure_block',
	'minecraft:structure_void',
	'minecraft:jigsaw',
	'minecraft:barrier',
	'minecraft:light_block',
	'minecraft:allow',
	'minecraft:deny',
	'minecraft:border_block',
	'minecraft:mob_spawner',
	'minecraft:end_portal_frame'
]);

/** Запрещён ли предмет: список выше и любые яйца призыва (ванильные и server:floating_text_spawn_egg). */
export const isBanned = (typeId) => bannedItems.has(typeId) || typeId === 'minecraft:spawn_egg' || typeId.endsWith('_spawn_egg');

// --- Предметы VIP-лавки (VIP-остров, x −84…−74): чары выше ванильного максимума продаются намеренно ---
// Раньше предмет пропускался по одному имени — переименованный на наковальне меч «Зачарованая кирка #1»
// проходил с любыми чарами. Теперь сверяются тип, имя и потолок каждого зачарования (из сундуков лавки);
// прочие зачарования — по обычным правилам (магазин зачарований добавляет до ванильного максимума).
export const VIP_ITEMS = {
	'minecraft:netherite_pickaxe|§r§lЗачарованая кирка #1': { efficiency: 10, fortune: 5 },
	'minecraft:netherite_pickaxe|§r§lЗачарованая кирка #2': { efficiency: 20, fortune: 10 },
	'minecraft:netherite_pickaxe|§r§lЗачарованая кирка #3': { efficiency: 30, fortune: 15 },
	'minecraft:skull|§r§eЧереп скелета': { protection: 10 },
	'minecraft:skull|§r§eЧереп скелета-иссушителя': { protection: 10 },
	'minecraft:skull|§r§eГолова зомби': { protection: 10 },
	'minecraft:skull|§r§eГолова игрока': { protection: 10 },
	'minecraft:skull|§r§eГолова крипера': { protection: 10 },
	'minecraft:skull|§r§eГолова дракона Края': { protection: 10 }
};

// --- Размер стопки ---
// В 1.19.50 у ItemStack нет maxAmount: предметы с прочностью — по одному, известные «по 16» — до 16, прочие — до 64
const STACK_16 = new Set(['minecraft:ender_pearl', 'minecraft:snowball', 'minecraft:egg', 'minecraft:bucket', 'minecraft:honey_bottle',
	'minecraft:oak_sign', 'minecraft:spruce_sign', 'minecraft:birch_sign', 'minecraft:jungle_sign', 'minecraft:acacia_sign',
	'minecraft:dark_oak_sign', 'minecraft:mangrove_sign', 'minecraft:crimson_sign', 'minecraft:warped_sign', 'minecraft:banner',
	'minecraft:armor_stand', 'server:portable_ender_crystal']);
const STACK_1 = /(potion|_bucket|_boat|_minecart|totem_of_undying|enchanted_book|written_book|writable_book|_stew|cake|saddle|music_disc|bed)$/;
function maxStack(item) {
	if (STACK_16.has(item.typeId)) return 16;
	if (STACK_1.test(item.typeId)) return 1;
	try { if (item.getComponent('durability')) return 1; } catch { /* компонента нет */ }
	return 64;
}

// Короткий id зачарования (как в MinecraftEnchantmentTypes) из type.id: 'minecraft:efficiency' / 'efficiency'
const enchantId = (e) => String(e.type.id).replace('minecraft:', '');

/**
 * Что не так с предметом: undefined — всё в порядке, иначе { check, detail }.
 * Неверная стопка, уровень выше максимума (у VIP-предметов — выше потолка лавки),
 * несовместимые зачарования или зачарование не для этого предмета.
 */
export function inspectItem(item) {
	if (isBanned(item.typeId)) return { check: 'item', detail: item.typeId };
	if (item.amount > maxStack(item)) return { check: 'enchant', detail: `${item.typeId} ×${item.amount}` };
	let list;
	try { list = item.getComponent('enchantments')?.enchantments; } catch { list = undefined; }
	if (!list) return undefined;
	const vip = VIP_ITEMS[`${item.typeId}|${item.nameTag ?? ''}`];
	// Совместимость: собираем зачарования по одному в пустой список того же слота с уровнем 1 —
	// canAddEnchantment откажет на конфликте (острота + небесная кара) и на чужом предмете (острота на кирке).
	// Книга принимает что угодно; зачарования VIP-лавки (защита на голове) законны сами по себе
	let fresh;
	try { fresh = item.typeId === 'minecraft:enchanted_book' ? undefined : new EnchantmentList(list.slot); } catch { fresh = undefined; }
	for (const e of list) {
		const id = enchantId(e);
		const cap = vip?.[id] ?? e.type.maxLevel;
		if (e.level > cap) return { check: 'enchant', detail: `${item.typeId} ${id} ${e.level}` };
		if (!fresh || vip?.[id]) continue;
		try {
			const one = new Enchantment(e.type, 1);
			if (!fresh.canAddEnchantment(one)) return { check: 'enchant', detail: `${item.typeId} ${id}` };
			fresh.addEnchantment(one);
		} catch { /* API не дал проверить — не наказываем */ }
	}
	return undefined;
}

// --- Пустой предмет для очистки слота ---
const air = new ItemStack(Items.get('minecraft:stick'), 0);

// --- Проверка инвентаря раз в CHECK_EVERY_TICKS тиков; очки тают раз в секунду ---
const CHECK_EVERY_TICKS = 10;
system.runSchedule(() => {
	tick++;
	if (tick % 20 === 0) {
		for (const [name, rec] of vl) {
			for (const check of Object.keys(rec)) {
				rec[check] = Math.max(0, rec[check] - 1 / DECAY_SECONDS);
				if (rec[check] === 0) delete rec[check];
			}
			if (!Object.keys(rec).length) vl.delete(name);
		}
	}
	if (tick % CHECK_EVERY_TICKS !== 0) return;
	for (const player of world.getPlayers()) {
		// Администратор и владелец не проверяются: им нужны командные блоки и т. п. из админ-меню;
		// в творческом режиме предметы берутся из меню режима
		if (isExempt(player)) continue;
		const container = player.getComponent('inventory').container;
		for (let i = 0; i < container.size; i++) {
			const item = container.getItem(i);
			if (!item) continue;
			const bad = inspectItem(item);
			if (!bad) continue;
			container.setItem(i, air);
			flag(player, bad.check, bad.detail);
			run(player, `tellraw @s ${JSON.stringify({ rawtext: [{ translate: `chat.anticheat.removed.${bad.check}`, with: [item.typeId] }] })}`);
		}
	}
});

