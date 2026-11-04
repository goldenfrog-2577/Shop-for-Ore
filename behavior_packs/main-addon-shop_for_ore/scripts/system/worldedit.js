// Небольшой WorldEdit для владельца: память структур, порции блоков и один запрос движку за тик.
import { world, system, MinecraftBlockTypes } from '@minecraft/server';
import { hasRole, tell } from '../DataBase.js';

export const MAX_BLOCKS = 65536, MAX_EDGE = 128, CHUNK = 8;
const selections = new Map(), clipboards = new Map(), undos = new Map(), queue = [];
let active, executing = false, serial = 0;
const SESSION = Date.now().toString(36);
const point = p => ({ x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) });
const xyz = p => `${p.x} ${p.y} ${p.z}`;
const fail = key => { throw new Error(key); };
const height = id => id.includes('nether') ? [0,127] : id.includes('the_end') ? [0,255] : [-64,319];

export function bounds(a, b, dimension) {
	const min = {}, max = {}, size = {};
	for (const k of ['x','y','z']) { min[k] = Math.min(a[k],b[k]); max[k] = Math.max(a[k],b[k]); size[k] = max[k]-min[k]+1; }
	const volume = size.x * size.y * size.z, [low,high] = height(dimension);
	if (Object.values(size).some(n=>n>MAX_EDGE) || volume>MAX_BLOCKS) fail('limit');
	if (min.y<low || max.y>high || Math.max(Math.abs(min.x),Math.abs(max.x),Math.abs(min.z),Math.abs(max.z))>29999984) fail('bounds');
	return {min,max,size,volume};
}
export function chunks(box) {
	const out=[];
	for(let y=box.min.y;y<=box.max.y;y+=CHUNK) for(let z=box.min.z;z<=box.max.z;z+=CHUNK) for(let x=box.min.x;x<=box.max.x;x+=CHUNK)
		out.push({from:{x,y,z},to:{x:Math.min(x+CHUNK-1,box.max.x),y:Math.min(y+CHUNK-1,box.max.y),z:Math.min(z+CHUNK-1,box.max.z)}});
	return out;
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
function command(job, text, cleanup=false, edit=false) {
	return new Promise((resolve,reject)=>queue.push({job,text,cleanup,edit,resolve,reject}));
}
const waitTicks=(job,ticks)=>new Promise((resolve,reject)=>queue.push({job,wait:ticks,resolve,reject}));
function notify(job,key,...args) {
	try { for(const player of world.getPlayers())if(player.name===job.owner){tell(player,key,...args);break;} } catch { /* игрок уже вышел */ }
}
// Не создаём очередь сотен одновременно выполняющихся runCommandAsync.
system.runSchedule(()=>{
	if(executing||!queue.length)return;
	const task=queue.shift();
	if(task.job.cancelled&&!task.cleanup){task.reject(new Error('cancelled'));return;}
	if(task.wait){if(--task.wait>0)queue.unshift(task);else task.resolve();return;}
	if(task.edit)task.job.changed=true;
	executing=true;
	try {
		Promise.resolve(task.job.dimension.runCommandAsync(task.text)).then(task.resolve,error=>{
			// /fill может сообщать об отсутствии изменений, когда область уже имеет нужные блоки.
			const noChange=task.text.startsWith('fill ')&&/commands\.fill\.failed|no blocks (?:were )?(?:filled|changed)|не заполнено ни одного блока|ни один блок не был/i.test(String(error));
			if(task.cleanup||noChange)task.resolve({successCount:0});else task.reject(error);
		}).finally(()=>{executing=false;});
	}catch(error){executing=false;task.cleanup?task.resolve(undefined):task.reject(error);}
},1);

async function snapshot(job, box, kind) {
	const parts=[];
	for(const part of chunks(box)) {
		const name=`shop_we_${SESSION}_${job.id}_${kind}_${parts.length}`;
		job.garbage.add(name);
		await command(job,`structure save ${name} ${xyz(part.from)} ${xyz(part.to)} false memory true`);
		parts.push({name,at:part.from});
	}
	return parts;
}
const dispose=(job,frame)=>{for(const p of frame?.parts??[])job.garbage.add(p.name);};
const retain=(job,frame)=>{for(const p of frame.parts)job.garbage.delete(p.name);};
async function runJob(player, kind, box, work) {
	const job={id:++serial,owner:player.name,dimension:player.dimension,cancelled:false,garbage:new Set(),changed:false,backup:undefined};
	active=job;
	const area=`shop_we_${SESSION}_${job.id}`;
	let outcome='chat.cmd.worldedit.done';
	notify(job,'chat.cmd.worldedit.started',kind);
	try {
		await command(job,`tickingarea add ${box.min.x} 0 ${box.min.z} ${box.max.x} 0 ${box.max.z} ${area} true`);
		await waitTicks(job,10);
		await work(job);
	}catch(error){
		if(job.cancelled)outcome=job.changed?'chat.cmd.worldedit.cancelled_undo':'chat.cmd.worldedit.cancelled';
		else { console.warn('[Shop for Ore WorldEdit] '+String(error)); outcome='chat.cmd.worldedit.error.failed'; }
	}finally{
		if(job.changed&&job.backup){
			dispose(job,undos.get(job.owner)); undos.set(job.owner,job.backup); retain(job,job.backup);
		}
		for(const name of job.garbage)await command(job,`structure delete ${name}`,true);
		await command(job,`tickingarea remove ${area}`,true);
		if(active===job)active=undefined;
		notify(job,outcome,kind,String(box.volume));
	}
}
function begin(player,kind,box,work) {
	if(active)fail('busy');
	// runJob обрабатывает и ошибки команды, и остановку, и очистку временных структур.
	void runJob(player,kind,box,work);
}
async function prepareUndo(job,box) {
	job.backup={dimension:job.dimension.id,box,parts:await snapshot(job,box,'undo')};
}
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
				const frame={box,offset:{x:box.min.x-anchor.x,y:box.min.y-anchor.y,z:box.min.z-anchor.z},parts:await snapshot(job,box,'copy')};
				dispose(job,clipboards.get(job.owner));clipboards.set(job.owner,frame);retain(job,frame);
			});return;
		}
		if(action==='paste'){
			const clip=clipboards.get(player.name);if(!clip)fail('clipboard');const anchor=coordinates(rest,player.location);
			const min={x:anchor.x+clip.offset.x,y:anchor.y+clip.offset.y,z:anchor.z+clip.offset.z};
			const box=bounds(min,{x:min.x+clip.box.size.x-1,y:min.y+clip.box.size.y-1,z:min.z+clip.box.size.z-1},player.dimension.id);
			begin(player,action,box,async job=>{
				await prepareUndo(job,box);
				for(const part of clip.parts)await command(job,`structure load ${part.name} ${xyz(atOffset(box.min,part.at,clip.box.min))}`,false,true);
			});return;
		}
		if(action==='undo'){
			if(rest.length)fail('args');const frame=undos.get(player.name);if(!frame)fail('undo');
			if(frame.dimension!==player.dimension.id)fail('dimension');
			begin(player,action,frame.box,async job=>{
				for(const part of frame.parts)await command(job,`structure load ${part.name} ${xyz(part.at)}`,false,true);
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
					await command(job,`fill ${xyz(part.from)} ${xyz(part.to)} ${target.id} ${target.data} replace${filter?' '+filter.id+' -1':''}`,false,true);
				}
			});return;
		}
		fail('args');
	}catch(error){const key=String(error.message);tell(player,'chat.cmd.worldedit.error.'+(['limit','bounds','selection','dimension','block','busy','clipboard','undo','idle','args'].includes(key)?key:'failed'));}
}
world.events.playerLeave.subscribe(e=>{selections.delete(e.playerName);if(active?.owner===e.playerName)active.cancelled=true;});
