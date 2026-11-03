import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../../behavior_packs/main-addon-shop_for_ore/scripts/system/worldedit.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const blocks=new Map(),structures=new Map(),areas=new Set(),log=[],messages=[],warnings=[],handlers={};let scheduler,tick=0,people=[],failure;
const key=(x,y,z)=>`${x},${y},${z}`,clone=x=>JSON.parse(JSON.stringify(x));
const get=(x,y,z)=>blocks.get(key(x,y,z))??{id:'minecraft:air',data:0};
function put(x,y,z,block){if(block.id==='minecraft:air')blocks.delete(key(x,y,z));else blocks.set(key(x,y,z),clone(block));}
const dim={id:'minecraft:overworld',runCommandAsync:async cmd=>{
	log.push({tick,cmd});if(failure?.(cmd)){failure=undefined;throw Error('synthetic command failure');}
	const a=cmd.split(' ');
	if(a[0]==='tickingarea'){if(a[1]==='add')areas.add(a[8]);else areas.delete(a[2]);return{};}
	if(a[0]==='structure'){
		const name=a[2];assert.ok(name.startsWith('shop_we_'),'only owned structures');
		if(a[1]==='delete'){structures.delete(name);return{};}
		if(a[1]==='save'){
			assert.deepEqual(a.slice(9),['false','memory','true']);const [x,y,z,X,Y,Z]=a.slice(3,9).map(Number),saved=[];
			for(let by=y;by<=Y;by++)for(let bz=z;bz<=Z;bz++)for(let bx=x;bx<=X;bx++)saved.push([bx-x,by-y,bz-z,clone(get(bx,by,bz))]);
			assert.ok(saved.length<=512);structures.set(name,saved);return{};
		}
		if(a[1]==='load'){const saved=structures.get(name);assert.ok(saved,'saved structure exists');const [x,y,z]=a.slice(3,6).map(Number);for(const [dx,dy,dz,b]of saved)put(x+dx,y+dy,z+dz,b);return{};}
	}
	if(a[0]==='fill'){
		const [x,y,z,X,Y,Z]=a.slice(1,7).map(Number),id=a[7],data=Number(a[8]),filter=a[10];assert.equal(a[9],'replace');let changed=0;
		for(let by=y;by<=Y;by++)for(let bz=z;bz<=Z;bz++)for(let bx=x;bx<=X;bx++)if(!filter||get(bx,by,bz).id===filter){if(get(bx,by,bz).id!==id||get(bx,by,bz).data!==data)changed++;put(bx,by,bz,{id,data});}
		if(!changed)throw Error('commands.fill.failed');return{successCount:changed};
	}
	throw Error('Unmodelled command '+cmd);
}};
const owner={name:'Owner',role:'owner',location:{x:0,y:1,z:0},dimension:dim,runCommandAsync:c=>dim.runCommandAsync(c)};people=[owner];
const ctx={world:{getPlayers:()=>people.values(),events:{playerLeave:{subscribe:fn=>handlers.leave=fn}}},system:{runSchedule:(fn,n)=>{assert.equal(n,1);scheduler=fn;}},MinecraftBlockTypes:{get:id=>['minecraft:stone','minecraft:dirt','minecraft:grass','minecraft:air'].includes(id)?{id}:undefined},hasRole:p=>p.role==='owner',tell:(p,k,...args)=>messages.push([k,...args]),console:{warn:m=>warnings.push(m)}};
vm.runInNewContext(source+'\nglobalThis.we={worldEditCommand,bounds,chunks,coordinates,active:()=>active};',ctx);
const command=(...args)=>ctx.we.worldEditCommand(owner,args);
const step=async()=>{tick++;scheduler();for(let i=0;i<8;i++)await Promise.resolve();};
async function drain(){for(let i=0;i<5000;i++){if(!ctx.we.active())return;await step();}throw Error('job stuck');}
const select=(a,b)=>{command('pos1',...a.map(String));command('pos2',...b.map(String));};
const snapshot=()=>JSON.stringify([...blocks].sort((a,b)=>a[0].localeCompare(b[0])));
const max=ctx.we.bounds({x:0,y:0,z:0},{x:127,y:3,z:127},dim.id);assert.equal(max.volume,65536);
assert.equal(ctx.we.chunks(max).reduce((n,p)=>n+(p.to.x-p.from.x+1)*(p.to.y-p.from.y+1)*(p.to.z-p.from.z+1),0),65536);
assert.throws(()=>ctx.we.bounds({x:0,y:0,z:0},{x:128,y:0,z:0},dim.id),/limit/);
assert.deepEqual(JSON.parse(JSON.stringify(ctx.we.coordinates(['~1','~','~-2'],{x:1.9,y:2.1,z:3.2}))),{x:2,y:2,z:1});
assert.throws(()=>ctx.we.coordinates(['0','bad','0'],owner.location),/args/);
ctx.we.worldEditCommand({...owner,role:'player'},['set','stone']);assert.equal(messages.at(-1)[0],'chat.cmd.error.no_permission');assert.equal(log.length,0);
select([0,0,0],[9,1,8]);put(0,0,0,{id:'minecraft:chest',data:2,inventory:[['diamond',7]]});put(3,1,4,{id:'minecraft:dirt',data:0});const before=snapshot();
command('set','stone');command('copy');assert.equal(messages.at(-1)[0],'chat.cmd.worldedit.error.busy');await drain();assert.equal(get(0,0,0).id,'minecraft:stone');assert.equal(areas.size,0);
command('undo');await drain();assert.equal(snapshot(),before,'undo restores blocks and container data');assert.equal(structures.size,0);
command('replace','dirt','grass');await drain();assert.equal(get(3,1,4).id,'minecraft:grass');assert.equal(get(0,0,0).id,'minecraft:chest');
// Cancelling after backup, before the first fill is dispatched, preserves the previous undo.
command('set','stone');while(!ctx.we.active()?.backup)await step();command('cancel');await drain();assert.equal(get(3,1,4).id,'minecraft:grass');command('undo');await drain();assert.equal(snapshot(),before);
// Clipboard offset and undo of a paste into previously empty blocks.
select([0,0,0],[1,0,1]);owner.location={x:3,y:1,z:3};command('copy');await drain();command('paste','10','5','10');await drain();assert.equal(get(7,4,7).id,'minecraft:chest');assert.deepEqual(get(7,4,7).inventory,[['diamond',7]]);command('undo');await drain();assert.equal(get(7,4,7).id,'minecraft:air');assert.equal(snapshot(),before);
// Stop after part of an edit: preserve a complete undo, never continue the remaining fills.
select([0,0,0],[15,1,15]);const beforeCancel=snapshot();command('set','stone');while(!log.some(e=>e.cmd.startsWith('fill ')&&e.tick>tick-1))await step();command('cancel');await drain();assert.equal(areas.size,0);command('undo');await drain();assert.equal(snapshot(),beforeCancel);
// Native error after an edit starts leaves a recoverable snapshot.
let fills=0;failure=cmd=>cmd.startsWith('fill ')&&++fills===2;command('set','dirt');await drain();assert.equal(messages.at(-1)[0],'chat.cmd.worldedit.error.failed');command('undo');await drain();assert.equal(snapshot(),beforeCancel);
// Leaving during a job cleans the ticking area and releases the queue.
command('set','stone');await step();people=[];handlers.leave({playerName:owner.name});await drain();assert.equal(areas.size,0);people=[owner];
const calls=log.length;command('pos1','0','0','0');command('pos2','999','0','0');command('set','stone');assert.equal(messages.at(-1)[0],'chat.cmd.worldedit.error.limit');assert.equal(log.length,calls);
select([0,0,0],[1,1,1]);command('set','stone;kill');assert.equal(messages.at(-1)[0],'chat.cmd.worldedit.error.block');assert.equal(log.length,calls);
const byTick=new Map();for(const e of log)byTick.set(e.tick,(byTick.get(e.tick)??0)+1);assert.ok([...byTick.values()].every(n=>n<=1),'one native command per tick');
console.log('PASS: owner-only selection, bounds/IDs, per-tick budget, container-safe undo, replace, clipboard offsets, cancel/error recovery and disconnect cleanup.');
