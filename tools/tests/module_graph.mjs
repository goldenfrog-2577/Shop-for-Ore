import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { syncModuleList } from '../module_list.mjs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
if(!vm.SourceTextModule){const r=spawnSync(process.execPath,['--experimental-vm-modules','--no-warnings',fileURLToPath(import.meta.url),...process.argv.slice(2)],{encoding:'utf8'});process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);}
const repo=fileURLToPath(new URL('../../',import.meta.url)),bp=path.join(repo,'behavior_packs/main-addon-shop_for_ore'),scripts=path.join(bp,'scripts');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const rel=(base,p)=>path.relative(base,p).split(path.sep).join('/');
const fixture=JSON.parse(fs.readFileSync(new URL('fixtures/system-layout.json',import.meta.url),'utf8'));
const mapping=fixture.relocations,identity=p=>mapping[p]??p;
async function startup(base, { fail, ready = false, limit = 40, heartbeat = true } = {}) {
 const evaluation=[],subscriptions=[],timers=[],oneShots=[],commands=[],properties=new Map(),log=[];let current;
 const context=vm.createContext({console:{log(){},warn(message){log.push(message);}},__enter:id=>{current=identity(id);evaluation.push(current);}});
 const sourceFiles=walk(base).filter(f=>f.endsWith('.js'));
 function signal(key) {
  return { handlers: [], subscribe(fn) { assert.equal(typeof fn, 'function'); this.handlers.push(fn); subscriptions.push([current, key]); return fn; } };
 }
 const beforeEvents = Object.fromEntries(['chatSend', 'itemUse', 'entityHurt', 'playerBreakBlock', 'playerInteractWithBlock', 'playerInteractWithEntity'].map(key => [key, signal('before.' + key)]));
 const afterEvents = Object.fromEntries(['buttonPush', 'entityHitEntity', 'entityHurt', 'itemStartUse', 'itemUse', 'playerBreakBlock', 'playerInventoryItemChange', 'playerLeave', 'playerSpawn', 'projectileHitBlock', 'soundCompleted', 'worldLoad'].map(key => [key, signal('after.' + key)]));
 const dimension = { id: 'minecraft:overworld', runCommand(c) {
  commands.push(c);
  return { successCount: !heartbeat && c === 'scoreboard players set scripts system 0' ? 0 : 1 };
 }, getEntities: () => [], getPlayers: () => [], getBlock: () => undefined };
 const world = { beforeEvents, afterEvents, getAllPlayers: () => [], getPlayers: () => [], getDimension: () => dimension,
  scoreboard: { getObjective: id => ready && ['system','money','lvl','xp','xp_need'].includes(id) ? { id } : undefined,
   getObjectives: () => [], addObjective: id => ({ id }) },
  getDynamicProperty: key => properties.get(key), setDynamicProperty: (key, value) => properties.set(key, value)
 };
 const system = {
  beforeEvents: { startup: signal('system.startup') },
  run(fn) { oneShots.push(fn); return oneShots.length; },
  runInterval(fn, interval = 1) { timers.push({fn, interval, owner: current, active: true}); return timers.length; },
  clearRun(id) { if (timers[id - 1]) timers[id - 1].active = false; }
 };
 const server = { world, system, BlockTypes: { get: id => ({ id }) }, EnchantmentTypes: { get: id => ({ id, maxLevel: 5 }) },
  BlockVolume: class {}, ItemStack: class {}, ItemLockMode: { slot: 'slot' },
  InputPermissionCategory: { Movement: 1 },
  GameMode: { Creative: 'Creative', Adventure: 'Adventure', Spectator: 'Spectator' }
 };
 const form=class{};const games=[];const chain={maxTicks(){return this;},structureName(){return this;}};
 const natives={'@minecraft/server':server,'@minecraft/server-ui':{ActionFormData:form,ModalFormData:form,MessageFormData:form},'@minecraft/server-gametest':{register:(namespace,name,fn)=>{games.push([namespace,name]);return chain;}}};
 const cache=new Map();
 function native(spec){if(cache.has(spec))return cache.get(spec);assert.ok(natives[spec],'unsupported API module '+spec);const values=natives[spec];const m=new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context,identifier:spec});cache.set(spec,m);return m;}
 function module(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);assert.ok(fs.existsSync(file),'missing module '+file);assert.ok(file.startsWith(path.resolve(base)+path.sep),'import escapes scripts');const id=rel(base,file);const s='globalThis.__enter('+JSON.stringify(id)+');\n'+fs.readFileSync(file,'utf8');const m=new vm.SourceTextModule(s,{context,identifier:file});cache.set(file,m);return m;}
 const entry=module(path.join(base,'import.js'));
 if (fail === 'missing') {
  await assert.rejects(entry.link((spec, ref) => {
   if (spec === './system/core/fallback.js') throw new Error('missing module');
   return spec.startsWith('.') ? module(path.resolve(path.dirname(ref.identifier), spec)) : native(spec);
  }), /missing module/);
  assert.ok(!log.some(line => line.includes('Загрузка завершена')));
  return;
 }
 if (fail === 'evaluate') {
  const dependency = new vm.SourceTextModule('export const heartbeatConfirmed = false; throw new Error("dependency failed");', {context});
  await entry.link((spec, ref) => spec === './system/core/fallback.js' ? dependency :
   spec.startsWith('.') ? module(path.resolve(path.dirname(ref.identifier), spec)) : native(spec));
  await assert.rejects(entry.evaluate(), /dependency failed/);
  assert.ok(!log.some(line => line.includes('Загрузка завершена')));
  return;
 }
 await entry.link((spec,ref)=>spec.startsWith('.')?module(path.resolve(path.dirname(ref.identifier),spec)):native(spec));
 await entry.evaluate();
 assert.equal(evaluation.length,sourceFiles.length,'all modules loaded from entry');assert.equal(new Set(evaluation).size,sourceFiles.length,'each module evaluated once');
 const readinessTimer = timers.at(-1);
 const components = [], nativeCommands = [];
 const itemComponentRegistry = { registerCustomComponent(id, handlers) {
  assert.equal(typeof handlers.onUse, 'function');
  assert.equal(typeof handlers.onUseOn, 'function');
  components.push(id);
 } };
 const customCommandRegistry = { registerCommand(command) { nativeCommands.push(command.name); } };
 for (const fn of system.beforeEvents.startup.handlers) fn({ itemComponentRegistry, customCommandRegistry });
 for (const fn of afterEvents.worldLoad.handlers) fn({});
 for (const fn of oneShots.splice(0)) await fn();
 for (let tick = 1; tick <= limit; tick++) {
  for (const timer of [...timers]) if (timer.active && tick % timer.interval === 0) timer.fn();
  for (let i = 0; i < 12; i++) await Promise.resolve();
 }
 const load = { evaluation, subscriptions, games, components, nativeCommands, readinessTimer };
 assert.ok([...cache.values()].every(m=>m.status==='evaluated'),'linked modules remain evaluated');
 return {load,commands,log,timers,modules:evaluation.length,relativeImports:sourceFiles.reduce((n,f)=>n+[...fs.readFileSync(f,'utf8').matchAll(/(?:from\s+|import\s+)['"]\.[^'"]+['"]/g)].length,0)};
}
const actual=await startup(scripts);
assert.equal(actual.modules,65);assert.equal(actual.relativeImports,228);
const index=JSON.parse(fs.readFileSync(path.join(bp,'contents.json'),'utf8')).content.map(e=>e.path);
const files=walk(scripts).filter(p=>p.endsWith('.js')).map(p=>'scripts/'+rel(scripts,p));
assert.deepEqual(index.filter(p=>p.startsWith('scripts/')&&p.endsWith('.js')).sort(),files.sort(),'index exactly covers scripts');
for(const [old,next]of Object.entries(mapping)){assert.ok(!fs.existsSync(path.join(scripts,old)),'old module remains '+old);assert.ok(fs.existsSync(path.join(scripts,next)),'missing relocation '+next);}
assert.deepEqual(fs.readdirSync(path.join(scripts,'system')).filter(n=>n.endsWith('.js')),['worldedit.js']);
const manifest = JSON.parse(fs.readFileSync(path.join(bp, 'manifest.json'), 'utf8'));
assert.equal(manifest.modules.find(m => m.type === 'script')?.entry, 'scripts/import.js');
assert.ok(!fs.existsSync(path.join(scripts, 'port')), 'separate prototype directory removed');
assert.deepEqual(actual.load.games, [['server', 'spawnbot']]);
assert.deepEqual(actual.load.components, ['sfo:open_menu', 'sfo:open_admin_menu']);
assert.deepEqual(actual.load.nativeCommands, [], 'custom commands are accessed through chat');
assert.equal(actual.load.subscriptions.filter(([, event]) => event === 'before.chatSend').length, 2);
assert.ok(actual.load.subscriptions.some(([, event]) => event === 'after.worldLoad'));
const unavailable = await startup(scripts,{limit:120,heartbeat:false});
assert.equal(unavailable.load.readinessTimer.active,false,'diagnostics stop after timeout');
const moduleList = syncModuleList(scripts, {check:true});
const report = actual.log.filter(line => line.endsWith(' — загружен'))
 .map(line => line.slice('[Shop for Ore]     '.length,-' — загружен'.length));
