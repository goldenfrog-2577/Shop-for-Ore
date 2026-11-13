import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
if(!vm.SourceTextModule){const r=spawnSync(process.execPath,['--experimental-vm-modules','--no-warnings',fileURLToPath(import.meta.url)],{encoding:'utf8'});process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);}
const bp=new URL('../../behavior_packs/main-addon-shop_for_ore/',import.meta.url),source=fs.readFileSync(new URL('scripts/chat/commands/commands.js',bp),'utf8'),db=fs.readFileSync(new URL('scripts/utils.js',bp),'utf8');
const section=db.slice(db.indexOf('export const commandsList = [')),commandsList=[...section.matchAll(/command:\s*['"]!([a-z0-9_]+)[^'"]*['"][\s\S]*?role:\s*['"](\w+)['"]/g)].map(m=>({command:'!'+m[1],role:m[2]}));
for(const name of ['worldedit','wipe','resetoffline','role','roles','resetpass'])assert.equal(commandsList.find(x=>x.command==='!'+name)?.role,'owner');
const ROLES=['player','helper','moder','admin','owner'],mk=(name,role='player')=>({name,tags:new Set(role==='player'?[]:['role:'+role]),hasTag(t){return this.tags.has(t);},addTag(t){this.tags.add(t);},removeTag(t){this.tags.delete(t);}});
const owner=mk('Owner','owner'),admin=mk('Admin','admin'),alice=mk('Alice Smith'),bot=mk('Bot','bot'),people=[alice,admin,bot,owner];
const getRole=p=>ROLES.slice().reverse().find(r=>p.hasTag('role:'+r))??'player',hasRole=(p,r)=>ROLES.indexOf(getRole(p))>=ROLES.indexOf(r);
const handlers={beforeChat:[],playerLeave:[]},world={events:Object.fromEntries(Object.keys(handlers).map(k=>[k,{subscribe:fn=>handlers[k].push(fn)}])),getPlayers:()=>people.values()};
const logged=[];
let now=1000,wipes=0,resets=0;const notices=[],native=[],delegated=[],passwords=[],routed=[],sounds=[];let helpHook;const muted=[];
const stubs={
 '@minecraft/server':{world},
 '../../utils.js':{commandsList,isPending:p=>!!p.pending,tell:(p,key,...args)=>notices.push({p,key,args}),hasRole,findPlayer:name=>people.find(p=>p.name===name),getRole,ROLES,run:(p,cmd)=>native.push(cmd),menuFeedback:(p,error)=>sounds.push([p.name,error]),settleCommands:async()=>{},toldErrorCount:p=>p.errs??0,toldSuccessCount:p=>p.oks??0},
 './player.js':{PLAYER_COMMANDS:{help:(p,a)=>helpHook?helpHook(p):routed.push(['help',p,Array.from(a)])},textWidth:s=>s.length,emoteGrid:()=> 'grid'},
 './moderator.js':{MODERATION_COMMANDS:{mute:(p,a)=>muted.push([p.name,...Array.from(a)])},isCoord:()=>true},
 './admin.js':{ADMIN_COMMANDS:{},debugLines:()=>[],giveOreMagnet:()=>true,setMoney:()=>true},
 '../../system/worldedit.js':{worldEditCommand:(p,a)=>delegated.push([p,Array.from(a)])},
 '../../system/core/offline_reset.js':{resetOffline:()=>resets++,offlineCounts:()=>({offline:2,online:4})},
 '../../system/core/wipe.js':{wipeAll:async()=>wipes++,wipeCounts:()=>({all:6,online:4})},
 '../../registration/change.js':{resetPassword:(p,t)=>passwords.push(t)},
 './selectors.js':{...await import(new URL('scripts/chat/commands/selectors.js',bp))},
 '../../system/security/staff_log.js':{logAction:(...a)=>logged.push(a)}
};
const context=vm.createContext({Date:class extends Date{static now(){return now;}}}),cache=new Map(),mod=new vm.SourceTextModule(source,{context,identifier:new URL('scripts/chat/commands/commands.js',bp).href});
await mod.link(spec=>{if(spec==='./common.js'){const url=new URL('scripts/chat/commands/common.js',bp);const common=new vm.SourceTextModule(fs.readFileSync(url,'utf8'),{context,identifier:url.href});cache.set(spec,common);return common;}assert(stubs[spec],'unresolved import '+spec);if(!cache.has(spec)){const values=stubs[spec];cache.set(spec,new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context,identifier:spec}));}return cache.get(spec);});await mod.evaluate();
assert.equal(handlers.beforeChat.length,1);assert.equal(handlers.playerLeave.length,1);const api=mod.namespace,command=(p,c,a=[])=>api.runChatCommand(p,c,a),last=()=>notices.at(-1)?.key;
for(const key of ['textWidth','emoteGrid'])assert.equal(api[key],stubs['./player.js'][key]);assert.equal(api.isCoord,stubs['./moderator.js'].isCoord);for(const key of ['debugLines','giveOreMagnet','setMoney'])assert.equal(api[key],stubs['./admin.js'][key]);
assert.deepEqual(Object.keys(api).sort(),['debugLines','emoteGrid','giveOreMagnet','isCoord','runChatCommand','setMoney','textWidth'].sort());
for(const role of ROLES.filter(r=>r!=='owner')){const p=mk(role,role);for(const name of ['worldedit','wipe','resetoffline','role','roles','resetpass']){command(p,name);assert.equal(last(),'chat.cmd.error.no_permission');}}assert.equal(wipes,0);assert.equal(resets,0);assert.equal(delegated.length,0);
command(owner,'worldedit',['pos1','1','2','3']);assert.deepEqual(delegated[0],[owner,['pos1','1','2','3']]);command(owner,'w');assert.equal(last(),'chat.cmd.error.unknown');command(owner,'constructor');assert.equal(last(),'chat.cmd.error.unknown');
command(owner,'wipe',['confirm']);assert.equal(last(),'chat.cmd.error.confirm_expired');assert.equal(wipes,0);command(owner,'wipe');command(owner,'wipe',['confirm']);await Promise.resolve();assert.equal(wipes,1);command(owner,'wipe',['confirm']);assert.equal(wipes,1);
command(owner,'wipe');now+=30001;command(owner,'wipe',['confirm']);assert.equal(last(),'chat.cmd.error.confirm_expired');assert.equal(wipes,1);
command(owner,'wipe');handlers.playerLeave[0]({playerName:owner.name});command(owner,'wipe',['confirm']);assert.equal(wipes,1);
command(owner,'resetoffline',['confirm']);assert.equal(resets,0);command(owner,'resetoffline');command(owner,'resetoffline',['confirm']);assert.equal(resets,1);command(owner,'resetoffline',['confirm']);assert.equal(resets,1);
command(owner,'resetoffline');now+=30001;command(owner,'resetoffline',['confirm']);assert.equal(resets,1);command(owner,'resetoffline');handlers.playerLeave[0]({playerName:owner.name});command(owner,'resetoffline',['confirm']);assert.equal(resets,1);
command(owner,'role',[alice.name,'moder']);assert(alice.hasTag('role:moder'));command(owner,'role',[owner.name,'player']);assert(owner.hasTag('role:owner'));command(owner,'role',[bot.name,'admin']);assert(!bot.hasTag('role:admin'));
command(owner,'resetpass',['Alice','Smith']);assert.equal(passwords[0],alice);command(owner,'resetpass',[owner.name]);assert.equal(passwords.length,1);command(owner,'resetpass',[bot.name]);assert.equal(passwords.length,1);
command(owner,'roles');const raw=JSON.parse(native.at(-1).slice('tellraw @s '.length));
const roleNames=raw.rawtext.filter(p=>p.translate==='chat.cmd.roles.line').map(p=>p.with.rawtext[0].text);
assert.equal(roleNames[0].trimEnd(),'Owner');
const {textWidth,tellList}=cache.get('./common.js').namespace,roleWidths=roleNames.map(textWidth);
const dashes = part => (part.text.match(/-/g) ?? []).length;
const readLocale = locale => Object.fromEntries(fs.readFileSync(new URL('../../resource_packs/main-rp-shop_for_ore/texts/'+locale+'.lang',import.meta.url),'utf8')
	.split(/\r?\n/).filter(line=>line.includes('=')).map(line=>[line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1)]));
