import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url);
const source = file => fs.readFileSync(new URL('scripts/' + file, bp), 'utf8')
	.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const owner = { name: 'Owner', role: 'owner', tags: ['auth:done'] };
const online = { name: 'Alice', role: 'player', tags: ['auth:done', 'auth:hash:secret', 'auth:salt:secret', 'password:secret', 'ach:welcome', 'sys:guided', 'sys:wipe:1', 'player', 'player:board', 'unprefixed_tag'] };
for (const player of [owner, online]) {
	player.scoreboard = { displayName: player.name, type: 'Player' };
	player.location = { x: -4.1, y: 1, z: 0 };
	player.dimension = { id: 'minecraft:overworld' };
	player.hasTag = tag => player.tags.includes(tag);
	player.getTags = () => player.tags;
}
const former = { displayName: 'Former', type: 'player' };
const botIdentity = { displayName: 'TestBot', type: 'player' };
const bot = { name: 'TestBot', scoreboard: botIdentity, hasTag: tag => tag === 'sys:bot' };
const unnamed = { displayName: 'commands.scoreboard.players.offlinePlayerName', type: 'player' };
const unnamedTranslated = { displayName: '%commands.scoreboard.players.offlinePlayerName', type: 'player' };
const fake = { displayName: 'Timer', type: 'FakePlayer' };
const tables = new Map();
for (const [id, current, previous] of [['money', 100, 0], ['lvl', 1, 40], ['xp', 0, 350], ['xp_need', 100, 0], ['vip_coins', 20, 508], ['rebirth', 0, 1], ['play_seconds', 65, 151617]]) {
	tables.set(id, new Map([[online.scoreboard, current], [former, previous], [fake, 1]]));
}
tables.get('money').set(botIdentity, 0);
tables.get('money').set(unnamed, 0);
tables.set('sfo_registry', new Map([[unnamedTranslated, 1]]));
const objective = id => tables.has(id) ? {
	getParticipants: () => [...tables.get(id).keys()],
	getScore: identity => {
		const value = tables.get(id).get(identity);
		if (value === undefined) throw new Error('Missing score');
		return value;
	}
} : undefined;
let players = [owner, online, bot], menu, snapshot;
const context = {
	world: { getPlayers: () => players.values(), events: { beforeItemUse: { subscribe() {} } }, scoreboard: {
		getObjective: objective, addObjective: id => tables.set(id, new Map())
	} },
	system: { runSchedule: fn => { snapshot = fn; } },
	ROLES: ['player', 'helper', 'moder', 'admin', 'owner'],
	MAX_LEVEL: 40,
	getRole: player => player.role,
	hasRole: player => player.role === 'owner',
	getWarns: () => 0,
	isBot: player => player.hasTag('sys:bot') || player.hasTag('role:bot'),
	isPending: player => player.hasTag('auth:login'),
	isVip: player => player.hasTag('player:vip'),
	playedSeconds: () => 65,
	durationText: String,
	findPlayer: name => players.find(player => player.name === name),
	run: (player, command) => {
		const [, id, value] = /set @s (\w+) (\d+)$/.exec(command);
		tables.get(id).set(player.scoreboard, Number(value));
		return Promise.resolve({});
	},
	showMenu: (player, title, body, items) => { menu = { title, body, items }; },
	backButton: run => ({ text: 'back', run })
};
vm.runInNewContext(source('system/player/registry.js'), context);
vm.runInNewContext(source('menu/admin/admin_menu.js') + '\nglobalThis.openRegistry = playerRegistryMenu;', context);

const click = part => {
	const item = menu.items.find(item => item?.text.includes(part));
	assert.ok(item, 'Missing button ' + part);
	item.run();
};
context.openRegistry(owner);
assert.match(menu.items[0].text,/Owner.*\n.*status\.self/);
assert.match(menu.items[0].text, /§2■§r .*status\.self/);
assert.ok(menu.items.some(item => item.text.includes('Alice') && item.text.includes('§2■§r %admin.players.registry.status.online')));
assert.ok(menu.items.some(item => item.text.includes('Former') && item.text.includes('§c■§r %admin.players.registry.status.offline')));
assert.ok(!menu.items.some(item => /Timer|TestBot|offlinePlayerName/.test(item.text)));
players = [owner, online];
tables.get('money').delete(botIdentity);
context.openRegistry(owner);
assert.ok(!menu.items.some(item => /TestBot|offlinePlayerName/.test(item.text)));
assert.ok(menu.items.some(item => item.text.includes('Former')));
click('Alice');
assert.match(menu.body, /§e0§7\/§e100/);
assert.equal(menu.items.find(item => item?.text.endsWith('.actions'))?.icon, 'textures/server_icons/command_block');
assert.equal(menu.items.find(item => item?.text.endsWith('.refresh'))?.icon, 'textures/ui/refresh_light');
click('.details');
assert.match(menu.body, /-5, 1, 0/);
assert.match(menu.body, /location_heading[\s\S]+dimension\.overworld[\s\S]+scores_heading[\s\S]+tags_heading/);
assert.doesNotMatch(menu.body, /\bvip_coins§8:/);
click('.tag.achievement');
assert.equal(menu.body, '§8■ §7ach:welcome§r');
click('back');
click('.tag.auth');
assert.equal(menu.body, '§8■ §7auth:done§r');
assert.doesNotMatch(menu.body, /secret/);
click('back');
click('.tag.system');
assert.equal(menu.body, '§8■ §7sys:guided§r\n§8■ §7sys:wipe:1§r');
click('back');
click('.tag.player');
assert.equal(menu.body, '§8■ §7player§r\n§8■ §7player:board§r');
click('back');
click('.tag.other');
assert.equal(menu.body, '§8■ §7unprefixed_tag§r');
click('back');
click('back');
online.tags.push('player:vip');
snapshot();
click('.refresh');
assert.match(menu.body, /§aVIP/);
assert.match(menu.body, /\ue128/);
assert.match(menu.body, /vip_coins §e20/);
players = [owner];
click('.refresh');
assert.match(menu.body, /\.snapshot/);
assert.match(menu.body, /§aVIP/);
assert.ok(!menu.items.some(item => item?.text.includes('.actions')));
click('back');
click('Former');
assert.match(menu.body, /350 %admin\.players\.registry\.xp\.max/);
assert.match(menu.body, /\.snapshot_missing/);
click('.details');
assert.match(menu.body, /registry\.money §e0/);
assert.match(menu.body, /offline_details/);
const previous = menu;
context.openRegistry(online);
assert.equal(menu, previous, 'registry requires administrator rights');
console.log('PASS: online and offline profiles, XP, VIP, grouped tags, navigation and permissions.');
