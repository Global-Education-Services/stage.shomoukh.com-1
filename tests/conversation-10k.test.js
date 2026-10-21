import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChatEngine} from '../chatbot/engine.js';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const knowledge=read('../chatbot/knowledge.json');
const holdout=read('../chatbot/evaluation/holdout.json');
const engine=()=>createChatEngine(knowledge);
const queryKey=text=>text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();

test('separately authored holdout has unique complete conversations and traceable expectations',()=>{
 assert.ok(holdout.review.savedBeforeEvaluation);
 assert.ok(holdout.cases.length>=80);
 const ids=new Set(),keys=new Set(),entities=new Set(knowledge.entityIndex.entities.map(entity=>entity.id));
 for(const entry of holdout.cases){
  assert.ok(!ids.has(entry.id),entry.id);ids.add(entry.id);
  const key=JSON.stringify([entry.setup.map(queryKey),queryKey(entry.question)]);
  assert.ok(!keys.has(key),entry.question);keys.add(key);
  assert.ok(entry.expectedStatuses.length);
  assert.ok(entry.variationCategory.startsWith('holdout-'));
  assert.ok(entry.expectedEntity===null||entities.has(entry.expectedEntity),entry.id);
  assert.ok(Array.isArray(entry.setup));
  if(entry.expectedStatuses.length===1&&entry.expectedStatuses[0]==='answer'){
   assert.ok(entry.all.length||entry.any.length,entry.id);
   assert.ok(entry.sourceUrls.length,entry.id);
  }
 }
 assert.ok(holdout.cases.filter(entry=>entry.setup.length).length>=20);
 assert.ok(holdout.cases.filter(entry=>entry.expectedStatuses.includes('unknown')).length>=25);
});

test('campus switching after an unknown fee request retrieves the new campus number',()=>{
 const chat=engine();chat.ask('Al Mouj');chat.ask('timing');
 assert.equal(chat.ask('fees').status,'unknown');
 chat.ask('what about qurm');
 const reply=chat.ask('phone');
 assert.equal(reply.status,'answer');assert.match(reply.text,/24600610/);
 assert.doesNotMatch(reply.text,/24555515/);
 assert.ok(reply.sources.some(source=>source.url==='/contact.html#alqurm'));
});

test('an explicitly named campus replaces the active campus in both directions',()=>{
 for(const [first,last,mail,wrong] of [['qurm','mouj','info.almouj','info.alqurum'],['mouj','qurm','info.alqurum','info.almouj']]){
  const chat=engine();chat.ask(first);chat.ask('phone');chat.ask(last);
  const reply=chat.ask('email');assert.equal(reply.status,'answer');
  assert.ok(reply.text.includes(mail));assert.ok(!reply.text.includes(wrong));
 }
});

test('changing from nursery campus to corporate or private school scope prevents contact leakage',()=>{
 for(const entity of ['GES','SIPS']){
  const chat=engine();chat.ask('Al Mouj');chat.ask('phone');chat.ask(entity);
  for(const question of ['phone','email','opening hours']){
   const reply=chat.ask(question);assert.ok(['unknown','clarify'].includes(reply.status),`${entity} ${question}`);
   assert.doesNotMatch(reply.text,/24555515|24600610|info\.almouj|info\.alqurum/);
  }
 }
});

test('multiple leadership matches never give an arbitrary referent to a singular pronoun',()=>{
 const chat=engine();chat.ask('who is the CEO');chat.ask('who is the MD and VP');
 const reply=chat.ask('what is his role');assert.ok(['unknown','clarify'].includes(reply.status));
 assert.doesNotMatch(reply.text,/Janat is|Jinan is|Julanda is/);
});

test('reset removes campus context before a one-word phone request',()=>{
 const chat=engine();chat.ask('Al Mouj');chat.reset();
 const reply=chat.ask('phone');
 assert.ok(reply.status==='clarify'||reply.text.includes('24600610'),reply.text);
 if(reply.status==='answer')assert.ok(reply.text.includes('24555515'));
});

test('preceding-turn oracles preserve campus scope through fees and reject unannotated paths',async()=>{
 const {buildSetupExpectations}=await import('../scripts/conversation-oracles.mjs');
 const expected=buildSetupExpectations(knowledge,['tell me about Al Mouj Campus','fees','phone','what about Al Qurm Campus','email']);
 assert.deepEqual(expected[1].expectedStatuses,['unknown']);
 assert.ok(expected[2].all.some(term=>term.includes('24555515')));
 assert.ok(expected[4].all.some(term=>term.includes('info.alqurum')));
 assert.ok(expected[4].none.some(term=>term.includes('info.almouj')));
 assert.throws(()=>buildSetupExpectations(knowledge,['phone']),/no established campus/);
 assert.throws(()=>buildSetupExpectations(knowledge,['invent a setup']),/Unannotated/);
});

test('preceding-turn corporate and leadership oracles assert published facts and source provenance',async()=>{
 const {buildSetupExpectations}=await import('../scripts/conversation-oracles.mjs');
 const expected=buildSetupExpectations(knowledge,['ges','who is julanda','who is md','sips','programs','campuses']);
 assert.ok(expected[0].all.includes('2012'));
 assert.ok(expected[1].all.includes('Vice President'));
 assert.ok(expected[2].all.includes('Managing Director'));
 assert.ok(expected[3].all.includes('Hay Al Hail'));
 assert.deepEqual(expected[4].all,['EYFS','Reggio']);
 assert.ok(expected[5].all.includes('Al Mouj Campus')&&expected[5].all.includes('Al Qurm Campus'));
 for(const entry of expected)assert.ok(entry.sourceUrls.length);
});
