import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const bp=new URL('../../behavior_packs/main-addon-shop_for_ore/',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,bp),'utf8');
const source=read('scripts/system/promo.js').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const codes=vm.runInNewContext('('+source.match(/const PROMOCODES = (\[[\s\S]*?\n\]);/)[1]+')');
const make=()=>({tags:new Set(),scores:{lvl:40,money:0,vip_coins:0,xp:0},items:[],hasTag(t){return this.tags.has(t);},addTag(t){this.tags.add(t);},removeTag(t){this.tags.delete(t);}});
const match=(value,range)=>{if(value===undefined)return false;if(!range.includes('..'))return value===Number(range);const [lo,hi]=range.split('..');return(!lo||value>=Number(lo))&&(!hi||value<=Number(hi));};
function selected(p,selector){for(const m of selector.matchAll(/tag=(!?[^,\]]+)/g)){if(m[1].startsWith('!')?p.tags.has(m[1].slice(1)):!p.tags.has(m[1]))return false;}const scores=selector.match(/scores=\{([^}]+)\}/)?.[1];if(scores)for(const part of scores.split(',')){const [id,range]=part.split('=');if(!match(p.scores[id],range))return false;}return true;}
function redeem(code,p){let result=0;const messages=[];
	function cmd(line){if(!line||line.startsWith('#'))return;
		let m;if((m=line.match(/^execute as (@s(?:\[.*?\])?) run (.*)$/))){if(selected(p,m[1]))cmd(m[2]);return;}
		if((m=line.match(/^execute if score @s (\w+) matches ([^ ]+) run (.*)$/))){if(match(p.scores[m[1]],m[2]))cmd(m[3]);return;}
		if((m=line.match(/^tag @s (add|remove) (.*)$/))){m[1]==='add'?p.tags.add(m[2]):p.tags.delete(m[2]);return;}
		if((m=line.match(/^scoreboard players add @s (\w+) (\d+)$/))){p.scores[m[1]]=(p.scores[m[1]]??0)+Number(m[2]);return;}
		if(line==='scoreboard players set promo_book_result system 1'){result=1;return;}
		if((m=line.match(/^give @s (\S+) (\d+)$/))){p.items.push([m[1],Number(m[2])]);return;}
		if(line.startsWith('tellraw ')){messages.push(line);return;}
		if(line.startsWith('function ui/menu_'))return;
		throw Error('Unmodelled production command: '+line);
	}
	for(const line of read('functions/promo/redeem_'+code.toLowerCase()+'.mcfunction').split(/\r?\n/))cmd(line);
	return {result,messages};
}
for(const code of codes){const p=make();p.tags.add('player:vip');const first=redeem(code.code,p);assert.equal(first.result,1);for(const k of ['money','vip_coins','xp'])assert.equal(p.scores[k],code.reward[k]??0);assert.deepEqual(p.items,Array.from(code.reward.items??[],a=>Array.from(a)));const before=JSON.stringify(p.scores);assert.equal(redeem(code.code,p).result,0);assert.equal(JSON.stringify(p.scores),before);assert.ok(p.tags.has('promo:'+code.code.toLowerCase()));}
const low=make();low.scores.lvl=15;assert.equal(redeem('hellbonus',low).result,0);assert.equal(low.scores.xp,0);assert.equal(redeem('vipbonus',make()).result,0);
const legacy=make();legacy.scores.promo1=1;assert.equal(redeem('kapycta',legacy).result,0);assert.ok(legacy.tags.has('promo:kapycta'));
// Same usage tags protect the ordinary JS entry point after a native activation.
const ctx={getScore:(p,id)=>p.scores[id]??0,isVip:p=>p.hasTag('player:vip'),tell(){},run(){},rewardText:()=>[],rawTranslateRich:()=> '{}'};
vm.runInNewContext(source+'\nglobalThis.redeem=redeemPromo;',ctx);const p=make();redeem('kapycta',p);assert.equal(ctx.redeem(p,'KAPYCTA'),'used');
const scan=read('functions/promo/books_scan.mcfunction');assert.ok(scan.includes('type=item'));assert.ok(scan.includes('tag=!sys:promo_checked'));
for(const c of codes){const wrapper=read('functions/promo/book_'+c.code.toLowerCase()+'.mcfunction');assert.ok(wrapper.includes('promo_claimants system matches 1'));assert.ok(wrapper.includes('kill @s[type=item,tag=sys:promo_checked]'));assert.ok(!wrapper.includes('kill @p'));}
console.log('PASS: all native rewards, level/VIP checks, legacy use, repeat prevention across JS and native paths, unambiguous claimant/typed consumption guards.');
