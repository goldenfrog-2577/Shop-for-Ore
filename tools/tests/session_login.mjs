// Вход в аккаунт без скриптов (functions/system/session): каждый вошедший в мир получает auth:login (есть аккаунт)
// или auth:register (нет), даже если скрипты не работают; кто остаётся в сети — не трогается; вышедший и вернувшийся —
// снова вход; бот — не трогается. Маленький интерпретатор ровно тех команд, что в функции.
import fs from 'node:fs'; import assert from 'node:assert/strict';
const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, bp), 'utf8');
const lines = read('functions/system/session.mcfunction').split('\n').filter(l => l && !l.startsWith('#'));

const scores = new Map();   // имя → счёт session
let online = [];
const mk = (name, tags = []) => ({ name, tags: new Set(tags) });
function select(sel) {
	const m = sel.match(/^@a(?:\[(.*)\])?$/); assert.ok(m, sel);
	const conds = m[1] ? m[1].split(',') : [];
	return online.filter(p => conds.every(c => {
		let r = c.match(/^tag=(!?)(.+)$/);
		if (r) return p.tags.has(r[2]) !== (r[1] === '!');
		r = c.match(/^scores=\{session=(\d+)\}$/);
		if (r) return scores.get(p.name) === Number(r[1]);
		throw new Error('selector ' + c);
	}));
}
function tick() {
	for (const l of lines) {
		let m;
		if ((m = l.match(/^scoreboard players add (\S+) session 0$/))) { for (const p of select(m[1])) if (!scores.has(p.name)) scores.set(p.name, 0); }
		else if ((m = l.match(/^scoreboard players set (\S+) session (\d+)$/))) { for (const p of select(m[1])) scores.set(p.name, Number(m[2])); }
		else if (l === 'scoreboard players reset * session') scores.clear();
		else if ((m = l.match(/^tag (\S+) add (\S+)$/))) { for (const p of select(m[1])) p.tags.add(m[2]); }
		else throw new Error('unknown command: ' + l);
	}
}
const alice = mk('Alice', ['auth:done', 'player']), newbie = mk('Newbie'), bot = mk('Bot', ['role:bot']);
// Заходят: зарегистрированная — на вход по паролю, новичок — на регистрацию, бот — без тегов
online = [alice, newbie, bot];
tick();
assert.ok(alice.tags.has('auth:login') && !alice.tags.has('auth:register'));
assert.ok(newbie.tags.has('auth:register') && !newbie.tags.has('auth:login'));
assert.ok(!bot.tags.has('auth:login') && !bot.tags.has('auth:register'));
// Вошли (это делают скрипты) — дальше в сети теги не появляются
alice.tags.delete('auth:login'); newbie.tags.delete('auth:register'); newbie.tags.add('auth:done');
for (let i = 0; i < 100; i++) tick();
assert.ok(!alice.tags.has('auth:login') && !newbie.tags.has('auth:login'));
// Alice вышла и вернулась — снова пароль, даже если скрипты так и не заработали
online = [newbie, bot]; tick(); tick();
online = [newbie, bot, alice]; tick();
assert.ok(alice.tags.has('auth:login'));
assert.ok(!newbie.tags.has('auth:login'));
// Регистрация не закончена (auth:register) и есть старый auth:done — второй тег не ставится
const half = mk('Half', ['auth:done', 'auth:register']); online.push(half); tick();
assert.ok(!half.tags.has('auth:login'));

// Подключение: первой строкой system/system (каждый тик), табло создаёт setup (номер 9), эффекты — раз в секунду
assert.match(read('functions/system/system.mcfunction'), /^(#.*\n|\n)*## --- Вход в мир[^\n]*\nfunction system\/session\n/);
assert.match(read('functions/system/setup.mcfunction'), /scoreboard objectives add session dummy\nscoreboard players set setup system 9$/);
assert.match(read('functions/system/timers.mcfunction'), /matches \.\.8 run function system\/setup/);
const t20 = read('functions/timers/ticks_20.mcfunction');
for (const t of ['auth:login', 'auth:register']) for (const e of ['blindness', 'slowness'])
	assert.ok(t20.includes(`effect @a[tag=${t},tag=!role:bot,tag=!sys:bot] ${e} 60 255 true`), `${t} ${e}`);
// Скрипты снимают у бота теги входа, поставленные функцией в его первый тик
assert.match(read('scripts/registration/system.js'), /if \(isBot\(player\)\) \{[\s\S]*?removeTag\('auth:login'\)[\s\S]*?removeTag\('auth:register'\)[\s\S]*?continue;/);
console.log('PASS: login without scripts — every join gets auth:login/auth:register from functions, online players untouched, rejoin re-asks, bot skipped.');
