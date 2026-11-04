import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const bp=new URL('../../behavior_packs/main-addon-shop_for_ore/',import.meta.url);
const load=p=>fs.readFileSync(new URL(p,bp),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const event=()=>({handlers:[],subscribe(fn){this.handlers.push(fn);}});
let seconds=0,scheduled;const timeCommands=[],timePlayer={scoreboard:{},hasTag:()=>false};let historical=120;
const time={world:{scoreboard:{getObjective:()=>({getScore:()=>seconds})},getPlayers:()=>[timePlayer].values(),getDimension:()=>({})},system:{runSchedule:f=>scheduled=f},getScore:()=>historical,isPending:()=>false,run:(p,c)=>timeCommands.push(c)};
vm.runInNewContext(load('scripts/system/player/playtime.js')+'\nglobalThis.api={playedSeconds,durationParts,playtimeText,playtimeRawtext};',time);
const text=()=>time.api.playtimeText(timePlayer);
assert.equal(text(),'0 %menu.common.time.hour 0 %menu.common.time.minute 0 %menu.common.time.second');
seconds=3661.99;assert.equal(text(),'1 %menu.common.time.hour 1 %menu.common.time.minute 1 %menu.common.time.second');
seconds=86400;assert.equal(text(),'1 %menu.common.time.day 0 %menu.common.time.hour 0 %menu.common.time.minute 0 %menu.common.time.second');
seconds=365*86400+60;assert.equal(text(),'1 %menu.common.time.year 0 %menu.common.time.hour 1 %menu.common.time.minute 0 %menu.common.time.second');
assert.deepEqual(Array.from(time.api.playtimeRawtext(timePlayer)).filter(p=>p.translate).map(p=>p.translate),['year','hour','minute','second'].map(u=>'menu.common.time.'+u));
for(const n of [0,1.9,-3,NaN,Infinity,undefined])for(const [,v]of time.api.durationParts(n))assert(Number.isInteger(v)&&v>=0);
seconds=undefined;assert.equal(time.api.playedSeconds(timePlayer),7200);scheduled();assert(timeCommands.some(c=>c.includes('set @s play_seconds 7200')));
seconds=NaN;historical=NaN;assert.equal(time.api.playedSeconds(timePlayer),0);assert(!/NaN|Infinity|\d\.\d/.test(text()));

const mk=(name,role='player',tags=[])=>({name,role,scores:{money:5,vip_coins:7},tags:new Set(tags),hasTag(t){return this.tags.has(t);}});
const owner=mk('Owner','owner'),alice=mk('Alice','player',['boost:magnet']),bob=mk('Bob','player',['boost:magnet']),bot=mk('Bot','player',['role:bot']);const people=[owner,bob,bot,alice];let capture;
const admin={world:{events:{beforeItemUse:event()},getPlayers:()=>people.values(),scoreboard:{getObjective(){throw Error('no settings');}}},getRole:p=>p.role,hasRole:p=>p.role==='owner',isBot:p=>p===bot,isVip:()=>false,isJailed:()=>false,
 getScore:(p,k)=>p.scores[k]??0,getWarns:()=>2,muteMinutesLeft:()=>0,playtimeText:time.api.playtimeText,findPlayer:n=>people.find(p=>p.name===n),
 showMenu:(p,title,body,items)=>capture={title,body,items},showModal:(p,form)=>capture={title:form.title},modal:title=>({title,dropdown(){return this;}}),backButton:run=>({text:'back',run}),
 boostSeconds:()=>0,getBot:()=>bot,getBotName:()=>bot.name,botState:()=>({mode:'follow',sit:false,totem:true,returnOnLoad:true}),SPAR_LEVELS:[1,2,3,4]};
vm.runInNewContext(load('scripts/menu/admin_menu.js')+'\nglobalThis.api={serverMenu,moneyPlayers,playerActions,botMenu};',admin);
admin.api.moneyPlayers(owner);assert.equal(capture.title,'%admin.players.money.title');
admin.api.playerActions(owner,alice);assert(capture.body.includes('2§7/§f3§r'));assert(!capture.body.includes('§e/3'));
admin.api.serverMenu(owner);assert(capture.body.includes('%admin.server.magnets §fAlice§7, §fBob'));
alice.tags.delete('boost:magnet');bob.tags.delete('boost:magnet');bob.scores.magnet=100;admin.api.serverMenu(owner);assert(capture.body.includes('%admin.server.magnets §f%admin.server.none'));
admin.api.botMenu(owner);for(const title of ['%admin.bot.button.mode','%admin.bot.button.sit']){const row=capture.items.find(i=>i.text.startsWith(title));assert(row.text.includes('\n§8[§7 '));assert(!row.text.includes('§r'));}

const events=Object.fromEntries(['tick','entityHurt','playerLeave','playerJoin','worldInitialize'].map(k=>[k,event()])),blocks=new Map(),calls=[];
const dim={id:'overworld',getBlock:p=>({typeId:blocks.get([p.x,p.y,p.z].join(','))??(p.y===0?'minecraft:stone':'minecraft:air')})};
const sim={name:'Bot',id:'bot',dimension:dim,typeId:'minecraft:player',location:{x:.5,y:1,z:.5},velocity:{x:0,y:0,z:0},tags:new Set(['role:bot','sys:bot']),hasTag:t=>sim.tags.has(t),addTag:t=>sim.tags.add(t),getComponent:()=>({resetToMaxValue(){}})};
const human={name:'Human',id:'human',dimension:dim,typeId:'minecraft:player',location:{x:4.5,y:1,z:.5},velocity:{x:0,y:.5,z:0},rotation:{x:0,y:0},hasTag:t=>t==='player:pvp'||t==='sys:guided'};
for(const f of ['navigateToEntity','navigateToLocation','stopMoving','stopBreakingBlock','lookAtEntity','setRotation','jump','attackEntity'])sim[f]=(...a)=>calls.push([f,...a]);
const ai={world:{events,getPlayers:()=>[sim,human].values(),getDynamicProperty(){},setDynamicProperty(){}},Location:class{constructor(x,y,z){Object.assign(this,{x,y,z});}},BlockLocation:class{constructor(x,y,z){Object.assign(this,{x,y,z});}},DynamicPropertiesDefinition:class{},
 getBot:()=>sim,isBot:p=>p===sim,isPending:()=>false,getScore:()=>10,findPlayer:n=>n===human.name?human:undefined,run(){},onBotSpawned(){},onBotRemoved(){},freezePlayer(){},unfreezePlayer(){},showHudLine(){},getGame(){},gameOf(){},leaveGame(){},joinGame:()=>true,teleportToArena(){},isAir:id=>!id||id==='minecraft:air',isSolid:id=>id==='minecraft:stone'};
vm.runInNewContext(load('scripts/system/bot/bot.js')+'\nglobalThis.api={setBotMode,toggleBot,jumpableObstacle};',ai);
const tick=n=>{for(let i=0;i<n;i++)for(const fn of events.tick.handlers)fn();},jumps=()=>calls.filter(c=>c[0]==='jump').length;
ai.api.setBotMode('follow',{target:'Human'});tick(240);assert.equal(jumps(),0,'stuck on a flat floor does not cause jumps');
blocks.set('1,1,0','minecraft:stone');assert(ai.api.jumpableObstacle(sim,human.location));sim.velocity.z=.2;assert(!ai.api.jumpableObstacle(sim,human.location),'follow the actual movement direction, not a wall beside the path');sim.velocity.z=0;calls.length=0;tick(10);assert(jumps()>0,'one-block obstacle causes a jump');
calls.length=0;blocks.set('1,2,0','minecraft:stone');assert(!ai.api.jumpableObstacle(sim,human.location));tick(20);assert.equal(jumps(),0,'two-block wall cannot be jumped');blocks.delete('1,2,0');
blocks.set('0,3,0','minecraft:stone');assert(!ai.api.jumpableObstacle(sim,human.location));blocks.delete('0,3,0');
blocks.set('1,1,0','minecraft:planks');assert(ai.api.jumpableObstacle(sim,human.location),'legacy full-block ID');
blocks.set('1,1,0','minecraft:stone_block_slab');assert(!ai.api.jumpableObstacle(sim,human.location),'walkable step does not force jumping');blocks.clear();
ai.api.setBotMode('mirror',{target:'Human'});calls.length=0;tick(24);assert.equal(jumps(),0,'mirror does not copy jumping in place');
ai.api.setBotMode('spar',{level:3});calls.length=0;tick(24);assert.equal(jumps(),0,'normal sparring stays on foot');
ai.api.setBotMode('spar',{level:4});calls.length=0;tick(24);assert(jumps()>0,'level 4 retains run-jump movement');
sim.velocity.y=.4;calls.length=0;tick(24);assert.equal(jumps(),0,'no additional jump while rising');sim.velocity.y=0;
ai.api.toggleBot('sit');calls.length=0;tick(24);assert.equal(jumps(),0,'crouching is not run-jump');
console.log('PASS: integer/compact playtime, missing-score fallback, admin headings/colors/magnets, obstacle-only jumps and level-4 run-jump.');
