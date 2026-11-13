import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export function syncModuleList(scripts, { check = false } = {}) {
	assert.ok(vm.SourceTextModule, 'Run Node with --experimental-vm-modules');
	const root = path.resolve(scripts);
	const entry = path.join(root, 'import.js');
	const files = new Set();
	const context = vm.createContext({});
	function visit(file) {
		const relative = path.relative(root, file);
		assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Import outside scripts: ' + file);
		const id = relative.split(path.sep).join('/');
		if (files.has(id)) return;
		files.add(id);
		const source = new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { context, identifier: file });
		const dependencies = source.moduleRequests?.map(request => request.specifier) ?? source.dependencySpecifiers;
		for (const specifier of dependencies) {
			if (specifier.startsWith('.')) visit(path.resolve(path.dirname(file), specifier));
		}
	}
	visit(entry);

	const source = fs.readFileSync(entry, 'utf8');
	const marker = /(?<=\/\/ BEGIN GENERATED MODULE LIST\n)[\s\S]*?(?=\/\/ END GENERATED MODULE LIST)/;
	assert.match(source, marker, 'Module list markers missing from scripts/import.js');
	const ordered = [...files].sort((a, b) => Number(a.includes('/')) - Number(b.includes('/')) || (a < b ? -1 : a > b ? 1 : 0));
	const rows = ordered.map(id => '\t' + JSON.stringify(id) + ',').join('\n');
	const generated = source.replace(marker, rows + '\n');
	if (check) {
		assert.equal(source, generated, 'Module list is stale. Run node --experimental-vm-modules tools/module_list.mjs');
	} else if (source !== generated) {
		fs.writeFileSync(entry, generated);
	}
	return ordered;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const scripts = fileURLToPath(new URL('../behavior_packs/main-addon-shop_for_ore/scripts/', import.meta.url));
	const count = syncModuleList(scripts, { check: process.argv.includes('--check') }).length;
	console.log('Shop for Ore module list: ' + count + ' files');
}
