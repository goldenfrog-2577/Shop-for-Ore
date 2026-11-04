import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const bp=new URL('../../behavior_packs/main-addon-shop_for_ore/',import.meta.url);
const src=fs.readFileSync(new URL('scripts/system/core/player_scores.js',bp),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const rules={functioncommandlimit:0,maxcommandchainlength:0,commandblocksenabled:false},props={},commands=[],warnings=[];
const player={name:'P',scores:{lvl:1,money:250100,vip_coins:80,play_seconds:24615},tags:new Set(['role:owner','auth:done','sys:wipe:1']),getTags:()=>[...player.tags],hasTag:t=>player.tags.has(t),addTag:t=>player.tags.add(t)};player.scoreboard=player;
const objectives=new Map();
const addObjective=id=>{const o={getScore:p=>{if(!(id in p.scores))throw Error('missing score');return p.scores[id];}};objectives.set(id,o);return o;};
let fail=false;
const dimension={async runCommandAsync(cmd){
	commands.push(cmd);
	if(cmd.startsWith('gamerule ')){
		if(fail)throw Error('native gamerule failure');
		const [,id,value]=cmd.split(' ');rules[id]=Number(value);return {};
	}
	if(cmd==='function system/spawnbot'){
		if(rules.functioncommandlimit===0||rules.maxcommandchainlength===0)throw Error('function disabled by command budget');
		return {};
	}
	throw Error('Unexpected command '+cmd);
}};
const world={events:{worldInitialize:{subscribe(){}},tick:{subscribe(){}}},getPlayers:()=>[player].values(),scoreboard:{getObjective:id=>objectives.get(id),addObjective},getDimension:id=>{assert.equal(id,'overworld');return dimension;},getDynamicProperty:k=>props[k],setDynamicProperty:(k,v)=>props[k]=v};
const run=async(p,cmd)=>{commands.push(cmd);const m=cmd.match(/^scoreboard players set @s (\w+) (\d+)$/);assert.ok(m,cmd);await Promise.resolve();p.scores[m[1]]=Number(m[2]);return {};};
function load(){const ctx={world,run,getScore:(p,k)=>p.scores[k]??0,system:{run(){}},DynamicPropertiesDefinition:class{},console:{warn:s=>warnings.push(s)}};vm.runInNewContext(src+'\nglobalThis.api={ensureFunctionLimits};',ctx);return ctx.api;}
await assert.rejects(dimension.runCommandAsync('function system/spawnbot'),/command budget/,'real saved zero-budget condition');
commands.length=0;
let api=load(),first=api.ensureFunctionLimits();assert.equal(api.ensureFunctionLimits(),first,'one concurrent startup');assert.equal(await first,true);
assert.equal(rules.functioncommandlimit,10000);assert.equal(rules.maxcommandchainlength,65536);assert.equal(rules.commandblocksenabled,false);
assert.equal(props['shop:command_limits_v1'],true);assert.equal(player.scores.money,250100);assert.equal(player.scores.vip_coins,80);assert.equal(player.scores.play_seconds,24615);assert.ok(player.hasTag('player'));
assert.ok(commands.findIndex(c=>c.startsWith('gamerule '))>commands.findLastIndex(c=>c.startsWith('scoreboard ')),'scores/player marker repaired before tick functions are enabled');
assert.ok(!commands.some(c=>c.includes('commandblocksenabled')),'do not enable old command blocks');
await dimension.runCommandAsync('function system/spawnbot');
const stable=commands.length;await api.ensureFunctionLimits();assert.equal(commands.length,stable);
// A registered migration must not overwrite future owner settings on each reload.
rules.functioncommandlimit=777;rules.maxcommandchainlength=888;api=load();await api.ensureFunctionLimits();assert.equal(commands.length,stable);assert.equal(rules.functioncommandlimit,777);assert.equal(rules.maxcommandchainlength,888);
delete props['shop:command_limits_v1'];fail=true;api=load();assert.equal(await api.ensureFunctionLimits(),false);assert.ok(warnings.some(s=>s.includes('native gamerule failure')));assert.equal(props['shop:command_limits_v1'],undefined);
fail=false;assert.equal(await api.ensureFunctionLimits(),true,'failed migration retries');
console.log('PASS: zero-budget function rejection, score recovery before enable, both limits, command blocks unchanged, once-only migration and native failure/retry.');
