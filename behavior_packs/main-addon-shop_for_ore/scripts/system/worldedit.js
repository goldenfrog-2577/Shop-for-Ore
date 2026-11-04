// WorldEdit владельца: порции блоков, ожидание чанков и журнал собственных ресурсов.
import { world, system, MinecraftBlockTypes, BlockLocation, DynamicPropertiesDefinition } from '@minecraft/server';
import { hasRole, tell } from '../DataBase.js';

export const CHUNK = 8;
const selections = new Map(), clipboards = new Map(), undos = new Map(), queue = [];
let active, executing = false, serial = 0, recovered = false, recoveryTask;
const SESSION = Date.now().toString(36), AREA = 'shop_worldedit';
const DIMENSIONS = ['minecraft:overworld', 'minecraft:nether', 'minecraft:the_end'];
const LOAD_TICKS = 200, JOURNAL_PAGES = 8, JOURNAL_LENGTH = 1000;
const pages = Array.from({length:JOURNAL_PAGES},()=>[]);
const journalKey = i => 'shop:we_resources'+i;
const canonical = id => id.includes('nether')?'minecraft:nether':id.includes('end')?'minecraft:the_end':'minecraft:overworld';
function dimension(id) {
	const names=[id.replace('minecraft:',''),id];if(id.includes('end'))names.push('the end');
	let error;for(const name of names){try{return world.getDimension(name);}catch(cause){error=cause;}}throw error;
}
const point = p => ({x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z)});
const xyz = p => p.x+' '+p.y+' '+p.z;
const fail = key => { throw new Error(key); };
const height = id => id.includes('nether') ? [0,127] : id.includes('the_end') ? [0,255] : [-64,319];

world.events.worldInitialize.subscribe(e=>{
	const def = new DynamicPropertiesDefinition();
	for(let i=0;i<JOURNAL_PAGES;i++)def.defineString(journalKey(i),JOURNAL_LENGTH);
	e.propertyRegistry.registerWorldDynamicProperties(def);
});

