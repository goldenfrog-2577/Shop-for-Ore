import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const repo=new URL('../../',import.meta.url),bp=new URL('behavior_packs/main-addon-shop_for_ore/',repo);
const langs=['ru_RU','en_US','uk_UA','es_ES'];
const parse=s=>new Map(s.replace(/^\uFEFF/,'').split(/\r?\n/).filter(s=>!s.startsWith('#')&&s.includes('=')).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1)];}));
const maps=langs.map(l=>parse(fs.readFileSync(new URL('resource_packs/main-rp-shop_for_ore/texts/'+l+'.lang',repo),'utf8')));
const params=s=>s.match(/%(?:\d+\$)?[sdif]/g)||[];
const identity=s=>{const a=params(s);return {indexed:a.filter(t=>/^%\d/.test(t)).sort(),positional:a.filter(t=>!/^%\d/.test(t))};};
for(let i=0;i<4;i++){
	assert.deepEqual([...maps[i].keys()],[...maps[0].keys()],langs[i]+' key order');
	for(const [key,value] of maps[i]){
		assert.deepEqual(identity(value),identity(maps[0].get(key)),langs[i]+': '+key+' placeholders');
		assert.ok(!value.includes('\t#'),key+' copied a vanilla comment');
		assert.ok(!/§(?![0-9a-gklmnor])/i.test(value),key+' invalid formatting code');
	}
}
const load=p=>fs.readFileSync(new URL(p,bp),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const source=load('scripts/menu/admin/admin_menu.js');
for(const p of ['scripts/menu/admin/admin_menu.js','scripts/menu/main_menu.js','scripts/menu/achievements_menu.js']){
	const s=load(p);assert.ok(!/§[0-9a-gr]%[a-z_]/i.test(s),p+' adjacent formatting/translation');
	assert.ok(!/\$\{color\(a\)\}%/.test(s),p+' adjacent dynamic color/translation');
}
const colorAt=(s,needle)=>{const n=s.indexOf(needle);assert.ok(n>=0,'Missing '+needle);const codes=s.slice(0,n).match(/§[0-9a-gr]/g);return codes?.at(-1)?.slice(1)||'r';};
for(let l=0;l<4;l++){
	const tr=s=>s.replace(/%([a-z_][a-z0-9_.]*)/gi,(all,k)=>{assert.ok(maps[l].has(k),'Missing UI key '+k);return maps[l].get(k);});
	const owner={name:'Owner',role:'owner',hasTag:()=>false};
	const tags=new Set();let mute=0,bot=null,captured;
	const target={name:'Target',role:'player',hasTag:t=>tags.has(t)};
	const scores={lvl:11,money:12345,vip_coins:67890};
	const ctx={world:{events:{beforeItemUse:{subscribe(){}}},getPlayers:()=>[owner,target].values(),scoreboard:{getObjective:()=>({getParticipants:()=>[]})}},
		getRole:p=>p.role,hasRole:(p,r)=>p.role==='owner',findPlayer:()=>target,isVip:p=>p===target&&tags.has('player:vip'),getScore:(p,k)=>scores[k]||0,getWarns:()=>2,
		muteMinutesLeft:()=>mute,playtimeText:()=> '987 %menu.common.time.second',isJailed:()=>false,backButton:fn=>({text:'%admin.common.back',run:fn}),
		showMenu:(p,title,body,items)=>{captured={title:tr(title),body:tr(typeof body==='function'?body():body),items:items.map(x=>({...x,text:tr(x.text)}))};},
		getBot:()=>bot,getBotName:()=> 'BotName',botState:()=>({sit:false,totem:true,returnOnLoad:false,mode:'idle'}),boostSeconds:()=>0,tell(){}};
	// Use the real menu builders so context and color inheritance are exercised together.
	vm.runInNewContext(source+'\nglobalThis.api={playerActions,botMenu};',ctx);
	for(const vip of [false,true])for(const remaining of [0,15,Infinity]){
		tags.clear();if(vip)tags.add('player:vip');mute=remaining;
		ctx.api.playerActions(owner,target);
		assert.equal(colorAt(captured.body,'12345'),'e','ordinary coins');
		assert.equal(colorAt(captured.body,'\ue152'),'r','ordinary coin glyph');
		const warningLine=captured.body.split('\n').find(s=>s.startsWith(maps[l].get('admin.players.body.warns')));
		assert.equal(colorAt(warningLine,'/'),'7','warning slash');
		assert.equal(colorAt(warningLine,'3'),'f','warning denominator');
		if(vip){assert.equal(colorAt(captured.body,'67890'),'g');assert.equal(colorAt(captured.body,'\ue186'),'r');}else assert.ok(!captured.body.includes('67890'));
		const muteLine=captured.body.split('\n').find(s=>s.startsWith(maps[l].get('admin.players.body.mute')));
		assert.ok(muteLine);assert.ok(!muteLine.includes('%'));
		assert.equal(colorAt(muteLine,remaining===15?'15':maps[l].get(remaining===0?'admin.players.mute.none':'chat.term.permanent')),'f','mute value');
	}
	for(const present of [false,true]){
		bot=present?target:null;ctx.api.botMenu(owner);
		assert.ok(captured.body.includes(maps[l].get(present?'admin.bot.present':'admin.bot.absent')));
		assert.equal(captured.items.some(x=>x.text.includes(maps[l].get('admin.bot.button.sit'))),present);
		assert.ok(captured.items.some(x=>/\[.*\]/s.test(x.text)));
	}
}
console.log('PASS: four language key order/parameters, UI key separators, assembled player cards (VIP/mute states), amount/glyph colors and bot presence/statuses.');

// The role-error wording is grounded in the actual permission predicates.
const roles=['player','helper','moder','admin','owner'];
let sent;
const guard={getRole:p=>p.role,hasRole:(p,r)=>roles.indexOf(p.role)>=roles.indexOf(r),tell:(...a)=>{sent=a;}};
vm.runInNewContext(load('scripts/chat/commands/common.js')+'\nglobalThis.punish=canPunish;',guard);
for(const a of roles)for(const b of roles){
 const actor={name:'A',role:a},target={name:'B',role:b};
 const allowed=guard.punish(actor,target);
 assert.equal(allowed,a==='owner'||roles.indexOf(a)>roles.indexOf(b),'punishment role boundary');
 if(!allowed)assert.equal(sent[1],'chat.cmd.error.role');
 assert.equal(guard.punish(actor,actor),false,'self punishment');
}
const db=load('scripts/DataBase.js'),begin=db.indexOf('function canLift('),end=db.indexOf('\n}',begin)+2;
const lift={hasRole:guard.hasRole,getIssuer:p=>p.issuer,run:(p,s)=>{sent=s;},rawTranslateRich:(k,p)=>{assert.equal(k,'chat.cmd.error.issuer');assert.ok(p.translate.startsWith('role.'));return '{}';}};
vm.runInNewContext(db.slice(begin,end)+'\nglobalThis.lift=canLift;',lift);
for(const a of roles)for(const issuer of [null,...roles])assert.equal(lift.lift({role:a},{issuer},'mute'),!issuer||roles.indexOf(a)>=roles.indexOf(issuer),'issuer role boundary');
console.log('PASS: punishment rejects equal/higher roles; lifting accepts the issuer role and higher (owner exception preserved).');
