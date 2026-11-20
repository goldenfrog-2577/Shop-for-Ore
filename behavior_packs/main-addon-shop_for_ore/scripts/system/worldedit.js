// WorldEdit владельца: порции блоков, ожидание чанков и журнал собственных ресурсов.
import { world, system, BlockTypes } from '@minecraft/server';
import { hasRole, tell } from '../utils.js';
import { tellList } from '../chat/commands/common.js';

export const CHUNK = 8;
const selections = new Map(), clipboards = new Map(), undos = new Map(), queue = [];
let active, executing = false, serial = 0, recovered = false, recoveryTask;
const SESSION = Date.now().toString(36), AREA = 'shop_worldedit';
const DIMENSIONS = ['minecraft:overworld', 'minecraft:nether', 'minecraft:the_end'];
const LOAD_TICKS = 200, JOURNAL_PAGES = 2, JOURNAL_LENGTH = 1000;
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
	const detail = errorText(error);
	const result = new Error(detail);
	result.wePhase = phase;
	result.weCommand = text;
	result.weDetail = detail;
	result.weReason = reason;
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
function matches(error, key) {
	const message = errorText(error);
	return message.includes(key) || nativePatterns[key].some(pattern => pattern.test(message));
}
// 1.19.5x отклоняет fill без изменённых блоков текстом commands.fill.success с числом 0 («Заполнено блоков: 0»).
const ZERO_FILL=[/(^|\D)0 blocks filled/i,/Заполнено блоков: 0(\D|$)/i,/Заповнено 0 блоків/i,/(^|\D)0 bloques llenados/i];
const zeroFill=error=>ZERO_FILL.some(re=>re.test(errorText(error)));
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
// В 26.60 fill принимает именованные состояния. Для старых команд владельца
// палитра в конце файла хранит соответствие ID и чисел 0–15 из релиза 1.19.50.
function block(raw, data) {
	if (!/^(?:[a-z0-9_]+:)?[a-z0-9_]+$/.test(raw ?? '')) fail('block');
	const id = raw.includes(':') ? raw : 'minecraft:' + raw;
	if (data !== undefined && (!/^\d+$/.test(data) || Number(data) > 15)) fail('block');
	const index = Number(data ?? 0);
	const oldVariant = id.startsWith('minecraft:') ? LEGACY_BLOCK_DATA.get(id.slice(10))?.[index] : undefined;
	if (data === undefined || (index === 0 && !oldVariant)) {
		const current = BlockTypes.get(id);
		if (current) return { id: current.id, states: '[]' };
	}
	if (!oldVariant) fail('block');
	if (oldVariant.startsWith('[')) return { id, states: oldVariant };
	const [name, states] = oldVariant.split(' ');
	return { id: 'minecraft:' + name, states };
}

