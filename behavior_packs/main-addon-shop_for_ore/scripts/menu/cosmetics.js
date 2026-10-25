// --- Магазин → Косметика: цвет ника, цвет текста в чате, частицы вокруг игрока и при смерти ---
// Покупается за VIP-коины (табло vip_coins) один раз, дальше выбирается и снимается бесплатно.
// Куплено — тег cosmetic:<вид>:<id>; выбрано: цвет — chat:name_color / chat:text_color (как у !color),
// частицы — fx:trail:<id> / fx:death:<id>. Цвета ролей (тёмно-красный, красный, синий) в магазине
// не продаются тем, у кого этой роли нет (colorAllowed).

import { world } from '@minecraft/server';
import { ActionFormData, MessageFormData } from '@minecraft/server-ui';
import { CHAT_COLORS, getChatColor, setChatColor, colorAllowed, getScore, metricNumbers, run, rawTranslateRich, closedByPlayer } from '../DataBase.js';

const VIP_COIN = '';

// Цены в VIP-коинах (коин — за аметист на VIP-уровне)
const COLOR_PRICE = { name: 150, text: 100 };
// Частицы — только ванильные идентификаторы 1.19.50 (resource_pack/particles)
export const TRAILS = [
	{ id: 'heart', particle: 'minecraft:heart_particle', price: 300, icon: 'textures/items/apple_golden' },
	{ id: 'note', particle: 'minecraft:note_particle', price: 300, icon: 'textures/blocks/noteblock' },
	{ id: 'happy', particle: 'minecraft:villager_happy', price: 250, icon: 'textures/items/emerald' },
	{ id: 'endrod', particle: 'minecraft:endrod', price: 400, icon: 'textures/blocks/end_rod' },
	{ id: 'flame', particle: 'minecraft:basic_flame_particle', price: 350, icon: 'textures/items/blaze_powder' },
	{ id: 'soul', particle: 'minecraft:soul_particle', price: 450, icon: 'textures/blocks/soul_sand' },
	{ id: 'snow', particle: 'minecraft:snowflake_particle', price: 350, icon: 'textures/items/snowball' },
	{ id: 'portal', particle: 'minecraft:basic_portal_particle', price: 400, icon: 'textures/items/ender_pearl' }
];
export const DEATHS = [
	{ id: 'totem', particle: 'minecraft:totem_particle', price: 400, icon: 'textures/items/totem' },
	{ id: 'explosion', particle: 'minecraft:large_explosion', price: 300, icon: 'textures/blocks/tnt_side' },
	{ id: 'dragon', particle: 'minecraft:dragon_breath_lingering', price: 600, icon: 'textures/items/dragons_breath' },
	{ id: 'sonic', particle: 'minecraft:sonic_explosion', price: 700, icon: 'textures/items/echo_shard' },
	{ id: 'lava', particle: 'minecraft:lava_particle', price: 350, icon: 'textures/items/bucket_lava' },
	{ id: 'souls', particle: 'minecraft:soul_particle', price: 450, icon: 'textures/blocks/soul_sand' }
];
const FX = { trail: TRAILS, death: DEATHS };

const owns = (player, kind, id) => player.hasTag(`cosmetic:${kind}:${id}`);
const coins = (player) => getScore(player, 'vip_coins');
const price = (n) => `§8${metricNumbers(n)} ${VIP_COIN}`;

/** Выбранные частицы ('trail' | 'death') или undefined. */
export function getFx(player, kind) {
	const tag = player.getTags().find(t => t.startsWith(`fx:${kind}:`));
	const id = tag?.slice(`fx:${kind}:`.length);
	// Выбрать можно только купленное: тег, выданный в обход, не действует
	return FX[kind].find(e => e.id === id && owns(player, kind, id));
}
function setFx(player, kind, id) {
	player.getTags().filter(t => t.startsWith(`fx:${kind}:`)).forEach(t => player.removeTag(t));
	if (id) player.addTag(`fx:${kind}:${id}`);
}

