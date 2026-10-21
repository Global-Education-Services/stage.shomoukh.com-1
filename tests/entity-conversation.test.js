import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChatEngine} from '../chatbot/engine.js';
const knowledge=JSON.parse(fs.readFileSync(new URL('../chatbot/knowledge.json',import.meta.url)));
const fresh=()=>createChatEngine(knowledge);
test('requested leadership to campus conversation resolves scope and sources',()=>{
 const chat=fresh();
 for(const [query,terms] of [['who is julanda',['Julanda','Vice President']],['md?',['Jinan','Managing Director']],['ceo?',['Janat','Chief Executive Officer']],['campuses?',['Al Mouj','Al Qurm']],['mouj timing?',['Al Mouj','7:00 AM','4:00 PM']],['phone?',['24555515']]]) {
  const r=chat.ask(query);assert.equal(r.status,'answer',query);
  for(const term of terms)assert.ok(r.text.includes(term),`${query}: ${r.text}`);
  assert.ok(r.sources.length,query);
 }
});
test('one-word organizations, campuses, count and cost requests have useful scoped replies',()=>{
 for(const [query,terms,status] of [['how many campus',['two','Al Mouj','Al Qurm'],'answer'],['mouj',['Al Mouj','24555515'],'answer'],['qurm',['Al Qurm','24600610'],'answer'],['global education',['Global Education Services'],'answer'],['shomoukh',['Shomoukh','nursery'],'answer'],['school time',['8:30 AM','1:30 PM'],'answer'],['how much',['fee'],'unknown']]) {
  const r=fresh().ask(query);assert.equal(r.status,status,query);
  for(const term of terms)assert.ok(r.text.toLowerCase().includes(term.toLowerCase()),`${query}: ${r.text}`);
 }
});
test('missing spaces and safe phonetic variants preserve the intended entity',()=>{
 for(const [query,expected] of [['whoisvp','Julanda'],['moujtiming','7:00 AM'],['almoujphone','24555515'],['qurmemail','info.alqurum'],['bookatour','tour'],['sheikhjulanda','Julanda'],['who is julandha','Julanda']]) {
  const r=fresh().ask(query);assert.equal(r.status,'answer',query);assert.ok(r.text.includes(expected),`${query}: ${r.text}`);
 }
 for(const query of ['janan','who is janan','phoneforapple','ceoofgoogle'])assert.ok(['clarify','unknown'].includes(fresh().ask(query).status),query);
});
test('corporate and campus scope never borrow another entity attributes',()=>{
 const chat=fresh();chat.ask('ges');
 const phone=chat.ask('phone?');assert.ok(['unknown','clarify'].includes(phone.status));assert.doesNotMatch(phone.text,/24555515|24600610/);
 const age=fresh().ask('how old is ges');assert.doesNotMatch(age.text,/differing age ranges|months/);
 const role=fresh();role.ask('who is the CEO of GES');role.ask('who is the MD and VP of GES');
 assert.ok(['unknown','clarify'].includes(role.ask('what is his role').status));
});
