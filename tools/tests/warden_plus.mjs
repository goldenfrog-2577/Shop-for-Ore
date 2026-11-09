// Хранитель+ (scripts/system/boss/boss.js, system/bot/bot.js, !top, ui/hud_screen.json): бот в отряде,
// победы и лучшее время в топе, свой босс-бар в стиле скалка.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const root = new URL('../../', import.meta.url);
const bp = new URL('behavior_packs/main-addon-shop_for_ore/', root), rp = new URL('resource_packs/main-rp-shop_for_ore/', root);
const read = (base, p) => fs.readFileSync(new URL(p, base), 'utf8');
const strip = (s) => s.replace(/^import .*;\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');

// ===== Правила старта с ботом =====
const bossSrc = read(bp, 'scripts/system/boss/boss.js');
const pure = strip(bossSrc.slice(0, bossSrc.indexOf('// ======== Состояние ========')));
const ctx = { Math, String };
vm.runInNewContext(pure + '\nglobalThis.B={checkStart,bestTime,mmss,MAX_FIGHTERS};', ctx);
const B = ctx.B;
const P = (name, level, bot = false, follows) => ({ name, level, bot, follows });
const start = (players) => B.checkStart({ busy: false, now: 0, until: 0, players, starter: 'a' });
// следует за участником — в отряде (и считается в здоровье босса)
let r = start([P('a', 30), P('Bot', 1, true, 'a')]);
assert.ok(r.ok); assert.deepEqual([...r.fighters], ['a', 'Bot']); assert.deepEqual([...r.kick], []);
// следует за тем, кто не в бою (низкий уровень), или ни за кем — на спавн
r = start([P('a', 30), P('low', 5), P('Bot', 1, true, 'low')]);
assert.deepEqual([...r.fighters], ['a']); assert.deepEqual([...r.kick], ['low', 'Bot']);
r = start([P('a', 30), P('Bot', 1, true, undefined)]);
assert.deepEqual([...r.kick], ['Bot']);
// мест нет — бот снаружи, бой всё равно начинается
r = start([P('a', 30), P('b', 30), P('c', 30), P('d', 30), P('Bot', 1, true, 'a')]);
assert.ok(r.ok); assert.equal(r.fighters.length, B.MAX_FIGHTERS); assert.deepEqual([...r.kick], ['Bot']);
// бот не спасает от «слишком много» и не стартует бой сам
assert.equal(start([...'abcde'].map(n => P(n, 30))).reason, 'too_many');
assert.equal(B.checkStart({ busy: false, now: 0, until: 0, players: [P('Bot', 40, true, 'a')], starter: 'Bot' }).reason, 'level');

// Лучшее время и формат
assert.equal(B.bestTime(0, 300), 300); assert.equal(B.bestTime(250, 300), 250); assert.equal(B.bestTime(400, 300), 300);
assert.equal(B.mmss(65), '1:05'); assert.equal(B.mmss(600), '10:00'); assert.equal(B.mmss(9), '0:09');

// Награда: бот не получает и в топ не попадает; победа считается и время записывается
assert.match(bossSrc, /filter\(n => !fight\.dead\.has\(n\) && !isBotName\(n\)\)/);
assert.match(bossSrc, /if \(isBotName\(name\)\) continue;\n\t\tif \(winners\.includes\(name\)\) reward\(p, seconds\);/);
assert.match(bossSrc, /scoreboard players add @s stat_win_boss 1/);
assert.match(bossSrc, /scoreboard players set @s stat_boss_time \$\{bestTime\(getScore\(p, 'stat_boss_time'\), seconds\)\}/);
// остался только бот — поражение
assert.match(bossSrc, /!fight\.dead\.has\(n\) && !isBotName\(n\)\)\) return endFight\('defeat'\)/);
// бот подключается сам — boss.js не импортирует bot.js (порядок загрузки модулей прежний)
assert.ok(!/from '\.\.\/bot\//.test(bossSrc));

// ===== Бот в бою =====
const event = () => ({ handlers: [], subscribe(fn) { this.handlers.push(fn); } });
const events = Object.fromEntries(['tick', 'entityHurt', 'playerLeave', 'worldInitialize'].map(k => [k, event()]));
const dim = { id: 'overworld' };
const mk = (name, tags = []) => { const p = { name, id: name, typeId: 'minecraft:player', dimension: dim, location: { x: 0, y: 1, z: 0 }, tags: new Set(tags), hasTag: t => p.tags.has(t), addTag: t => p.tags.add(t), removeTag: t => p.tags.delete(t) }; return p; };
const bot = mk('Bot', ['sys:bot', 'role:bot']), human = mk('Human', ['auth:done', 'sys:guided']);
human.location.x = 3;
const warden = { typeId: 'server:warden_boss', dimension: dim, location: { x: 2, y: 1, z: 0 } }, skeleton = { typeId: 'minecraft:skeleton', dimension: dim, location: { x: 40, y: 1, z: 0 } };
const calls = [], commands = [], spawns = [];
for (const m of ['navigateToEntity', 'navigateToLocation', 'lookAtEntity', 'stopMoving', 'stopBreakingBlock', 'attackEntity', 'jump', 'setRotation']) bot[m] = (...a) => calls.push([m, ...a]);
let hp = 20;
bot.getComponent = () => ({ current: hp, resetToMaxValue() {} });
let link, present = bot;
const botCtx = { connectBot: l => { link = l; }, Math, JSON, Number, Object, Set, Map, Date,
	world: { events, getPlayers: () => [bot, human].values(), getDynamicProperty() {}, setDynamicProperty() {} },
	Location: class { constructor(x, y, z) { Object.assign(this, { x, y, z }); } }, BlockLocation: class {}, DynamicPropertiesDefinition: class {},
	MinecraftEffectTypes: {}, isAir: () => true, isSolid: () => false, getBot: () => present, isBot: p => p.hasTag('role:bot'), isPending: () => false,
	getScore: () => 10, findPlayer: n => n === 'Human' ? human : undefined, run: (p, c) => commands.push(c),
	onBotSpawned() {}, onBotRemoved() {}, removeBot() { present = undefined; }, spawnBot: (who, at) => { spawns.push(at); },
	freezePlayer() {}, unfreezePlayer() {}, showHudLine() {}, getGame() {}, gameOf() {}, leaveGame() {}, joinGame() { return true; }, teleportToArena() {} };
vm.runInNewContext(strip(read(bp, 'scripts/system/bot/bot.js')) + '\nglobalThis.api={setBotMode};', botCtx);
const tick = n => { for (let i = 0; i < n; i++) for (const fn of events.tick.handlers) fn(); };
assert.equal(typeof link?.assist, 'function', 'bot.js connects itself to boss.js');
botCtx.api.setBotMode('follow', { target: 'Human' });
assert.equal(link.follows(), 'Human'); assert.equal(link.name(), 'Bot');
tick(5);
// в отряде: бьёт ближайшую цель (Хранителя, а не далёкого скелета), автототем не выдаётся
link.assist(() => [skeleton, warden], { x: 9, y: 5, z: 9 });
calls.length = 0; commands.length = 0; tick(40);
const hits = calls.filter(c => c[0] === 'attackEntity');
assert.ok(hits.length >= 2); assert.ok(hits.every(c => c[1] === warden));
assert.ok(!commands.some(c => c.includes('totem_of_undying')), 'no auto-totem while fighting the boss');
// погиб — появится на спавне и будет ждать
hp = 0; for (const fn of events.entityHurt.handlers) fn({ hurtEntity: bot, damage: 30 });
tick(60);
assert.deepEqual(spawns.at(-1), { x: 9, y: 5, z: 9 });
present = bot; hp = 20; calls.length = 0; tick(40);
assert.ok(!calls.some(c => c[0] === 'attackEntity' || c[0] === 'navigateToEntity'), 'benched bot stands still');
// бой кончился — снова следует за игроком, автототем возвращается
link.end(); human.location.x = 30; calls.length = 0; commands.length = 0; tick(40);
assert.ok(calls.some(c => c[0] === 'navigateToEntity')); assert.ok(commands.some(c => c.includes('totem_of_undying')));
// не в отряде (bench сразу) — стоит даже в другом режиме
botCtx.api.setBotMode('stay'); link.assist(() => [warden], { x: 0, y: 0, z: 0 }); link.bench();
calls.length = 0; tick(40);
assert.ok(!calls.some(c => c[0] === 'attackEntity' || c[0] === 'navigateToLocation'));
link.end();

// ===== Топ, табло, меню, тексты =====
const playerSrc = read(bp, 'scripts/chat/commands/player.js');
assert.match(playerSrc, /\bboss: \(p\) =>/); assert.match(playerSrc, /\bboss_time: \(p\) =>/);
assert.match(playerSrc, /\.filter\(\(\{ row \}\) => row\)/, 'players without a Warden time are left out of !top boss_time');
assert.match(read(bp, 'scripts/system/player/achievements.js'), /'stat_win_boss', 'stat_boss_time'\]/, 'wipe resets the new counters');
const setup = read(bp, 'functions/system/setup.mcfunction');
assert.match(setup, /scoreboard objectives add stat_win_boss dummy\nscoreboard objectives add stat_boss_time dummy\nscoreboard players set setup system 11$/);
assert.match(read(bp, 'functions/system/timers.mcfunction'), /matches \.\.10 run function system\/setup/);
const admin = read(bp, 'scripts/menu/admin/admin_menu.js');
assert.match(admin, /top_boss'.*runChatCommand\(player, 'top', \['boss'\]\)/); assert.match(admin, /top_boss_time'.*\['boss_time'\]/);
assert.match(read(bp, 'scripts/DataBase.js'), /§fboss§8\/§fboss_time§7>/);
for (const l of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) {
	const t = read(rp, `texts/${l}.lang`);
	for (const k of ['chat.cmd.top.header.boss', 'chat.cmd.top.header.boss_time', 'admin.server.button.top_boss', 'admin.server.button.top_boss_time'])
		assert.match(t, new RegExp(`^${k.replace(/\./g, '\\.')}=.+`, 'm'), `${l}: ${k}`);
	assert.match(t, /^chat\.cmd\.top\.boss_value=.*%1\$s.*%2\$s/m, l);
	assert.match(t, /^chat\.cmd\.top\.use=.*\/boss\/boss_time>/m, l);
}

// ===== Босс-бар =====
const hud = JSON.parse(read(rp, 'ui/hud_screen.json').replace(/^\s*\/\/.*$/gm, ''));
const panel = hud.boss_health_panel;
assert.deepEqual(panel.size, [182, 20]);
const flat = JSON.stringify(panel);
for (const t of ['boss_bar_empty', 'boss_bar_full']) {
	assert.ok(flat.includes(`textures/ui/server/${t}`));
	const png = fs.readFileSync(new URL(`textures/ui/server/${t}.png`, rp));
	assert.equal(png.readUInt32BE(16), 182); assert.equal(png.readUInt32BE(20), 5);
}
assert.ok(flat.includes('"#progress_percentage"') && flat.includes('"#clip_ratio"') && flat.includes('"#bossName"') && flat.includes('"#bar_visible"'));
assert.ok(!flat.includes('#bar_color'), 'own colours, no tint by boss colour');

console.log('PASS: Warden+ — bot joins the party when following a fighter (slot, no reward, benched after death), wins and best time in !top, sculk boss bar.');