const ru=readLocale('ru_RU'),en=readLocale('en_US');
const footerCount=(frame,lang)=>dashes(frame.at(-3))+dashes({text:lang[frame.at(-2).translate]})+dashes(frame.at(-1));
assert.deepEqual([dashes(raw.rawtext[0]),dashes(raw.rawtext[2])],[5,5]);
assert.equal(raw.rawtext.at(-2).translate,'chat.cmd.roles.header.divider');
assert.equal(footerCount(raw.rawtext,ru),23);
assert.equal(footerCount(raw.rawtext,en),22);
tellList(owner,{translate:'chat.cmd.worldedit.help.header'},[]);
const weFrame=JSON.parse(native.at(-1).slice('tellraw @s '.length)).rawtext;
assert.equal(footerCount(weFrame,ru),29);
assert.equal(footerCount(weFrame,en),23);
tellList(owner,{translate:'chat.cmd.banlist.header'},[],6);
const banFrame=JSON.parse(native.at(-1).slice('tellraw @s '.length)).rawtext;
assert.deepEqual([dashes(banFrame[0]),dashes(banFrame[2])],[6,6]);
assert.ok(footerCount(banFrame,ru)>12);
tellList(owner,{translate:'chat.cmd.stats.header',with:['Owner']},[]);
const statsFrame=JSON.parse(native.at(-1).slice('tellraw @s '.length)).rawtext;
assert.equal(statsFrame.at(-2).with.rawtext[0].text,'-----');
tellList(owner,{translate:'chat.cmd.ac.header',with:{rawtext:[{translate:'anticheat.mode.kick'}]}},[]);
const acFrame=JSON.parse(native.at(-1).slice('tellraw @s '.length)).rawtext;
assert.equal(acFrame.at(-2).with.rawtext[0].translate,'anticheat.mode.kick.divider');
assert.ok(Math.max(...roleWidths)-Math.min(...roleWidths)<=3,'role descriptions align after player names');
let data={sender:alice,message:'!HeLp  one two',cancel:false};handlers.beforeChat[0](data);assert.equal(data.cancel,true);assert.deepEqual(routed.at(-1),['help',alice,['one','two']]);alice.pending=true;const n=routed.length;handlers.beforeChat[0]({sender:alice,message:'!help'});assert.equal(routed.length,n);
assert(!fs.existsSync(new URL('scripts/chat/commands/owner.js',bp)));
// Звук результата команды из чата: ошибка/успех по счётчикам сообщений, справка — без звука
{const chat=handlers.beforeChat[0],P=mk('Sound');people.push(P);const send=async(m)=>{chat({sender:P,message:m,cancel:false});for(let i=0;i<6;i++)await Promise.resolve();};
helpHook=()=>{};await send('!help');assert.deepEqual(sounds,[]);
helpHook=(p)=>{p.errs=(p.errs??0)+1;};await send('!help');assert.deepEqual(sounds.at(-1),['Sound',true]);
helpHook=(p)=>{p.oks=(p.oks??0)+1;};await send('!help');assert.deepEqual(sounds.at(-1),['Sound',false]);assert.equal(sounds.length,2);helpHook=undefined;}
// Селекторы: !mute @a … — по вызову на каждого, кроме себя и бота, с ником вместо селектора; @s — сам; @e и * — ошибка
{const chat=handlers.beforeChat[0];const send=async(P,m)=>{chat({sender:P,message:m,cancel:false});for(let i=0;i<6;i++)await Promise.resolve();};
const loc={x:0,y:0,z:0},dim={id:'minecraft:overworld'};for(const p of people){p.location=loc;p.dimension=dim;}
await send(admin,'!mute @a 5 флуд');assert.deepEqual(muted.map(m=>m.join('|')).sort(),['Admin|Alice Smith|5|флуд','Admin|Owner|5|флуд','Admin|Sound|5|флуд'].sort());
muted.length=0;await send(admin,'!mute @s 1');assert.deepEqual(muted,[['Admin','Admin','1']]);
muted.length=0;notices.length=0;await send(admin,'!mute @e 1');assert.equal(muted.length,0);assert.equal(notices.at(-1).key,'chat.cmd.error.selector');
await send(admin,'!mute * 1');assert.equal(notices.at(-1).key,'chat.cmd.error.selector');assert.equal(muted.length,0);}
// Журнал персонала: роль пишется в журнал содержимого; команды !logs больше нет
{logged.length=0;command(owner,'role',[alice.name,'helper']);assert.deepEqual(logged.at(-1).slice(1),['role','Alice Smith','helper']);
notices.length=0;command(owner,'logs',[]);assert.ok(notices.length===0||notices.at(-1).key!=='chat.cmd.logs.use');}
console.log('PASS: real ESM imports/exports, one chat/leave subscription, all owner guards, one-use/expired/leave confirmations, resetpass, roles and shared chat dispatcher.');
