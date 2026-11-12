import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/', import.meta.url);
const rp = new URL('../../resource_packs/main-rp-shop_for_ore/', import.meta.url);
const read = (base, path) => fs.readFileSync(new URL(path, base), 'utf8');
const json = (base, path) => JSON.parse(read(base, path));
const entities = [];
const players = [];
const events = {};
const dimension = id => ({
	id,
	spawnEntity(type, position) {
		assert.equal(type, 'server:player_stats');
		const entity = {
			position, nameTag: '', removed: false, refreshes: 0,
			teleport(pos, destination) { assert.equal(destination.id, id); this.position = pos; },
			triggerEvent(event) {
				if (event === 'server:remove') this.removed = true;
				else if (event === 'server:refresh') this.refreshes++;
				else assert.fail(event);
			}
		};
		entities.push(entity);
		return entity;
	}
});
const overworld = dimension('minecraft:overworld');
const nether = dimension('minecraft:nether');
const makePlayer = name => ({
	name, nameTag: '§4' + name + '\nOld stats',
	dimension: overworld, location: { x: 1, y: 5, z: 3 },
	scores: { lvl: 40, xp: 350, xp_need: 0, money: 110, vip_coins: 20, rebirth: 1 },
	tags: new Set(),
	hasTag(tag) { return this.tags.has(tag); },
	getEffect() { return this.invisible; },
	getComponent() { return { current: this.hp ?? 20 }; }
});
const context = {
	world: {
		events: Object.fromEntries(['beforeChat', 'playerLeave', 'tick'].map(name => [name, { subscribe: fn => { events[name] = fn; } }])),
		getPlayers: () => players.values()
	},
	system: { runSchedule() {} },
	Location: class { constructor(x, y, z) { Object.assign(this, { x, y, z }); } },
	MinecraftEffectTypes: { invisibility: {} },
	getScore: (p, id) => p.scores[id],
	metricNumbers: String,
	isPending: p => p.hasTag('auth:login'),
	isVip: p => p.hasTag('player:vip'),
	isBot: p => p.hasTag('role:bot')
};
vm.runInNewContext(read(bp, 'scripts/chat/chat.js').replace(/^import .*$/gm, '').replace(/^export /gm, ''), context);
const tick = n => { for (let i = 0; i < n; i++) events.tick(); };
const alice = makePlayer('Alice'), bot = makePlayer('Bot');
bot.tags.add('role:bot');
players.push(alice, bot);
tick(2);
assert.equal(alice.nameTag, 'Alice');
assert.equal(bot.nameTag, 'Bot');
tick(18);
assert.equal(entities.length, 1);
assert.match(entities[0].nameTag, /40.*350.*110.*1/);
assert.equal(entities[0].position.y, 6.58);
alice.location.x = 9;
tick(2);
assert.equal(entities[0].position.x, 9);
alice.tags.add('player:vip');
tick(18);
assert.equal(entities.length, 1);
assert.match(entities[0].nameTag, /VIP.*\ue128.*20.*1/);
assert.equal(entities[0].refreshes, 2);

alice.dimension = nether;
tick(2);
assert.ok(entities[0].removed);
tick(18);
assert.equal(entities.length, 2);
alice.invisible = true;
tick(2);
assert.ok(entities[1].removed);
alice.invisible = false;
tick(18);
assert.equal(entities.length, 3);
events.playerLeave({ playerName: 'Alice' });
assert.ok(entities[2].removed);

const server = json(bp, 'entities/player_stats.json')['minecraft:entity'];
const client = json(rp, 'entity/player_stats.json')['minecraft:client_entity'];
assert.equal(server.description.identifier, client.description.identifier);
assert.equal(server.components['minecraft:nameable'].always_show, true);
assert.equal(server.components['minecraft:physics'].has_collision, false);
assert.equal(server.component_groups['server:active']['minecraft:timer'].time_down_event.event, 'server:remove');
assert.deepEqual(json(rp, 'ui/_global_variables.json')['$npc_dialog_text_color'], [0, 0, 0]);
const npc = json(rp, 'ui/npc_interact_screen.json');
const label = npc.student_custom_dialog_stack_panel.controls.find(c => c.text_panel).text_panel.controls[0].message_label;
assert.equal(label.text, '#dialogtext');
assert.deepEqual(label.color, [1, 1, 1]);
assert.ok(json(rp, 'contents.json').content.some(entry => entry.path === 'entity/player_stats.json'));
console.log('PASS: native player names, separate statistics and label lifecycle, independent NPC editor and dialogue colors.');
