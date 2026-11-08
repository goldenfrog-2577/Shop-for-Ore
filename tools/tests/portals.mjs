// Порталы закрыты (scripts/system/security/portals.js): поджиг огнивом/зарядом по обсидиану и оком в рамку отменяется
// (сообщение не чаще раза в 2 с), порталы вокруг игроков ломаются /fill с обрезкой по высоте мира,
// из Незера и Энда — на спавн верхнего мира. Правила одни для всех ролей.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url);
const src = fs.readFileSync(new URL('scripts/system/security/portals.js', bp), 'utf8')
	.replace(/^import .*;\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');
let useOn, tick; const told = [], commands = [], teleports = [];
const dim = (id) => ({ id, runCommandAsync: c => { commands.push([id, c]); return Promise.resolve({}); }, getBlock: () => ({ typeId: blocks.get(id) }) });
const blocks = new Map();
const dims = { overworld: dim('minecraft:overworld'), nether: dim('minecraft:nether'), end: dim('minecraft:the_end') };
let players = [];
const ctx = {
	world: {
		events: { beforeItemUseOn: { subscribe: cb => { useOn = cb; } }, playerLeave: { subscribe() {} }, tick: { subscribe: cb => { tick = cb; } } },
		getPlayers: () => players[Symbol.iterator](), getDimension: () => dims.overworld
	},
	tell: (p, k) => told.push([p.name, k]), SPAWN: [0, 5, 0], console
};
vm.runInNewContext(src + '\nglobalThis.P={ignitesPortal,breakCommands,RADIUS};', ctx);
const { ignitesPortal, RADIUS } = ctx.P;
const breakCommands = (...a) => [...ctx.P.breakCommands(...a)];   // массив из другого контекста vm

// 1. Что считается поджигом
assert.equal(ignitesPortal('minecraft:flint_and_steel', 'minecraft:obsidian'), true);
assert.equal(ignitesPortal('minecraft:fire_charge', 'minecraft:obsidian'), true);
assert.equal(ignitesPortal('minecraft:ender_eye', 'minecraft:end_portal_frame'), true);
assert.equal(ignitesPortal('minecraft:flint_and_steel', 'minecraft:netherrack'), false);   // костёр на незерраке — можно
assert.equal(ignitesPortal('minecraft:flint_and_steel', 'minecraft:crying_obsidian'), false); // из плачущего обсидиана портал не строится
assert.equal(ignitesPortal('minecraft:stick', 'minecraft:obsidian'), false);

// 2. Событие: отмена для всех ролей, сообщение с паузой, не-игроки не трогаются
const player = (name, d, tags = [], loc = { x: 10.7, y: -55.2, z: -3.4 }) => ({ name, typeId: 'minecraft:player', dimension: d, location: loc, hasTag: t => tags.includes(t),
	teleport: (l, to) => teleports.push([name, l, to.id]) });
blocks.set('minecraft:overworld', 'minecraft:obsidian');
for (const tags of [[], ['role:owner'], ['role:admin'], ['role:moder']]) {
	const e = { source: player('P' + tags.join(), dims.overworld, tags), item: { typeId: 'minecraft:flint_and_steel' }, blockLocation: {}, cancel: false };
	useOn(e); assert.equal(e.cancel, true, tags.join());
}
assert.equal(told.length, 4);
const owner = player('Owner', dims.overworld, ['role:owner']);
const ev = () => ({ source: owner, item: { typeId: 'minecraft:flint_and_steel' }, blockLocation: {}, cancel: false });
told.length = 0;
useOn(ev()); useOn(ev()); assert.equal(told.length, 1);   // зажатая кнопка — одно сообщение
for (let i = 0; i < 40; i++) tick();
const later = ev(); useOn(later); assert.equal(later.cancel, true); assert.equal(told.length, 2);
assert.deepEqual(told[0], ['Owner', 'chat.server.portal_blocked']);
blocks.set('minecraft:overworld', 'minecraft:stone');
const free = ev(); useOn(free); assert.equal(free.cancel, false);
const mob = { source: { typeId: 'minecraft:skeleton' }, item: { typeId: 'minecraft:flint_and_steel' }, blockLocation: {}, cancel: false };
useOn(mob); assert.equal(mob.cancel, false);

// 3. /fill вокруг игрока: куб в пределах лимита, обрезка по высоте, все виды порталов
assert.ok((2 * RADIUS + 1) ** 3 <= 32768);
const cmds = breakCommands({ x: 10.7, y: -55.2, z: -3.4 }, 'minecraft:overworld');
assert.deepEqual(cmds, ['portal', 'end_portal', 'end_gateway'].map(b => `fill -5 -64 -19 25 -41 11 air 0 replace ${b} -1`));
assert.match(breakCommands({ x: 0, y: 120, z: 0 }, 'minecraft:nether')[0], /^fill -15 105 -15 15 127 15 /);
assert.deepEqual(breakCommands({ x: 0, y: -200, z: 0 }, 'minecraft:overworld'), []);   // далеко под миром — нечего чистить

// 4. Тик: /fill каждые 5 тиков в измерении игрока, возврат из Незера и Энда раз в секунду
commands.length = 0; told.length = 0; teleports.length = 0;
players = [player('A', dims.overworld), player('B', dims.nether, ['role:owner'], { x: 0, y: 64, z: 0 }), player('C', dims.end, [], { x: 0, y: 64, z: 0 })];
let n = 0; while (n < 20) { tick(); n++; }
// счётчик тиков уже не с нуля — за 20 тиков ровно 4 раза по 3 игрока × 3 команды
assert.equal(commands.length, 4 * 3 * 3);
assert.ok(commands.some(([d]) => d === 'minecraft:nether') && commands.some(([d]) => d === 'minecraft:the_end'));
assert.deepEqual(teleports.map(t => [t[0], t[2]]), [['B', 'minecraft:overworld'], ['C', 'minecraft:overworld']]);
assert.deepEqual({ ...teleports[0][1] }, { x: 0.5, y: 5, z: 0.5 });
assert.deepEqual(told, [['B', 'chat.server.dimension_closed'], ['C', 'chat.server.dimension_closed']]);

// 5. Подключение, список файлов, ошибки и переводы
assert.match(fs.readFileSync(new URL('scripts/import.js', bp), 'utf8'), /import '\.\/system\/security\/portals\.js';/);
assert.ok(fs.readFileSync(new URL('contents.json', bp), 'utf8').includes('"scripts/system/security/portals.js"'));
assert.ok(fs.readFileSync(new URL('scripts/system/ui/error_keys.js', bp), 'utf8').includes("'chat.server.portal_blocked'"));
for (const l of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) {
	const t = fs.readFileSync(new URL(`../../resource_packs/main-rp-shop_for_ore/texts/${l}.lang`, import.meta.url), 'utf8');
	assert.ok(/^chat\.server\.portal_blocked=.*ERROR!/m.test(t) && /^chat\.server\.dimension_closed=/m.test(t), l);
}
console.log('PASS: portals — ignition cancelled for every role, portals broken around players, return from Nether/End to spawn.');
