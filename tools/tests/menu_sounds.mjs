// Звуки меню: успех/ошибка — после действий меню, команд чата и входа/пароля (по настройкам игрока);
// «Клик» — при нажатии кнопки формы, выключается тегом player:menu_click_off.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url), rp = new URL('../../resource_packs/main-rp-shop_for_ore/', import.meta.url);
const read = (u) => fs.readFileSync(u, 'utf8');
// Ключи успеха: …done…, «Настройка изменена»; ошибки и справка — нет
const db = read(new URL('scripts/DataBase.js', bp));
const S = vm.runInNewContext(db.match(/const TRANSLATE = [^\n]+/)[0] + '\n' + db.match(/const SUCCESS_KEY = [^\n]+/)[0] + '\n' +
	db.slice(db.indexOf('export function isSuccessMessage')).replace('export ', '').split('\n}\n')[0] + '\n}\nisSuccessMessage');
const tr = (k) => `tellraw @s {"rawtext":[{"translate":"${k}","with":[]}]}`;
for (const k of ['chat.cmd.mute.done', 'chat.cmd.boost.stop.done', 'chat.cmd.warp.done', 'chat.settings.enabled']) assert.ok(S(tr(k)), k);
for (const k of ['chat.help.header', 'chat.cmd.error.offline', 'chat.cmd.stats.header', 'chat.cmd.donate']) assert.ok(!S(tr(k)), k);
// Клик: в формах при нажатии; крестик — без клика; тег выключает
const forms = read(new URL('scripts/menu/common/forms.js', bp)).replace(/^import .*$/gm, '').replaceAll('export ', '');
const ran = []; const shown = [];
class Form { constructor() { this.b = []; } title() { return this; } body() { return this; } button(v) { this.b.push(v); return this; } button1(v) { return this.button(v); } button2(v) { return this.button(v); } }
const ctx = { ActionFormData: Form, ModalFormData: Form, MessageFormData: Form, hasPendingCommands: () => false, menuCommandCount: () => 0, menuSoundCount: () => 0, failedCommandCount: () => 0,
	beginMenuAction() {}, endMenuAction() {}, closedByPlayer: r => r.canceled, toldCount: () => 0, toldErrorCount: () => 0, settleCommands: async () => {}, menuFeedback() {},
	showWhenFree: (_, f) => new Promise(res => shown.push(res)) };
vm.runInNewContext(forms + '\nglobalThis.api={showMenu,confirm,CLICK_SOUND};', ctx);
const tags = new Set(); const P = { name: 'P', hasTag: t => tags.has(t), runCommandAsync: c => { ran.push(c); return Promise.resolve(); } };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
ctx.api.showMenu(P, 't', 'b', [{ text: 'a', run() {} }]); await flush(); shown.shift()({ selection: 0 }); await flush();
assert.deepEqual(ran, [ctx.api.CLICK_SOUND]);
ctx.api.showMenu(P, 't', 'b', [{ text: 'a', run() {} }]); await flush(); shown.shift()({ canceled: true }); await flush(); assert.equal(ran.length, 1);
tags.add('player:menu_click_off'); ctx.api.confirm(P, 't', 'b', () => {}); await flush(); shown.shift()({ selection: 1 }); await flush(); assert.equal(ran.length, 1);
// Команды чата — звук по результату; вход и пароль — через menuFeedback (с настройкой), а не жёсткий note.bass
assert.match(read(new URL('scripts/chat/commands/commands.js', bp)), /if \(error \|\| toldSuccessCount\(player\) > before\.success\) menuFeedback\(player, error\);/);
for (const f of ['registration/login.js', 'registration/register.js', 'registration/change.js']) {
	const s = read(new URL('scripts/' + f, bp)); assert.ok(!s.includes("'playsound note.bass @s'"), f); assert.ok(s.includes('menuFeedback(player, true)'), f);
	assert.ok(!/run\(player, 'playsound random\.levelup @s'\)/.test(s.replace(/if \(!player\.hasTag\('player:menu_success_off'\)\) run\(player, 'playsound random\.levelup @s'\)/g, '')), f);
}
// Настройки: третий переключатель «Клик» на 4 языках
// Кнопки «Звуки в меню» — с ванильными текстурами (решение владельца: текстуры, не глифы)
{ const mm = read(new URL('scripts/menu/main_menu.js', bp));
  for (const [k, ic] of [['success', 'confirm'], ['error', 'cancel'], ['click', 'cursor']])
    assert.ok(mm.includes(`{ text: '%menu.settings.menu_sounds.${k}', icon: 'textures/ui/${ic}', run: () => toggle('${k}') }`), k); }
for (const l of ['ru_RU', 'en_US', 'uk_UA', 'es_ES']) {
	const keys = new Set(read(new URL(`texts/${l}.lang`, rp)).split(/\r?\n/).map(x => x.split('=')[0]));
	for (const k of ['menu.settings.menu_sounds.click', 'menu.settings.menu_sounds.click.title']) assert.ok(keys.has(k), `${l} ${k}`);
}
console.log('PASS: success keys, click on button (not on X, off by tag), chat command feedback, login/password sounds respect settings, click toggle in 4 locales.');
