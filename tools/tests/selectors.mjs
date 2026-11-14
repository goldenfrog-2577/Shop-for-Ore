// Селекторы (scripts/chat/commands/selectors.js): @s — сам, @p — ближайший другой, @r — случайный другой, @a — все кроме себя;
// бот не попадает; @e, * и @a[…] — ошибка; одиночные команды не принимают @a; позиции ников совпадают с синтаксисом команд.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url);
const S = await import(new URL('scripts/chat/commands/selectors.js', bp));
const mk = (name, x, tags = [], dim = 'minecraft:overworld') => ({ name, location: { x, y: 0, z: 0 }, dimension: { id: dim }, hasTag: t => tags.includes(t) });
const me = mk('Me', 0), near = mk('Near', 3), far = mk('Far', 50), bot = mk('Bot', 1, ['role:bot']), nether = mk('Neth', 2, [], 'minecraft:nether');
const all = [me, near, far, bot, nether];
const names = (r) => r.targets.map(p => p.name);
assert.deepEqual(names(S.selectTargets(me, '@s', 'mute', all)), ['Me']);
assert.deepEqual(names(S.selectTargets(me, '@p', 'mute', all)), ['Near']);            // не бот (ближе), не Незер
assert.deepEqual(names(S.selectTargets(me, '@a', 'mute', all)), ['Near', 'Far', 'Neth']);
assert.deepEqual(names(S.selectTargets(me, '@A', 'mute', all)), ['Near', 'Far', 'Neth']);
assert.deepEqual(names(S.selectTargets(me, '@r', 'mute', all, () => 0.99)), ['Neth']);
for (const bad of ['@e', '*', '@a[r=5]', '@x', '@']) assert.equal(S.selectTargets(me, bad, 'mute', all).error, 'chat.cmd.error.selector', bad);
assert.equal(S.selectTargets(me, '@a', 'ban', all).error, 'chat.cmd.error.selector_single');
assert.deepEqual(names(S.selectTargets(me, '@r', 'ban', all, () => 0)), ['Near']);
assert.equal(S.selectTargets(me, '@a', 'mute', [me, bot]).error, 'chat.cmd.error.selector_empty');
assert.ok(S.isSelector('@a') && S.isSelector('*') && S.isSelector('@e') && !S.isSelector('Alice') && !S.isSelector('a*b'));
// Позиции ников: у каждой команды из PLAYER_ARG в синтаксисе на этом месте — «player»
const db = fs.readFileSync(new URL('scripts/utils.js', bp), 'utf8');
const usage = Object.fromEntries([...db.matchAll(/command: '!([a-z0-9]+)([^']*)'/g)].map(m => [m[1], m[2].replace(/§./g, '').trim().split(/\s+/)]));
for (const [cmd, pos] of Object.entries(S.PLAYER_ARG)) {
	assert.ok(usage[cmd], `нет команды !${cmd}`);
	assert.match(usage[cmd][pos] ?? '', /^[<[]player/, `!${cmd}: аргумент ${pos} — не ник (${usage[cmd].join(' ')})`);
}
for (const cmd of S.SINGLE_TARGET) assert.ok(cmd in S.PLAYER_ARG, cmd);
// Codex (#123): у !ac и !fly ник «плавает» по форме команды — селектор раскрывается на правильном месте
assert.equal(S.playerArgPos('ac', ['reset', '@a']), 1);
assert.equal(S.playerArgPos('ac', ['@a']), 0);
assert.equal(S.playerArgPos('ac', ['mode', 'kick']), undefined);
assert.equal(S.playerArgPos('fly', ['@s']), 0);
assert.equal(S.playerArgPos('fly', ['on', '@a']), 1);
assert.equal(S.playerArgPos('fly', ['OFF', '@p']), 1);
assert.equal(S.playerArgPos('mute', ['@a', '5m']), 0);
assert.equal(S.playerArgPos('help', []), undefined);
assert.match(fs.readFileSync(new URL('scripts/chat/commands/commands.js', bp), 'utf8'), /const pos = playerArgPos\(command, args\);/);
// Ошибки селекторов — на 4 языках и в ERROR_KEYS
const errors = fs.readFileSync(new URL('scripts/system/ui/error_keys.js', bp), 'utf8');
for (const k of ['chat.cmd.error.selector', 'chat.cmd.error.selector_single', 'chat.cmd.error.selector_empty']) {
	assert.ok(errors.includes(`'${k}'`), k);
	for (const l of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) assert.match(fs.readFileSync(new URL(`../../resource_packs/main-rp-shop_for_ore/texts/${l}.lang`, import.meta.url), 'utf8'), new RegExp(`^${k.replaceAll('.', '\\.')}=`, 'm'), `${l} ${k}`);
}
console.log('PASS: @s/@p/@r/@a targets (no self in @a, no bot), @e/*/params rejected, single-target commands, player argument positions match usage.');
