// --- Магазин → Косметика: цвет ника и текста в чате, частицы вокруг игрока, при смерти и при продаже ---
// Покупается за VIP-коины (табло vip_coins) один раз, дальше выбирается и снимается бесплатно — как в магазине:
// нажал на товар → деньги списались, сообщение в чат (без окна подтверждения).
// Куплено — тег cosmetic:<вид>:<id>; выбрано: цвет — chat:name_color / chat:text_color (как у !color),
// частицы — fx:trail:<id> / fx:death:<id> / fx:sell:<id>. Цвета ролей (тёмно-красный, красный, синий)
// не продаются тем, у кого этой роли нет (colorAllowed). Частицы при продаже смотреть может каждый, покупать и выбирать — только VIP.

import { world, BlockLocation } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { CHAT_COLORS, getChatColor, setChatColor, colorAllowed, getScore, metricNumbers, run, rawTranslateRich, closedByPlayer } from '../DataBase.js';

const VIP_COIN = '';
const isVip = (player) => getScore(player, 'lvl') >= 26;

// Цены в VIP-коинах (коин — за аметист на VIP-уровне)
const COLOR_PRICE = { name: 150, text: 100 };
// Частицы — только ванильные идентификаторы 1.19.50 (resource_pack/particles)
export const TRAILS = [
	{ id: 'heart', particle: 'minecraft:heart_particle', price: 300, icon: 'textures/items/apple_golden' },
	{ id: 'note', particle: 'minecraft:note_particle', price: 300, icon: 'textures/server_icons/note_block' },
	{ id: 'happy', particle: 'minecraft:villager_happy', price: 250, icon: 'textures/items/emerald' },
	{ id: 'endrod', particle: 'minecraft:endrod', price: 400, icon: 'textures/items/nether_star' },
	{ id: 'flame', particle: 'minecraft:basic_flame_particle', price: 350, icon: 'textures/items/blaze_powder' },
	{ id: 'soul', particle: 'minecraft:soul_particle', price: 450, icon: 'textures/server_icons/soul_sand' },
	{ id: 'snow', particle: 'minecraft:snowflake_particle', price: 350, icon: 'textures/items/snowball' },
	{ id: 'portal', particle: 'minecraft:basic_portal_particle', price: 400, icon: 'textures/items/ender_pearl' }
];
export const DEATHS = [
	{ id: 'totem', particle: 'minecraft:totem_particle', price: 400, icon: 'textures/items/totem' },
	{ id: 'explosion', particle: 'minecraft:large_explosion', price: 300, icon: 'textures/server_icons/tnt_block' },
	{ id: 'dragon', particle: 'minecraft:dragon_breath_lingering', price: 600, icon: 'textures/items/dragons_breath' },
	{ id: 'sonic', particle: 'minecraft:sonic_explosion', price: 700, icon: 'textures/items/echo_shard' },
	{ id: 'lava', particle: 'minecraft:lava_particle', price: 350, icon: 'textures/items/bucket_lava' },
	{ id: 'souls', particle: 'minecraft:soul_particle', price: 450, icon: 'textures/server_icons/soul_sand' }
];
// Частицы при продаже на золотом блоке (вместо стандартного тотема из autosale) — только VIP.
// «Лава» раньше была бесплатной у VIP (аметист в autosale), теперь продаётся здесь
export const SELLS = [
	{ id: 'heart', particle: 'minecraft:heart_particle', price: 200, icon: 'textures/items/apple_golden' },
	{ id: 'happy', particle: 'minecraft:villager_happy', price: 200, icon: 'textures/items/emerald' },
	{ id: 'note', particle: 'minecraft:note_particle', price: 250, icon: 'textures/server_icons/note_block' },
	{ id: 'endrod', particle: 'minecraft:endrod', price: 300, icon: 'textures/items/nether_star' },
	{ id: 'flame', particle: 'minecraft:basic_flame_particle', price: 300, icon: 'textures/items/blaze_powder' },
	{ id: 'portal', particle: 'minecraft:basic_portal_particle', price: 350, icon: 'textures/items/ender_pearl' },
	{ id: 'lava', particle: 'minecraft:lava_particle', price: 300, icon: 'textures/items/bucket_lava' }
];
const FX = { trail: TRAILS, death: DEATHS, sell: SELLS };
const SELL_FLAG = 'fx:sell';   // есть — autosale не показывает стандартные частицы продажи

const owns = (player, kind, id) => player.hasTag(`cosmetic:${kind}:${id}`);
const coins = (player) => getScore(player, 'vip_coins');
const price = (n) => `§8${metricNumbers(n)} ${VIP_COIN}`;

