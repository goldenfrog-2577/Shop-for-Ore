import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const pack=process.argv[2]?path.resolve(process.argv[2]):fileURLToPath(new URL('../../behavior_packs/main-addon-shop_for_ore/',import.meta.url));
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const relative=f=>path.relative(pack,f).split(path.sep).join('/'),all=walk(pack),names=all.map(relative),exact=new Set(names);
assert.equal(new Set(names.map(p=>p.toLowerCase())).size,names.length,'paths must not collide when ignoring case');
const has=(p,label)=>assert.ok(exact.has(p),label+': '+p);
const index=JSON.parse(fs.readFileSync(path.join(pack,'contents.json'),'utf8')).content.map(e=>e.path);
assert.equal(new Set(index.map(p=>p.toLowerCase())).size,index.length,'pack index duplicates');for(const p of index)has(p,'indexed file');
const modules=names.filter(p=>p.startsWith('scripts/')&&p.endsWith('.js'));
assert.deepEqual(index.filter(p=>p.startsWith('scripts/')&&p.endsWith('.js')).sort(),[...modules].sort(),'script index exactly matches files');
const manifest=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'),'utf8'));for(const m of manifest.modules)if(m.entry)has(m.entry,'manifest entry');
let imports=0,functions=0,nativeFunctions=0;
for(const p of modules){const source=fs.readFileSync(path.join(pack,p),'utf8');for(const [,spec]of source.matchAll(/(?:from\s+|import\s+)['"](\.[^'"]+)['"]/g)){const target=relative(path.resolve(pack,path.dirname(p),spec));has(target,'relative import from '+p);imports++;}
 for(const [,name]of source.matchAll(/\bfunction ([\w/.-]+)/g)){if(!name.includes('/')||name.endsWith('/'))continue;has('functions/'+name+'.mcfunction','native function from '+p);nativeFunctions++;}}
for(const name of JSON.parse(fs.readFileSync(path.join(pack,'functions/tick.json'),'utf8')).values)has('functions/'+name+'.mcfunction','tick function');
for(const p of names.filter(p=>p.endsWith('.mcfunction'))){const source=fs.readFileSync(path.join(pack,p),'utf8').split(/\r?\n/).filter(l=>!l.trimStart().startsWith('#')).join('\n');for(const [,name]of source.matchAll(/\bfunction ([\w/.-]+)/g)){has('functions/'+name+'.mcfunction','function call from '+p);functions++;}}
// File names may change independently of the registered GameTest namespace/test name.
const spawner=fs.readFileSync(path.join(pack,'scripts/system/bot/spawnbot.js'),'utf8');const registration=spawner.match(/GT\.register\('([^']+)', '([^']+)'/);assert.ok(registration);
const command=spawner.match(/runCommandAsync\('function ([^']+)'/);assert.ok(command);const native=fs.readFileSync(path.join(pack,'functions/'+command[1]+'.mcfunction'),'utf8');assert.ok(native.includes('gametest run '+registration[1]+':'+registration[2]),'native bot function calls registered GameTest');
console.log('PASS: exact/case-safe pack paths, '+modules.length+' modules, '+imports+' imports, '+functions+' function calls, '+nativeFunctions+' native JS function references and bot GameTest identity.');
