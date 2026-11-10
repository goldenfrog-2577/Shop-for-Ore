// Журнал персонала (scripts/system/security/staff_log.js): записи в тегах служебной сущности, новые первыми,
// не больше LIMIT, «журнал начат» при создании сущности, очередь, пока зона не загружена; вызовы logAction
// стоят во всех нужных командах и в функциях, которые меню администратора вызывает напрямую.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, bp), 'utf8');
const src = read('scripts/system/security/staff_log.js').replace(/^import .*;\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');

let entities = [], loaded = true, schedule, spawned = 0, now = 1000;
const mkEntity = () => { const tags = new Set(); return { tags, getTags: () => [...tags], addTag: t => tags.add(t), removeTag: t => tags.delete(t) }; };
const dim = {
	getEntities: (q) => { assert.equal(q.type, 'server:floating_text'); return entities.filter(e => q.tags.every(t => e.tags.has(t)))[Symbol.iterator](); },
	spawnEntity: (id, loc) => { if (!loaded) throw new Error('unloaded'); assert.equal(id, 'server:floating_text'); assert.deepEqual([loc.x, loc.y, loc.z], [15.5, -60, 15.5]); spawned++; const e = mkEntity(); entities.push(e); return e; }
};
const ctx = {
	world: { getDimension: () => dim }, system: { runSchedule: (fn, t) => { assert.equal(t, 20); schedule = fn; } },
	Location: class { constructor(x, y, z) { Object.assign(this, { x, y, z }); } }, Date: { now: () => now }
};
vm.runInNewContext(src + '\nglobalThis.L={logAction,readLog,encode,decode,LIMIT};', ctx);
const { logAction, encode, decode, LIMIT } = ctx.L;
const readLog = () => [...ctx.L.readLog()].map(e => ({ ...e }));   // массивы из другого контекста vm

// Кодирование: | и переводы строк в тексте не ломают запись, длинная причина обрезается
const tag = encode(7, 1794154000000, 'Ad|min', 'mute', 'Bob', 'спам\nи | флуд');
assert.equal(tag, `log:7|${(1794154000000).toString(36)}|Ad/min|mute|Bob|спам и / флуд`);
assert.deepEqual({ ...decode(tag) }, { seq: 7, time: 1794154000000, by: 'Ad/min', command: 'mute', target: 'Bob', details: 'спам и / флуд' });
assert.ok(encode(1, 1, 'a', 'b', 'c', 'x'.repeat(300)).endsWith('x'.repeat(79) + '…'));
assert.equal(decode('role:admin'), null); assert.equal(decode('log:x|1|a|b|c|'), null);

// Зона не загружена: запись ждёт, сущность не создаётся
loaded = false;
logAction({ name: 'Moder' }, 'mute', 'Bob', ['30m', 'спам']);
assert.equal(entities.length, 0); assert.equal(readLog().length, 0);
loaded = true; schedule();
assert.equal(spawned, 1);
let log = readLog();
assert.deepEqual(log.map(e => e.command), ['mute', '#start']);
assert.deepEqual({ ...log[0], time: 0 }, { seq: 2, time: 0, by: 'Moder', command: 'mute', target: 'Bob', details: '30m спам' });
assert.ok(entities[0].tags.has('sys:staff_log'));

// Дальше — в ту же сущность, номера растут, старые сверх LIMIT удаляются
for (let i = 0; i < LIMIT + 5; i++) { now++; logAction('Admin', 'warn', 'P' + i, `1/3 r${i}`); }
assert.equal(spawned, 1);
log = readLog();
assert.equal(log.length, LIMIT); assert.equal(log[0].target, 'P' + (LIMIT + 4)); assert.equal(log.at(-1).target, 'P5');
assert.equal(entities[0].getTags().length, LIMIT + 1);   // + sys:staff_log

// Сущность убили — новая с отметкой «журнал начат»
entities = [];
logAction('Owner', 'wipe', '', '#3');
assert.equal(spawned, 2); assert.deepEqual(readLog().map(e => e.command), ['wipe', '#start']);
// Две сущности (старая загрузилась позже) — записи читаются из обеих по номерам
const old = mkEntity(); old.addTag('sys:staff_log'); old.addTag(encode(99, 5, 'X', 'ban', 'Y', '')); entities.push(old);
assert.equal(readLog()[0].seq, 99);

// Где пишется журнал
const calls = {
	'scripts/chat/commands/moderator.js': ['kick', 'mute', 'jail', 'unjail', 'unmute', 'warn', 'unwarn', 'freeze', 'unfreeze'],
	'scripts/chat/commands/admin.js': ['boost', 'ban', 'unban'],
	'scripts/chat/commands/commands.js': ['role'],
	'scripts/registration/change.js': ['resetpass'],
	'scripts/system/core/wipe.js': ['wipe'],
	'scripts/system/core/offline_reset.js': ['resetoffline']
};
for (const [file, cmds] of Object.entries(calls)) {
	const text = read(file);
	for (const c of cmds) assert.match(text, new RegExp(`logAction\\([a-z]+, '${c}'`), `${file}: ${c}`);
}
// Меню администратора вызывает сброс пароля, вайп и сброс офлайн напрямую — журнал внутри этих функций
assert.match(read('scripts/menu/admin/admin_menu.js'), /wipeAll\(player\)/);
assert.match(read('scripts/registration/change.js'), /export function resetPassword[\s\S]*?logAction\(owner, 'resetpass'[\s\S]*?return true;/);
// !logs — только владельцу
assert.match(read('scripts/DataBase.js'), /command: '!logs §7\[§fplayer§7\] \[§fpage N§7\]',\s*description: '%chat\.help\.logs',\s*role: 'owner'/);
assert.ok(read('contents.json').includes('"scripts/system/security/staff_log.js"'));
for (const l of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) {
	const t = fs.readFileSync(new URL(`../../resource_packs/main-rp-shop_for_ore/texts/${l}.lang`, import.meta.url), 'utf8');
	for (const k of ['chat.help.logs', 'chat.cmd.logs.use', 'chat.cmd.logs.header', 'chat.cmd.logs.header_player', 'chat.cmd.logs.empty', 'chat.cmd.logs.started', 'chat.cmd.logs.error.page'])
		assert.ok(new RegExp(`^${k.replace(/\./g, '\\.')}=`, 'm').test(t), `${l}: ${k}`);
}
console.log('PASS: staff log — tags on a service entity, newest first, 200 kept, "log started" on (re)creation, queue while unloaded, logged everywhere staff acts.');