/** Выбранные частицы ('trail' | 'death' | 'sell') или undefined. */
export function getFx(player, kind) {
	const tag = player.getTags().find(t => t.startsWith(`fx:${kind}:`));
	const id = tag?.slice(`fx:${kind}:`.length);
	// Выбрать можно только купленное: тег, выданный в обход, не действует; частицы продажи — только у VIP
	if (kind === 'sell' && !isVip(player)) return undefined;
	return FX[kind].find(e => e.id === id && owns(player, kind, id));
}
function setFx(player, kind, id) {
	player.getTags().filter(t => t.startsWith(`fx:${kind}:`)).forEach(t => player.removeTag(t));
	if (id) player.addTag(`fx:${kind}:${id}`);
	if (kind === 'sell') syncSellFlag(player);
}
/** Тег fx:sell — только пока частицы продажи действительно действуют (VIP и куплено), иначе вернутся стандартные. */
function syncSellFlag(player) {
	const on = !!getFx(player, 'sell');
	if (on && !player.hasTag(SELL_FLAG)) player.addTag(SELL_FLAG);
	if (!on && player.hasTag(SELL_FLAG)) player.removeTag(SELL_FLAG);
}

/** Купить как в магазине: хватает — списать и сообщить, нет — ошибка. @returns {boolean} */
function buy(player, kind, id, cost, mark, nameKey) {
	if (coins(player) < cost) {
		run(player, 'tellraw @s {"rawtext":[{"translate":"chat.shop.cosmetics.error.no_coins"}]}');
		run(player, 'playsound note.bass @s');
		return false;
	}
	run(player, `scoreboard players remove @s vip_coins ${cost}`);
	player.addTag(`cosmetic:${kind}:${id}`);
	run(player, `tellraw @s ${rawTranslateRich('chat.shop.cosmetics.bought', { text: mark }, { translate: nameKey }, { text: `${metricNumbers(cost)} ${VIP_COIN}` })}`);
	run(player, 'playsound random.levelup @s');
	return true;
}

// --- Главное окно ---
export function cosmeticsMenu(player, back) {
	const form = new ActionFormData()
	.title('%menu.shop.cosmetics.title')
	.body(`%menu.shop.cosmetics.body\n%menu.shop.cosmetics.balance ${price(coins(player))}`)
	.button('%menu.shop.cosmetics.button.name', 'textures/items/name_tag')
	.button('%menu.shop.cosmetics.button.text', 'textures/items/book_writable')
	.button('%menu.shop.cosmetics.button.trail', 'textures/items/blaze_powder')
	.button('%menu.shop.cosmetics.button.death', 'textures/items/totem')
	.button(`%menu.shop.cosmetics.button.sell\n${isVip(player) ? '' : '%menu.shop.cosmetics.vip_only'}`, 'textures/items/gold_ingot')
	.button('%menu.common.back');
	form.show(player).then(r => {
		if (closedByPlayer(r) || r.selection === 5) return back();
		const again = () => cosmeticsMenu(player, back);
		if (r.selection === 0) colorMenu(player, 'name', again);
		else if (r.selection === 1) colorMenu(player, 'text', again);
		else if (r.selection === 2) fxMenu(player, 'trail', again);
		else if (r.selection === 3) fxMenu(player, 'death', again);
		else if (r.selection === 4) fxMenu(player, 'sell', again);
	});
}

// Состояние кнопки: выбрано / куплено / цена
const state = (selected, owned, cost) => selected ? '%menu.shop.cosmetics.selected' : owned ? '%menu.shop.cosmetics.owned' : price(cost);

// --- Цвет ника / текста ---
function colorMenu(player, kind, back) {
	// Цвета ролей — только своей роли и ниже (как у !color); текст сообщений — любым цветом
	const ids = Object.keys(CHAT_COLORS).filter(id => kind === 'text' || colorAllowed(player, CHAT_COLORS[id]));
	const current = getChatColor(player, kind);
	const form = new ActionFormData()
	.title(`%menu.shop.cosmetics.${kind}.title`)
	.body(`%menu.shop.cosmetics.${kind}.body\n%menu.shop.cosmetics.balance ${price(coins(player))}`)
	.button('%menu.shop.cosmetics.reset', 'textures/ui/refresh_light');
	for (const id of ids) {
		const code = CHAT_COLORS[id];
		form.button(`§${code}■§r %color.${id}\n${state(current === `§${code}`, owns(player, kind, code), COLOR_PRICE[kind])}`);
	}
	form.button('%menu.common.back');
	form.show(player).then(r => {
		if (closedByPlayer(r) || r.selection === ids.length + 1) return back();
		const again = () => colorMenu(player, kind, back);
		if (r.selection === 0) {
			setChatColor(player, kind, undefined);
			run(player, `tellraw @s {"rawtext":[{"translate":"chat.shop.cosmetics.reset.${kind}"}]}`);
			return again();
		}
		const id = ids[r.selection - 1];
		const code = CHAT_COLORS[id];
		if (!owns(player, kind, code) && !buy(player, kind, code, COLOR_PRICE[kind], `§${code}■`, `color.${id}`)) return again();
		setChatColor(player, kind, code);
		run(player, `tellraw @s ${rawTranslateRich(`chat.shop.cosmetics.selected.${kind}`, { text: `§${code}■` }, { translate: `color.${id}` })}`);
		again();
	});
}

