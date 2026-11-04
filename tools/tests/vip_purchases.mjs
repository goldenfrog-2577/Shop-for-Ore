import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const repo=new URL('../../',import.meta.url),bp=new URL('behavior_packs/main-addon-shop_for_ore/',repo);
const load=p=>fs.readFileSync(new URL('scripts/'+p,bp),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const events=Object.fromEntries(['tick','blockBreak','entityHurt','buttonPush'].map(k=>[k,{handlers:[],subscribe(fn){this.handlers.push(fn);}}]));
const people=[],commands=[],messages=[],toasts=[];let capture;
const context={world:{events,getPlayers:()=>people.values()},system:{runSchedule(){}},TRAILS:[],PROMOCODES:[],usedPromo:()=>false,TOAST_TICKS:60,
 getScore:(p,k)=>p.scores[k]??0,isPending:p=>p.hasTag('auth:login'),isVip:p=>p.hasTag('player:vip'),rawTranslateRich:()=> '{}',showToast:(p,t)=>toasts.push({p,t}),
 tell:(p,k)=>messages.push({p,k}),metricNumbers:String,backButton:fn=>({text:'BACK',run:fn}),showMenu:(p,title,body,items)=>{capture={title,body,items};},
 run:(p,c)=>{commands.push({p,c});if(c.startsWith('structure load ')||c.startsWith('effect '))return new Promise(resolve=>p.finish=resolve);const m=c.match(/^scoreboard players (add|remove) @s (\w+) (\d+)$/);if(m)p.scores[m[2]]=(p.scores[m[2]]??0)+(m[1]==='add'?1:-1)*Number(m[3]);return Promise.resolve({});}
};
vm.runInNewContext(load('system/achievements.js')+'\n'+load('system/trader.js')+'\n'+load('menu/achievements_menu.js')+'\nglobalThis.api={ACHIEVEMENTS,PRODUCTS,buy,unlock,has,findAchievement,achievementsMenu};',context);
const a=context.api,ids=['vip_diamond_kit','vip_netherite_kit','vip_pickaxe'];
assert.equal(a.ACHIEVEMENTS.length,39);assert.equal(a.ACHIEVEMENTS.filter(x=>x.type==='task').length,23);assert.equal(a.ACHIEVEMENTS.filter(x=>x.type==='challenge').length,16);
assert.deepEqual(Array.from(a.ACHIEVEMENTS.slice(-3),x=>x.id),ids,'old 36-entry award queue stays ahead of new purchases');
for(const [id,type,reward]of [[ids[0],'task',25],[ids[1],'challenge',50],[ids[2],'challenge',50]]){const x=a.findAchievement(id);assert.equal(x.type,type);assert.equal(x.reward.vip_coins,reward);}
const mk=(name,extra=[])=>{const p={name,typeId:'minecraft:player',scores:{vip_coins:10000},slots:10,tags:new Set(['player:vip',...extra]),getTags(){return[...this.tags];},hasTag(t){return this.tags.has(t);},addTag(t){this.tags.add(t);},removeTag(t){this.tags.delete(t);},getComponent(){return{container:{emptySlotsCount:this.slots}};}};for(const x of a.ACHIEVEMENTS)if(!ids.includes(x.id))p.tags.add('ach:'+x.id);return p;};
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const advance=n=>{for(let i=0;i<n;i++)for(const fn of events.tick.handlers)fn();};
const diamond=a.PRODUCTS.find(p=>p.id==='kit_diamond');
for(const [name,change,result]of [['not VIP',p=>p.tags.delete('player:vip'),'vip'],['poor',p=>p.scores.vip_coins=0,'coins'],['full',p=>p.slots=4,'full']]){const p=mk(name);change(p);const count=commands.length;assert.equal(a.buy(p,diamond),result);assert.equal(commands.length,count);assert.ok(!p.hasTag('stat:trader:kit_diamond'));}
for(const result of [undefined,{successCount:0}]){const fail=mk('Failed');assert.equal(a.buy(fail,diamond),'ok');assert.equal(a.buy(fail,diamond),'busy');assert.ok(!fail.hasTag('stat:trader:kit_diamond'),'no credit before completion');fail.finish(result);await settle();assert.equal(fail.scores.vip_coins,10000);assert.ok(!fail.hasTag('stat:trader'));assert.ok(!a.findAchievement(ids[0]).done(fail));assert.ok(messages.some(x=>x.p===fail&&x.k==='chat.trader.error.give'));assert.equal(a.buy(fail,diamond),'ok','failed transaction releases pending lock');fail.finish(undefined);await settle();}
for(const [productId,achievement,reward]of [['kit_diamond',ids[0],25],['kit_netherite',ids[1],50],['pickaxe_1',ids[2],50],['pickaxe_2',ids[2],50],['pickaxe_3',ids[2],50]]){
 const p=mk(productId),product=a.PRODUCTS.find(x=>x.id===productId);people.push(p);
 assert.ok(!a.findAchievement(achievement).done(p));assert.equal(a.buy(p,product),'ok');assert.ok(!a.findAchievement(achievement).done(p));
 p.finish({successCount:1});await settle();assert.equal(p.scores.vip_coins,10000-product.price);assert.ok(a.findAchievement(achievement).done(p));
 for(const id of ids)assert.equal(a.findAchievement(id).done(p),id===achievement,'only matching purchase counts');
 advance(20);assert.ok(a.has(p,achievement));assert.equal(p.scores.vip_coins,10000-product.price+reward);
 const earned=toasts.filter(t=>t.p===p).length;assert.equal(earned,1);
 assert.equal(a.buy(p,product),'ok');p.finish({successCount:1});await settle();advance(120);assert.equal(toasts.filter(t=>t.p===p).length,earned);assert.equal(p.scores.vip_coins,10000-2*product.price+reward,'one achievement reward across repeat buys');
 people.splice(people.indexOf(p),1);
}
for(const productId of ['skeleton_skull','haste']){const p=mk(productId),product=a.PRODUCTS.find(x=>x.id===productId);assert.equal(a.buy(p,product),'ok');p.finish({});await settle();assert.ok(p.hasTag('stat:trader'));for(const id of ids)assert.ok(!a.findAchievement(id).done(p),'unrelated trader item');if(productId==='skeleton_skull')assert.ok(p.hasTag('stat:head:skeleton_skull'));}
const buyer=mk('Buyer'),nearby=mk('Nearby');events.buttonPush.handlers[0]({source:buyer,block:{location:{x:-74,y:1,z:-54}}});buyer.finish({});await settle();assert.ok(a.findAchievement(ids[0]).done(buyer));assert.ok(!a.findAchievement(ids[0]).done(nearby),'event source gets credit');
const owned=mk('Gifted items');owned.getComponent=()=>({container:{emptySlotsCount:5,getItem:()=>({typeId:'minecraft:netherite_chestplate'})}});for(const id of ids)assert.ok(!a.findAchievement(id).done(owned),'inventory is not purchase proof');
const all=mk('Menu');a.achievementsMenu(all,()=>{});const menuIds=capture.items.map(x=>x.text.match(/%ach\.([^.]+)\.name/)?.[1]).filter(Boolean);assert.equal(menuIds.length,39);assert.equal(new Set(menuIds).size,39);
const kinds=menuIds.map(id=>a.findAchievement(id).type);assert.ok(kinds.slice(0,23).every(k=>k==='task'));assert.ok(kinds.slice(23).every(k=>k==='challenge'));
assert.equal(menuIds.indexOf(ids[0]),menuIds.indexOf('vip')+1);assert.equal(menuIds.indexOf(ids[2]),menuIds.indexOf(ids[1])+1);assert.ok(menuIds.indexOf(ids[2])<menuIds.indexOf('amethyst_500'),'challenges stay in the VIP theme');
for(const l of ['ru_RU','en_US','uk_UA','es_ES']){const text=fs.readFileSync(new URL('resource_packs/main-rp-shop_for_ore/texts/'+l+'.lang',repo),'utf8');for(const id of ids)for(const part of ['name','desc'])assert.ok(text.includes('ach.'+id+'.'+part+'='));}
const wipe=load('system/wipe.js');assert.ok(wipe.includes("'stat:'"),'purchase proof uses existing full-wipe prefix');
console.log('PASS: 39 entries, approved types/rewards, source-player purchase proof, all three picks, rejected/pending/failed/repeated purchases, no inventory backfill, VIP menu order and 4 locales.');
