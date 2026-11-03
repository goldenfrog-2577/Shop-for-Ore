import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const file=new URL('../../behavior_packs/main-addon-shop_for_ore/scripts/system/spawnbot.js',import.meta.url);
const src=fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function fixture(){
	let registered,ready=false,mode='success',calls=0,players=[];const schedules=new Map(),commands=[],warnings=[];
	const dimension={id:'overworld',getBlock:()=>ready?{}:undefined};
	const bot={name:'Bot',tags:new Set(),hasTag:t=>bot.tags.has(t),addTag:t=>bot.tags.add(t),removeTag:t=>bot.tags.delete(t),kill:()=>{players=[];}};
	const test={spawnSimulatedPlayer(){if(mode==='throw')throw Error('engine spawn failure');players.push(bot);return bot;},removeSimulatedPlayer(){players=[];}};
	const context={console:{warn:s=>warnings.push(s)},world:{events:{worldInitialize:{subscribe(){}}},getDynamicProperty(){},getDimension:id=>{assert.equal(id,'overworld');return dimension;},getPlayers:()=>players.values()},
		system:{runSchedule:fn=>{schedules.set(++calls,fn);return calls;},clearRunSchedule:id=>schedules.delete(id)},BlockLocation:class{constructor(x,y,z){Object.assign(this,{x,y,z});}},DynamicPropertiesDefinition:class{},
		GT:{register(a,b,fn){registered=fn;return {maxTicks(){return this;},structureName(){return this;}};}},
		run:async(entity,cmd)=>{commands.push([entity,cmd]);if(cmd==='function system/spawnbot'){
			assert.equal(entity,dimension,'GameTest always in overworld');
			if(mode==='command-fail')return undefined;
			if(mode!=='timeout')registered(test);
		}return {};}};
	vm.runInNewContext(src+'\nglobalThis.api={spawnBot,getBot,removeBot,onBotSpawned};',context);
	return {api:context.api,commands,warnings,bot,summoner:{name:'Owner',dimension:{id:'nether'}},setReady:v=>ready=v,setMode:v=>mode=v,
		async tick(n=1){for(let i=0;i<n;i++){for(const fn of [...schedules.values()])fn();await flush();}},late:()=>registered(test)};
}
let f=fixture(),spawned=0;f.api.onBotSpawned(()=>spawned++);
const a=f.api.spawnBot(f.summoner),b=f.api.spawnBot(f.summoner);assert.equal(a,b,'deduplicated spawn request');
await f.tick(4);assert.equal(f.commands.filter(([,c])=>c==='function system/spawnbot').length,0,'waits for loaded area');
f.setReady(true);await f.tick();assert.equal(await a,f.bot);assert.equal(spawned,1);assert.ok(f.bot.hasTag('role:bot'));assert.ok(f.bot.hasTag('auth:done'));
assert.ok(f.commands.some(([p,c])=>p===f.summoner&&c==='tp "Bot" @s'),'teleports to summoner including dimension');
assert.equal(f.commands.filter(([,c])=>c==='function system/spawnbot').length,1);assert.equal(f.api.removeBot(),true);assert.ok(f.commands.some(([,c])=>c==='tickingarea remove shop_bot'));
for(const mode of ['command-fail','throw','timeout']){
	f=fixture();f.setMode(mode);f.setReady(true);let result=f.api.spawnBot(f.summoner);await f.tick(101);assert.equal(await result,undefined,mode);assert.equal(f.api.getBot(),undefined);assert.ok(f.warnings.length);assert.ok(f.commands.some(([,c])=>c==='tickingarea remove shop_bot'));f.late();assert.equal(f.api.getBot(),undefined,'late callback cannot create a ghost bot');
}
f=fixture();let waiting=f.api.spawnBot(f.summoner);f.api.removeBot();assert.equal(await waiting,undefined,'cancel pending spawn');
console.log('PASS: loaded overworld area, delayed readiness, single concurrent spawn, confirmed appearance/teleport, native failure, timeout, cleanup and cancellation.');