const plain = value => String(value??'').replace(/§./g,'').replace(/[\r\n]+/g,' ');
function errorText(error) {
	if(error?.weDetail)return error.weDetail;
	const parts=[];
	for(const key of ['name','message','statusCode','statusMessage','code']) {
		try { if(error?.[key]!==undefined)parts.push(key+': '+plain(error[key])); } catch {}
	}
	return parts.length?parts.join('; '):plain(error);
}
function failure(job, phase, text, error, reason) {
	const result=new Error(errorText(error));
	result.wePhase=phase;result.weCommand=text;result.weDetail=errorText(error);result.weReason=reason;
	return result;
}
function report(job,error) {
	const phase=error?.wePhase??job.phase??'storage';
	const text=error?.weCommand??job.lastCommand??'—';
	console.warn('[Shop for Ore WorldEdit] '+JSON.stringify({action:job.kind,phase,dimension:job.dimension.id,command:text,error:errorText(error)}));
	notify(job,'chat.cmd.worldedit.error.detail',{translate:'chat.cmd.worldedit.phase.'+phase},plain(text).slice(0,300),error?.weReason?{translate:'chat.cmd.worldedit.reason.'+error.weReason}:plain(errorText(error)).slice(0,300));
}
const escapePattern=s=>s.replace(/[.*+?^\u0024{}()|[\]\\]/g,'\\$&');
const NATIVE_MESSAGES={
	"commands.fill.failed": [
		"No blocks filled",
		"Блоки не заполнены",
		"Блоки не заповнено",
		"No se ha rellenado ningún bloque"
	],
	"commands.structure.notFound": [
		"The structure %s can't be found. Make sure the name was spelled correctly and try again.",
		"Строение %s не найдено. Убедитесь, что имя написано правильно, и повторите попытку.",
		"Структуру %s не вдалося знайти. Перевірте, чи ім’я написано правильно, і спробуйте ще раз.",
		"No se puede encontrar la estructura %s. Asegúrate de que el nombre está bien escrito e inténtalo de nuevo."
	],
	"commands.tickingarea-remove.byname.failure": [
		"No ticking areas named %1$s exist in the current dimension.",
		"В этом измерении нет тактовых областей с именем «%1$s».",
		"У поточному вимірі з іменем %1$s немає зациклених областей.",
		"No existe ninguna área de marca denominada %1$s en la dimensión actual."
	],
	"commands.tickingarea.noneExist.currentDimension": [
		"No ticking areas exist in the current dimension.",
		"В этом измерении нет тактовых областей.",
		"У поточному вимірі немає зациклених областей.",
		"No existe ninguna área de marca en la dimensión actual."
	]
};
const nativePatterns=Object.fromEntries(Object.entries(NATIVE_MESSAGES).map(([key,values])=>[key,values.map(s=>new RegExp(s.split(/%(?:\d+\$)?[sdif]/g).map(escapePattern).join('.*?'),'i'))]));
const matches=(error,key)=>errorText(error).includes(key)||nativePatterns[key].some(re=>re.test(errorText(error)));
function absent(task,error) {
	if(task.text.startsWith('structure delete '))return matches(error,'commands.structure.notFound');
	if(task.text==='tickingarea remove '+AREA)return matches(error,'commands.tickingarea-remove.byname.failure')||matches(error,'commands.tickingarea.noneExist.currentDimension');
	return false;
}
function persist(page) {
	try {
		const text=JSON.stringify(pages[page]);if(text.length>JOURNAL_LENGTH)fail('journal full');
		world.setDynamicProperty(journalKey(page),text);
	} catch(error) { throw failure(active,'storage',journalKey(page),error,'storage'); }
}
function readJournal(job) {
	for(let i=0;i<JOURNAL_PAGES;i++) {
		let rows;
		try { rows=JSON.parse(world.getDynamicProperty(journalKey(i))??'[]'); }
		catch(error) { throw failure(job,'recovery',journalKey(i),error,'storage'); }
		if(!Array.isArray(rows)||rows.some(r=>!Array.isArray(r)||r.length!==3||!/^shop_we_[a-z0-9]+_\d+_(undo|copy)$/.test(r[0])||!DIMENSIONS.includes(r[1])||!Number.isSafeInteger(r[2])||r[2]<0))throw failure(job,'recovery',journalKey(i),'invalid resource journal','corrupt');
		pages[i]=rows;
	}
}
function allocate(job,kind) {
	const record=['shop_we_'+SESSION+'_'+job.id+'_'+kind,canonical(job.dimension.id),0];
	for(let i=0;i<JOURNAL_PAGES;i++) {
		// Reserve enough digits for any counter; selection volume is not restricted.
		if(JSON.stringify([...pages[i],[record[0],record[1],Number.MAX_SAFE_INTEGER]]).length>JOURNAL_LENGTH)continue;
		pages[i].push(record);
		try { persist(i); } catch(error) { pages[i].pop();throw error; }
		return {page:i,record};
	}
	throw failure(job,'storage','resource journal','resource journal is full','journal_full');
}
function countResource(resource,count) {
	const old=resource.record[2];resource.record[2]=count;
	try { persist(resource.page); } catch(error) { resource.record[2]=old;throw error; }
}
function forget(resource) {
	const rows=pages[resource.page],at=rows.indexOf(resource.record);if(at<0)return;
	rows.splice(at,1);
	try { persist(resource.page); } catch(error) { rows.splice(at,0,resource.record);throw error; }
}
export function bounds(a, b, dimension) {
	const min = {}, max = {}, size = {};
	for (const k of ['x','y','z']) { min[k] = Math.min(a[k],b[k]); max[k] = Math.max(a[k],b[k]); size[k] = max[k]-min[k]+1; }
	const volume = size.x * size.y * size.z, [low,high] = height(dimension);
	if ([...Object.values(min),...Object.values(max)].some(n=>!Number.isSafeInteger(n))) fail('bounds');
	if (min.y<low || max.y>high || Math.max(Math.abs(min.x),Math.abs(max.x),Math.abs(min.z),Math.abs(max.z))>29999984) fail('bounds');
	return {min,max,size,volume};
}
export function* chunks(box) {
	for(let y=box.min.y;y<=box.max.y;y+=CHUNK) for(let z=box.min.z;z<=box.max.z;z+=CHUNK) for(let x=box.min.x;x<=box.max.x;x+=CHUNK)
		yield {from:{x,y,z},to:{x:Math.min(x+CHUNK-1,box.max.x),y:Math.min(y+CHUNK-1,box.max.y),z:Math.min(z+CHUNK-1,box.max.z)}};
}
export function coordinates(args, at) {
	if (!args.length) return point(at);
	if (args.length!==3) fail('args');
	const out={};
	for(const [i,k] of ['x','y','z'].entries()) {
		const raw=String(args[i]); if(!/^(?:-?\d+|~(?:-?\d+)?)$/.test(raw)) fail('args');
		out[k]=raw.startsWith('~')?Math.floor(at[k])+Number(raw.slice(1)||0):Number(raw);
		if(!Number.isSafeInteger(out[k])) fail('bounds');
	}
	return out;
}
function selection(player) {
	const s=selections.get(player.name);
	if(!s?.a||!s?.b) fail('selection');
	if(s.dimension!==player.dimension.id) fail('dimension');
	return bounds(s.a,s.b,s.dimension);
}
function block(raw, data='0') {
	if(!/^(?:[a-z0-9_]+:)?[a-z0-9_]+$/.test(raw??'')||!/^\d+$/.test(String(data))||Number(data)>15) fail('block');
	const id=raw.includes(':')?raw:'minecraft:'+raw;
	let type;try { type=MinecraftBlockTypes.get(id); } catch { fail('block'); }
	if(!type) fail('block');
	return {id,data:Number(data)};
}

