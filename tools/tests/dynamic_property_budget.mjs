// Бюджет динамических свойств мира (Minecraft 1.19.5x): сумма объявленных длин строк
// не должна приближаться к 10 000 — иначе игра пишет «Dynamic property size limit exceeded»
// и не регистрирует часть свойств (так было с журналом WorldEdit на 8 страниц).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../behavior_packs/main-addon-shop_for_ore/scripts/', import.meta.url).pathname;
const LIMIT = 10000, RESERVE = 1000, NUMBER = 8, BOOLEAN = 1;

const files = [];
(function walk(dir) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path);
		else if (name.endsWith('.js')) files.push(path);
	}
})(ROOT);

const constant = (src, name) => {
	const m = src.match(new RegExp(`\\b${name}\\s*=\\s*(\\d+)`));
	if (!m) throw new Error(`константа ${name} не найдена`);
	return Number(m[1]);
};
const value = (src, expr) => /^\d+$/.test(expr.trim()) ? Number(expr) : constant(src, expr.trim());

let total = 0;
const rows = [];
for (const file of files) {
	const src = readFileSync(file, 'utf8');
	if (!src.includes('registerWorldDynamicProperties')) continue;
	let size = 0;
	// for (let i = 0; i < N; i++) def.defineString(key(i), LEN)
	for (const m of src.matchAll(/for\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*(\w+)\s*;[^)]*\)\s*def\.defineString\([^,]+,\s*(\w+)\s*\)/g))
		size += value(src, m[1]) * value(src, m[2]);
	const loopless = src.replace(/for\s*\([^)]*\)\s*def\.defineString\([^)]*\)/g, '');
	for (const m of loopless.matchAll(/defineString\([^,]+,\s*(\w+)\s*\)/g)) size += value(src, m[1]);
	size += (loopless.match(/defineNumber\(/g) || []).length * NUMBER;
	size += (loopless.match(/defineBoolean\(/g) || []).length * BOOLEAN;
	total += size;
	rows.push(`${file.slice(ROOT.length)}: ${size}`);
}

if (total > LIMIT - RESERVE) {
	console.error(rows.join('\n'));
	console.error(`FAIL: объявлено ${total} из ${LIMIT}, запас меньше ${RESERVE}`);
	process.exit(1);
}
console.log(`PASS: world dynamic properties ${total}/${LIMIT} (${rows.length} files, reserve ≥ ${RESERVE})`);
