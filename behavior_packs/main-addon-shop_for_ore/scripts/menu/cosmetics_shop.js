// --- Магазин → Косметика: цвет ника и текста в чате, частицы вокруг игрока, при смерти и при продаже ---
// Покупается за VIP-коины (табло vip_coins) один раз, дальше выбирается и снимается бесплатно — как в магазине:
// нажал на товар → деньги списались, сообщение в чат (без окна подтверждения).
// Куплено — тег cosmetic:<вид>:<id>; выбрано: цвет — chat:name_color / chat:text_color (как у !color),
// частицы — fx:trail:<id> / fx:death:<id> / fx:sell:<id>. Цвета ролей (тёмно-красный, красный, синий)
// не продаются тем, у кого этой роли нет (colorAllowed). Смотреть Косметику может каждый, покупать — только VIP (уровень 26);
// купленное раньше (например, до ребитха) выбирается и без VIP, кроме частиц при продаже — они действуют только у VIP.

import { world, BlockLocation } from '@minecraft/server';
import { CHAT_COLORS, getChatColor, setChatColor, colorAllowed, getScore, metricNumbers, run, tell, isVip } from '../DataBase.js';
import { showMenu, backButton } from './forms.js';

const VIP_COIN = '';

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

/** Купить как в магазине: VIP и хватает коинов — списать и сообщить, иначе ошибка. @returns {boolean} */
function buy(player, kind, id, cost, mark, nameKey) {
	if (!isVip(player)) {
		tell(player, 'chat.shop.cosmetics.error.vip');
		run(player, 'playsound note.bass @s');
		return false;
	}
	if (coins(player) < cost) {
		tell(player, 'chat.shop.cosmetics.error.no_coins');
		run(player, 'playsound note.bass @s');
		return false;
	}
	run(player, `scoreboard players remove @s vip_coins ${cost}`);
	player.addTag(`cosmetic:${kind}:${id}`);
	tell(player, 'chat.shop.cosmetics.bought', { text: mark }, { translate: nameKey }, { text: `${metricNumbers(cost)} ${VIP_COIN}` });
	run(player, 'playsound random.levelup @s');
	return true;
}

// Пометка «[Только для VIP]» (common.vip_only) — второй строкой у заголовка и разделов; у товаров её нет.
// Не VIP — пометка есть, VIP — строки нет совсем (без пустого переноса)
const VIP_ONLY = '%common.vip_only';
const vipMark = (player, text) => isVip(player) ? text : `${text}\n${VIP_ONLY}`;

// --- Главное окно ---
export function cosmeticsMenu(player, back) {
	const again = () => cosmeticsMenu(player, back);
	const section = (kind, icon, open) => ({ text: vipMark(player, `%menu.shop.cosmetics.button.${kind}`), icon, run: () => open(player, kind, again) });
	showMenu(player, vipMark(player, '%menu.shop.cosmetics.title'), `%menu.shop.cosmetics.body\n%menu.shop.cosmetics.balance ${price(coins(player))}`, [
		section('name', 'textures/items/name_tag', colorMenu),
		section('text', 'textures/items/book_writable', colorMenu),
		section('trail', 'textures/items/blaze_powder', fxMenu),
		section('death', 'textures/items/totem', fxMenu),
		section('sell', 'textures/items/gold_ingot', fxMenu),
		backButton(back)
	], back);
}

// Состояние кнопки: выбрано / куплено / цена
const state = (selected, owned, cost) => selected ? '%menu.shop.cosmetics.selected' : owned ? '%menu.shop.cosmetics.owned' : price(cost);
const body = (player, kind) => `%menu.shop.cosmetics.${kind}.body\n%menu.shop.cosmetics.balance ${price(coins(player))}`;

// --- Цвет ника / текста ---
// После покупки, выбора или ошибки в чат приходит сообщение — и меню закрывается (menu/forms.js)
function colorMenu(player, kind, back) {
	// Цвета ролей — только своей роли и ниже (как у !color); текст сообщений — любым цветом
	const ids = Object.keys(CHAT_COLORS).filter(id => kind === 'text' || colorAllowed(player, CHAT_COLORS[id]));
	const current = getChatColor(player, kind);
	const choose = (id) => () => {
		const code = CHAT_COLORS[id];
		if (!owns(player, kind, code) && !buy(player, kind, code, COLOR_PRICE[kind], `§${code}■`, `color.${id}`)) return;
		setChatColor(player, kind, code);
		tell(player, `chat.shop.cosmetics.selected.${kind}`, { text: `§${code}■` }, { translate: `color.${id}` });
	};
	showMenu(player, `%menu.shop.cosmetics.${kind}.title`, body(player, kind), [
		{ text: '%menu.shop.cosmetics.reset', icon: 'textures/ui/refresh_light', run: () => { setChatColor(player, kind, undefined); tell(player, `chat.shop.cosmetics.reset.${kind}`); } },
		...ids.map(id => {
			const code = CHAT_COLORS[id];
			return { text: `§${code}■§r %color.${id}\n${state(current === `§${code}`, owns(player, kind, code), COLOR_PRICE[kind])}`, run: choose(id) };
		}),
		backButton(back)
	], back);
}

// --- Частицы ---
function fxMenu(player, kind, back) {
	const current = getFx(player, kind);
	// Частицы при продаже действуют только у VIP — выбрать их без VIP нельзя, даже купленные
	const locked = kind === 'sell' && !isVip(player);
	const choose = (e) => () => {
		if (locked) {
			tell(player, 'chat.shop.cosmetics.error.vip_sell');
			run(player, 'playsound note.bass @s');
			return;
		}
		if (!owns(player, kind, e.id) && !buy(player, kind, e.id, e.price, '', `cosmetics.${kind}.${e.id}`)) return;
		setFx(player, kind, e.id);
		tell(player, `chat.shop.cosmetics.selected.${kind}`, { translate: `cosmetics.${kind}.${e.id}` });
		// Показать сразу, как это выглядит
		if (kind === 'death') burst(player.dimension, player.location, e.particle);
		else run(player, `particle ${e.particle} ~ ~1 ~`);
	};
	showMenu(player, `%menu.shop.cosmetics.${kind}.title`, body(player, kind), [
		{ text: '%menu.shop.cosmetics.off', icon: 'textures/ui/cancel', run: () => { setFx(player, kind, undefined); tell(player, `chat.shop.cosmetics.off.${kind}`); } },
		...FX[kind].map(e => ({ text: `%cosmetics.${kind}.${e.id}\n${state(current?.id === e.id, owns(player, kind, e.id), e.price)}`, icon: e.icon, run: choose(e) })),
		backButton(back)
	], back);
}

const at = (v) => v.toFixed(2);
const particleAt = (dim, x, y, z, id) => run(dim, `particle ${id} ${at(x)} ${at(y)} ${at(z)}`);

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
				run(player, `particle ${sell.particle} ~ ~1 ~`);
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