function command(job,text,cleanup=false,edit=false,options={}) {
	return new Promise((resolve,reject)=>queue.push({job,text,cleanup,edit,phase:options.phase??job.phase,dimension:options.dimension??job.dimension,positive:!!options.positive,resolve,reject}));
}
const waitTicks=(job,ticks)=>new Promise((resolve,reject)=>queue.push({job,wait:ticks,resolve,reject}));
function notify(job,key,...args) {
	try { for(const player of world.getPlayers())if(player.name===job.owner){tell(player,key,...args);break;} } catch {}
}
// At most one native command per tick, including cleanup and recovery.
system.runSchedule(()=>{
	if(executing||!queue.length)return;
	const task=queue.shift();
	if(task.job.cancelled&&!task.cleanup){task.reject(new Error('cancelled'));return;}
	if(task.wait){if(--task.wait>0)queue.unshift(task);else task.resolve();return;}
	if(task.edit)task.job.changed=true;
	task.job.lastCommand=task.text;executing=true;
	const rejected=error=>{
		if((task.cleanup&&absent(task,error))||(task.text.startsWith('fill ')&&matches(error,'commands.fill.failed')))task.resolve({successCount:0});
		else task.reject(failure(task.job,task.phase,task.text,error));
	};
	try {
		Promise.resolve(task.dimension.runCommandAsync(task.text)).then(result=>{
			// A zero fill is a valid no-op; save/load/add must explicitly succeed when a count is supplied.
			if(task.positive&&Number.isFinite(result?.successCount)&&result.successCount<=0)task.reject(failure(task.job,task.phase,task.text,'successCount: '+result.successCount,'zero'));
			else task.resolve(result);
		},rejected).finally(()=>{executing=false;});
	} catch(error) { executing=false;rejected(error); }
},1);