// --- Частицы ---
function fxMenu(player, kind, back) {
	const list = FX[kind];
	const current = getFx(player, kind);
	const form = new ActionFormData()
	.title(`%menu.shop.cosmetics.${kind}.title`)
	.body(`%menu.shop.cosmetics.${kind}.body\n%menu.shop.cosmetics.balance ${price(coins(player))}`)
	.button('%menu.shop.cosmetics.off', 'textures/ui/cancel');
	for (const e of list) form.button(`%cosmetics.${kind}.${e.id}\n${state(current?.id === e.id, owns(player, kind, e.id), e.price)}`, e.icon);
	form.button('%menu.common.back');
	form.show(player).then(r => {
		if (closedByPlayer(r) || r.selection === list.length + 1) return back();
		const again = () => fxMenu(player, kind, back);
		if (r.selection === 0) {
			setFx(player, kind, undefined);
			run(player, `tellraw @s {"rawtext":[{"translate":"chat.shop.cosmetics.off.${kind}"}]}`);
			return again();
		}
		const e = list[r.selection - 1];
		// Частицы при продаже: смотреть может каждый, купить и выбрать — только VIP
		if (kind === 'sell' && !isVip(player)) {
			run(player, 'tellraw @s {"rawtext":[{"translate":"chat.shop.cosmetics.error.vip"}]}');
			run(player, 'playsound note.bass @s');
			return again();
		}
		if (!owns(player, kind, e.id) && !buy(player, kind, e.id, e.price, '', `cosmetics.${kind}.${e.id}`)) return again();
		setFx(player, kind, e.id);
		run(player, `tellraw @s ${rawTranslateRich(`chat.shop.cosmetics.selected.${kind}`, { translate: `cosmetics.${kind}.${e.id}` })}`);
		// Показать сразу, как это выглядит
		if (kind === 'death') burst(player.dimension, player.location, e.particle);
		else run(player, `particle ${e.particle} ~ ~1 ~`);
		again();
	});
}

const at = (v) => v.toFixed(2);
const particleAt = (dim, x, y, z, id) => dim.runCommandAsync(`particle ${id} ${at(x)} ${at(y)} ${at(z)}`).catch(() => undefined);

// --- Частицы вокруг игрока: только в движении — след там, где игрок только что был (на уровне пояса) ---
// Стоит на месте (АФК) — частиц нет. Не у невидимых (!invis), замороженных и бота
const TRAIL_TICKS = 4;
const MOVE_MIN = 0.15;            // блоков за TRAIL_TICKS тиков — меньше считается «стоит»
const lastPos = new Map();        // ник → { x, y, z }
// --- Частицы при продаже: счёт вырос, пока игрок стоит на золотом блоке ---
const lastWorth = new Map();      // ник → money + vip_coins + xp
let tick = 0;
world.events.tick.subscribe(() => {
	if (++tick % TRAIL_TICKS !== 0) return;
	for (const player of world.getPlayers()) {
		const { x, y, z } = player.location;
		const prev = lastPos.get(player.name);
		lastPos.set(player.name, { x, y, z });
		syncSellFlag(player);
		const sell = getFx(player, 'sell');
		if (sell) {
			const worth = getScore(player, 'money') + getScore(player, 'vip_coins') + getScore(player, 'xp');
			const was = lastWorth.get(player.name);
			lastWorth.set(player.name, worth);
			if (was !== undefined && worth > was && player.hasTag('player:particle') && onGold(player)) {
				player.runCommandAsync(`particle ${sell.particle} ~ ~1 ~`).catch(() => undefined);
			}
		}
		if (player.hasTag('state:invis') || player.hasTag('state:frozen') || player.hasTag('role:bot')) continue;
		const fx = getFx(player, 'trail');
		if (!fx || !prev) continue;
		if (Math.hypot(x - prev.x, y - prev.y, z - prev.z) < MOVE_MIN) continue;
		particleAt(player.dimension, prev.x, prev.y + 0.6, prev.z, fx.particle);
	}
});
world.events.playerLeave.subscribe((e) => { lastPos.delete(e.playerName); lastWorth.delete(e.playerName); });

function onGold(player) {
	try {
		const { x, y, z } = player.location;
		return player.dimension.getBlock(new BlockLocation(Math.floor(x), Math.floor(y) - 1, Math.floor(z))).typeId === 'minecraft:gold_block';
	} catch {
		return false;
	}
}

// --- Частицы при смерти: удар, после которого здоровье 0. Облако не меньше 2×2 блока ---
// Центр + 8 точек по кругу радиусом 1.2 на двух высотах (≈2.4 блока в поперечнике и 2 в высоту)
function burst(dim, loc, id) {
	particleAt(dim, loc.x, loc.y + 1, loc.z, id);
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2;
		const dx = Math.cos(a) * 1.2, dz = Math.sin(a) * 1.2;
		particleAt(dim, loc.x + dx, loc.y + 0.3, loc.z + dz, id);
		particleAt(dim, loc.x + dx, loc.y + 1.5, loc.z + dz, id);
	}
}
world.events.entityHurt.subscribe((e) => {
	const p = e.hurtEntity;
	if (!p || p.typeId !== 'minecraft:player') return;
	let hp;
	try { hp = p.getComponent('health').current; } catch { return; }
	if (hp > 0) return;
	const fx = getFx(p, 'death');
	if (fx) burst(p.dimension, p.location, fx.particle);
});