/** Купить: проверить баланс, списать, выдать тег. @returns {boolean} */
function buy(player, kind, id, cost) {
	if (coins(player) < cost) {
		run(player, 'tellraw @s {"rawtext":[{"translate":"chat.shop.cosmetics.error.no_coins"}]}');
		run(player, 'playsound note.bass @s');
		return false;
	}
	run(player, `scoreboard players remove @s vip_coins ${cost}`);
	player.addTag(`cosmetic:${kind}:${id}`);
	run(player, 'playsound random.levelup @s');
	return true;
}

/** Подтверждение покупки. onYes — после покупки, back — по «Нет» и крестику. */
function confirmBuy(player, nameText, cost, onYes, back) {
	new MessageFormData()
	.title('%menu.shop.cosmetics.confirm.title')
	.body(`%menu.shop.cosmetics.confirm.body ${nameText}\n%menu.shop.cosmetics.confirm.price ${price(cost)}\n%menu.shop.cosmetics.balance ${price(coins(player))}`)
	// В 1.19.50 button1 — selection 1, button2 — selection 0
	.button1('\ue139 %menu.common.yes')
	.button2('\ue130 %menu.common.no')
	.show(player).then(r => {
		if (r.selection === 1) onYes();
		else if (r.selection === 0 || closedByPlayer(r)) back();
	});
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
	.button('%menu.common.back');
	form.show(player).then(r => {
		if (closedByPlayer(r) || r.selection === 4) return back();
		const again = () => cosmeticsMenu(player, back);
		if (r.selection === 0) colorMenu(player, 'name', again);
		else if (r.selection === 1) colorMenu(player, 'text', again);
		else if (r.selection === 2) fxMenu(player, 'trail', again);
		else if (r.selection === 3) fxMenu(player, 'death', again);
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
		const select = () => {
			setChatColor(player, kind, code);
			run(player, `tellraw @s ${rawTranslateRich(`chat.shop.cosmetics.selected.${kind}`, { text: `§${code}■` }, { translate: `color.${id}` })}`);
			again();
		};
		if (owns(player, kind, code)) return select();
		confirmBuy(player, `§${code}■§r %color.${id}`, COLOR_PRICE[kind], () => (buy(player, kind, code, COLOR_PRICE[kind]) ? select() : again()), again);
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
		const select = () => {
			setFx(player, kind, e.id);
			run(player, `tellraw @s ${rawTranslateRich(`chat.shop.cosmetics.selected.${kind}`, { translate: `cosmetics.${kind}.${e.id}` })}`);
			// Показать сразу, как это выглядит
			run(player, `particle ${e.particle} ~ ~1 ~`);
			again();
		};
		if (owns(player, kind, e.id)) return select();
		confirmBuy(player, `%cosmetics.${kind}.${e.id}`, e.price, () => (buy(player, kind, e.id, e.price) ? select() : again()), again);
	});
}

// --- Частицы вокруг игрока: раз в 5 тиков у ног; не у невидимых (!invis), наблюдателей и замороженных ---
const TRAIL_TICKS = 5;
let tick = 0;
world.events.tick.subscribe(() => {
	if (++tick % TRAIL_TICKS !== 0) return;
	for (const player of world.getPlayers()) {
		if (player.hasTag('state:invis') || player.hasTag('state:frozen') || player.hasTag('role:bot')) continue;
		const fx = getFx(player, 'trail');
		if (fx) player.runCommandAsync(`particle ${fx.particle} ~ ~0.2 ~`).catch(() => undefined);
	}
});

// --- Частицы при смерти: удар, после которого здоровье 0 ---
world.events.entityHurt.subscribe((e) => {
	const p = e.hurtEntity;
	if (!p || p.typeId !== 'minecraft:player') return;
	let hp;
	try { hp = p.getComponent('health').current; } catch { return; }
	if (hp > 0) return;
	const fx = getFx(p, 'death');
	if (!fx) return;
	const { x, y, z } = p.location;
	p.dimension.runCommandAsync(`particle ${fx.particle} ${x.toFixed(2)} ${(y + 1).toFixed(2)} ${z.toFixed(2)}`).catch(() => undefined);
});
