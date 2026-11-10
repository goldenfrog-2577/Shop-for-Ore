// Незер (уровни 16–25): один порядок блоков в ямах (automine), автопродаже (autosale), кирках (pickaxe_lvl) и меню уровней.
// Порядок владельца: незерак, кварц, золотые самородки, магма, позолоченный чернит, обломки, незерит, обсидиан, плачущий.
import fs from 'node:fs'; import assert from 'node:assert/strict';
const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, bp), 'utf8');
// [уровень, блок в яме, что продаётся, цена, яма x1 z1 x2 z2]
const NETHER = [
	[16, 'netherrack', 'netherrack', 50, [-9, -26, -11, -28]],
	[17, 'quartz_ore', 'quartz', 53, [-9, -33, -11, -35]],
	[18, 'nether_gold_ore', 'gold_nugget', 56, [-9, -40, -11, -42]],
	[19, 'magma', 'magma', 59, [-9, -47, -11, -49]],
	[20, 'gilded_blackstone', 'gilded_blackstone', 62, [-4, -47, -2, -49]],
	[21, 'ancient_debris', 'ancient_debris', 65, [3, -47, 5, -49]],
	[22, 'netherite_block', 'netherite_ingot', 75, [10, -47, 12, -49]],
	[24, 'obsidian', 'obsidian', 90, [10, -42, 12, -40]],
	[25, 'crying_obsidian', 'crying_obsidian', 100, [10, -35, 12, -33]]
];
const automine = read('functions/system/automine.mcfunction');
for (const [, block, , , [x1, z1, x2, z2]] of NETHER) assert.ok(automine.includes(`fill ${x1} 0 ${z1} ${x2} -4 ${z2} ${block}\n`), 'pit ' + block);
assert.ok(!/fill 10 0 -2[68] 12 -4 -2[68] /.test(automine), 'tenth pit stays empty');

const sale = read('functions/system/autosale.mcfunction');
for (const [lvl, , item, price] of NETHER) {
	const sel = `scores={lvl=${lvl}..40},hasitem={item=${item}}`;
	assert.ok(sale.includes(`execute as @a[${sel}] at @s if block ~~-1~ gold_block run scoreboard players add @s money ${price}\n`), 'money ' + item);
	assert.ok(sale.includes(`execute as @a[tag=boost:x4,tag=!boost:x2,${sel}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp ${price * 4}\n`), 'xp x4 ' + item);
	assert.ok(sale.includes(`execute as @a[${sel}] at @s if block ~~-1~ gold_block run clear @s ${item} 0 1\n`), 'clear ' + item);
	assert.equal((sale.match(new RegExp(`hasitem=\\{item=${item}\\}`, 'g')) || []).length, 7, 'one section ' + item);
}

const pick = read('functions/system/pickaxe_lvl.mcfunction');
const ranges = ['16..16', '17..17', '18..18', '19..19', '20..20', '21..21', '22..23', '24..24', '25..25'];
ranges.forEach((r, i) => {
	const line = pick.split('\n').find(l => l.startsWith(`replaceitem entity @a[tag=sys:pick_update,scores={lvl=${r}}]`));
	assert.ok(line, 'pickaxe ' + r);
	const blocks = JSON.parse(line.match(/"blocks":(\[[^\]]*\])/)[1]);
	assert.deepEqual(blocks.slice(11, -1), NETHER.slice(0, i + 1).map(n => n[1]), 'pickaxe blocks ' + r);
	assert.equal(blocks.at(-1), 'amethyst_cluster');
});
assert.ok(!pick.includes('lvl=20..21'));
// Старые кирки 17–21 ломали бы не те блоки — setup 9 выдаёт кирки заново (дальше — шаги новее)
assert.match(read('functions/system/setup.mcfunction'), /scoreboard players reset \* pick\n# 10 /);
assert.match(read('functions/system/timers.mcfunction'), /matches \.\.10 run function system\/setup/);
assert.match(read('scripts/system/security/anticheat_checks.js'), /\|gilded_blackstone\|/);

const names = { ru_RU: ['Незерский кварц', 'Кусочек золота', 'Магма', 'Позолоченный чернит', 'Древние обломки'] };
const ru = fs.readFileSync(new URL('../../resource_packs/main-rp-shop_for_ore/texts/ru_RU.lang', import.meta.url), 'utf8');
names.ru_RU.forEach((n, i) => assert.ok(ru.includes(`menu.levels.line.${17 + i}=${17 + i} уровень - ${n}\r\n`), n));
console.log('PASS: Nether order — pits, autosale levels/prices, pickaxe lists and level menu agree; tenth pit empty; pickaxes reissued once.');
