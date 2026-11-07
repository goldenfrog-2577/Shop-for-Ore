import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../../../behavior_packs/main-addon-shop_for_ore/scripts/system/worldedit.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const clone=x=>JSON.parse(JSON.stringify(x));
const emptyMessages=['No blocks filled','Блоки не заполнены','Блоки не заповнено','No se ha rellenado ningún bloque'];
export function runtime(shared){
	shared??={tick:0,blocks:new Map(),structures:new Map(),areas:new Map(),properties:new Map(),log:[]};
	const messages=[],warnings=[],control={delay:0,language:0,fault:undefined,propertyFailure:false};let api,scheduled=[],events,people,owner;
	const canonical=id=>id.includes('nether')?'minecraft:nether':id.includes('end')?'minecraft:the_end':'minecraft:overworld';
	const key=(id,x,y,z)=>id+':'+x+','+y+','+z;
	const get=(x,y,z,id='minecraft:overworld')=>shared.blocks.get(key(id,x,y,z))??{id:'minecraft:air',data:0};
	const put=(x,y,z,b,id='minecraft:overworld')=>{if(b.id==='minecraft:air')shared.blocks.delete(key(id,x,y,z));else shared.blocks.set(key(id,x,y,z),clone(b));};
	class BlockLocation{constructor(x,y,z){Object.assign(this,{x,y,z});}}
	const area=id=>shared.areas.get(id+':shop_worldedit');
	function inWindow(id,x,z,X,Z){const a=area(id);assert.ok(a,'loaded window exists');assert.ok(shared.tick>=a.ready,'native command waits for chunk readiness');for(const [n,lo,hi]of [[x,a.x,a.X],[X,a.x,a.X],[z,a.z,a.Z],[Z,a.z,a.Z]])assert.ok(Math.floor(n/16)>=Math.floor(lo/16)&&Math.floor(n/16)<=Math.floor(hi/16),'command in loaded window');}
	const dims=new Map();
	function dimension(name){if(name.startsWith('minecraft:'))throw Error('old-runtime fixture requires bare dimension names');const id=canonical(name);if(dims.has(id))return dims.get(id);const d={id,getBlock(loc){assert.ok(loc instanceof BlockLocation,'old API BlockLocation');const a=area(id);if(!a||shared.tick<a.ready)return undefined;return{typeId:get(loc.x,loc.y,loc.z,id).id};},runCommandAsync(cmd){
		shared.log.push({tick:shared.tick,dimension:id,cmd});const f=control.fault?.(cmd,id,shared.tick);
		if(f?.sync)throw f.error;if(f?.error)return Promise.reject(f.error);if(f&&'result'in f)return Promise.resolve(f.result);
		return Promise.resolve().then(()=>execute(id,cmd));
	}};dims.set(id,d);return d;}
	function execute(id,cmd){const a=cmd.split(' ');
		if(a[0]==='tickingarea'){
			assert.equal(a[1]==='add'?a[8]:a[2],'shop_worldedit','only owned area touched');
			if(a[1]==='remove'){if(!shared.areas.delete(id+':'+a[2]))throw Error('commands.tickingarea-remove.byname.failure');return{successCount:1};}
			if(area(id))throw Error('commands.tickingarea-add.conflictingname');const[x,,z,X,,Z]=a.slice(2,8).map(Number);assert.ok((Math.floor(X/16)-Math.floor(x/16)+1)*(Math.floor(Z/16)-Math.floor(z/16)+1)<=4);shared.areas.set(id+':'+a[8],{x,z,X,Z,ready:shared.tick+control.delay});return{successCount:1};
		}
		if(a[0]==='structure'){
			const name=a[2];assert.ok(name.startsWith('shop_we_'),'only owned structures');
			if(a[1]==='delete'){if(!shared.structures.delete(name))throw Error('commands.structure.notFound');return{successCount:1};}
			if(a[1]==='save'){assert.deepEqual(a.slice(9),['false','memory','true']);const[x,y,z,X,Y,Z]=a.slice(3,9).map(Number);inWindow(id,x,z,X,Z);const blocks=[];for(let by=y;by<=Y;by++)for(let bz=z;bz<=Z;bz++)for(let bx=x;bx<=X;bx++)blocks.push([bx-x,by-y,bz-z,clone(get(bx,by,bz,id))]);assert.ok(blocks.length<=512);shared.structures.set(name,blocks);return{successCount:1};}
			if(a[1]==='load'){const blocks=shared.structures.get(name);if(!blocks)throw Error('commands.structure.notFound');const[x,y,z]=a.slice(3,6).map(Number);inWindow(id,x,z,x+Math.max(...blocks.map(p=>p[0])),z+Math.max(...blocks.map(p=>p[2])));for(const[dx,dy,dz,b]of blocks)put(x+dx,y+dy,z+dz,b,id);return{successCount:1};}
		}
		if(a[0]==='fill'){const[x,y,z,X,Y,Z]=a.slice(1,7).map(Number),block=a[7],data=Number(a[8]),filter=a[10];assert.equal(a[9],'replace');inWindow(id,x,z,X,Z);let changed=0;for(let by=y;by<=Y;by++)for(let bz=z;bz<=Z;bz++)for(let bx=x;bx<=X;bx++)if(!filter||get(bx,by,bz,id).id===filter){if(get(bx,by,bz,id).id!==block||get(bx,by,bz,id).data!==data)changed++;put(bx,by,bz,{id:block,data},id);}if(!changed)throw Error(emptyMessages[control.language]);return{successCount:changed};}
		throw Error('unmodelled command '+cmd);
	}
	function boot(){
		events={worldInitialize:{handlers:[],subscribe(fn){this.handlers.push(fn);}},playerLeave:{handlers:[],subscribe(fn){this.handlers.push(fn);}}};scheduled=[];const once=[],registered=new Map();
		class DynamicPropertiesDefinition{defineString(k,n){registered.set(k,n);}}
		owner={name:'Owner',role:'owner',location:{x:0,y:1,z:0},dimension:dimension('overworld'),runCommandAsync:async()=>({successCount:1})};people=[owner];
		const ctx={world:{events,getPlayers:()=>people.values(),getDimension:dimension,getDynamicProperty:k=>{if(!registered.has(k))throw Error('unregistered property');return shared.properties.get(k);},setDynamicProperty:(k,v)=>{if(control.propertyFailure)throw Error('fixture storage failure');assert.ok(registered.has(k));assert.ok(v.length<=registered.get(k));shared.properties.set(k,v);}},system:{run:fn=>once.push(fn),runSchedule:(fn,n)=>{assert.equal(n,1);scheduled.push(fn);}},BlockLocation,DynamicPropertiesDefinition,MinecraftBlockTypes:{get:id=>['minecraft:air','minecraft:stone','minecraft:dirt','minecraft:grass'].includes(id)?{id}:undefined},hasRole:p=>p.role==='owner',tell:(p,k,...args)=>messages.push([k,...args]),console:{warn:s=>warnings.push(s)}};
		vm.runInNewContext(source+'\nglobalThis.api={worldEditCommand,bounds,chunks,coordinates,active:()=>active,pending:()=>queue.length||executing};',ctx);api=ctx.api;
		for(const fn of events.worldInitialize.handlers)fn({propertyRegistry:{registerWorldDynamicProperties(){}}});for(const fn of once)fn();
	}
	boot();
	const step=async()=>{shared.tick++;for(const fn of scheduled)fn();for(let i=0;i<20;i++)await Promise.resolve();};
	const drain=async(max=100000)=>{for(let i=0;i<max;i++){if(!api.active()&&!api.pending()){for(let j=0;j<20;j++)await Promise.resolve();if(!api.active()&&!api.pending())return;}await step();}throw Error('job stuck');};
	const command=(...args)=>api.worldEditCommand(owner,args);
	return{shared,control,messages,warnings,get owner(){return owner;},get api(){return api;},step,drain,command,select:(a,b)=>{command('pos1',...a.map(String));command('pos2',...b.map(String));},get,put,leave(){people=[];for(const fn of events.playerLeave.handlers)fn({playerName:owner.name});},rejoin(){people=[owner];},reload:boot,dimension,snapshot:()=>JSON.stringify([...shared.blocks].sort((a,b)=>a[0].localeCompare(b[0]))),journal:()=>[...shared.properties.values()].flatMap(s=>JSON.parse(s))};
}
export function commandBudget(r){const counts=new Map();for(const c of r.shared.log)counts.set(c.tick,(counts.get(c.tick)??0)+1);assert.ok([...counts.values()].every(n=>n<=1),'one native command per tick');}
