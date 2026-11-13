// Журнал персонала (scripts/system/security/staff_log.js): строка в журнал содержимого через console.warn
// (console.log туда не попадает — проверено в игре), время по Москве, без §-кодов, длинная причина обрезается;
// вызовы logAction стоят во всех командах персонала и в функциях, которые меню администратора вызывает напрямую;
// команды !logs и хранилища в игре больше нет.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, bp), 'utf8');
const src = read('scripts/system/security/staff_log.js');
assert.ok(!/^import /m.test(src), 'no imports — the log does not touch the world');
const warns = [], logs = [];
const ctx = { console: { warn: (s) => warns.push(s), log: (s) => logs.push(s), error() {} }, Date: class extends Date { static now() { return Date.UTC(2026, 10, 9, 16, 24); } } };
vm.runInNewContext(src.replace(/\bexport (?=(?:async )?function|const)/g, '') + '\nglobalThis.L={logAction,formatEntry,logTime,PREFIX};', ctx);
const { logAction, formatEntry, logTime, PREFIX } = ctx.L;

assert.equal(PREFIX, '[Журнал персонала]');
assert.equal(logTime(Date.UTC(2026, 10, 9, 16, 24)), '09.11 19:24');
logAction({ name: 'Moder' }, 'mute', 'Bob', ['30m', 'спам']);
assert.deepEqual(warns, ['[Журнал персонала] 09.11 19:24 Moder » !mute Bob 30m спам']);
assert.equal(logs.length, 0);
logAction('Owner', 'wipe', '', '#3');
assert.equal(warns.at(-1), '[Журнал персонала] 09.11 19:24 Owner » !wipe #3');
logAction('Owner', 'resetoffline');
assert.equal(warns.at(-1), '[Журнал персонала] 09.11 19:24 Owner » !resetoffline');
assert.equal(formatEntry(0, '§cAd', 'kick', 'Bo§eb', 'a\nb'), '[Журнал персонала] 01.01 03:00 Ad » !kick Bob a b');
assert.ok(formatEntry(0, 'a', 'b', 'c', 'x'.repeat(300)).endsWith('x'.repeat(79) + '…'));

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
assert.match(read('scripts/registration/change.js'), /export function resetPassword[\s\S]*?logAction\(owner, 'resetpass'[\s\S]*?return true;/);
// Команды !logs и хранилища больше нет
assert.ok(!read('scripts/utils.js').includes('!logs'));
assert.ok(!/\blogs\(player, args\)|readLog/.test(read('scripts/chat/commands/commands.js')));
for (const l of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) {
	const t = fs.readFileSync(new URL(`../../resource_packs/main-rp-shop_for_ore/texts/${l}.lang`, import.meta.url), 'utf8');
	assert.ok(!/^chat\.(help\.logs|cmd\.logs\.)/m.test(t), l);
}
console.log('PASS: staff log — console.warn line in the content log (Moscow time, no § codes), logged everywhere staff acts, no !logs.');
