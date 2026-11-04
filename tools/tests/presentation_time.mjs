import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const bp=new URL('../../behavior_packs/main-addon-shop_for_ore/',import.meta.url);
const load=p=>fs.readFileSync(new URL(p,bp),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const events={tick:{subscribe(){}},playerLeave:{subscribe(){}}};
const player={name:'P',tags:new Set(),scores:{lvl:1,money:20,vip_coins:50,xp:10,stat_playtime:120},hasTag:t=>player.tags.has(t)};player.scoreboard=player;
const context={world:{events},getScore:(p,id)=>p.scores[id]??0,isVip:p=>p.hasTag('player:vip'),metricNumbers:String,MAX_LEVEL:40,run(){}};
vm.runInNewContext(load('scripts/system/ui/hud.js')+'\nglobalThis.hud=hudRawtext;',context);
for(const icons of [false,true])for(const level of [0,1,40]){
	player.scores.lvl=level;player.tags=new Set(['player:vip',...(icons?['player:board_icons']:[])]);
	const raw=context.hud(player),text=JSON.stringify(raw);assert.ok(text.includes('VIP'));assert.ok(text.includes('\ue128'));assert.ok(!text.includes('"objective":"xp"'));assert.ok(!text.includes('"objective":"lvl"'));assert.ok(text.includes('vip_coins'));
}
player.tags=new Set();player.scores.lvl=1;assert.ok(JSON.stringify(context.hud(player)).includes('"objective":"xp"'));
let scheduled;const commands=[];
const pt={world:{scoreboard:{getObjective:()=>({getScore:p=>{if(p.scores.play_seconds===undefined)throw Error('missing');return p.scores.play_seconds;}})},getPlayers:()=>[player].values(),getDimension:()=>({})},system:{runSchedule:(cb,n)=>{assert.equal(n,20);scheduled=cb;}},getScore:context.getScore,isPending:()=>false,run:(p,cmd)=>{commands.push(cmd);const m=cmd.match(/set @s play_seconds (\d+)/);if(m)player.scores.play_seconds=Number(m[1]);}};
vm.runInNewContext(load('scripts/system/player/playtime.js')+'\nglobalThis.time={playedSeconds,durationParts};',pt);
assert.equal(pt.time.playedSeconds(player),7200);scheduled();assert.equal(player.scores.play_seconds,7200);assert.equal(commands.filter(c=>c.startsWith('scoreboard players add @a')).length,1);
assert.deepEqual(Array.from(pt.time.durationParts(365*86400+30*86400+86400+3661),a=>Array.from(a)),[['year',1],['month',1],['day',1],['hour',1],['minute',1],['second',1]]);
// API-compatible enchantment fixture: invalid levels and non-admin changes never reach setItem.
const comp={enchantments:{hasEnchantment:()=>0,canAddEnchantment:()=>true,addEnchantment:e=>e.level<=5,removeEnchantment(){}}};
const item={typeId:'minecraft:diamond_sword',getComponent:()=>comp};let writes=0;
const ench={MinecraftEnchantmentTypes:{sharpness:{}},Enchantment:class{constructor(type,level){this.level=level;}},ITEM_ENCHANTS:[{id:'sharpness',name:'enchantment.damage.all',max:5}],PICKAXE_ENCHANTS:[],hasRole:p=>p.admin,tell(){},};
const admin={admin:true,getComponent:()=>({container:{getItem:()=>item,setItem:()=>writes++}})};
vm.runInNewContext(load('scripts/menu/admin/admin_enchant.js')+'\nglobalThis.apply=applyAdminEnchant;',ench);
ench.apply(admin,0,item.typeId,'sharpness',3);assert.equal(writes,1);ench.apply(admin,0,item.typeId,'sharpness',99);assert.equal(writes,1);ench.apply({...admin,admin:false},0,item.typeId,'sharpness',1);assert.equal(writes,1);
console.log('PASS: VIP HUD in both modes, historical minutes, duration formatting, batched seconds and enchantment limits/rights.');