function command(job,text,cleanup=false,edit=false,options={}) {
	return new Promise((resolve,reject)=>queue.push({job,text,cleanup,edit,phase:options.phase??job.phase,dimension:options.dimension??job.dimension,positive:!!options.positive,resolve,reject}));
}
const waitTicks=(job,ticks)=>new Promise((resolve,reject)=>queue.push({job,wait:ticks,resolve,reject}));
function notify(job,key,...args) {
	try { for(const player of world.getPlayers())if(player.name===job.owner){tell(player,key,...args);break;} } catch {}
}
// Не более одной команды за тик. Откат и очистка идут через ту же очередь, что и правки.
system.runInterval(()=>{
	if(executing||!queue.length)return;
	const task=queue.shift();
	if(task.job.cancelled&&!task.cleanup){task.reject(new Error('cancelled'));return;}
	if(task.wait){if(--task.wait>0)queue.unshift(task);else task.resolve();return;}
	if(task.edit)task.job.changed=true;
	task.job.lastCommand=task.text;executing=true;
	const rejected=error=>{
		if((task.cleanup&&absent(task,error))||(task.text.startsWith('fill ')&&(matches(error,'commands.fill.failed')||zeroFill(error))))task.resolve({successCount:0});
		else task.reject(failure(task.job,task.phase,task.text,error));
	};
	try {
		Promise.resolve().then(() => task.dimension.runCommand(task.text)).then(result=>{
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
			const block=job.dimension.getBlock({ x, y, z });
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

export const HELP_LINES=10;
export function worldEditCommand(player,args=[]) {
	if(!hasRole(player,'owner'))return tell(player,'chat.cmd.error.no_permission');
	const action=String(args[0]??'help').toLowerCase(),rest=args.slice(1);
	try {
		if(action==='help'||action==='?') {
			const lines = Array.from({ length: HELP_LINES }, (_, i) => ({ translate: 'chat.cmd.worldedit.help.' + (i + 1) }));
			tellList(player, { translate: 'chat.cmd.worldedit.help.header' }, lines);
			return;
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
					await command(job,`fill ${xyz(part.from)} ${xyz(part.to)} ${target.id} ${target.states} replace${filter ? ' ' + filter.id : ''}`,false,true);
				}
			});return;
		}
		fail('args');
	}catch(error){const key=String(error.message);tell(player,'chat.cmd.worldedit.error.'+(['bounds','selection','dimension','block','busy','clipboard','undo','idle','args'].includes(key)?key:'failed'));}
}
world.afterEvents.playerLeave.subscribe(e=>{selections.delete(e.playerName);if(active?.owner===e.playerName)active.cancelled=true;});

// Метаданные из pmmp/BedrockData, тег bedrock-1.19.50 (CC0, 57337dd).
// Варианты преобразованы движком 1.26.60.6. Одинаковые таблицы общие для семейств блоков.
const LEGACY_BLOCK_DATA = new Map();
for (const [names, variants] of [
	["acacia_button bamboo_button birch_button crimson_button dark_oak_button jungle_button mangrove_button polished_blackstone_button spruce_button stone_button warped_button wooden_button", ["[]","[\"facing_direction\"=1]","[\"facing_direction\"=2]","[\"facing_direction\"=3]","[\"facing_direction\"=4]","[\"facing_direction\"=5]",null,null,"[\"button_pressed_bit\"=true]","[\"button_pressed_bit\"=true,\"facing_direction\"=1]","[\"button_pressed_bit\"=true,\"facing_direction\"=2]","[\"button_pressed_bit\"=true,\"facing_direction\"=3]","[\"button_pressed_bit\"=true,\"facing_direction\"=4]","[\"button_pressed_bit\"=true,\"facing_direction\"=5]"]],
	["acacia_door bamboo_door birch_door crimson_door dark_oak_door iron_door jungle_door mangrove_door spruce_door warped_door wooden_door", ["[]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\"]","[\"open_bit\"=true]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\",\"open_bit\"=true]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\",\"open_bit\"=true]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\",\"open_bit\"=true]","[\"upper_block_bit\"=true]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\",\"upper_block_bit\"=true]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\",\"upper_block_bit\"=true]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\",\"upper_block_bit\"=true]","[\"open_bit\"=true,\"upper_block_bit\"=true]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\",\"open_bit\"=true,\"upper_block_bit\"=true]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\",\"open_bit\"=true,\"upper_block_bit\"=true]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\",\"open_bit\"=true,\"upper_block_bit\"=true]"]],
	["acacia_fence_gate bamboo_fence_gate birch_fence_gate crimson_fence_gate dark_oak_fence_gate fence_gate jungle_fence_gate mangrove_fence_gate spruce_fence_gate warped_fence_gate", ["[]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\"]","[\"open_bit\"=true]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\",\"open_bit\"=true]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\",\"open_bit\"=true]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\",\"open_bit\"=true]","[\"in_wall_bit\"=true]","[\"direction\"=1,\"in_wall_bit\"=true,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"in_wall_bit\"=true,\"minecraft:cardinal_direction\"=\"north\"]","[\"direction\"=3,\"in_wall_bit\"=true,\"minecraft:cardinal_direction\"=\"east\"]","[\"in_wall_bit\"=true,\"open_bit\"=true]","[\"direction\"=1,\"in_wall_bit\"=true,\"minecraft:cardinal_direction\"=\"west\",\"open_bit\"=true]","[\"direction\"=2,\"in_wall_bit\"=true,\"minecraft:cardinal_direction\"=\"north\",\"open_bit\"=true]","[\"direction\"=3,\"in_wall_bit\"=true,\"minecraft:cardinal_direction\"=\"east\",\"open_bit\"=true]"]],
	["acacia_hanging_sign bamboo_hanging_sign birch_hanging_sign crimson_hanging_sign dark_oak_hanging_sign jungle_hanging_sign mangrove_hanging_sign oak_hanging_sign spruce_hanging_sign warped_hanging_sign", ["[]","[\"facing_direction\"=1]","[\"facing_direction\"=2]","[\"facing_direction\"=3]","[\"facing_direction\"=4]","[\"facing_direction\"=5]",null,null,"[\"ground_sign_direction\"=1]","[\"facing_direction\"=1,\"ground_sign_direction\"=1]","[\"facing_direction\"=2,\"ground_sign_direction\"=1]","[\"facing_direction\"=3,\"ground_sign_direction\"=1]","[\"facing_direction\"=4,\"ground_sign_direction\"=1]","[\"facing_direction\"=5,\"ground_sign_direction\"=1]"]],
	["acacia_pressure_plate bamboo_pressure_plate birch_pressure_plate crimson_pressure_plate dark_oak_pressure_plate daylight_detector daylight_detector_inverted heavy_weighted_pressure_plate jungle_pressure_plate light_weighted_pressure_plate mangrove_pressure_plate polished_blackstone_pressure_plate redstone_wire spruce_pressure_plate stone_pressure_plate warped_pressure_plate wooden_pressure_plate", ["[]","[\"redstone_signal\"=1]","[\"redstone_signal\"=2]","[\"redstone_signal\"=3]","[\"redstone_signal\"=4]","[\"redstone_signal\"=5]","[\"redstone_signal\"=6]","[\"redstone_signal\"=7]","[\"redstone_signal\"=8]","[\"redstone_signal\"=9]","[\"redstone_signal\"=10]","[\"redstone_signal\"=11]","[\"redstone_signal\"=12]","[\"redstone_signal\"=13]","[\"redstone_signal\"=14]","[\"redstone_signal\"=15]"]],
	["acacia_stairs andesite_stairs bamboo_mosaic_stairs bamboo_stairs birch_stairs blackstone_stairs brick_stairs cobbled_deepslate_stairs crimson_stairs cut_copper_stairs dark_oak_stairs dark_prismarine_stairs deepslate_brick_stairs deepslate_tile_stairs diorite_stairs end_brick_stairs exposed_cut_copper_stairs granite_stairs jungle_stairs mangrove_stairs mossy_cobblestone_stairs mossy_stone_brick_stairs mud_brick_stairs nether_brick_stairs normal_stone_stairs oak_stairs oxidized_cut_copper_stairs polished_andesite_stairs polished_blackstone_brick_stairs polished_blackstone_stairs polished_deepslate_stairs polished_diorite_stairs polished_granite_stairs prismarine_bricks_stairs prismarine_stairs purpur_stairs quartz_stairs red_nether_brick_stairs red_sandstone_stairs sandstone_stairs smooth_quartz_stairs smooth_red_sandstone_stairs smooth_sandstone_stairs spruce_stairs stone_brick_stairs stone_stairs warped_stairs waxed_cut_copper_stairs waxed_exposed_cut_copper_stairs waxed_oxidized_cut_copper_stairs waxed_weathered_cut_copper_stairs weathered_cut_copper_stairs", ["[]","[\"weirdo_direction\"=1]","[\"weirdo_direction\"=2]","[\"weirdo_direction\"=3]","[\"upside_down_bit\"=true]","[\"upside_down_bit\"=true,\"weirdo_direction\"=1]","[\"upside_down_bit\"=true,\"weirdo_direction\"=2]","[\"upside_down_bit\"=true,\"weirdo_direction\"=3]"]],
	["acacia_standing_sign bamboo_standing_sign birch_standing_sign crimson_standing_sign darkoak_standing_sign jungle_standing_sign mangrove_standing_sign spruce_standing_sign standing_banner standing_sign warped_standing_sign", ["[]","[\"ground_sign_direction\"=1]","[\"ground_sign_direction\"=2]","[\"ground_sign_direction\"=3]","[\"ground_sign_direction\"=4]","[\"ground_sign_direction\"=5]","[\"ground_sign_direction\"=6]","[\"ground_sign_direction\"=7]","[\"ground_sign_direction\"=8]","[\"ground_sign_direction\"=9]","[\"ground_sign_direction\"=10]","[\"ground_sign_direction\"=11]","[\"ground_sign_direction\"=12]","[\"ground_sign_direction\"=13]","[\"ground_sign_direction\"=14]","[\"ground_sign_direction\"=15]"]],
	["acacia_trapdoor bamboo_trapdoor birch_trapdoor crimson_trapdoor dark_oak_trapdoor iron_trapdoor jungle_trapdoor mangrove_trapdoor spruce_trapdoor trapdoor warped_trapdoor", ["[]","[\"direction\"=1]","[\"direction\"=2]","[\"direction\"=3]","[\"upside_down_bit\"=true]","[\"direction\"=1,\"upside_down_bit\"=true]","[\"direction\"=2,\"upside_down_bit\"=true]","[\"direction\"=3,\"upside_down_bit\"=true]","[\"open_bit\"=true]","[\"direction\"=1,\"open_bit\"=true]","[\"direction\"=2,\"open_bit\"=true]","[\"direction\"=3,\"open_bit\"=true]","[\"open_bit\"=true,\"upside_down_bit\"=true]","[\"direction\"=1,\"open_bit\"=true,\"upside_down_bit\"=true]","[\"direction\"=2,\"open_bit\"=true,\"upside_down_bit\"=true]","[\"direction\"=3,\"open_bit\"=true,\"upside_down_bit\"=true]"]],
	["acacia_wall_sign bamboo_wall_sign birch_wall_sign black_glazed_terracotta blue_glazed_terracotta brown_glazed_terracotta crimson_wall_sign cyan_glazed_terracotta darkoak_wall_sign end_rod gray_glazed_terracotta green_glazed_terracotta jungle_wall_sign ladder light_blue_glazed_terracotta lightning_rod lime_glazed_terracotta magenta_glazed_terracotta mangrove_wall_sign orange_glazed_terracotta pink_glazed_terracotta piston piston_arm_collision purple_glazed_terracotta red_glazed_terracotta silver_glazed_terracotta spruce_wall_sign sticky_piston sticky_piston_arm_collision wall_banner wall_sign warped_wall_sign white_glazed_terracotta yellow_glazed_terracotta", ["[]","[\"facing_direction\"=1]","[\"facing_direction\"=2]","[\"facing_direction\"=3]","[\"facing_direction\"=4]","[\"facing_direction\"=5]"]],
	["activator_rail detector_rail golden_rail", ["[]","[\"rail_direction\"=1]","[\"rail_direction\"=2]","[\"rail_direction\"=3]","[\"rail_direction\"=4]","[\"rail_direction\"=5]",null,null,"[\"rail_data_bit\"=true]","[\"rail_data_bit\"=true,\"rail_direction\"=1]","[\"rail_data_bit\"=true,\"rail_direction\"=2]","[\"rail_data_bit\"=true,\"rail_direction\"=3]","[\"rail_data_bit\"=true,\"rail_direction\"=4]","[\"rail_data_bit\"=true,\"rail_direction\"=5]"]],
	["amethyst_cluster large_amethyst_bud medium_amethyst_bud small_amethyst_bud", ["[\"facing_direction\"=0,\"minecraft:block_face\"=\"down\"]","[]","[\"facing_direction\"=2,\"minecraft:block_face\"=\"north\"]","[\"facing_direction\"=3,\"minecraft:block_face\"=\"south\"]","[\"facing_direction\"=4,\"minecraft:block_face\"=\"west\"]","[\"facing_direction\"=5,\"minecraft:block_face\"=\"east\"]"]],
	["anvil", ["[]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\"]","chipped_anvil []","chipped_anvil [\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","chipped_anvil [\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","chipped_anvil [\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\"]","damaged_anvil []","damaged_anvil [\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","damaged_anvil [\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","damaged_anvil [\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\"]","deprecated_anvil []","deprecated_anvil [\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","deprecated_anvil [\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","deprecated_anvil [\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\"]"]],
	["azalea_leaves azalea_leaves_flowered mangrove_leaves", ["[]","[\"update_bit\"=true]","[\"persistent_bit\"=true]","[\"persistent_bit\"=true,\"update_bit\"=true]"]],
	["bamboo", ["[]","[\"bamboo_stalk_thickness\"=\"thick\"]","[\"bamboo_leaf_size\"=\"small_leaves\"]","[\"bamboo_leaf_size\"=\"small_leaves\",\"bamboo_stalk_thickness\"=\"thick\"]","[\"bamboo_leaf_size\"=\"large_leaves\"]","[\"bamboo_leaf_size\"=\"large_leaves\",\"bamboo_stalk_thickness\"=\"thick\"]",null,null,"[\"age_bit\"=true]","[\"age_bit\"=true,\"bamboo_stalk_thickness\"=\"thick\"]","[\"age_bit\"=true,\"bamboo_leaf_size\"=\"small_leaves\"]","[\"age_bit\"=true,\"bamboo_leaf_size\"=\"small_leaves\",\"bamboo_stalk_thickness\"=\"thick\"]","[\"age_bit\"=true,\"bamboo_leaf_size\"=\"large_leaves\"]","[\"age_bit\"=true,\"bamboo_leaf_size\"=\"large_leaves\",\"bamboo_stalk_thickness\"=\"thick\"]"]],
	["bamboo_double_slab bamboo_mosaic_double_slab bamboo_mosaic_slab bamboo_slab blackstone_double_slab blackstone_slab cobbled_deepslate_double_slab cobbled_deepslate_slab crimson_double_slab crimson_slab cut_copper_slab deepslate_brick_double_slab deepslate_brick_slab deepslate_tile_double_slab deepslate_tile_slab double_cut_copper_slab exposed_cut_copper_slab exposed_double_cut_copper_slab mangrove_double_slab mangrove_slab mud_brick_double_slab mud_brick_slab oxidized_cut_copper_slab oxidized_double_cut_copper_slab polished_blackstone_brick_double_slab polished_blackstone_brick_slab polished_blackstone_double_slab polished_blackstone_slab polished_deepslate_double_slab polished_deepslate_slab warped_double_slab warped_slab waxed_cut_copper_slab waxed_double_cut_copper_slab waxed_exposed_cut_copper_slab waxed_exposed_double_cut_copper_slab waxed_oxidized_cut_copper_slab waxed_oxidized_double_cut_copper_slab waxed_weathered_cut_copper_slab waxed_weathered_double_cut_copper_slab weathered_cut_copper_slab weathered_double_cut_copper_slab", ["[]","[\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]"]],
	["bamboo_sapling", ["[]","[\"age_bit\"=true]","[]","[\"age_bit\"=true]","[]","[\"age_bit\"=true]","[]","[\"age_bit\"=true]","[]","[\"age_bit\"=true]","[]","[\"age_bit\"=true]"]],
	["barrel", ["[]","[\"facing_direction\"=1]","[\"facing_direction\"=2]","[\"facing_direction\"=3]","[\"facing_direction\"=4]","[\"facing_direction\"=5]",null,null,"[\"open_bit\"=true]","[\"facing_direction\"=1,\"open_bit\"=true]","[\"facing_direction\"=2,\"open_bit\"=true]","[\"facing_direction\"=3,\"open_bit\"=true]","[\"facing_direction\"=4,\"open_bit\"=true]","[\"facing_direction\"=5,\"open_bit\"=true]"]],
	["basalt crimson_hyphae crimson_stem deepslate infested_deepslate mangrove_log muddy_mangrove_roots ochre_froglight pearlescent_froglight polished_basalt stripped_acacia_log stripped_birch_log stripped_crimson_hyphae stripped_crimson_stem stripped_dark_oak_log stripped_jungle_log stripped_mangrove_log stripped_mangrove_wood stripped_oak_log stripped_spruce_log stripped_warped_hyphae stripped_warped_stem verdant_froglight warped_hyphae warped_stem", ["[]","[\"pillar_axis\"=\"x\"]","[\"pillar_axis\"=\"z\"]"]],
	["bed", ["[]","[\"direction\"=1]","[\"direction\"=2]","[\"direction\"=3]","[\"occupied_bit\"=true]","[\"direction\"=1,\"occupied_bit\"=true]","[\"direction\"=2,\"occupied_bit\"=true]","[\"direction\"=3,\"occupied_bit\"=true]","[\"head_piece_bit\"=true]","[\"direction\"=1,\"head_piece_bit\"=true]","[\"direction\"=2,\"head_piece_bit\"=true]","[\"direction\"=3,\"head_piece_bit\"=true]","[\"head_piece_bit\"=true,\"occupied_bit\"=true]","[\"direction\"=1,\"head_piece_bit\"=true,\"occupied_bit\"=true]","[\"direction\"=2,\"head_piece_bit\"=true,\"occupied_bit\"=true]","[\"direction\"=3,\"head_piece_bit\"=true,\"occupied_bit\"=true]"]],
	["bedrock", ["[]","[\"infiniburn_bit\"=true]"]],
	["bee_nest beehive", ["[]","[\"direction\"=1]","[\"direction\"=2]","[\"direction\"=3]","[\"honey_level\"=1]","[\"direction\"=1,\"honey_level\"=1]","[\"direction\"=2,\"honey_level\"=1]","[\"direction\"=3,\"honey_level\"=1]","[\"honey_level\"=2]","[\"direction\"=1,\"honey_level\"=2]","[\"direction\"=2,\"honey_level\"=2]","[\"direction\"=3,\"honey_level\"=2]","[\"honey_level\"=3]","[\"direction\"=1,\"honey_level\"=3]","[\"direction\"=2,\"honey_level\"=3]","[\"direction\"=3,\"honey_level\"=3]"]],
	["beetroot carrots potatoes sweet_berry_bush wheat", ["[]","[\"growth\"=1]","[\"growth\"=2]","[\"growth\"=3]","[\"growth\"=4]","[\"growth\"=5]","[\"growth\"=6]","[\"growth\"=7]"]],
	["bell grindstone", ["[]","[\"direction\"=1]","[\"direction\"=2]","[\"direction\"=3]","[\"attachment\"=\"hanging\"]","[\"attachment\"=\"hanging\",\"direction\"=1]","[\"attachment\"=\"hanging\",\"direction\"=2]","[\"attachment\"=\"hanging\",\"direction\"=3]","[\"attachment\"=\"side\"]","[\"attachment\"=\"side\",\"direction\"=1]","[\"attachment\"=\"side\",\"direction\"=2]","[\"attachment\"=\"side\",\"direction\"=3]","[\"attachment\"=\"multiple\"]","[\"attachment\"=\"multiple\",\"direction\"=1]","[\"attachment\"=\"multiple\",\"direction\"=2]","[\"attachment\"=\"multiple\",\"direction\"=3]"]],
	["big_dripleaf", ["[\"big_dripleaf_head\"=false]","[\"big_dripleaf_head\"=false,\"big_dripleaf_tilt\"=\"unstable\"]","[\"big_dripleaf_head\"=false,\"big_dripleaf_tilt\"=\"partial_tilt\"]","[\"big_dripleaf_head\"=false,\"big_dripleaf_tilt\"=\"full_tilt\"]","[]","[\"big_dripleaf_tilt\"=\"unstable\"]","[\"big_dripleaf_tilt\"=\"partial_tilt\"]","[\"big_dripleaf_tilt\"=\"full_tilt\"]","[\"big_dripleaf_head\"=false,\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"big_dripleaf_head\"=false,\"big_dripleaf_tilt\"=\"unstable\",\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"big_dripleaf_head\"=false,\"big_dripleaf_tilt\"=\"partial_tilt\",\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"big_dripleaf_head\"=false,\"big_dripleaf_tilt\"=\"full_tilt\",\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"big_dripleaf_tilt\"=\"unstable\",\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"big_dripleaf_tilt\"=\"partial_tilt\",\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"big_dripleaf_tilt\"=\"full_tilt\",\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]"]],
	["black_candle blue_candle brown_candle candle cyan_candle gray_candle green_candle light_blue_candle light_gray_candle lime_candle magenta_candle orange_candle pink_candle purple_candle red_candle white_candle yellow_candle", ["[]","[\"candles\"=1]","[\"candles\"=2]","[\"candles\"=3]","[\"lit\"=true]","[\"candles\"=1,\"lit\"=true]","[\"candles\"=2,\"lit\"=true]","[\"candles\"=3,\"lit\"=true]"]],
	["black_candle_cake blue_candle_cake brown_candle_cake candle_cake cyan_candle_cake gray_candle_cake green_candle_cake light_blue_candle_cake light_gray_candle_cake lime_candle_cake magenta_candle_cake orange_candle_cake pink_candle_cake purple_candle_cake red_candle_cake white_candle_cake yellow_candle_cake", ["[]","[\"lit\"=true]"]],
	["blackstone_wall border_block cobbled_deepslate_wall deepslate_brick_wall deepslate_tile_wall mud_brick_wall polished_blackstone_brick_wall polished_blackstone_wall polished_deepslate_wall", ["[]","[\"wall_post_bit\"=true]","[\"wall_connection_type_north\"=\"short\"]","[\"wall_connection_type_north\"=\"short\",\"wall_post_bit\"=true]","[\"wall_connection_type_north\"=\"tall\"]","[\"wall_connection_type_north\"=\"tall\",\"wall_post_bit\"=true]",null,null,"[\"wall_connection_type_east\"=\"short\"]","[\"wall_connection_type_east\"=\"short\",\"wall_post_bit\"=true]","[\"wall_connection_type_east\"=\"short\",\"wall_connection_type_north\"=\"short\"]","[\"wall_connection_type_east\"=\"short\",\"wall_connection_type_north\"=\"short\",\"wall_post_bit\"=true]","[\"wall_connection_type_east\"=\"short\",\"wall_connection_type_north\"=\"tall\"]","[\"wall_connection_type_east\"=\"short\",\"wall_connection_type_north\"=\"tall\",\"wall_post_bit\"=true]"]],
	["blast_furnace furnace lit_blast_furnace lit_furnace lit_smoker smoker", ["[]","[\"facing_direction\"=4,\"minecraft:cardinal_direction\"=\"west\"]","[\"facing_direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","[]","[\"facing_direction\"=4,\"minecraft:cardinal_direction\"=\"west\"]","[\"facing_direction\"=5,\"minecraft:cardinal_direction\"=\"east\"]"]],
	["bone_block hay_block", ["[]","[\"deprecated\"=1]","[\"deprecated\"=2]","[\"deprecated\"=3]","[\"pillar_axis\"=\"x\"]","[\"deprecated\"=1,\"pillar_axis\"=\"x\"]","[\"deprecated\"=2,\"pillar_axis\"=\"x\"]","[\"deprecated\"=3,\"pillar_axis\"=\"x\"]","[\"pillar_axis\"=\"z\"]","[\"deprecated\"=1,\"pillar_axis\"=\"z\"]","[\"deprecated\"=2,\"pillar_axis\"=\"z\"]","[\"deprecated\"=3,\"pillar_axis\"=\"z\"]"]],
	["brewing_stand", ["[]","[\"brewing_stand_slot_a_bit\"=true]","[\"brewing_stand_slot_b_bit\"=true]","[\"brewing_stand_slot_a_bit\"=true,\"brewing_stand_slot_b_bit\"=true]","[\"brewing_stand_slot_c_bit\"=true]","[\"brewing_stand_slot_a_bit\"=true,\"brewing_stand_slot_c_bit\"=true]","[\"brewing_stand_slot_b_bit\"=true,\"brewing_stand_slot_c_bit\"=true]","[\"brewing_stand_slot_a_bit\"=true,\"brewing_stand_slot_b_bit\"=true,\"brewing_stand_slot_c_bit\"=true]"]],
	["brown_mushroom_block red_mushroom_block", ["[\"huge_mushroom_bits\"=0]","[\"huge_mushroom_bits\"=1]","[\"huge_mushroom_bits\"=2]","[\"huge_mushroom_bits\"=3]","[\"huge_mushroom_bits\"=4]","[\"huge_mushroom_bits\"=5]","[\"huge_mushroom_bits\"=6]","[\"huge_mushroom_bits\"=7]","[\"huge_mushroom_bits\"=8]","[\"huge_mushroom_bits\"=9]","mushroom_stem [\"huge_mushroom_bits\"=10]","[\"huge_mushroom_bits\"=11]","[\"huge_mushroom_bits\"=12]","[\"huge_mushroom_bits\"=13]","[]","mushroom_stem []"]],
	["bubble_column", ["[]","[\"drag_down\"=true]"]],
	["cactus fire reeds soul_fire", ["[]","[\"age\"=1]","[\"age\"=2]","[\"age\"=3]","[\"age\"=4]","[\"age\"=5]","[\"age\"=6]","[\"age\"=7]","[\"age\"=8]","[\"age\"=9]","[\"age\"=10]","[\"age\"=11]","[\"age\"=12]","[\"age\"=13]","[\"age\"=14]","[\"age\"=15]"]],
	["cake", ["[]","[\"bite_counter\"=1]","[\"bite_counter\"=2]","[\"bite_counter\"=3]","[\"bite_counter\"=4]","[\"bite_counter\"=5]","[\"bite_counter\"=6]"]],
	["campfire soul_campfire", ["[]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\"]","[\"extinguished\"=true]","[\"direction\"=1,\"extinguished\"=true,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"extinguished\"=true,\"minecraft:cardinal_direction\"=\"north\"]","[\"direction\"=3,\"extinguished\"=true,\"minecraft:cardinal_direction\"=\"east\"]"]],
	["carpet", ["white_carpet []","orange_carpet []","magenta_carpet []","light_blue_carpet []","yellow_carpet []","lime_carpet []","pink_carpet []","gray_carpet []","light_gray_carpet []","cyan_carpet []","purple_carpet []","blue_carpet []","brown_carpet []","green_carpet []","red_carpet []","black_carpet []"]],
	["carved_pumpkin lit_pumpkin pumpkin", ["[]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\"]"]],
	["cauldron", ["[]","[\"fill_level\"=1]","[\"fill_level\"=2]","[\"fill_level\"=3]","[\"fill_level\"=4]","[\"fill_level\"=5]","[\"fill_level\"=6]",null,"[\"cauldron_liquid\"=\"lava\"]","[\"cauldron_liquid\"=\"lava\",\"fill_level\"=1]","[\"cauldron_liquid\"=\"lava\",\"fill_level\"=2]","[\"cauldron_liquid\"=\"lava\",\"fill_level\"=3]","[\"cauldron_liquid\"=\"lava\",\"fill_level\"=4]","[\"cauldron_liquid\"=\"lava\",\"fill_level\"=5]","[\"cauldron_liquid\"=\"lava\",\"fill_level\"=6]"]],
	["cave_vines cave_vines_body_with_berries cave_vines_head_with_berries", ["[]","[\"growing_plant_age\"=1]","[\"growing_plant_age\"=2]","[\"growing_plant_age\"=3]","[\"growing_plant_age\"=4]","[\"growing_plant_age\"=5]","[\"growing_plant_age\"=6]","[\"growing_plant_age\"=7]","[\"growing_plant_age\"=8]","[\"growing_plant_age\"=9]","[\"growing_plant_age\"=10]","[\"growing_plant_age\"=11]","[\"growing_plant_age\"=12]","[\"growing_plant_age\"=13]","[\"growing_plant_age\"=14]","[\"growing_plant_age\"=15]"]],
	["chain", ["iron_chain []","iron_chain [\"pillar_axis\"=\"x\"]","iron_chain [\"pillar_axis\"=\"z\"]"]],
	["chain_command_block command_block repeating_command_block", ["[]","[\"facing_direction\"=1]","[\"facing_direction\"=2]","[\"facing_direction\"=3]","[\"facing_direction\"=4]","[\"facing_direction\"=5]",null,null,"[\"conditional_bit\"=true]","[\"conditional_bit\"=true,\"facing_direction\"=1]","[\"conditional_bit\"=true,\"facing_direction\"=2]","[\"conditional_bit\"=true,\"facing_direction\"=3]","[\"conditional_bit\"=true,\"facing_direction\"=4]","[\"conditional_bit\"=true,\"facing_direction\"=5]"]],
	["chemistry_table", ["compound_creator []","compound_creator [\"direction\"=1]","compound_creator [\"direction\"=2]","compound_creator [\"direction\"=3]","material_reducer []","material_reducer [\"direction\"=1]","material_reducer [\"direction\"=2]","material_reducer [\"direction\"=3]","element_constructor []","element_constructor [\"direction\"=1]","element_constructor [\"direction\"=2]","element_constructor [\"direction\"=3]","lab_table []","lab_table [\"direction\"=1]","lab_table [\"direction\"=2]","lab_table [\"direction\"=3]"]],
	["chest ender_chest stonecutter_block trapped_chest", ["[]","[]","[]","[\"facing_direction\"=3,\"minecraft:cardinal_direction\"=\"south\"]","[\"facing_direction\"=4,\"minecraft:cardinal_direction\"=\"west\"]","[\"facing_direction\"=5,\"minecraft:cardinal_direction\"=\"east\"]"]],
	["chiseled_bookshelf", ["[]","[\"direction\"=1]","[\"direction\"=2]","[\"direction\"=3]","[\"books_stored\"=1]","[\"books_stored\"=1,\"direction\"=1]","[\"books_stored\"=1,\"direction\"=2]","[\"books_stored\"=1,\"direction\"=3]","[\"books_stored\"=2]","[\"books_stored\"=2,\"direction\"=1]","[\"books_stored\"=2,\"direction\"=2]","[\"books_stored\"=2,\"direction\"=3]","[\"books_stored\"=3]","[\"books_stored\"=3,\"direction\"=1]","[\"books_stored\"=3,\"direction\"=2]","[\"books_stored\"=3,\"direction\"=3]"]],
	["chorus_flower", ["[]","[\"age\"=1]","[\"age\"=2]","[\"age\"=3]","[\"age\"=4]","[\"age\"=5]"]],
	["cobblestone_wall", ["[]","mossy_cobblestone_wall []","granite_wall []","diorite_wall []","andesite_wall []","sandstone_wall []","brick_wall []","stone_brick_wall []","mossy_stone_brick_wall []","nether_brick_wall []","end_stone_brick_wall []","prismarine_wall []","red_sandstone_wall []","red_nether_brick_wall []"]],
	["cocoa", ["[]","[\"direction\"=1]","[\"direction\"=2]","[\"direction\"=3]","[\"age\"=1]","[\"age\"=1,\"direction\"=1]","[\"age\"=1,\"direction\"=2]","[\"age\"=1,\"direction\"=3]","[\"age\"=2]","[\"age\"=2,\"direction\"=1]","[\"age\"=2,\"direction\"=2]","[\"age\"=2,\"direction\"=3]"]],
	["colored_torch_bp", ["colored_torch_blue []","colored_torch_blue [\"torch_facing_direction\"=\"west\"]","colored_torch_blue [\"torch_facing_direction\"=\"east\"]","colored_torch_blue [\"torch_facing_direction\"=\"north\"]","colored_torch_blue [\"torch_facing_direction\"=\"south\"]","colored_torch_blue [\"torch_facing_direction\"=\"top\"]",null,null,"colored_torch_purple []","colored_torch_purple [\"torch_facing_direction\"=\"west\"]","colored_torch_purple [\"torch_facing_direction\"=\"east\"]","colored_torch_purple [\"torch_facing_direction\"=\"north\"]","colored_torch_purple [\"torch_facing_direction\"=\"south\"]","colored_torch_purple [\"torch_facing_direction\"=\"top\"]"]],
	["colored_torch_rg", ["colored_torch_red []","colored_torch_red [\"torch_facing_direction\"=\"west\"]","colored_torch_red [\"torch_facing_direction\"=\"east\"]","colored_torch_red [\"torch_facing_direction\"=\"north\"]","colored_torch_red [\"torch_facing_direction\"=\"south\"]","colored_torch_red [\"torch_facing_direction\"=\"top\"]",null,null,"colored_torch_green []","colored_torch_green [\"torch_facing_direction\"=\"west\"]","colored_torch_green [\"torch_facing_direction\"=\"east\"]","colored_torch_green [\"torch_facing_direction\"=\"north\"]","colored_torch_green [\"torch_facing_direction\"=\"south\"]","colored_torch_green [\"torch_facing_direction\"=\"top\"]"]],
	["composter", ["[]","[\"composter_fill_level\"=1]","[\"composter_fill_level\"=2]","[\"composter_fill_level\"=3]","[\"composter_fill_level\"=4]","[\"composter_fill_level\"=5]","[\"composter_fill_level\"=6]","[\"composter_fill_level\"=7]","[\"composter_fill_level\"=8]"]],
	["concrete", ["white_concrete []","orange_concrete []","magenta_concrete []","light_blue_concrete []","yellow_concrete []","lime_concrete []","pink_concrete []","gray_concrete []","light_gray_concrete []","cyan_concrete []","purple_concrete []","blue_concrete []","brown_concrete []","green_concrete []","red_concrete []","black_concrete []"]],
	["concrete_powder", ["white_concrete_powder []","orange_concrete_powder []","magenta_concrete_powder []","light_blue_concrete_powder []","yellow_concrete_powder []","lime_concrete_powder []","pink_concrete_powder []","gray_concrete_powder []","light_gray_concrete_powder []","cyan_concrete_powder []","purple_concrete_powder []","blue_concrete_powder []","brown_concrete_powder []","green_concrete_powder []","red_concrete_powder []","black_concrete_powder []"]],
	["coral", ["tube_coral []","brain_coral []","bubble_coral []","fire_coral []","horn_coral []",null,null,null,"dead_tube_coral []","dead_brain_coral []","dead_bubble_coral []","dead_fire_coral []","dead_horn_coral []"]],
	["coral_block", ["tube_coral_block []","brain_coral_block []","bubble_coral_block []","fire_coral_block []","horn_coral_block []",null,null,null,"dead_tube_coral_block []","dead_brain_coral_block []","dead_bubble_coral_block []","dead_fire_coral_block []","dead_horn_coral_block []"]],
	["coral_fan", ["tube_coral_fan []","brain_coral_fan []","bubble_coral_fan []","fire_coral_fan []","horn_coral_fan []",null,null,null,"tube_coral_fan [\"coral_fan_direction\"=1]","brain_coral_fan [\"coral_fan_direction\"=1]","bubble_coral_fan [\"coral_fan_direction\"=1]","fire_coral_fan [\"coral_fan_direction\"=1]","horn_coral_fan [\"coral_fan_direction\"=1]"]],
	["coral_fan_dead", ["dead_tube_coral_fan []","dead_brain_coral_fan []","dead_bubble_coral_fan []","dead_fire_coral_fan []","dead_horn_coral_fan []",null,null,null,"dead_tube_coral_fan [\"coral_fan_direction\"=1]","dead_brain_coral_fan [\"coral_fan_direction\"=1]","dead_bubble_coral_fan [\"coral_fan_direction\"=1]","dead_fire_coral_fan [\"coral_fan_direction\"=1]","dead_horn_coral_fan [\"coral_fan_direction\"=1]"]],
	["coral_fan_hang", ["tube_coral_wall_fan []","brain_coral_wall_fan []","dead_tube_coral_wall_fan []","dead_brain_coral_wall_fan []","tube_coral_wall_fan [\"coral_direction\"=1]","brain_coral_wall_fan [\"coral_direction\"=1]","dead_tube_coral_wall_fan [\"coral_direction\"=1]","dead_brain_coral_wall_fan [\"coral_direction\"=1]","tube_coral_wall_fan [\"coral_direction\"=2]","brain_coral_wall_fan [\"coral_direction\"=2]","dead_tube_coral_wall_fan [\"coral_direction\"=2]","dead_brain_coral_wall_fan [\"coral_direction\"=2]","tube_coral_wall_fan [\"coral_direction\"=3]","brain_coral_wall_fan [\"coral_direction\"=3]","dead_tube_coral_wall_fan [\"coral_direction\"=3]","dead_brain_coral_wall_fan [\"coral_direction\"=3]"]],
	["coral_fan_hang2", ["bubble_coral_wall_fan []","fire_coral_wall_fan []","dead_bubble_coral_wall_fan []","dead_fire_coral_wall_fan []","bubble_coral_wall_fan [\"coral_direction\"=1]","fire_coral_wall_fan [\"coral_direction\"=1]","dead_bubble_coral_wall_fan [\"coral_direction\"=1]","dead_fire_coral_wall_fan [\"coral_direction\"=1]","bubble_coral_wall_fan [\"coral_direction\"=2]","fire_coral_wall_fan [\"coral_direction\"=2]","dead_bubble_coral_wall_fan [\"coral_direction\"=2]","dead_fire_coral_wall_fan [\"coral_direction\"=2]","bubble_coral_wall_fan [\"coral_direction\"=3]","fire_coral_wall_fan [\"coral_direction\"=3]","dead_bubble_coral_wall_fan [\"coral_direction\"=3]","dead_fire_coral_wall_fan [\"coral_direction\"=3]"]],
	["coral_fan_hang3", ["horn_coral_wall_fan []","horn_coral_wall_fan []","dead_horn_coral_wall_fan []","dead_horn_coral_wall_fan []","horn_coral_wall_fan [\"coral_direction\"=1]","horn_coral_wall_fan [\"coral_direction\"=1]","dead_horn_coral_wall_fan [\"coral_direction\"=1]","dead_horn_coral_wall_fan [\"coral_direction\"=1]","horn_coral_wall_fan [\"coral_direction\"=2]","horn_coral_wall_fan [\"coral_direction\"=2]","dead_horn_coral_wall_fan [\"coral_direction\"=2]","dead_horn_coral_wall_fan [\"coral_direction\"=2]","horn_coral_wall_fan [\"coral_direction\"=3]","horn_coral_wall_fan [\"coral_direction\"=3]","dead_horn_coral_wall_fan [\"coral_direction\"=3]","dead_horn_coral_wall_fan [\"coral_direction\"=3]"]],
	["dirt", ["[]","coarse_dirt []"]],
	["dispenser dropper", ["[]","[\"facing_direction\"=1]","[\"facing_direction\"=2]","[\"facing_direction\"=3]","[\"facing_direction\"=4]","[\"facing_direction\"=5]",null,null,"[\"triggered_bit\"=true]","[\"facing_direction\"=1,\"triggered_bit\"=true]","[\"facing_direction\"=2,\"triggered_bit\"=true]","[\"facing_direction\"=3,\"triggered_bit\"=true]","[\"facing_direction\"=4,\"triggered_bit\"=true]","[\"facing_direction\"=5,\"triggered_bit\"=true]"]],
	["double_plant", ["sunflower []","lilac []","tall_grass []","large_fern []","rose_bush []","peony []",null,null,"sunflower [\"upper_block_bit\"=true]","lilac [\"upper_block_bit\"=true]","tall_grass [\"upper_block_bit\"=true]","large_fern [\"upper_block_bit\"=true]","rose_bush [\"upper_block_bit\"=true]","peony [\"upper_block_bit\"=true]"]],
	["double_stone_block_slab", ["smooth_stone_double_slab []","sandstone_double_slab []","petrified_oak_double_slab []","cobblestone_double_slab []","brick_double_slab []","stone_brick_double_slab []","quartz_double_slab []","nether_brick_double_slab []","smooth_stone_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","sandstone_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","petrified_oak_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","cobblestone_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","brick_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","stone_brick_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","quartz_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","nether_brick_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]"]],
	["double_stone_block_slab2", ["red_sandstone_double_slab []","purpur_double_slab []","prismarine_double_slab []","dark_prismarine_double_slab []","prismarine_brick_double_slab []","mossy_cobblestone_double_slab []","smooth_sandstone_double_slab []","red_nether_brick_double_slab []","red_sandstone_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","purpur_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","prismarine_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","dark_prismarine_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","prismarine_brick_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","mossy_cobblestone_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","smooth_sandstone_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","red_nether_brick_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]"]],
	["double_stone_block_slab3", ["end_stone_brick_double_slab []","smooth_red_sandstone_double_slab []","polished_andesite_double_slab []","andesite_double_slab []","diorite_double_slab []","polished_diorite_double_slab []","granite_double_slab []","polished_granite_double_slab []","end_stone_brick_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","smooth_red_sandstone_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","polished_andesite_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","andesite_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","diorite_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","polished_diorite_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","granite_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","polished_granite_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]"]],
	["double_stone_block_slab4", ["mossy_stone_brick_double_slab []","smooth_quartz_double_slab []","normal_stone_double_slab []","cut_sandstone_double_slab []","cut_red_sandstone_double_slab []",null,null,null,"mossy_stone_brick_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","smooth_quartz_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","normal_stone_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","cut_sandstone_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","cut_red_sandstone_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]"]],
	["double_wooden_slab", ["oak_double_slab []","spruce_double_slab []","birch_double_slab []","jungle_double_slab []","acacia_double_slab []","dark_oak_double_slab []",null,null,"oak_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","spruce_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","birch_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","jungle_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","acacia_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","dark_oak_double_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]"]],
	["end_portal_frame", ["[]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\"]","[\"end_portal_eye_bit\"=true]","[\"direction\"=1,\"end_portal_eye_bit\"=true,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"end_portal_eye_bit\"=true,\"minecraft:cardinal_direction\"=\"north\"]","[\"direction\"=3,\"end_portal_eye_bit\"=true,\"minecraft:cardinal_direction\"=\"east\"]"]],
	["farmland", ["[]","[\"moisturized_amount\"=1]","[\"moisturized_amount\"=2]","[\"moisturized_amount\"=3]","[\"moisturized_amount\"=4]","[\"moisturized_amount\"=5]","[\"moisturized_amount\"=6]","[\"moisturized_amount\"=7]"]],
	["fence", ["oak_fence []","spruce_fence []","birch_fence []","jungle_fence []","acacia_fence []","dark_oak_fence []"]],
	["flower_pot", ["[]","[\"update_bit\"=true]"]],
	["flowing_lava flowing_water lava water", ["[]","[\"liquid_depth\"=1]","[\"liquid_depth\"=2]","[\"liquid_depth\"=3]","[\"liquid_depth\"=4]","[\"liquid_depth\"=5]","[\"liquid_depth\"=6]","[\"liquid_depth\"=7]","[\"liquid_depth\"=8]","[\"liquid_depth\"=9]","[\"liquid_depth\"=10]","[\"liquid_depth\"=11]","[\"liquid_depth\"=12]","[\"liquid_depth\"=13]","[\"liquid_depth\"=14]","[\"liquid_depth\"=15]"]],
	["frame glow_frame", ["[]","[\"facing_direction\"=1]","[\"facing_direction\"=2]","[\"facing_direction\"=3]","[\"facing_direction\"=4]","[\"facing_direction\"=5]",null,null,"[\"item_frame_map_bit\"=true]","[\"facing_direction\"=1,\"item_frame_map_bit\"=true]","[\"facing_direction\"=2,\"item_frame_map_bit\"=true]","[\"facing_direction\"=3,\"item_frame_map_bit\"=true]","[\"facing_direction\"=4,\"item_frame_map_bit\"=true]","[\"facing_direction\"=5,\"item_frame_map_bit\"=true]"]],
	["frosted_ice nether_wart", ["[]","[\"age\"=1]","[\"age\"=2]","[\"age\"=3]"]],
	["glow_lichen", ["[\"multi_face_direction_bits\"=0]","[\"multi_face_direction_bits\"=1]","[\"multi_face_direction_bits\"=2]","[\"multi_face_direction_bits\"=3]","[\"multi_face_direction_bits\"=4]","[\"multi_face_direction_bits\"=5]","[\"multi_face_direction_bits\"=6]","[\"multi_face_direction_bits\"=7]","[\"multi_face_direction_bits\"=8]","[\"multi_face_direction_bits\"=9]","[\"multi_face_direction_bits\"=10]","[\"multi_face_direction_bits\"=11]","[\"multi_face_direction_bits\"=12]","[\"multi_face_direction_bits\"=13]","[\"multi_face_direction_bits\"=14]","[\"multi_face_direction_bits\"=15]"]],
	["grass", ["grass_block []"]],
	["hard_stained_glass", ["hard_white_stained_glass []","hard_orange_stained_glass []","hard_magenta_stained_glass []","hard_light_blue_stained_glass []","hard_yellow_stained_glass []","hard_lime_stained_glass []","hard_pink_stained_glass []","hard_gray_stained_glass []","hard_light_gray_stained_glass []","hard_cyan_stained_glass []","hard_purple_stained_glass []","hard_blue_stained_glass []","hard_brown_stained_glass []","hard_green_stained_glass []","hard_red_stained_glass []","hard_black_stained_glass []"]],
	["hard_stained_glass_pane", ["hard_white_stained_glass_pane []","hard_orange_stained_glass_pane []","hard_magenta_stained_glass_pane []","hard_light_blue_stained_glass_pane []","hard_yellow_stained_glass_pane []","hard_lime_stained_glass_pane []","hard_pink_stained_glass_pane []","hard_gray_stained_glass_pane []","hard_light_gray_stained_glass_pane []","hard_cyan_stained_glass_pane []","hard_purple_stained_glass_pane []","hard_blue_stained_glass_pane []","hard_brown_stained_glass_pane []","hard_green_stained_glass_pane []","hard_red_stained_glass_pane []","hard_black_stained_glass_pane []"]],
	["hopper", ["[]","[\"facing_direction\"=1]","[\"facing_direction\"=2]","[\"facing_direction\"=3]","[\"facing_direction\"=4]","[\"facing_direction\"=5]",null,null,"[\"toggle_bit\"=true]","[\"facing_direction\"=1,\"toggle_bit\"=true]","[\"facing_direction\"=2,\"toggle_bit\"=true]","[\"facing_direction\"=3,\"toggle_bit\"=true]","[\"facing_direction\"=4,\"toggle_bit\"=true]","[\"facing_direction\"=5,\"toggle_bit\"=true]"]],
	["jigsaw", ["[]","[\"facing_direction\"=1]","[\"facing_direction\"=2]","[\"facing_direction\"=3]","[\"facing_direction\"=4]","[\"facing_direction\"=5]",null,null,"[\"rotation\"=1]","[\"facing_direction\"=1,\"rotation\"=1]","[\"facing_direction\"=2,\"rotation\"=1]","[\"facing_direction\"=3,\"rotation\"=1]","[\"facing_direction\"=4,\"rotation\"=1]","[\"facing_direction\"=5,\"rotation\"=1]"]],
	["kelp", ["[]","[\"kelp_age\"=1]","[\"kelp_age\"=2]","[\"kelp_age\"=3]","[\"kelp_age\"=4]","[\"kelp_age\"=5]","[\"kelp_age\"=6]","[\"kelp_age\"=7]","[\"kelp_age\"=8]","[\"kelp_age\"=9]","[\"kelp_age\"=10]","[\"kelp_age\"=11]","[\"kelp_age\"=12]","[\"kelp_age\"=13]","[\"kelp_age\"=14]","[\"kelp_age\"=15]"]],
	["lantern soul_lantern", ["[]","[\"hanging\"=true]"]],
	["lava_cauldron", ["cauldron []","cauldron [\"fill_level\"=1]","cauldron [\"fill_level\"=2]","cauldron [\"fill_level\"=3]","cauldron [\"fill_level\"=4]","cauldron [\"fill_level\"=5]","cauldron [\"fill_level\"=6]",null,"cauldron [\"cauldron_liquid\"=\"lava\"]","cauldron [\"cauldron_liquid\"=\"lava\",\"fill_level\"=1]","cauldron [\"cauldron_liquid\"=\"lava\",\"fill_level\"=2]","cauldron [\"cauldron_liquid\"=\"lava\",\"fill_level\"=3]","cauldron [\"cauldron_liquid\"=\"lava\",\"fill_level\"=4]","cauldron [\"cauldron_liquid\"=\"lava\",\"fill_level\"=5]","cauldron [\"cauldron_liquid\"=\"lava\",\"fill_level\"=6]"]],
	["leaves", ["oak_leaves []","spruce_leaves []","birch_leaves []","jungle_leaves []","oak_leaves [\"update_bit\"=true]","spruce_leaves [\"update_bit\"=true]","birch_leaves [\"update_bit\"=true]","jungle_leaves [\"update_bit\"=true]","oak_leaves [\"persistent_bit\"=true]","spruce_leaves [\"persistent_bit\"=true]","birch_leaves [\"persistent_bit\"=true]","jungle_leaves [\"persistent_bit\"=true]","oak_leaves [\"persistent_bit\"=true,\"update_bit\"=true]","spruce_leaves [\"persistent_bit\"=true,\"update_bit\"=true]","birch_leaves [\"persistent_bit\"=true,\"update_bit\"=true]","jungle_leaves [\"persistent_bit\"=true,\"update_bit\"=true]"]],
	["leaves2", ["acacia_leaves []","dark_oak_leaves []","acacia_leaves [\"update_bit\"=true]","dark_oak_leaves [\"update_bit\"=true]","acacia_leaves [\"persistent_bit\"=true]","dark_oak_leaves [\"persistent_bit\"=true]","acacia_leaves [\"persistent_bit\"=true,\"update_bit\"=true]","dark_oak_leaves [\"persistent_bit\"=true,\"update_bit\"=true]"]],
	["lectern", ["[]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\"]","[\"powered_bit\"=true]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\",\"powered_bit\"=true]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\",\"powered_bit\"=true]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\",\"powered_bit\"=true]"]],
	["lever", ["[]","[\"lever_direction\"=\"east\"]","[\"lever_direction\"=\"west\"]","[\"lever_direction\"=\"south\"]","[\"lever_direction\"=\"north\"]","[\"lever_direction\"=\"up_north_south\"]","[\"lever_direction\"=\"up_east_west\"]","[\"lever_direction\"=\"down_north_south\"]","[\"open_bit\"=true]","[\"lever_direction\"=\"east\",\"open_bit\"=true]","[\"lever_direction\"=\"west\",\"open_bit\"=true]","[\"lever_direction\"=\"south\",\"open_bit\"=true]","[\"lever_direction\"=\"north\",\"open_bit\"=true]","[\"lever_direction\"=\"up_north_south\",\"open_bit\"=true]","[\"lever_direction\"=\"up_east_west\",\"open_bit\"=true]","[\"lever_direction\"=\"down_north_south\",\"open_bit\"=true]"]],
	["light_block", ["light_block_0 []","light_block_1 []","light_block_2 []","light_block_3 []","light_block_4 []","light_block_5 []","light_block_6 []","light_block_7 []","light_block_8 []","light_block_9 []","light_block_10 []","light_block_11 []","light_block_12 []","light_block_13 []","light_block_14 []","light_block_15 []"]],
	["log", ["oak_log []","spruce_log []","birch_log []","jungle_log []","oak_log [\"pillar_axis\"=\"x\"]","spruce_log [\"pillar_axis\"=\"x\"]","birch_log [\"pillar_axis\"=\"x\"]","jungle_log [\"pillar_axis\"=\"x\"]","oak_log [\"pillar_axis\"=\"z\"]","spruce_log [\"pillar_axis\"=\"z\"]","birch_log [\"pillar_axis\"=\"z\"]","jungle_log [\"pillar_axis\"=\"z\"]"]],
	["log2", ["acacia_log []","dark_oak_log []","acacia_log [\"pillar_axis\"=\"x\"]","dark_oak_log [\"pillar_axis\"=\"x\"]","acacia_log [\"pillar_axis\"=\"z\"]","dark_oak_log [\"pillar_axis\"=\"z\"]"]],
	["loom", ["[]","[\"direction\"=1]","[\"direction\"=2]","[\"direction\"=3]"]],
	["mangrove_propagule", ["[]","[\"propagule_stage\"=1]","[\"propagule_stage\"=2]","[\"propagule_stage\"=3]","[\"propagule_stage\"=4]",null,null,null,"[\"hanging\"=true]","[\"hanging\"=true,\"propagule_stage\"=1]","[\"hanging\"=true,\"propagule_stage\"=2]","[\"hanging\"=true,\"propagule_stage\"=3]","[\"hanging\"=true,\"propagule_stage\"=4]"]],
	["mangrove_wood", ["[]","[]","[\"pillar_axis\"=\"x\"]","[\"pillar_axis\"=\"x\"]","[\"pillar_axis\"=\"z\"]","[\"pillar_axis\"=\"z\"]"]],
	["melon_stem pumpkin_stem", ["[]","[\"growth\"=1]","[\"growth\"=2]","[\"growth\"=3]","[\"growth\"=4]","[\"growth\"=5]","[\"growth\"=6]","[\"growth\"=7]","[\"facing_direction\"=1]","[\"facing_direction\"=1,\"growth\"=1]","[\"facing_direction\"=1,\"growth\"=2]","[\"facing_direction\"=1,\"growth\"=3]","[\"facing_direction\"=1,\"growth\"=4]","[\"facing_direction\"=1,\"growth\"=5]","[\"facing_direction\"=1,\"growth\"=6]","[\"facing_direction\"=1,\"growth\"=7]"]],
	["monster_egg", ["infested_stone []","infested_cobblestone []","infested_stone_bricks []","infested_mossy_stone_bricks []","infested_cracked_stone_bricks []","infested_chiseled_stone_bricks []"]],
	["observer", ["[]","[\"facing_direction\"=1,\"minecraft:facing_direction\"=\"up\"]","[\"facing_direction\"=2,\"minecraft:facing_direction\"=\"north\"]","[\"facing_direction\"=3,\"minecraft:facing_direction\"=\"south\"]","[\"facing_direction\"=4,\"minecraft:facing_direction\"=\"west\"]","[\"facing_direction\"=5,\"minecraft:facing_direction\"=\"east\"]",null,null,"[\"powered_bit\"=true]","[\"facing_direction\"=1,\"minecraft:facing_direction\"=\"up\",\"powered_bit\"=true]","[\"facing_direction\"=2,\"minecraft:facing_direction\"=\"north\",\"powered_bit\"=true]","[\"facing_direction\"=3,\"minecraft:facing_direction\"=\"south\",\"powered_bit\"=true]","[\"facing_direction\"=4,\"minecraft:facing_direction\"=\"west\",\"powered_bit\"=true]","[\"facing_direction\"=5,\"minecraft:facing_direction\"=\"east\",\"powered_bit\"=true]"]],
	["planks", ["oak_planks []","spruce_planks []","birch_planks []","jungle_planks []","acacia_planks []","dark_oak_planks []"]],
	["pointed_dripstone", ["[\"hanging\"=false]","[\"dripstone_thickness\"=\"frustum\",\"hanging\"=false]","[\"dripstone_thickness\"=\"middle\",\"hanging\"=false]","[\"dripstone_thickness\"=\"base\",\"hanging\"=false]","[\"dripstone_thickness\"=\"merge\",\"hanging\"=false]",null,null,null,"[]","[\"dripstone_thickness\"=\"frustum\"]","[\"dripstone_thickness\"=\"middle\"]","[\"dripstone_thickness\"=\"base\"]","[\"dripstone_thickness\"=\"merge\"]"]],
	["portal", ["[]","[\"portal_axis\"=\"x\"]","[\"portal_axis\"=\"z\"]"]],
	["powered_comparator unpowered_comparator", ["[]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\"]","[\"output_subtract_bit\"=true]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\",\"output_subtract_bit\"=true]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\",\"output_subtract_bit\"=true]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\",\"output_subtract_bit\"=true]","[\"output_lit_bit\"=true]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\",\"output_lit_bit\"=true]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\",\"output_lit_bit\"=true]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\",\"output_lit_bit\"=true]","[\"output_lit_bit\"=true,\"output_subtract_bit\"=true]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\",\"output_lit_bit\"=true,\"output_subtract_bit\"=true]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\",\"output_lit_bit\"=true,\"output_subtract_bit\"=true]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\",\"output_lit_bit\"=true,\"output_subtract_bit\"=true]"]],
	["powered_repeater unpowered_repeater", ["[]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\"]","[\"repeater_delay\"=1]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\",\"repeater_delay\"=1]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\",\"repeater_delay\"=1]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\",\"repeater_delay\"=1]","[\"repeater_delay\"=2]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\",\"repeater_delay\"=2]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\",\"repeater_delay\"=2]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\",\"repeater_delay\"=2]","[\"repeater_delay\"=3]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\",\"repeater_delay\"=3]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\",\"repeater_delay\"=3]","[\"direction\"=3,\"minecraft:cardinal_direction\"=\"east\",\"repeater_delay\"=3]"]],
	["prismarine", ["[]","dark_prismarine []","prismarine_bricks []"]],
	["purpur_block", ["[]","deprecated_purpur_block_1 []","purpur_pillar []","deprecated_purpur_block_2 []","[\"pillar_axis\"=\"x\"]","deprecated_purpur_block_1 [\"pillar_axis\"=\"x\"]","purpur_pillar [\"pillar_axis\"=\"x\"]","deprecated_purpur_block_2 [\"pillar_axis\"=\"x\"]","[\"pillar_axis\"=\"z\"]","deprecated_purpur_block_1 [\"pillar_axis\"=\"z\"]","purpur_pillar [\"pillar_axis\"=\"z\"]","deprecated_purpur_block_2 [\"pillar_axis\"=\"z\"]"]],
	["quartz_block", ["[]","chiseled_quartz_block []","quartz_pillar []","smooth_quartz []","[\"pillar_axis\"=\"x\"]","chiseled_quartz_block [\"pillar_axis\"=\"x\"]","quartz_pillar [\"pillar_axis\"=\"x\"]","smooth_quartz [\"pillar_axis\"=\"x\"]","[\"pillar_axis\"=\"z\"]","chiseled_quartz_block [\"pillar_axis\"=\"z\"]","quartz_pillar [\"pillar_axis\"=\"z\"]","smooth_quartz [\"pillar_axis\"=\"z\"]"]],
	["rail", ["[]","[\"rail_direction\"=1]","[\"rail_direction\"=2]","[\"rail_direction\"=3]","[\"rail_direction\"=4]","[\"rail_direction\"=5]","[\"rail_direction\"=6]","[\"rail_direction\"=7]","[\"rail_direction\"=8]","[\"rail_direction\"=9]"]],
	["red_flower", ["poppy []","blue_orchid []","allium []","azure_bluet []","red_tulip []","orange_tulip []","white_tulip []","pink_tulip []","oxeye_daisy []","cornflower []","lily_of_the_valley []"]],
	["red_sandstone", ["[]","chiseled_red_sandstone []","cut_red_sandstone []","smooth_red_sandstone []"]],
	["redstone_torch soul_torch torch underwater_torch unlit_redstone_torch", ["[]","[\"torch_facing_direction\"=\"west\"]","[\"torch_facing_direction\"=\"east\"]","[\"torch_facing_direction\"=\"north\"]","[\"torch_facing_direction\"=\"south\"]","[\"torch_facing_direction\"=\"top\"]"]],
	["respawn_anchor", ["[]","[\"respawn_anchor_charge\"=1]","[\"respawn_anchor_charge\"=2]","[\"respawn_anchor_charge\"=3]","[\"respawn_anchor_charge\"=4]"]],
	["sand", ["[]","red_sand []"]],
	["sandstone", ["[]","chiseled_sandstone []","cut_sandstone []","smooth_sandstone []"]],
	["sapling", ["oak_sapling []","spruce_sapling []","birch_sapling []","jungle_sapling []","acacia_sapling []","dark_oak_sapling []",null,null,"oak_sapling [\"age_bit\"=true]","spruce_sapling [\"age_bit\"=true]","birch_sapling [\"age_bit\"=true]","jungle_sapling [\"age_bit\"=true]","acacia_sapling [\"age_bit\"=true]","dark_oak_sapling [\"age_bit\"=true]"]],
	["scaffolding", ["[]","[\"stability\"=1]","[\"stability\"=2]","[\"stability\"=3]","[\"stability\"=4]","[\"stability\"=5]","[\"stability\"=6]","[\"stability\"=7]","[\"stability_check\"=true]","[\"stability\"=1,\"stability_check\"=true]","[\"stability\"=2,\"stability_check\"=true]","[\"stability\"=3,\"stability_check\"=true]","[\"stability\"=4,\"stability_check\"=true]","[\"stability\"=5,\"stability_check\"=true]","[\"stability\"=6,\"stability_check\"=true]","[\"stability\"=7,\"stability_check\"=true]"]],
	["sculk_catalyst", ["[]","[\"bloom\"=true]"]],
	["sculk_sensor", ["[]","[\"powered_bit\"=true,\"sculk_sensor_phase\"=1]"]],
	["sculk_shrieker", ["[]","[\"active\"=true]","[\"can_summon\"=true]","[\"active\"=true,\"can_summon\"=true]"]],
	["sculk_vein", ["[]","[\"multi_face_direction_bits\"=1]","[\"multi_face_direction_bits\"=2]","[\"multi_face_direction_bits\"=3]","[\"multi_face_direction_bits\"=4]","[\"multi_face_direction_bits\"=5]","[\"multi_face_direction_bits\"=6]","[\"multi_face_direction_bits\"=7]","[\"multi_face_direction_bits\"=8]","[\"multi_face_direction_bits\"=9]","[\"multi_face_direction_bits\"=10]","[\"multi_face_direction_bits\"=11]","[\"multi_face_direction_bits\"=12]","[\"multi_face_direction_bits\"=13]","[\"multi_face_direction_bits\"=14]","[\"multi_face_direction_bits\"=15]"]],
	["sea_pickle", ["[]","[\"cluster_count\"=1]","[\"cluster_count\"=2]","[\"cluster_count\"=3]","[\"dead_bit\"=true]","[\"cluster_count\"=1,\"dead_bit\"=true]","[\"cluster_count\"=2,\"dead_bit\"=true]","[\"cluster_count\"=3,\"dead_bit\"=true]"]],
	["seagrass", ["[]","[\"sea_grass_type\"=\"double_top\"]","[\"sea_grass_type\"=\"double_bot\"]"]],
	["shulker_box", ["white_shulker_box []","orange_shulker_box []","magenta_shulker_box []","light_blue_shulker_box []","yellow_shulker_box []","lime_shulker_box []","pink_shulker_box []","gray_shulker_box []","light_gray_shulker_box []","cyan_shulker_box []","purple_shulker_box []","blue_shulker_box []","brown_shulker_box []","green_shulker_box []","red_shulker_box []","black_shulker_box []"]],
	["skull", ["skeleton_skull []","skeleton_skull [\"facing_direction\"=1]","skeleton_skull [\"facing_direction\"=2]","skeleton_skull [\"facing_direction\"=3]","skeleton_skull [\"facing_direction\"=4]","skeleton_skull [\"facing_direction\"=5]"]],
	["small_dripleaf_block", ["[\"direction\"=0,\"minecraft:cardinal_direction\"=\"south\",\"upper_block_bit\"=false]","[\"direction\"=0,\"minecraft:cardinal_direction\"=\"south\"]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\",\"upper_block_bit\"=false]","[\"direction\"=1,\"minecraft:cardinal_direction\"=\"west\"]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\",\"upper_block_bit\"=false]","[\"direction\"=2,\"minecraft:cardinal_direction\"=\"north\"]","[\"upper_block_bit\"=false]","[]"]],
	["snow_layer", ["[]","[\"height\"=1]","[\"height\"=2]","[\"height\"=3]","[\"height\"=4]","[\"height\"=5]","[\"height\"=6]","[\"height\"=7]","[\"covered_bit\"=true]","[\"covered_bit\"=true,\"height\"=1]","[\"covered_bit\"=true,\"height\"=2]","[\"covered_bit\"=true,\"height\"=3]","[\"covered_bit\"=true,\"height\"=4]","[\"covered_bit\"=true,\"height\"=5]","[\"covered_bit\"=true,\"height\"=6]","[\"covered_bit\"=true,\"height\"=7]"]],
	["sponge", ["[]","wet_sponge []"]],
	["stained_glass", ["white_stained_glass []","orange_stained_glass []","magenta_stained_glass []","light_blue_stained_glass []","yellow_stained_glass []","lime_stained_glass []","pink_stained_glass []","gray_stained_glass []","light_gray_stained_glass []","cyan_stained_glass []","purple_stained_glass []","blue_stained_glass []","brown_stained_glass []","green_stained_glass []","red_stained_glass []","black_stained_glass []"]],
	["stained_glass_pane", ["white_stained_glass_pane []","orange_stained_glass_pane []","magenta_stained_glass_pane []","light_blue_stained_glass_pane []","yellow_stained_glass_pane []","lime_stained_glass_pane []","pink_stained_glass_pane []","gray_stained_glass_pane []","light_gray_stained_glass_pane []","cyan_stained_glass_pane []","purple_stained_glass_pane []","blue_stained_glass_pane []","brown_stained_glass_pane []","green_stained_glass_pane []","red_stained_glass_pane []","black_stained_glass_pane []"]],
	["stained_hardened_clay", ["white_terracotta []","orange_terracotta []","magenta_terracotta []","light_blue_terracotta []","yellow_terracotta []","lime_terracotta []","pink_terracotta []","gray_terracotta []","light_gray_terracotta []","cyan_terracotta []","purple_terracotta []","blue_terracotta []","brown_terracotta []","green_terracotta []","red_terracotta []","black_terracotta []"]],
	["stone", ["[]","granite []","polished_granite []","diorite []","polished_diorite []","andesite []","polished_andesite []"]],
	["stone_block_slab", ["smooth_stone_slab []","sandstone_slab []","petrified_oak_slab []","cobblestone_slab []","brick_slab []","stone_brick_slab []","quartz_slab []","nether_brick_slab []","smooth_stone_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","sandstone_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","petrified_oak_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","cobblestone_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","brick_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","stone_brick_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","quartz_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","nether_brick_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]"]],
	["stone_block_slab2", ["red_sandstone_slab []","purpur_slab []","prismarine_slab []","dark_prismarine_slab []","prismarine_brick_slab []","mossy_cobblestone_slab []","smooth_sandstone_slab []","red_nether_brick_slab []","red_sandstone_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","purpur_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","prismarine_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","dark_prismarine_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","prismarine_brick_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","mossy_cobblestone_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","smooth_sandstone_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","red_nether_brick_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]"]],
	["stone_block_slab3", ["end_stone_brick_slab []","smooth_red_sandstone_slab []","polished_andesite_slab []","andesite_slab []","diorite_slab []","polished_diorite_slab []","granite_slab []","polished_granite_slab []","end_stone_brick_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","smooth_red_sandstone_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","polished_andesite_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","andesite_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","diorite_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","polished_diorite_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","granite_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","polished_granite_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]"]],
	["stone_block_slab4", ["mossy_stone_brick_slab []","smooth_quartz_slab []","normal_stone_slab []","cut_sandstone_slab []","cut_red_sandstone_slab []",null,null,null,"mossy_stone_brick_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","smooth_quartz_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","normal_stone_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","cut_sandstone_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","cut_red_sandstone_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]"]],
	["stonebrick", ["stone_bricks []","mossy_stone_bricks []","cracked_stone_bricks []","chiseled_stone_bricks []","stone_bricks []"]],
	["structure_block", ["[]","[\"structure_block_type\"=\"save\"]","[\"structure_block_type\"=\"load\"]","[\"structure_block_type\"=\"corner\"]","[\"structure_block_type\"=\"invalid\"]","[\"structure_block_type\"=\"export\"]"]],
	["structure_void", ["[]","[]"]],
	["tallgrass", ["short_grass []","short_grass []","fern []","fern []"]],
	["tnt", ["[]","[\"explode_bit\"=true]","underwater_tnt []","underwater_tnt [\"explode_bit\"=true]"]],
	["trip_wire", ["[]","[\"powered_bit\"=true]","[\"suspended_bit\"=true]","[\"powered_bit\"=true,\"suspended_bit\"=true]","[\"attached_bit\"=true]","[\"attached_bit\"=true,\"powered_bit\"=true]","[\"attached_bit\"=true,\"suspended_bit\"=true]","[\"attached_bit\"=true,\"powered_bit\"=true,\"suspended_bit\"=true]","[\"disarmed_bit\"=true]","[\"disarmed_bit\"=true,\"powered_bit\"=true]","[\"disarmed_bit\"=true,\"suspended_bit\"=true]","[\"disarmed_bit\"=true,\"powered_bit\"=true,\"suspended_bit\"=true]","[\"attached_bit\"=true,\"disarmed_bit\"=true]","[\"attached_bit\"=true,\"disarmed_bit\"=true,\"powered_bit\"=true]","[\"attached_bit\"=true,\"disarmed_bit\"=true,\"suspended_bit\"=true]","[\"attached_bit\"=true,\"disarmed_bit\"=true,\"powered_bit\"=true,\"suspended_bit\"=true]"]],
	["tripwire_hook", ["[]","[\"direction\"=1]","[\"direction\"=2]","[\"direction\"=3]","[\"attached_bit\"=true]","[\"attached_bit\"=true,\"direction\"=1]","[\"attached_bit\"=true,\"direction\"=2]","[\"attached_bit\"=true,\"direction\"=3]","[\"powered_bit\"=true]","[\"direction\"=1,\"powered_bit\"=true]","[\"direction\"=2,\"powered_bit\"=true]","[\"direction\"=3,\"powered_bit\"=true]","[\"attached_bit\"=true,\"powered_bit\"=true]","[\"attached_bit\"=true,\"direction\"=1,\"powered_bit\"=true]","[\"attached_bit\"=true,\"direction\"=2,\"powered_bit\"=true]","[\"attached_bit\"=true,\"direction\"=3,\"powered_bit\"=true]"]],
	["turtle_egg", ["[]","[\"turtle_egg_count\"=\"two_egg\"]","[\"turtle_egg_count\"=\"three_egg\"]","[\"turtle_egg_count\"=\"four_egg\"]","[\"cracked_state\"=\"cracked\"]","[\"cracked_state\"=\"cracked\",\"turtle_egg_count\"=\"two_egg\"]","[\"cracked_state\"=\"cracked\",\"turtle_egg_count\"=\"three_egg\"]","[\"cracked_state\"=\"cracked\",\"turtle_egg_count\"=\"four_egg\"]","[\"cracked_state\"=\"max_cracked\"]","[\"cracked_state\"=\"max_cracked\",\"turtle_egg_count\"=\"two_egg\"]","[\"cracked_state\"=\"max_cracked\",\"turtle_egg_count\"=\"three_egg\"]","[\"cracked_state\"=\"max_cracked\",\"turtle_egg_count\"=\"four_egg\"]"]],
	["twisting_vines", ["[]","[\"twisting_vines_age\"=1]","[\"twisting_vines_age\"=2]","[\"twisting_vines_age\"=3]","[\"twisting_vines_age\"=4]","[\"twisting_vines_age\"=5]","[\"twisting_vines_age\"=6]","[\"twisting_vines_age\"=7]","[\"twisting_vines_age\"=8]","[\"twisting_vines_age\"=9]","[\"twisting_vines_age\"=10]","[\"twisting_vines_age\"=11]","[\"twisting_vines_age\"=12]","[\"twisting_vines_age\"=13]","[\"twisting_vines_age\"=14]","[\"twisting_vines_age\"=15]"]],
	["vine", ["[]","[\"vine_direction_bits\"=1]","[\"vine_direction_bits\"=2]","[\"vine_direction_bits\"=3]","[\"vine_direction_bits\"=4]","[\"vine_direction_bits\"=5]","[\"vine_direction_bits\"=6]","[\"vine_direction_bits\"=7]","[\"vine_direction_bits\"=8]","[\"vine_direction_bits\"=9]","[\"vine_direction_bits\"=10]","[\"vine_direction_bits\"=11]","[\"vine_direction_bits\"=12]","[\"vine_direction_bits\"=13]","[\"vine_direction_bits\"=14]","[\"vine_direction_bits\"=15]"]],
	["weeping_vines", ["[]","[\"weeping_vines_age\"=1]","[\"weeping_vines_age\"=2]","[\"weeping_vines_age\"=3]","[\"weeping_vines_age\"=4]","[\"weeping_vines_age\"=5]","[\"weeping_vines_age\"=6]","[\"weeping_vines_age\"=7]","[\"weeping_vines_age\"=8]","[\"weeping_vines_age\"=9]","[\"weeping_vines_age\"=10]","[\"weeping_vines_age\"=11]","[\"weeping_vines_age\"=12]","[\"weeping_vines_age\"=13]","[\"weeping_vines_age\"=14]","[\"weeping_vines_age\"=15]"]],
	["wood", ["oak_wood []","spruce_wood []","birch_wood []","jungle_wood []","acacia_wood []","dark_oak_wood []",null,null,"stripped_oak_wood []","stripped_spruce_wood []","stripped_birch_wood []","stripped_jungle_wood []","stripped_acacia_wood []","stripped_dark_oak_wood []"]],
	["wooden_slab", ["oak_slab []","spruce_slab []","birch_slab []","jungle_slab []","acacia_slab []","dark_oak_slab []",null,null,"oak_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","spruce_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","birch_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","jungle_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","acacia_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]","dark_oak_slab [\"minecraft:vertical_half\"=\"top\",\"top_slot_bit\"=true]"]],
	["wool", ["white_wool []","orange_wool []","magenta_wool []","light_blue_wool []","yellow_wool []","lime_wool []","pink_wool []","gray_wool []","light_gray_wool []","cyan_wool []","purple_wool []","blue_wool []","brown_wool []","green_wool []","red_wool []","black_wool []"]],
	["yellow_flower", ["dandelion []"]],
]) {
	for (const name of names.split(' ')) LEGACY_BLOCK_DATA.set(name, variants);
}
