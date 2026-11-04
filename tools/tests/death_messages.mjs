import fs from 'node:fs';
import assert from 'node:assert/strict';
const repo=new URL('../../',import.meta.url),langs=['ru_RU','en_US','uk_UA','es_ES'];
const fixture=JSON.parse(fs.readFileSync(new URL('fixtures/bedrock-1.19.50-deaths.json',import.meta.url),'utf8'));
const signature=s=>(s.match(/%(?:\d+\$)?[sdif]/g)||[]).sort();
const colorAt=(s,at)=>{const codes=s.slice(0,at).match(/§[0-9a-gr]/g);return codes?.at(-1)?.slice(1)||'r';};
assert.equal(Object.keys(fixture.entries).length,57);
for(const l of langs){
 const lines=fs.readFileSync(new URL('resource_packs/main-rp-shop_for_ore/texts/'+l+'.lang',repo),'utf8').split(/\r?\n/).filter(x=>x.startsWith('death.'));
 const entries=new Map(lines.map(s=>{const n=s.indexOf('=');return[s.slice(0,n),s.slice(n+1)];}));assert.equal(lines.length,57,l+' no duplicate death keys');
 assert.deepEqual([...entries.keys()],Object.keys(fixture.entries),l+' exact 1.19.50 keys');
 for(const [key,params]of Object.entries(fixture.entries)){
  const value=entries.get(key);assert.deepEqual(signature(value),[...params].sort(),l+' '+key+' original placeholders');
  assert.ok(value.startsWith('§r\ue115 '),l+' '+key+' existing untinted icon');
  assert.ok(!value.includes('\t#'));assert.ok(!/[\r\n]/.test(value));assert.ok(!/§(?![0-9a-gklmnor])/i.test(value));
  const rendered=value.replace(/%(\d+)\$s/g,(_,n)=>['','Victim','Attacker','Item'][Number(n)]);
  assert.ok(!/%(?:\d+\$)?[sdif]/.test(rendered));
  for(const name of ['Victim','Attacker','Item']){const at=rendered.indexOf(name);if(at>=0)assert.equal(colorAt(rendered,at),'f',l+' '+key+' '+name+' white');}
  const stripped=rendered.replace(/§[0-9a-gklmnor]/g,'');assert.ok(stripped.length>10);
  for(let at=0;at<rendered.length;at++){
   if(rendered[at]==='§'){at++;continue;}
   if(!/\p{L}/u.test(rendered[at]))continue;
   if(['Victim','Attacker','Item'].some(name=>{const start=rendered.indexOf(name);return start>=0&&at>=start&&at<start+name.length;}))continue;
   assert.equal(colorAt(rendered,at),'c',l+' '+key+' cause in red');
  }
  if(key==='death.attack.player'||key==='death.attack.player.item')assert.ok(value.includes('§r\ue114 §f%2$s'),'PvP glyph copied and reset');
 }
}
console.log('PASS: all 57 Bedrock 1.19.50 death keys in 4 languages, original argument identities, white names/items, red cause and untinted existing glyphs.');
