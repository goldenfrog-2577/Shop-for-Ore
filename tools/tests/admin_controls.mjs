import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const bp=new URL('../../behavior_packs/main-addon-shop_for_ore/',import.meta.url);
const load=p=>fs.readFileSync(new URL(p,bp),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const mk=(name,role='player',tags=[])=>{const p={name,role,tags:new Set(tags),scores:{money:100,vip_coins:50},getTags:()=>[...p.tags],hasTag:t=>p.tags.has(t),addTag:t=>p.tags.add(t),removeTag:t=>p.tags.delete(t)};return p;};
const owner=mk('Owner','owner'),a=mk('Alice'),b=mk('Bob'),bot=mk('Bot','player',['role:bot']);let captured;
const ctx={world:{events:{beforeItemUse:{subscribe(){}}},getPlayers:()=>[owner,bot,b,a].values()},getRole:p=>p.role,hasRole:(p,r)=>p.role==='owner'||r==='admin'&&p.role==='admin',
	showMenu:(p,title,body,items)=>{captured={title,body,items};},showModal(){},modal(){},backButton:fn=>({text:'%admin.common.back',run:fn}),
	getScore:(p,k)=>p.scores[k]??0,getWarns:()=>2,findPlayer:n=>[owner,a,b,bot].find(p=>p.name===n),isVip:p=>p.hasTag('player:vip'),VIP_TAG:'player:vip',
	isJailed:()=>false,muteMinutesLeft:()=>15,playtimeText:()=> '1 h',tell(){},getBot:()=>bot};
vm.runInNewContext(load('scripts/menu/admin_menu.js')+'\nglobalThis.api={orderedPlayers,playerActions};',ctx);
assert.deepEqual(Array.from(ctx.api.orderedPlayers(owner,[owner,bot,b,a],()=>0),p=>p.name),['Alice','Bob','Bot','Owner']);
assert.equal(ctx.api.orderedPlayers(owner,[owner,bot,b,a],()=>0.9)[0].name,'Bob');
ctx.api.playerActions(owner,owner);assert.ok(captured.items.some(i=>i.text==='%admin.players.button.vip_give'),'self VIP');
captured.items.find(i=>i.text==='%admin.players.button.vip_give').run();assert.ok(owner.hasTag('player:vip'));
ctx.api.playerActions(owner,owner);assert.ok(captured.body.includes('%admin.players.body.vip_coins 50'));assert.ok(captured.body.includes('%admin.players.body.mute 15'));
captured.items.find(i=>i.text==='%admin.players.button.vip_take').run();assert.ok(!owner.hasTag('player:vip'));
const admin=load('scripts/chat/commands/admin.js');const start=admin.indexOf('async function setMoney('),end=admin.indexOf('\n}',start)+2;
const notices=[];const money={hasRole:ctx.hasRole,getScore:ctx.getScore,tell:(...args)=>notices.push(args),run:async(p,cmd)=>{const m=cmd.match(/set @s (\w+) (\d+)/);p.scores[m[1]]=Number(m[2]);return{};}};
vm.runInNewContext(admin.slice(start,end)+'\nglobalThis.setMoney=setMoney;',money);
assert.equal(await money.setMoney(owner,a,'add','25','vip_coins'),true);assert.equal(a.scores.vip_coins,75);assert.equal(a.scores.money,100);
await money.setMoney(owner,a,'take','999','vip_coins');assert.equal(a.scores.vip_coins,0);
await money.setMoney(owner,a,'set','2147483647','money');await money.setMoney(owner,a,'add','10','money');assert.equal(a.scores.money,2147483647);
assert.equal(await money.setMoney(a,b,'set','99','vip_coins'),false);assert.equal(b.scores.vip_coins,50);
assert.equal(await money.setMoney(owner,a,'add','-1','money'),false);
console.log('PASS: random default, player/bot/owner ordering, self VIP, mute/VIP display and both currencies with rights/ranges.');
