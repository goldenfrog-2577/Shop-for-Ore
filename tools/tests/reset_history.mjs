import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const bp=new URL('../../behavior_packs/main-addon-shop_for_ore/',import.meta.url);
const load=p=>fs.readFileSync(new URL(p,bp),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?function|const)/g,'');
const mk=(name,tags=[])=>{const p={name,tags:new Set(tags),getTags:()=>[...p.tags],hasTag:t=>p.tags.has(t),addTag:t=>p.tags.add(t),removeTag:t=>p.tags.delete(t)};return p;};
const owner=mk('Owner',['role:owner','sys:wipe:7','sys:offline_reset:4']),offline=mk('Absent',['auth:done','player:vip','sys:wipe:1','sys:offline_reset:1']);
const props={'shop:wipe_id':7,'shop:offline_reset_id':4};const ctx={world:{events:{worldInitialize:{subscribe(){}}},getPlayers:()=>[owner].values(),getDynamicProperty:k=>props[k],setDynamicProperty:(k,v)=>props[k]=v},isBot:p=>p.hasTag('role:bot'),hasRole:p=>p.hasTag('role:owner'),tell(){},run(){},DynamicPropertiesDefinition:class{defineNumber(){}}};
vm.runInNewContext(load('scripts/system/core/reset_history.js')+'\nglobalThis.history={clearResetHistory,syncResetEpoch};',ctx);
assert.equal(ctx.history.clearResetHistory(offline),false);assert.equal(props['shop:wipe_id'],7);
ctx.history.clearResetHistory(owner);assert.equal(props['shop:wipe_id'],0);assert.equal(props['shop:offline_reset_id'],0);
vm.runInNewContext(load('scripts/system/core/offline_reset.js')+'\nglobalThis.offline={applyOfflineReset};',ctx);
assert.equal(ctx.offline.applyOfflineReset(offline),false);assert.ok(offline.hasTag('auth:done'));assert.ok(offline.hasTag('player:vip'));assert.ok(offline.hasTag('sys:wipe:0'));assert.ok(!offline.hasTag('sys:wipe:1'));
// Новое событие №1 не совпадает со старой отметкой №1; настоящий сброс применяется ровно один раз.
props['shop:offline_reset_id']=1;assert.equal(ctx.offline.applyOfflineReset(offline),true);assert.equal(ctx.offline.applyOfflineReset(offline),false);
props['shop:wipe_id']=1;assert.ok(!offline.hasTag('sys:wipe:1'),'new wipe remains pending');
console.log('PASS: owner-only clear, offline cleanup without data loss, counter reuse and no repeated reset.');
