import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const main = read('behavior_packs/main-addon-shop_for_ore/scripts/menu/main_menu.js');
const code = main.slice(main.indexOf('const CREATOR_ICONS'), main.indexOf('// ===== Магазин ====='));
let form;
const context = {
	mapInfo() { form = { title: 'about' }; },
	backButton: (run, text, icon) => ({ run, text, icon }),
	showMenu: (player, title, body, buttons) => { form = { title, body, buttons: buttons.filter(Boolean) }; },
	modal: title => ({ title, fields: [], textField(...field) { this.fields.push(field); return this; } }),
	showModal: (player, modalForm, submit, close) => { form = { ...modalForm, submit, close }; }
};
vm.runInNewContext(code, context);
const player = { name: 'Test' };
const names = ['kapycta1231484', 'NastyaXs00', 'Claude', 'Codex'];
const urls = [
	['https://github.com/goldenfrog-2577', 'https://t.me/goldenfrog_2577'],
	[],
	['https://claude.com/'],
	['https://openai.com/codex/']
];
context.creators(player);
assert.equal(form.buttons.length, 5);
assert.deepEqual(Array.from(form.buttons.slice(0, 4), b => b.text.split('\n')[0].slice(2)), names);
for (const [i, name] of names.entries()) {
	assert.ok(form.buttons[i].icon.startsWith('textures/server_icons/'));
	form.buttons[i].run();
	assert.equal(form.title, '§l§8' + name);
	assert.match(form.body, /%menu\.creators\.\w+\.bio$/);
	assert.equal(form.buttons.length, urls[i].length ? 2 : 1);
	if (urls[i].length) {
		form.buttons[0].run();
		assert.deepEqual(Array.from(form.fields, ([, placeholder, value]) => {
			assert.equal(placeholder, value);
			return value;
		}), urls[i]);
		form.close();
		assert.equal(form.title, '§l§8' + name);
		form.buttons[0].run();
		form.submit(['ignored']);
		assert.equal(form.title, '§l§8' + name);
	}
	form.buttons.at(-1).run();
	assert.equal(form.title, '%menu.creators.title');
}
form.buttons.at(-1).run();
assert.equal(form.title, 'about');

const rp = 'resource_packs/main-rp-shop_for_ore/';
const assets = JSON.parse(read(rp + 'contents.json')).content.map(entry => entry.path);
for (const name of ['claude', 'codex']) {
	const path = 'textures/server_icons/creator_' + name + '.png';
	assert.ok(assets.includes(path));
	const png = fs.readFileSync(new URL(rp + path, root));
	assert.equal(png.readUInt32BE(16), 32);
	assert.equal(png.readUInt32BE(20), 32);
	assert.equal(png[25], 6);
}
console.log('PASS: creator cards, icons, copyable links and navigation.');