async function release(job,resource,phase='cleanup') {
	while(resource.record[2]>0) {
		const index=resource.record[2]-1;
		await command(job,'structure delete '+resource.record[0]+'_'+index,true,false,{phase,dimension:dimension(resource.record[1])});
		countResource(resource,index);
	}
	forget(resource);
}
function ensureRecovery(job) {
	if(recovered)return Promise.resolve();
	if(!recoveryTask)recoveryTask=recover(job).finally(()=>{recoveryTask=undefined;});
	return recoveryTask;
}
async function recover(job) {
	if(recovered)return;
	readJournal(job);
	for(let page=0;page<JOURNAL_PAGES;page++)for(const record of [...pages[page]])await release(job,{page,record},'recovery');
	for(const id of DIMENSIONS)await command(job,'tickingarea remove '+AREA,true,false,{phase:'recovery',dimension:dimension(id)});
	recovered=true;
}
system.run(()=>{
	const job={owner:'',kind:'recovery',dimension:dimension('minecraft:overworld'),cancelled:false,phase:'recovery'};
	void ensureRecovery(job).catch(error=>console.warn('[Shop for Ore WorldEdit] startup: '+JSON.stringify({phase:error.wePhase,command:error.weCommand,error:errorText(error)})));
});
function loaded(job,part) {
	try {
		for(const x of [part.from.x,part.to.x])for(const z of [part.from.z,part.to.z])for(const y of [part.from.y,part.to.y]) {
			const block=job.dimension.getBlock(new BlockLocation(x,y,z));
			if(!block||!block.typeId)return false;
		}
		return true;
	} catch { return false; }
}
async function loadPart(job,part) {
	const key=[Math.floor(part.from.x/16),Math.floor(part.to.x/16),Math.floor(part.from.z/16),Math.floor(part.to.z/16)].join(',');
	if(job.loaded!==key) {
		await command(job,'tickingarea remove '+AREA,true,false,{phase:'chunks'});
		job.loaded=undefined;
		await command(job,'tickingarea add '+part.from.x+' 0 '+part.from.z+' '+part.to.x+' 0 '+part.to.z+' '+AREA+' true',false,false,{phase:'chunks',positive:true});
		job.loaded=key;
	}
	for(let i=0;i<LOAD_TICKS;i++) {
		if(job.cancelled)fail('cancelled');
		if(loaded(job,part))return;
		await waitTicks(job,1);
	}
	throw failure(job,'chunks','getBlock '+xyz(part.from)+' .. '+xyz(part.to),'chunk readiness timeout','chunks');
}
async function loadStructure(job,part,at=part.at) {
	const to={x:at.x+part.to.x-part.at.x,y:at.y+part.to.y-part.at.y,z:at.z+part.to.z-part.at.z};
	await loadPart(job,{from:at,to});
	await command(job,'structure load '+part.name+' '+xyz(at),false,true,{phase:job.kind,positive:true});
}
async function snapshot(job,box,kind) {
	const resource=allocate(job,kind),frame={dimension:job.dimension.id,box,parts:[],resource};
	job.garbage.add(resource);
	for(const part of chunks(box)) {
		await loadPart(job,part);
		const name=resource.record[0]+'_'+frame.parts.length;
		// Journal before the native save: interrupted saves remain recoverable.
		countResource(resource,frame.parts.length+1);
		await command(job,'structure save '+name+' '+xyz(part.from)+' '+xyz(part.to)+' false memory true',false,false,{phase:kind==='undo'?'backup':'copy',positive:true});
		frame.parts.push({name,at:part.from,to:part.to});
	}
	return frame;
}
const dispose=(job,frame)=>{if(frame?.resource)job.garbage.add(frame.resource);};
const retain=(job,frame)=>job.garbage.delete(frame.resource);
async function runJob(player,kind,box,work) {
	const job={id:++serial,owner:player.name,kind,dimension:player.dimension,cancelled:false,garbage:new Set(),changed:false,backup:undefined,phase:kind==='set'||kind==='replace'?'fill':kind};
	active=job;
	let outcome='chat.cmd.worldedit.done',problem;
	notify(job,'chat.cmd.worldedit.started',kind);
	try { await ensureRecovery(job);await work(job); }
	catch(error) {
		if(job.cancelled)outcome=job.changed?'chat.cmd.worldedit.cancelled_undo':'chat.cmd.worldedit.cancelled';
		else { problem=error;outcome='chat.cmd.worldedit.error.failed'; }
	} finally {
		if(job.changed&&job.backup){dispose(job,undos.get(job.owner));undos.set(job.owner,job.backup);retain(job,job.backup);}
		for(const resource of job.garbage) {
			try { await release(job,resource); }
			catch(error) { if(!problem)problem=error;else console.warn('[Shop for Ore WorldEdit] cleanup: '+errorText(error)); }
		}
		try { await command(job,'tickingarea remove '+AREA,true,false,{phase:'cleanup'}); }
		catch(error) { if(!problem)problem=error;else console.warn('[Shop for Ore WorldEdit] cleanup: '+errorText(error)); }
		if(problem)outcome='chat.cmd.worldedit.error.failed';
		if(active===job)active=undefined;
		notify(job,outcome,kind,String(box.volume));
		if(problem)report(job,problem);
	}
}
function begin(player,kind,box,work) {
	if(active)fail('busy');
	void runJob(player,kind,box,work);
}
async function prepareUndo(job,box) { job.backup=await snapshot(job,box,'undo'); }
const atOffset=(to,at,from)=>({x:to.x+at.x-from.x,y:to.y+at.y-from.y,z:to.z+at.z-from.z});

