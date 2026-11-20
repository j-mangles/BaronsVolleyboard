import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../serve-review.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
scripts.forEach(source=>new vm.Script(source));
const sandbox={};
vm.runInNewContext(scripts.find(source=>source.includes('root.VBRules=api')),sandbox);
const rules=sandbox.VBRules;
const six=['a','b','c','d','e','f'];
function match(){
 return {rulesProfile:'mhsaa',sets:[{home:0,away:0}],events:[],lineupEvents:[],
  roster:[...six,'lib1','lib2','bench'].map(id=>({id})),lineup:{slots:[...six],serving:'away'}};
}
function advance(m,direction=1){
 rules.rally(m);m.lineup.serving='home';rules.rotate(m,direction);rules.autoReplace(m);
 rules.rally(m);m.lineup.serving='away';rules.autoReplace(m);
}
for(const two of [false,true]){
 const m=match(),r=rules.ensure(m);
 const pairs=[{middle:'a',libero:'lib1'},{middle:'d',libero:two?'lib2':'lib1'}];
 assert.equal(rules.setCoverage(m,two?['lib1','lib2']:['lib1'],pairs),null);
 assert.equal(rules.autoReplace(m).inId,'lib1');
 assert.equal(rules.autoReplace(m),null);
 assert.ok(rules.canSub(m,'lib1','bench'));
 assert.ok(rules.canSub(m,'c','a'));
 assert.equal(rules.doSub(m,'c','bench').ok,true);
 for(let i=0;i<3;i++)advance(m);
 assert.equal(m.lineup.slots[0],two?'lib2':'lib1');
 assert.equal(r.replacedId,'d');
 assert.equal(r.subs,1);
 assert.ok(m.lineup.slots.includes('bench'));
 assert.equal(new Set(m.lineup.slots).size,6);
 for(let i=0;i<3;i++)advance(m);
 assert.equal(r.replacedId,'a');
 m.lineup.slots=[...six];m.sets.push({home:0,away:0});m.lineup.serving=null;
 const next=rules.newSet(m);
 assert.equal(next.autoCoverage.length,2);assert.equal(next.subs,0);
 assert.equal(rules.autoReplace(m),null);
}
const legacy=match(),reg=rules.ensure(legacy);
reg.liberos=['lib1'];delete reg.autoCoverage;reg.autoLiberoFor='a';
const old=JSON.stringify(legacy);rules.ensure(legacy);assert.equal(JSON.stringify(legacy),old,'Reading old data leaves its sync revision unchanged');
assert.equal(rules.autoReplace(legacy).inId,'lib1');
legacy.lineup.serving='home';assert.equal(rules.autoReplace(legacy).inId,'a');
const single=match();single.lineup.serving='home';
assert.equal(rules.setCoverage(single,['lib1'],[{middle:'a',libero:'lib1'}]),null);
assert.equal(rules.autoReplace(single),null);
single.lineup.serving='away';assert.equal(rules.autoReplace(single).inId,'lib1');
rules.rotate(single,-1);assert.ok(!single.lineup.slots.includes('lib1'));
const review=globalThis.VBServeReview,m=match();
m.events=[{id:'1',setIndex:0,action:'kill',dh:1,da:0,statPlayerFixId:'bench',rallyContext:{serving:'home',serverId:'a',rotation:0,lineup:six}},
 {id:'2',setIndex:0,action:'theirPoint',dh:0,da:1,serveFix:{serverId:'b'},rallyContext:{serving:'home',serverId:'a',rotation:0,lineup:six}}];
const original=JSON.stringify(m.events), corrected=review.preview(m,0,'away');
assert.equal(corrected.changes.length,2);assert.equal(JSON.stringify(m.events),original);
review.restore(m,0,corrected.after);
assert.equal(review.context(m,m.events[0]).side,'away');
assert.equal(review.context(m,m.events[1]).serverId,'b');
assert.equal(review.context(m,m.events[1]).rotation,1);
const reset=review.preview(m,0,'reset');review.restore(m,0,reset.after);
assert.equal(m.events[0].statPlayerFixId,'bench');assert.equal(m.events[1].serveFix,undefined);
review.restore(m,0,reset.before);assert.equal(review.context(m,m.events[1]).serverId,'b');
console.log('Passed coverage through six rotations, two liberos, one middle, migration, substitutions, serving preview, reset and undo.');

const planned=match();
const planReg=rules.ensure(planned);
assert.equal(rules.setBackRowPlan(planned,'a',['bench','b']),null);
assert.deepEqual(JSON.parse(JSON.stringify(rules.plannedChanges(planned))),[{out:'a',in:'bench'}]);
assert.equal(rules.doSub(planned,'a','bench').ok,true);
assert.equal(planReg.subs,1);
for(let turn=0;turn<3;turn++)rules.rotate(planned,1);
assert.equal(rules.plannedChanges(planned)[0].in,'a');
assert.equal(rules.doSub(planned,'bench','a').ok,true);
assert.equal(planReg.subs,2);
const twoOptions=match();
assert.equal(rules.setBackRowPlan(twoOptions,'a',['bench','lib2']),null);
assert.equal(rules.plannedChanges(twoOptions).length,2);
rules.setCoverage(twoOptions,['lib1'],[{middle:'a',libero:'lib1'}]);
rules.autoReplace(twoOptions);
assert.equal(rules.plannedChanges(twoOptions).length,0);
twoOptions.sets.push({home:0,away:0});
assert.equal(rules.plannedChanges(twoOptions).length,0);
