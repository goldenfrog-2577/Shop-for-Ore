import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const bp=new URL('../../behavior_packs/main-addon-shop_for_ore/',import.meta.url);
const source=p=>fs.readFileSync(new URL(p,bp),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const turns=async(n=12)=>{for(let i=0;i<n;i++)await Promise.resolve();};
const events=()=>Object.fromEntries(['tick','worldInitialize','playerJoin','playerLeave'].map(k=>[k,{subscribe(){}}]));
const mk=name=>{const p={name,tags:new Set(['role:owner','auth:done','player:board']),scores:{},getTags:()=>[...p.tags],hasTag:t=>p.tags.has(t),addTag:t=>p.tags.add(t),removeTag:t=>p.tags.delete(t)};p.scoreboard=p;return p;};
const player=mk('P'),offline=mk('Offline');
player.tags.add('sys:wipe:1');
Object.assign(player.scores,{lvl:1,money:250100,vip_coins:80,play_seconds:24615});
const objectives=new Map(),commands=[],properties={};let useUndefined=false;
const addObjective=id=>{const o={id,getScore:p=>{if(!(id in p.scores)&&!useUndefined)throw Error('missing');return p.scores[id];}};objectives.set(id,o);return o;};
for(const id of ['xp','money','vip_coins','lvl','rebirth','efficiency','fortune','pick','magnet','online','xp_need','stat_mined'])addObjective(id);
const world={events:events(),getPlayers:()=>[player].values(),scoreboard:{getObjective:id=>objectives.get(id),addObjective:id=>addObjective(id)},getDynamicProperty:k=>properties[k],setDynamicProperty:(k,v)=>{properties[k]=v;}};
const run=async(p,cmd)=>{
	commands.push(cmd);await Promise.resolve();
	let m=cmd.match(/^scoreboard players set @s (\w+) (-?\d+)$/);if(m)p.scores[m[1]]=Number(m[2]);
	m=cmd.match(/^scoreboard players reset \* (\w+)$/);if(m)for(const x of [player,offline])delete x.scores[m[1]];
	if(cmd==='function system/xp_need'){
		const rows=fs.readFileSync(new URL('functions/system/xp_need.mcfunction',bp),'utf8');
		for(const [,lo,hi,cost]of rows.matchAll(/lvl=(\d+)\.\.(\d*)\}\] xp_need (\d+)/g))if(p.scores.lvl>=Number(lo)&&(!hi||p.scores.lvl<=Number(hi)))p.scores.xp_need=Number(cost);
	}
	return {};
};
const ctx={world,run,console,Number,getScore:(p,k)=>Number.isFinite(p.scores[k])?p.scores[k]:0};
vm.runInNewContext(source('scripts/system/player_scores.js')+'\nglobalThis.ensure=ensurePlayerScores;',ctx);
const task=ctx.ensure(player);assert.equal(ctx.ensure(player),task,'one pending repair per player');await task;
for(const k of ['xp','rebirth','efficiency','fortune','pick','magnet'])assert.equal(player.scores[k],0,k+' explicitly initialized');
assert.equal(player.scores.xp_need,100);assert.equal(player.scores.online,1);assert.equal(player.scores.money,250100);assert.equal(player.scores.vip_coins,80);assert.equal(player.scores.play_seconds,24615);assert.ok(player.hasTag('player'));
const stable=commands.length;await ctx.ensure(player);assert.equal(commands.length,stable,'stable scores produce no writes');
useUndefined=true;delete player.scores.xp;await ctx.ensure(player);assert.equal(player.scores.xp,0,'API returning undefined also repaired');
player.scores.lvl=33;delete player.scores.xp_need;await ctx.ensure(player);assert.equal(player.scores.xp_need,126000,'price from real level table');
objectives.delete('fortune');delete player.scores.fortune;await ctx.ensure(player);assert.equal(player.scores.fortune,0,'missing objective recreated');
// HUD now has every referenced score, without replacing current money or VIP balance.
const hud={world,getScore:ctx.getScore,isVip:()=>false,MAX_LEVEL:40,metricNumbers:String,run:async()=>({})};
vm.runInNewContext(source('scripts/system/hud.js')+'\nglobalThis.hud=hudRawtext;',hud);
for(const part of hud.hud(player))if(part.score)assert.ok(Number.isFinite(player.scores[part.score.objective]),'HUD score exists: '+part.score.objective);
player.scores.lvl=25;player.tags.delete('player');await ctx.ensure(player);assert.ok(!player.hasTag('player'),'rebirth signal must remain until the function resets progress');player.tags.add('player');
// Full wipe runs asynchronously in order; offline scores stay removed and online scores are explicit.
offline.scores={money:900,xp:50,lvl:8};player.tags.add('player:vip');player.tags.add('ach:first');player.scores.stat_mined=100;
const wipe={...ctx,ensurePlayerScores:ctx.ensure,STATS:['stat_mined'],tell(){},syncResetEpoch(){},DynamicPropertiesDefinition:class{defineNumber(){}}};
vm.runInNewContext(source('scripts/system/wipe.js')+'\nglobalThis.wipe=wipeAll;',wipe);
await wipe.wipe(player);
assert.equal(player.scores.lvl,1);assert.equal(player.scores.money,0);assert.equal(player.scores.vip_coins,0);assert.equal(player.scores.xp,0);assert.equal(player.scores.rebirth,0);assert.equal(player.scores.xp_need,100);
assert.equal(offline.scores.money,undefined);assert.ok(player.hasTag('role:owner'));assert.ok(player.hasTag('auth:done'));assert.ok(player.hasTag('player:board'));assert.ok(player.hasTag('player'));assert.ok(player.hasTag('sys:wipe:1'));assert.ok(!player.hasTag('player:vip'));assert.ok(!player.hasTag('ach:first'));
assert.ok(!commands.some(c=>c.startsWith('scoreboard players reset @s')),'no online reset removes newly initialized scores');
console.log('PASS: missing/undefined scores and objectives, preservation of new balances, idempotency, level cost/HUD references and ordered online/offline wipe.');