export function worldEditCommand(player,args=[]) {
	if(!hasRole(player,'owner'))return tell(player,'chat.cmd.error.no_permission');
	const action=String(args[0]??'help').toLowerCase(),rest=args.slice(1);
	try {
		if(action==='help'||action==='?') {
			const rawtext=[];for(let i=1;i<=5;i++){if(i>1)rawtext.push({text:'\n'});rawtext.push({translate:'chat.cmd.worldedit.help.'+i});}
			void player.runCommandAsync('tellraw @s '+JSON.stringify({rawtext})).catch(()=>{});return;
		}
		if(action==='cancel'){
			if(!active||active.owner!==player.name)fail('idle');active.cancelled=true;return;
		}
		if(action==='pos1'||action==='pos2'){
			const p=coordinates(rest,player.location),old=selections.get(player.name);
			if(old&&old.dimension!==player.dimension.id&&action==='pos2')fail('dimension');
			const s=old?.dimension===player.dimension.id?old:{dimension:player.dimension.id};
			s[action==='pos1'?'a':'b']=p;selections.set(player.name,s);
			tell(player,'chat.cmd.worldedit.pos',action.slice(-1),xyz(p));return;
		}
		if(action==='size') {const b=selection(player);tell(player,'chat.cmd.worldedit.size',xyz(b.size),String(b.volume));return;}
		if(action==='copy'){
			if(rest.length)fail('args');const box=selection(player),anchor=point(player.location);
			begin(player,action,box,async job=>{
				const frame=await snapshot(job,box,'copy');
				frame.offset={x:box.min.x-anchor.x,y:box.min.y-anchor.y,z:box.min.z-anchor.z};
				dispose(job,clipboards.get(job.owner));clipboards.set(job.owner,frame);retain(job,frame);
			});return;
		}
		if(action==='paste'){
			const clip=clipboards.get(player.name);if(!clip)fail('clipboard');const anchor=coordinates(rest,player.location);
			const min={x:anchor.x+clip.offset.x,y:anchor.y+clip.offset.y,z:anchor.z+clip.offset.z};
			const box=bounds(min,{x:min.x+clip.box.size.x-1,y:min.y+clip.box.size.y-1,z:min.z+clip.box.size.z-1},player.dimension.id);
			begin(player,action,box,async job=>{
				await prepareUndo(job,box);
				for(const part of clip.parts)await loadStructure(job,part,atOffset(box.min,part.at,clip.box.min));
			});return;
		}
		if(action==='undo'){
			if(rest.length)fail('args');const frame=undos.get(player.name);if(!frame)fail('undo');
			if(frame.dimension!==player.dimension.id)fail('dimension');
			begin(player,action,frame.box,async job=>{
				for(const part of frame.parts)await loadStructure(job,part);
				undos.delete(job.owner);dispose(job,frame);
			});return;
		}
		if(action==='set'||action==='replace'){
			const box=selection(player);let target,filter;
			if(action==='set'){if(rest.length<1||rest.length>2)fail('args');target=block(rest[0],rest[1]);}
			else {if(rest.length<2||rest.length>3)fail('args');filter=block(rest[0]);target=block(rest[1],rest[2]);}
			begin(player,action,box,async job=>{
				await prepareUndo(job,box);
				for(const part of chunks(box)){
					await loadPart(job,part);
					await command(job,`fill ${xyz(part.from)} ${xyz(part.to)} ${target.id} ${target.data} replace${filter?' '+filter.id+' -1':''}`,false,true);
				}
			});return;
		}
		fail('args');
	}catch(error){const key=String(error.message);tell(player,'chat.cmd.worldedit.error.'+(['bounds','selection','dimension','block','busy','clipboard','undo','idle','args'].includes(key)?key:'failed'));}
}
world.events.playerLeave.subscribe(e=>{selections.delete(e.playerName);if(active?.owner===e.playerName)active.cancelled=true;});
