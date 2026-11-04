import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const bp=new URL('../../behavior_packs/main-addon-shop_for_ore/',import.meta.url);
const load=p=>fs.readFileSync(new URL(p,bp),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const event=()=>({handlers:[],subscribe(fn){this.handlers.push(fn);}});
const events=Object.fromEntries(['tick','entityHurt','playerLeave','playerJoin','worldInitialize','beforeChat'].map(k=>[k,event()]));
const dim={id:'overworld'},mk=(name,tags=[])=>{const p={name,id:name,typeId:'minecraft:player',dimension:dim,location:{x:0,y:1,z:0},tags:new Set(tags),hasTag:t=>p.tags.has(t),addTag:t=>p.tags.add(t),removeTag:t=>p.tags.delete(t),getTags:()=>[...p.tags]};return p;};
const bot=mk('Bot',['sys:bot','role:bot']),human=mk('Human',['player:pvp','auth:done','sys:guided']);human.location.x=50;
const calls=[],commands=[],props={},clock={now:()=>1000};
for(const method of ['navigateToEntity','navigateToLocation','lookAtEntity','stopMoving','stopBreakingBlock','attackEntity','jump','setRotation'])bot[method]=(...args)=>calls.push([method,...args]);
bot.getComponent=()=>({current:20,resetToMaxValue(){}});
const ctx={world:{events,getPlayers:()=>[bot,human].values(),getDynamicProperty:k=>props[k],setDynamicProperty:(k,v)=>props[k]=v},Location:class{constructor(x,y,z){Object.assign(this,{x,y,z});}},BlockLocation:class{},DynamicPropertiesDefinition:class{},Date:clock,
	isAir:id=>!id||id==='minecraft:air',isSolid:id=>id==='minecraft:stone',getBot:()=>bot,isBot:p=>p.hasTag('sys:bot')||p.hasTag('role:bot'),isPending:()=>false,getScore:()=>10,findPlayer:n=>n===human.name?human:undefined,
	run:(p,c)=>commands.push(c),onBotSpawned(){},onBotRemoved(){},freezePlayer(){},unfreezePlayer(){},showHudLine(){},getGame(){},gameOf(){},leaveGame(){},joinGame(){return true;},teleportToArena:p=>p.addTag('player:pvp')};
vm.runInNewContext(load('scripts/system/bot/bot.js')+'\nglobalThis.botApi={setBotMode};',ctx);
const tick=n=>{for(let i=0;i<n;i++)for(const fn of events.tick.handlers)fn();};
ctx.botApi.setBotMode('follow',{target:'Human'});tick(20);assert.ok(calls.some(c=>c[0]==='navigateToEntity'));assert.ok(!commands.some(c=>c.startsWith('tp ')),'distant target starts with walking');
for(let i=0;i<10;i++){bot.location.x+=0.5;tick(10);}assert.ok(!commands.some(c=>c.startsWith('tp ')),'progress avoids teleport');
tick(220);assert.ok(commands.some(c=>c.startsWith('tp ')),'stuck recovery eventually works');assert.ok(!calls.some(c=>c[0]==='jump'),'flat stuck follow never jumps');
human.location.x=bot.location.x+2;ctx.botApi.setBotMode('spar',{level:4});calls.length=0;tick(40);assert.ok(calls.filter(c=>c[0]==='attackEntity').length>=15);assert.ok(calls.some(c=>c[0]==='jump'));assert.ok(calls.some(c=>c[0]==='navigateToLocation'),'hardest bot circles its target');
// Dummy HUD blocks lower-priority arena updates for its lease, then releases them.
let now=1000;const hud={world:{events:{playerLeave:event()}},Date:{now:()=>now},run:(p,c)=>commands.push(c)};
vm.runInNewContext(load('scripts/system/ui/toast.js')+'\nglobalThis.line=showHudLine;',hud);
assert.equal(hud.line(human,[],{priority:10,source:'dummy'}),true);assert.equal(hud.line(human,[]),false);now+=2001;assert.equal(hud.line(human,[]),true);
// Join a running game as an additional participant; humans still cannot join late.
const miniEvents=new Proxy({}, {get:(o,k)=>o[k]??(o[k]=event())});let starts=0;
const mini={world:{events:miniEvents,getPlayers:()=>[bot,human].values()},system:{runSchedule(){},run(){}},run(){},tell(){},rawTranslateRich:()=> '{}',isPending:()=>false,isBot:ctx.isBot,findPlayer:n=>n===bot.name?bot:human,
	isJailed:()=>false,jailMinutesLeft:()=>0,combatSecondsLeft:()=>0,teleportToArena:()=>starts++,showTitle(){}};
vm.runInNewContext(load('scripts/system/minigames/minigames.js')+'\nglobalThis.games={getGame,joinGame};',mini);
const g=mini.games.getGame('pvp_ffa');g.phase='running';g.seconds=40;g.players.add(human.name);g.alive.add(human.name);
assert.equal(mini.games.joinGame(bot,'pvp_ffa',{allowBot:true}),true);assert.ok(g.alive.has(bot.name));assert.equal(g.joinedAt.get(bot.name),40);assert.equal(starts,1);
const third=mk('Third');assert.equal(mini.games.joinGame(third,'pvp_ffa'),false);
assert.ok(calls.filter(c=>c[0].startsWith('navigate')).every(c=>c[2]<=1),'navigation respects API speed bounds');
// Bot prefix survives a separately assigned role and arbitrary custom ranks.
bot.addTag('role:owner');bot.addTag('rank:Fake');const chatCommands=[];
const chat={world:{events,getDimension:()=>({})},system:{runSchedule(){}},getScore:()=>7,isBot:ctx.isBot,isPending:()=>false,getRole:()=> 'player',ROLE_COLORS:{owner:'§4',player:'§f'},BOT_COLOR:'§f',getChatColor:()=>undefined,impersonatedRole:()=>undefined,emotes:{},run:(p,c)=>chatCommands.push(c),isVip:()=>false};
vm.runInNewContext(load('scripts/chat/chat.js')+'\nglobalThis.chat=sendChatMessage;',chat);chat.chat(bot,'hello');
const message=chatCommands.at(-1);assert.ok(message.includes('role.tag.bot'));assert.ok(message.includes('§4Bot'));assert.ok(message.includes('7'));assert.ok(!message.includes('Fake'));assert.ok(!message.includes('role.tag.owner'));
let present=true,menu;const ui={world:{events:{beforeItemUse:event()}},getBot:()=>present?bot:undefined,getBotName:()=>bot.name,botState:()=>({mode:'follow',sit:false,totem:true,returnOnLoad:true}),showMenu:(p,t,b,items)=>menu={body:typeof b==='function'?b():b,items},backButton:run=>({text:'%admin.common.back',run})};
vm.runInNewContext(load('scripts/menu/admin/admin_menu.js')+'\nglobalThis.menu=botMenu;',ui);ui.menu(human);
const slots=menu.items.findIndex(i=>i.text==='%admin.bot.button.slots'),sit=menu.items.findIndex(i=>i.text.startsWith('%admin.bot.button.sit'));
assert.equal(sit,slots+1);assert.ok(menu.items[sit].text.replace(/§./g,'').includes('[ '));assert.ok(menu.body.includes('%admin.bot.status %admin.bot.present'));
present=false;ui.menu(human);assert.ok(!menu.items.some(i=>i.text.startsWith('%admin.bot.button.sit')));assert.ok(menu.body.includes('%admin.bot.absent'));
console.log('PASS: walk before teleport, stuck recovery, fast jumping/circling sparring, dummy HUD priority and late bot entry.');
