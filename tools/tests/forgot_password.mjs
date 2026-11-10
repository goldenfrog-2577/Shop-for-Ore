// Регистрация и «Я забыл пароль» (registration/forgot.js, login.js, register.js, change.js):
// заявка без автосброса, ник Telegram в поле для копирования, владельцу — сообщение один раз и при входе,
// заявка снимается сбросом и удачным входом; приветствие перечисляет возможности сервера на 4 языках.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url), rp = new URL('../../resource_packs/main-rp-shop_for_ore/', import.meta.url);
const read = (u) => fs.readFileSync(u, 'utf8');
const src = read(new URL('scripts/registration/forgot.js', bp)).replace(/^import .*;\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');
const told = []; const forms = []; const players = [];
const mk = (name, tags = []) => { const s = new Set(tags); return { name, hasTag: t => s.has(t), addTag: t => s.add(t), removeTag: t => s.delete(t) }; };
const ctx = {
	world: { getPlayers: () => players.values() },
	tell: (p, k, ...a) => told.push([p.name, k, ...a]),
	modal: (title) => { const f = { title, fields: [], textField(l, ph, def) { this.fields.push([l, ph, def]); return this; }, show: () => Promise.resolve({}) }; forms.push(f); return f; }
};
vm.runInNewContext(src + '\nglobalThis.F={requestReset,notifyRequests,ForgotUI,RESET_REQUEST,OWNER_TELEGRAM};', ctx);
const F = ctx.F;
assert.equal(F.OWNER_TELEGRAM, '@goldenfrog_2577');
const owner = mk('Owner', ['role:owner']), pendingOwner = mk('Owner2', ['role:owner', 'auth:login']), P = mk('Lost', ['auth:login']);
players.push(owner, pendingOwner, P);
// Окно: заявка ставится, ник — значением поля (можно скопировать), владелец в сети — текст «в игре»
await F.ForgotUI(P);
assert.ok(P.hasTag(F.RESET_REQUEST));
assert.equal(forms[0].title, '%account.forgot.title'); assert.deepEqual([...forms[0].fields[0]].slice(1), ['@goldenfrog_2577', '@goldenfrog_2577']);
assert.match(forms[0].fields[0][0], /%account\.forgot\.online$/);
// Владельцу (вошедшему) — одно сообщение; не вошедшему — нет; повторная заявка не спамит
assert.deepEqual(told, [['Owner', 'chat.account.reset_request', 'Lost']]);
await F.ForgotUI(P); assert.equal(told.length, 1);
// Владельца нет — «зайди позже»
players.splice(0, 1); await F.ForgotUI(mk('Other', ['auth:login'])); assert.match(forms.at(-1).fields[0][0], /%account\.forgot\.offline$/);
// Владелец вошёл — видит заявки игроков в игре
told.length = 0; players.push(P); F.notifyRequests(owner); assert.ok(told.some(([, k, n]) => k === 'chat.account.reset_request' && n === 'Lost'));

// Форма входа: переключатель «Я забыл пароль» ведёт в окно без проверки пароля; удачный вход снимает заявку; владельцу — заявки
const login = read(new URL('scripts/registration/login.js', bp));
assert.match(login, /\.toggle\('%account\.login\.forgot', false\)/);
assert.match(login, /if \(r\.formValues\[1\] === true\) return ForgotUI\(player\);\s*const password/);
assert.ok(login.includes('player.removeTag(RESET_REQUEST);') && login.includes("if (player.hasTag('role:owner')) notifyRequests(player);"));
assert.ok(!/count >= MAX_WRONG[\s\S]{0,200}clearPassword|resetPassword/.test(login), 'автосброса после неудачных попыток нет');
// Сброс владельцем снимает заявку; карточка игрока показывает заявку
assert.match(read(new URL('scripts/registration/change.js', bp)), /clearPassword\(target\);\s*target\.removeTag\('auth:reset_request'\);/);
assert.match(read(new URL('scripts/menu/admin/admin_menu.js', bp)), /target\.hasTag\('auth:reset_request'\) \? \['%admin\.players\.body\.reset_request'\]/);
// Приветствие и ключи на 4 языках
const reg = read(new URL('scripts/registration/register.js', bp));
const keys = [...reg.matchAll(/%(account\.register\.[a-z_.0-9]+)/g)].map(m => m[1]);
assert.ok(keys.includes('account.register.feature.4') && keys.includes('account.register.menu') && keys.includes('account.register.password'));
for (const l of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) {
	const lang = Object.fromEntries(read(new URL(`texts/${l}.lang`, rp)).replace(/^﻿/, '').split(/\r?\n/).filter(x => x.includes('=')).map(x => [x.slice(0, x.indexOf('=')), x.slice(x.indexOf('=') + 1)]));
	for (const k of [...keys, 'account.login.forgot', 'account.forgot.title', 'account.forgot.body', 'account.forgot.online', 'account.forgot.offline', 'chat.account.reset_request', 'admin.players.body.reset_request'])
		assert.ok(lang[k], `${l}: ${k}`);
	assert.ok(lang['account.register.feature.2'].includes('40') && lang['account.register.feature.2'].includes('16') && lang['account.register.feature.2'].includes('26'), l);
	assert.ok(lang['account.register.feature.4'].includes('25') && lang['account.register.feature.4'].includes('40'), l);
	assert.ok(lang['chat.account.reset_request'].includes('Telegram'), l);
}
// Цифры приветствия совпадают с картой: Незер с 16, Пещера с 26 (WARPS mine), босс с 26 (MIN_LEVEL), VIP с 40 (MAX_LEVEL)
const db = read(new URL('scripts/DataBase.js', bp));
assert.match(db, /if \(lvl >= 26\) return \[0, 5, -69\];\s*if \(lvl >= 16\) return \[0, 5, -33\];/);
assert.match(read(new URL('scripts/system/boss/boss.js', bp)), /export const MIN_LEVEL = 26;/);
assert.match(db, /MAX_LEVEL = 40/);
console.log('PASS: forgot-password request (no auto-reset), Telegram nick to copy, owner notified once and on login, request cleared by reset/login, welcome lines in 4 locales match map numbers.');
