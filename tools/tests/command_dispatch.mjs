import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
if(!vm.SourceTextModule){const r=spawnSync(process.execPath,['--experimental-vm-modules','--no-warnings',fileURLToPath(import.meta.url)],{encoding:'utf8'});process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);}
const bp=new URL('../../behavior_packs/main-addon-shop_for_ore/',import.meta.url),source=fs.readFileSync(new URL('scripts/chat/commands/commands.js',bp),'utf8'),db=fs.readFileSync(new URL('scripts/DataBase.js',bp),'utf8');
const section=db.slice(db.indexOf('export const commandsList = [')),commandsList=[...section.matchAll(/command:\s*['"]!([a-z0-9_]+)[^'"]*['"][\s\S]*?role:\s*['"](\w+)['"]/g)].map(m=>({command:'!'+m[1],role:m[2]}));
for(const name of ['worldedit','wipe','resetoffline','role','roles','resetpass'])assert.equal(commandsList.find(x=>x.command==='!'+name)?.role,'owner');
const ROLES=['player','helper','moder','admin','owner'],mk=(name,role='player')=>({name,tags:new Set(role==='player'?[]:['role:'+role]),hasTag(t){return this.tags.has(t);},addTag(t){this.tags.add(t);},removeTag(t){this.tags.delete(t);}});
const owner=mk('Owner','owner'),admin=mk('Admin','admin'),alice=mk('Alice Smith'),bot=mk('Bot','bot'),people=[alice,admin,bot,owner];
const getRole=p=>ROLES.slice().reverse().find(r=>p.hasTag('role:'+r))??'player',hasRole=(p,r)=>ROLES.indexOf(getRole(p))>=ROLES.indexOf(r);
const handlers={beforeChat:[],playerLeave:[]},world={events:Object.fromEntries(Object.keys(handlers).map(k=>[k,{subscribe:fn=>handlers[k].push(fn)}])),getPlayers:()=>people.values()};
let now=1000,wipes=0,resets=0;const notices=[],native=[],delegated=[],passwords=[],routed=[];
const stubs={
 '@minecraft/server':{world},
 '../../DataBase.js':{commandsList,isPending:p=>!!p.pending,tell:(p,key,...args)=>notices.push({p,key,args}),hasRole,findPlayer:name=>people.find(p=>p.name===name),getRole,ROLES,run:(p,cmd)=>native.push(cmd)},
 './player.js':{PLAYER_COMMANDS:{help:(p,a)=>routed.push(['help',p,Array.from(a)])},textWidth:s=>s.length,emoteGrid:()=> 'grid'},
 './moderator.js':{MODERATION_COMMANDS:{},isCoord:()=>true},
 './admin.js':{ADMIN_COMMANDS:{},debugLines:()=>[],giveOreMagnet:()=>true,setMoney:()=>true},
 '../../system/worldedit.js':{worldEditCommand:(p,a)=>delegated.push([p,Array.from(a)])},
 '../../system/core/offline_reset.js':{resetOffline:()=>resets++,offlineCounts:()=>({offline:2,online:4})},
 '../../system/core/wipe.js':{wipeAll:async()=>wipes++,wipeCounts:()=>({all:6,online:4})},
 '../../registration/change.js':{resetPassword:(p,t)=>passwords.push(t)}
};
const context=vm.createContext({Date:{now:()=>now}}),cache=new Map(),mod=new vm.SourceTextModule(source,{context,identifier:new URL('scripts/chat/commands/commands.js',bp).href});
await mod.link(spec=>{assert(stubs[spec],'unresolved import '+spec);if(!cache.has(spec)){const values=stubs[spec];cache.set(spec,new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context,identifier:spec}));}return cache.get(spec);});await mod.evaluate();
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
command(owner,'roles');const raw=JSON.parse(native.at(-1).slice('tellraw @s '.length));assert.equal(raw.rawtext.find(p=>p.translate==='chat.cmd.roles.line').with.rawtext[0].text,'Owner');
let data={sender:alice,message:'!HeLp  one two',cancel:false};handlers.beforeChat[0](data);assert.equal(data.cancel,true);assert.deepEqual(routed.at(-1),['help',alice,['one','two']]);alice.pending=true;const n=routed.length;handlers.beforeChat[0]({sender:alice,message:'!help'});assert.equal(routed.length,n);
assert(!fs.existsSync(new URL('scripts/chat/commands/owner.js',bp)));
console.log('PASS: real ESM imports/exports, one chat/leave subscription, all owner guards, one-use/expired/leave confirmations, resetpass, roles and shared chat dispatcher.');
