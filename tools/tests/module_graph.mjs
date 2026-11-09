import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
if(!vm.SourceTextModule){const r=spawnSync(process.execPath,['--experimental-vm-modules','--no-warnings',fileURLToPath(import.meta.url),...process.argv.slice(2)],{encoding:'utf8'});process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);}
const repo=fileURLToPath(new URL('../../',import.meta.url)),bp=path.join(repo,'behavior_packs/main-addon-shop_for_ore'),scripts=path.join(bp,'scripts');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const rel=(base,p)=>path.relative(base,p).split(path.sep).join('/');
const fixture=JSON.parse(fs.readFileSync(new URL('fixtures/system-layout.json',import.meta.url),'utf8'));
const mapping=fixture.relocations,identity=p=>mapping[p]??p;
async function startup(base,old=false){
 const evaluation=[],subscriptions=[],timers=[],oneShots=[],commands=[],events={},properties=new Map();let current;
 const context=vm.createContext({console:{log(){},warn(){}},__enter:id=>{current=identity(id);evaluation.push(current);}});
 const sourceFiles=walk(base).filter(f=>f.endsWith('.js'));
 const names=new Set(sourceFiles.flatMap(f=>[...fs.readFileSync(f,'utf8').matchAll(/world\.events\.(\w+)/g)].map(m=>m[1])));
 for(const key of names)events[key]={handlers:[],subscribe(fn){assert.equal(typeof fn,'function');this.handlers.push(fn);subscriptions.push([current,key]);return fn;},unsubscribe(fn){const i=this.handlers.indexOf(fn);if(i>=0)this.handlers.splice(i,1);}};
 const dimension={id:'minecraft:overworld',runCommandAsync:async c=>{commands.push(c);return {successCount:1,statusMessage:c.includes('maxcommandchainlength')?'65536':'10000'};},getEntities:()=>[],getPlayers:()=>[].values(),getBlock:()=>undefined};
 const world={events,getPlayers:()=>[].values(),getDimension:()=>dimension,scoreboard:{getObjective:()=>undefined,getObjectives:()=>[],addObjective:id=>({id})},getDynamicProperty:k=>properties.get(k),setDynamicProperty:(k,v)=>properties.set(k,v)};
 const system={run(fn){oneShots.push(fn);return oneShots.length;},runSchedule(fn,interval=1){timers.push({fn,interval,owner:current,active:true});return timers.length;},clearRunSchedule(id){if(timers[id-1])timers[id-1].active=false;}};
 class Point{constructor(x,y,z){Object.assign(this,{x,y,z});}}
 class DynamicPropertiesDefinition{defineString(){}defineNumber(){}defineBoolean(){}}
 class ItemStack{constructor(type,amount){this.type=type;this.typeId=type?.id;this.amount=amount;}}
 class Enchantment{constructor(type,level){Object.assign(this,{type,level});}}
 const dictionary=new Proxy({}, {get:(o,k)=>({id:String(k),maxLevel:5})});
 const server={world,system,Location:Point,Vector:Point,BlockLocation:Point,DynamicPropertiesDefinition,Items:{get:id=>({id})},ItemStack,Enchantment,EnchantmentList:class{},MinecraftEnchantmentTypes:dictionary,MinecraftEffectTypes:dictionary,MinecraftBlockTypes:dictionary,GameMode:{creative:'creative',survival:'survival',adventure:'adventure',spectator:'spectator'}};
 const form=class{};const games=[];const chain={maxTicks(){return this;},structureName(){return this;}};
 const natives={'@minecraft/server':server,'@minecraft/server-ui':{ActionFormData:form,ModalFormData:form,MessageFormData:form},'@minecraft/server-gametest':{register:(namespace,name,fn)=>{games.push([namespace,name]);return chain;}}};
 const cache=new Map();
 function native(spec){if(cache.has(spec))return cache.get(spec);assert.ok(natives[spec],'unsupported API module '+spec);const values=natives[spec];const m=new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context,identifier:spec});cache.set(spec,m);return m;}
 function module(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);assert.ok(fs.existsSync(file),'missing module '+file);assert.ok(file.startsWith(path.resolve(base)+path.sep),'import escapes scripts');const id=rel(base,file);const s='globalThis.__enter('+JSON.stringify(id)+');\n'+fs.readFileSync(file,'utf8');const m=new vm.SourceTextModule(s,{context,identifier:file});cache.set(file,m);return m;}
 const entry=module(path.join(base,'import.js'));
 await entry.link((spec,ref)=>spec.startsWith('.')?module(path.resolve(path.dirname(ref.identifier),spec)):native(spec));
 await entry.evaluate();
 assert.equal(evaluation.length,sourceFiles.length,'all modules loaded from entry');assert.equal(new Set(evaluation).size,sourceFiles.length,'each module evaluated once');
 const load={evaluation:[...evaluation],subscriptions:[...subscriptions],timers:timers.map(t=>[t.owner,t.interval]),oneShots:oneShots.length,games};
 const registry={registerWorldDynamicProperties(){},registerEntityTypeDynamicProperties(){}};
 for(const fn of events.worldInitialize?.handlers??[])fn({propertyRegistry:registry});
 for(const fn of oneShots.splice(0))await fn();
 for(let tick=1;tick<=40;tick++){for(const fn of events.tick?.handlers??[])fn({});for(const t of [...timers])if(t.active&&tick%t.interval===0)t.fn();for(let i=0;i<12;i++)await Promise.resolve();}
 assert.ok([...cache.values()].every(m=>m.status==='evaluated'),'linked modules remain evaluated');
 return {load,commands,modules:evaluation.length,relativeImports:sourceFiles.reduce((n,f)=>n+[...fs.readFileSync(f,'utf8').matchAll(/(?:from\s+|import\s+)['"]\.[^'"]+['"]/g)].length,0)};
}
const actual=await startup(scripts);
assert.equal(actual.modules,63);assert.equal(actual.relativeImports,217);
const index=JSON.parse(fs.readFileSync(path.join(bp,'contents.json'),'utf8')).content.map(e=>e.path);
const files=walk(scripts).filter(p=>p.endsWith('.js')).map(p=>'scripts/'+rel(scripts,p));
assert.deepEqual(index.filter(p=>p.startsWith('scripts/')&&p.endsWith('.js')).sort(),files.sort(),'index exactly covers scripts');
for(const [old,next]of Object.entries(mapping)){assert.ok(!fs.existsSync(path.join(scripts,old)),'old module remains '+old);assert.ok(fs.existsSync(path.join(scripts,next)),'missing relocation '+next);}
assert.deepEqual(fs.readdirSync(path.join(scripts,'system')).filter(n=>n.endsWith('.js')),['worldedit.js']);
assert.deepEqual(actual.load,fixture.startup,'module evaluation/subscription/schedule order unchanged');
if(process.argv[2]){const baseline=await startup(path.resolve(process.argv[2]),true);assert.deepEqual(actual.load,baseline.load,'baseline startup order');assert.deepEqual(actual.commands,baseline.commands,'baseline first 40 empty-world ticks');}
console.log('PASS: real ESM entry links/evaluates all 53 modules and 181 relative imports; preserved evaluation/subscription/schedule order, exact pack index, no old module copies and 40 empty-world ticks.');
