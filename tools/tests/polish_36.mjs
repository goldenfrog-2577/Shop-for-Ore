// Мелкие правки (PR «Мелочи»): роль «Игрок» белая и в чате, кнопки меню админа, «нет» в бустах, промокоды книгой —
// только в запасном меню, справка !worldedit как !help, облако частиц при продаже, портал арены Хранителя.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const root = new URL('../../', import.meta.url);
const bp = new URL('behavior_packs/main-addon-shop_for_ore/', root), rp = new URL('resource_packs/main-rp-shop_for_ore/', root);
const read = (u) => fs.readFileSync(u, 'utf8');
const LANGS = ['ru_RU', 'en_US', 'uk_UA', 'es_ES'];
const lang = Object.fromEntries(LANGS.map(l => [l, Object.fromEntries(read(new URL(`texts/${l}.lang`, rp)).replace(/^﻿/, '').split(/\r?\n/)
	.filter(x => x.includes('=') && !x.startsWith('#')).map(x => [x.slice(0, x.indexOf('=')), x.slice(x.indexOf('=') + 1)]))]));

// Роль «Игрок» — белая везде; в чате префикс роли есть у каждого, переводится на языке читателя
for (const l of LANGS) {
	assert.match(lang[l]['role.player'], /^§f\S/, l); assert.equal(lang[l]['role.tag.player'], lang[l]['role.player'], l);
}
const chat = read(new URL('scripts/chat/chat.js', bp));
assert.ok(!chat.includes('rankDefault') && !chat.includes("role !== 'player'"));
assert.match(chat, /\{ translate: `role\.tag\.\$\{role\}` \}\];/);

// Меню админа: «Сбросить пароль» — последняя кнопка перед «Назад»; «Убрать бота» — только когда бот в мире
const admin = read(new URL('scripts/menu/admin/admin_menu.js', bp));
const reset = admin.indexOf("'%admin.players.button.resetpass'"), vip = admin.indexOf("'%admin.players.button.vip_give'"), back = admin.indexOf('items.push(back(openProfile));', reset);
assert.ok(vip < reset && reset < back && admin.indexOf("'%admin.players.button.resetpass'", reset + 1) < 0);
assert.ok(!/[^\n]*'%admin\.players\.button\.resetpass'[^\n]*\n[^\n]*\n[^\n]*vip_give/.test(admin));
assert.match(admin, /\.\.\.\(bot \? \[\{ text: '%admin\.bot\.button\.remove'/);
// Карточка игрока: «Предупреждения» → «Монет на балансе» → «VIP-монеты»
const actions = admin.indexOf('function playerActions(');
const w = admin.indexOf('%admin.players.body.warns ', actions), v = admin.indexOf('%admin.players.body.vip_coins ', actions), m = admin.indexOf('%admin.players.body.money ', actions);
assert.ok(w > 0 && w < m && m < v);

// !boost stop: прочерк заменён словом «нет» на языке читателя
assert.match(read(new URL('scripts/chat/commands/admin.js', bp)), /boost \?\? \{ translate: 'chat\.cmd\.boost\.stop\.no' \}/);
assert.deepEqual(LANGS.map(l => lang[l]['chat.cmd.boost.stop.no']), ['нет', 'none', 'немає', 'ninguno']);

// Промокоды книгой — не в меню промокодов (скрипты работают), а в запасном меню; в списке «недоступно» промокодов нет
assert.ok(!read(new URL('scripts/menu/main_menu.js', bp)).includes('promo.book'));
const dialogue = read(new URL('dialogue/fallback_menu.json', bp));
assert.ok(dialogue.includes('"legacy_menu.notice"') && dialogue.includes('"legacy_menu.promo"'));
for (const l of LANGS) { assert.ok(!lang[l]['menu.promo.book'], l); assert.ok(!/промокод|promo code|промокоди|códigos promocionales/i.test(lang[l]['legacy_menu.notice']), l); }

// Справка !worldedit: команда слева, синтаксис и описание справа.
const we = read(new URL('scripts/system/worldedit.js', bp));
const lines = Number(we.match(/export const HELP_LINES=(\d+);/)[1]);
for (const l of LANGS) {
	assert.ok(lang[l]['chat.cmd.worldedit.help.header'].length > 0, l);
	assert.doesNotMatch(lang[l]['chat.cmd.worldedit.help.header'], /-{5}/, l);
	for (let i = 1; i < lines; i++) {
		const row = lang[l][`chat.cmd.worldedit.help.${i}`];
		assert.match(row, /^§f!worldedit [a-z0-9]+ +§8- §7\S/, `${l} ${i}`);
		assert.equal(row.split('§8-')[0], lang.en_US[`chat.cmd.worldedit.help.${i}`].split('§8-')[0], `${l} ${i}`);
	}
	assert.match(lang[l][`chat.cmd.worldedit.help.${lines}`], /^§7\S/, l);   // владелец: §7, как остальные строки assert.ok(!lang[l][`chat.cmd.worldedit.help.${lines + 1}`], l);
}
assert.ok(we.includes("tellList(player, { translate: 'chat.cmd.worldedit.help.header' }, lines)"));

// Облако при продаже: точки вокруг игрока, от ног до макушки, не в нём самом
const cos = read(new URL('scripts/menu/cosmetics_shop.js', bp));
const fn = cos.slice(cos.indexOf('export const SELL_POINTS'), cos.indexOf('function sellCloud')).replace(/export /g, '');
const C = vm.runInNewContext(fn + ';({SELL_POINTS,sellPoints})', { Math });
for (const r of [() => 0, () => 0.999, Math.random]) {
	const pts = C.sellPoints(r); assert.equal(pts.length, C.SELL_POINTS);
	for (const [x, y, z] of pts) { const d = Math.hypot(x, z); assert.ok(d >= 0.59 && d <= 1.31 && y >= 0.1 && y <= 2.01); }
}
assert.ok(!cos.includes('particle ${sell.particle} ~ ~1 ~'));

// Бирюзовый портал: функция только ставит тег, телепорт — командой warp boss (те же проверки уровня и боя), отказ не чаще DENY_TICKS
const sys = read(new URL('functions/system/system.mcfunction', bp));
assert.ok(sys.includes('tag @a[x=-115,y=0,z=-51,r=1,tag=!role:bot,tag=!sys:warp_boss] add sys:warp_boss') && !sys.includes('tp @s 528 -55 -5'));
const portal = read(new URL('scripts/system/boss/portal.js', bp)).replace(/^import .*;\r?\n/gm, '').replace(/\bexport (?=const)/g, '');
let cb; const calls = []; const players = [];
vm.runInNewContext(portal, {
	system: { runSchedule: (f, n) => { assert.equal(n, 2); cb = f; } },
	world: { getPlayers: () => players.values(), events: { playerLeave: { subscribe() {} } } },
	runChatCommand: (p, c, a) => calls.push([p.name, c, ...a])
});
const tags = new Set(['sys:warp_boss']); const P = { name: 'low', hasTag: t => tags.has(t), removeTag: t => tags.delete(t) };
players.push(P);
for (let i = 0; i < 40; i++) { tags.add('sys:warp_boss'); cb(); }      // стоит в портале 80 тиков
assert.deepEqual(calls, [['low', 'warp', 'boss'], ['low', 'warp', 'boss']]);
assert.ok(!tags.has('sys:warp_boss'));

console.log('PASS: white player role + chat prefix, admin menu order, boost "no", promo book only in legacy menu, WorldEdit help layout, sell cloud, boss portal via !warp boss.');
