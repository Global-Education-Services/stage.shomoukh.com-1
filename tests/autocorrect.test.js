import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChatEngine} from '../chatbot/engine.js';
const knowledge=JSON.parse(fs.readFileSync(new URL('../chatbot/knowledge.json',import.meta.url)));
const engine=()=>createChatEngine(knowledge);
const examples=[
 ['whr r u',/Muscat|Mouj|Qurm/],['ur ph num',/24555515/],['alqurm addres',/Al Suraj/],['opning hrs',/7:00 AM/],
 ['how2apply',/application|enrollment/i],['admisn docs',/Birth Certificate/],['buk a vist',/appointment/],['wot progrms',/EYFS|Reggio/],
 ['whos managin director',/Jinan/],['whois ceo',/Janat/],['parent poratl',/parent|portal|app/i],['facilites',/space|environment|classroom|garden|Piazza/i],
 ['mision',/childcare|creativity/i],['art activites',/art|paint|creativ/i]
];
test('simple, short and misspelled questions work across verified topics',()=>{
 for(const [question,expected] of examples) {
  const response=engine().ask(question);
  assert.equal(response.status,'answer',`${question}: ${response.text}`);
  assert.match(response.text,expected,question);
 }
});
test('query corrections occur before identity, intent and campus processing',()=>{
 const chat=engine();
 assert.match(chat.ask('whr is alqurm').text,/Al Suraj/);
 assert.match(chat.ask('emal?').text,/info.alqurum/);
 const response=chat.ask('whois managin director of ges');
 assert.match(response.text,/Jinan/);
 assert.equal(response.query.original,'whois managin director of ges');
 assert.ok(response.query.corrections.length>0);
 assert.match(response.query.interpreted,/managing director/);
});
test('autocorrect preserves unknown subjects, dates, negations and personal details',()=>{
 for(const question of ['apple phne','hospital opning hours','CEO salry','Julanda birthdy','nursery wheelchair acces','tmrw classroom schedul','presdent of ges']) {
   const response=engine().ask(question);
   assert.ok(['unknown','clarify'].includes(response.status),`${question}: ${response.text}`);
 }
 assert.equal(engine().ask('ما هي الرسوم؟').status,'unsupported-language');
});
test('correction metadata does not rewrite ordinary valid input',()=>{
 const response=engine().ask('Who is the CEO?');
 assert.equal(response.status,'answer');
 assert.equal(response.query.corrections.length,0);
});
test('real English words near website topics are never silently rewritten',()=>{
 for(const question of ['nursery contract','postal address','patent','prone','phony','amply','aptly','booming','booting','broking','chainman','choirman','directory']) {
  const response=engine().ask(question);
  assert.ok(['unknown','clarify'].includes(response.status),`${question}: ${response.text}`);
  assert.equal(response.query.corrections.length,0,question);
 }
});
