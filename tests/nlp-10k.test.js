import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChatEngine} from '../chatbot/engine.js';
const knowledge=JSON.parse(fs.readFileSync(new URL('../chatbot/knowledge.json',import.meta.url)));
const chat=()=>createChatEngine(knowledge);
test('visitor shorthand and bounded segmentation retain source facts',()=>{
 for(const [question,status,intent,term] of [
  ['whr is al mouj','answer','location','24555515'],
  ['almoj timing','answer','hours','7:00 AM'],
  ['shomuk school','answer','search','Shomoukh'],
  ['admisn requirments','answer','apply','Birth Certificate'],
  ['whoisvp','answer','leadership','Julanda'],
  ['nurseryfee','unknown','fees','fee'],
  ['canivisit','answer','visit','tour'],
  ['contct no','answer','contact','24555515'],
  ['school opning hrs','answer','hours','7:00 AM']]) {
  const response=chat().ask(question);
  assert.equal(response.status,status,question);assert.equal(response.intent,intent,question);
  assert.ok(response.text.includes(term),question);assert.ok(response.sources.length,question);
 }
});
test('entity metadata is tied to selected fact records rather than shared source URLs',()=>{
 const r=chat().ask('who is julanda');
 assert.deepEqual(r.recordIds,['ges-julanda']);assert.ok(r.entityIds.includes('person-julanda'));
 assert.ok(!r.entityIds.includes('person-janat'));
 const campus=chat().ask('almoj timing');assert.deepEqual(campus.entityIds,['campus-mouj']);
 assert.ok(campus.recordIds.length);
 assert.deepEqual(chat().ask('weather tomorrow').entityIds,[]);
});
test('short academic followups cannot borrow nursery information for a school or group',()=>{
 for(const institution of ['GES','SIPS'])for(const question of ['fees','admissions','transport']) {
  const engine=chat();engine.ask(institution);const r=engine.ask(question);
  assert.ok(['unknown','clarify'].includes(r.status),`${institution}: ${question}`);
  assert.doesNotMatch(r.text,/24555515|24600610/);
  assert.ok(r.entityIds.includes(institution==='GES'?'ges':'school-sips'));
 }
});
test('scoped roles and unknown campus names require clarification',()=>{
 for(const institution of ['SIPS','Shomoukh'])for(const role of ['md','ceo','vp']) {
  const engine=chat();engine.ask(institution);assert.equal(engine.ask(role).status,'clarify');
  assert.equal(engine.ask('GES '+role).status,'answer');
 }
 assert.equal(chat().ask('shomoukh ece al foobar campus ges listing').status,'unknown');
 for(const name of ['quum','quurm','qurmu']) {
  const r=chat().ask('shomoukh ece al '+name+' campus ges listing');
  assert.doesNotMatch(r.text,/Al Mouj/i);
 }
});
test('class hours remain distinct from campus office schedules',()=>{
 const r=chat().ask('qurm school time');
 assert.equal(r.status,'answer');assert.match(r.text,/office hours/i);
 assert.match(r.text,/8:30 AM/);assert.match(r.text,/1:30 PM/);
 assert.match(r.text,/7:00 AM/);assert.match(r.text,/4:00 PM/);
});
test('valid visitor grammar is not changed to a near topic word',()=>{
 for(const word of ['there','teaches','along']) {
  const r=chat().ask('is '+word+' a browser version of the parent portal');
  assert.ok(r.query.interpreted.includes(word),word);
 }
});

test('complete headings disambiguate short typos while real words remain intact',()=>{
 const chat=createChatEngine(knowledge);
 for(const query of ['bring your cild','bith certificate','musc & movement']){
  chat.reset();const result=chat.ask(query);assert.equal(result.status,'answer',query);assert.ok(result.query.corrections.some(correction=>correction.kind==='contextual-spelling'),query);
 }
 for(const query of ['the central pizza','tree steps to enrollment','in the heat of muscat']){
  chat.reset();const result=chat.ask(query);
  assert.ok(!result.query.corrections.some(correction=>correction.kind==='contextual-spelling'),query);
 }
});
