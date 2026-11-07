// Перо «Прыжка веры» (scripts/system/player/void.js): ПКМ — левитация 10 с, плавное падение, минус одно перо;
// в мини-игре не срабатывает; другие предметы и не-игроки не трогаются.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const src = fs.readFileSync(new URL('../../behavior_packs/main-addon-shop_for_ore/scripts/system/player/void.js', import.meta.url), 'utf8')
	.replace(/^import .*;\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');
let use; const cmds = [], told = [];
vm.runInNewContext(src, {
	world: { events: { tick: { subscribe() {} }, itemUse: { subscribe: cb => { use = cb; } } }, getPlayers: () => [] },
	GameMode: {}, run: (p, c) => cmds.push(c), tell: (p, k) => told.push(k)
});
const player = (tags = []) => ({ typeId: 'minecraft:player', getTags: () => tags });
use({ item: { typeId: 'minecraft:feather' }, source: player() });
assert.deepEqual(cmds, ['clear @s feather 0 1', 'effect @s levitation 10 0', 'effect @s slow_falling 20 0 true']);
assert.deepEqual(told, ['chat.server.feather']);
cmds.length = 0; told.length = 0;
use({ item: { typeId: 'minecraft:feather' }, source: player(['game:spleef']) });
assert.deepEqual(cmds, []); assert.deepEqual(told, ['chat.server.feather_game']);
told.length = 0;
use({ item: { typeId: 'minecraft:stick' }, source: player() });
use({ item: { typeId: 'minecraft:feather' }, source: { typeId: 'minecraft:skeleton', getTags: () => [] } });
assert.equal(cmds.length + told.length, 0);
const errors = fs.readFileSync(new URL('../../behavior_packs/main-addon-shop_for_ore/scripts/system/ui/error_keys.js', import.meta.url), 'utf8');
assert.ok(errors.includes("'chat.server.feather_game'"));
for (const l of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) {
	const t = fs.readFileSync(new URL(`../../resource_packs/main-rp-shop_for_ore/texts/${l}.lang`, import.meta.url), 'utf8');
	assert.ok(/^chat\.server\.feather=/m.test(t) && /^chat\.server\.feather_game=/m.test(t), l);
}
console.log('PASS: feather of faith — levitation, slow falling, one feather consumed, blocked in mini-games.');
