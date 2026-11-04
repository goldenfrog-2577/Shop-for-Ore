import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../../behavior_packs/main-addon-shop_for_ore/scripts/menu/common/forms.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replaceAll('export ','');
const shown=[], sounds=[], pending=[];
let told=0,errors=0;
class Form {
	constructor(){this.buttons=[];}
	title(v){this.t=v;return this;} body(v){this.b=v;return this;}
	button(v){this.buttons.push(v);return this;} button1(v){return this.button(v);} button2(v){return this.button(v);}
}
const context={hasPendingCommands:()=>pending.length>0,menuCommandCount:()=>0,menuSoundCount:()=>0,failedCommandCount:()=>0,beginMenuAction(){},endMenuAction(){},ActionFormData:Form,ModalFormData:Form,MessageFormData:Form,
	closedByPlayer:r=>r.canceled&&r.cancelationReason!=='userBusy',toldCount:()=>told,toldErrorCount:()=>errors,
	settleCommands:async()=>{while(pending.length)await Promise.all(pending.splice(0));},menuFeedback:(_,error)=>sounds.push(error),
	showWhenFree:(_,form)=>new Promise(resolve=>shown.push({form,resolve}))};
vm.runInNewContext(source+'\nglobalThis.api={showMenu,showModal,confirm};',context);
const player={name:'Owner'};
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const close={canceled:true,cancelationReason:'userClosed'};
let back=0;
context.api.showMenu(player,'title','body',[],()=>back++);await flush();
assert.equal(shown[0].form.buttons.length,1,'nested list gets an explicit Back');shown.shift().resolve(close);await flush();assert.equal(back,0,'list X only closes');
context.api.confirm(player,'title','body',()=>back++,()=>back++);await flush();shown.shift().resolve(close);await flush();assert.equal(back,0,'confirmation X does not call No');
context.api.showModal(player,new Form(),()=>{},()=>back++);await flush();shown.shift().resolve(close);await flush();assert.equal(back,1,'modal X returns');
context.api.showMenu(player,'title','body',[{text:'action',run:()=>{pending.push(Promise.resolve().then(()=>{told++;}));}}]);await flush();shown.shift().resolve({selection:0});await flush();assert.deepEqual(sounds,[false]);assert.equal(shown.length,1,'successful action reopens once');shown.shift().resolve(close);await flush();
context.api.showMenu(player,'title','body',[{text:'error',run:()=>{told++;errors++;context.api.showMenu(player,'blocked','',[]);}}]);await flush();shown.shift().resolve({selection:0});await flush();assert.deepEqual(sounds,[false,true]);assert.equal(shown.length,0,'error suppresses follow-up');
console.log('PASS: explicit Back, close semantics, modal return, async result and one feedback sound.');
