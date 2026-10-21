import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createChatEngine} from '../chatbot/engine.js';
const knowledge=JSON.parse(readFileSync(new URL('../chatbot/knowledge.json',import.meta.url),'utf8'));
for(const followup of ['timing','phone','email','school time'])test(`SIPS retains its own source scope for ${followup}`,()=>{
 const engine=createChatEngine(knowledge);engine.answer('sips');const reply=engine.answer(followup);
 assert.equal(reply.status,'unknown');assert.match(reply.text,/school|SIPS/i);assert.doesNotMatch(reply.text,/24555515|24600610|7:00 AM/);
 assert.ok(reply.sources.every(source=>source.url.startsWith('https://www.ges.om/')));
});
for(const followup of ['programs','curriculum'])test(`SIPS ${followup} uses its published British curriculum`,()=>{
 const engine=createChatEngine(knowledge);engine.answer('sips');const reply=engine.answer(followup);
 assert.equal(reply.status,'answer');assert.match(reply.text,/British|National English/);assert.doesNotMatch(reply.text,/EYFS|Reggio/);
});
for(const query of ['ges campuses','ges nurseries','global education campuses'])test(`${query} scopes to the GES institutions`,()=>{
 const reply=createChatEngine(knowledge).answer(query);assert.equal(reply.status,'answer');assert.match(reply.text,/SIPS|International Private School/);assert.match(reply.text,/Mouj/);assert.match(reply.text,/Qurum/);
});
test('GES institution context survives a short campus follow-up',()=>{
 const engine=createChatEngine(knowledge);engine.answer('ges');const reply=engine.answer('all campus');assert.equal(reply.status,'answer');assert.match(reply.text,/SIPS|International Private School/);
});
test('An explicit nursery campus switches away from SIPS scope',()=>{
 const engine=createChatEngine(knowledge);engine.answer('sips');const reply=engine.answer('mouj phone');assert.equal(reply.status,'answer');assert.match(reply.text,/24555515/);
});

for(const name of ['Al Shomoukh International Private School (SIPS)','Tell me about Al Shomoukh International Private School (SIPS)'])test(`${name} preserves school context`,()=>{
 const engine=createChatEngine(knowledge);engine.answer(name);const reply=engine.answer('phone');assert.equal(reply.status,'unknown');assert.doesNotMatch(reply.text,/24555515|24600610/);
});
test('SIPS admissions remains unknown instead of describing nursery enrollment',()=>{
 const engine=createChatEngine(knowledge);engine.answer('sips');const reply=engine.answer('admission');assert.equal(reply.status,'unknown');assert.match(reply.text,/school-specific/);
});

test('SIPS founding date remains available in follow-up context',()=>{
 const engine=createChatEngine(knowledge);engine.answer('sips');const reply=engine.answer('when founded');assert.equal(reply.status,'answer');assert.match(reply.text,/2015/);
});