assert.deepEqual(report.slice().sort(), actual.load.evaluation.slice().sort(), 'report matches evaluated modules');
assert.deepEqual(report, moduleList, 'report matches generated module list');
const groups = actual.log.filter(line => /^\[Shop for Ore\] {3}\S+\/$/.test(line));
assert.ok(groups.length > 1 && new Set(groups).size === groups.length, 'each group appears once');
assert.equal(actual.log.filter(line => line === '[Shop for Ore] Загрузка завершена · файлов: '+moduleList.length).length,1);
assert.ok(unavailable.log.includes('[Shop for Ore] Проверка legacy · сигнал не подтверждён'));
assert.equal(unavailable.log.filter(line => line.includes('Проверка табло · отсутствуют:')).length,1);
const reloaded = await startup(scripts,{ready:true});
assert.equal(reloaded.log.filter(line => line.includes('Загрузка завершена')).length,1);
assert.ok(reloaded.log.includes('[Shop for Ore] Проверка табло · доступны'));
assert.ok(reloaded.log.includes('[Shop for Ore] Проверка legacy · сигнал обновляется'));
assert.equal(reloaded.load.readinessTimer.active,false,'diagnostics stop after success');
await startup(scripts,{fail:'missing'});
await startup(scripts,{fail:'evaluate'});
console.log('PASS: ESM graph, pack index, startup order, generated Content Log report, readiness and failed imports.');
