import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChatEngine} from '../chatbot/engine.js';
const knowledge=JSON.parse(fs.readFileSync(new URL('../chatbot/knowledge.json',import.meta.url)));
const engine=()=>createChatEngine(knowledge);
test('exact visitor conversation supports abbreviated GES roles',()=>{
  const chat=engine();
  for(const [question,name,role] of [['who is shk julanda','Julanda','Vice President'],['who is md','Jinan','Managing Director'],['who vp?','Julanda','Vice President'],['ceo?','Janat','Chief Executive Officer']]) {
    const response=chat.ask(question);
    assert.equal(response.status,'answer',question);
    assert.ok(response.text.includes(name),response.text);
    assert.ok(response.text.includes(role),response.text);
    assert.ok(response.sources.some(source=>source.url==='https://www.ges.om/about.php'));
  }
});
test('short role questions work without an exact sentence template',()=>{
  for(const [question,name] of [['MD?','Jinan'],['who md','Jinan'],['who is the m.d.?','Jinan'],['managing director?','Jinan'],['vp','Julanda'],['vice president?','Julanda'],['who is CEO','Janat'],['c.e.o.?','Janat'],['Who is GES MD?','Jinan'],['tell me the CEO of GES','Janat']]) {
    const response=engine().ask(question);
    assert.equal(response.status,'answer',question);
    assert.ok(response.text.includes(name),`${question}: ${response.text}`);
    assert.match(response.text,/GES|Global Education Services/);
  }
});
test('role shorthand keeps explicit organizations and unpublished details separate',()=>{
  for(const question of ['Who is the MD of T-Mobile?','CEO of Google?','Who is Al Mouj campus MD?','CEO salary?','What is the MD email?','Who is the president?'])assert.equal(engine().ask(question).status,'unknown',question);
  const chat=engine();chat.ask('Who is Sheikh Julanda?');
  assert.equal(chat.ask('Who is the nursery director?').status,'unknown');
  chat.reset();
  assert.equal(chat.ask('What is his role?').status,'unknown');
});
test('short campus followups retain campus and can switch campuses',()=>{
  const chat=engine();
  assert.equal(chat.ask('Where is Al Mouj?').status,'answer');
  for(const question of ['phone?','email?','hrs?','address?']) {
    const response=chat.ask(question);
    assert.equal(response.status,'answer',question);
    assert.ok(response.sources.some(source=>source.url==='/contact.html#almouj'));
    assert.ok(response.sources.every(source=>source.url!=='/contact.html#alqurm'));
  }
  assert.match(chat.ask('what about qurm?').text,/24600610|Qurm/);
  assert.match(chat.ask('ph no?').text,/24600610/);
  const all=chat.ask('all campuses?');
  assert.match(all.text,/24555515/);
  assert.match(all.text,/24600610/);
});
test('common short campus requests reach the published contact facts',()=>{
  for(const question of ['opening hrs','tel','ph no','location qrum','maps?']) {
    const response=engine().ask(question);
    assert.equal(response.status,'answer',question);
    assert.ok(response.sources.some(source=>source.url.startsWith('/contact.html#')));
  }
  const chat=engine();chat.ask('admission');
  assert.match(chat.ask('docs?').text,/Birth Certificate/);
});
test('visit and campus admissions questions use actionable existing routes',()=>{
  for(const question of ['visit','when can i visit','can i book a tour']) {
    const response=engine().ask(question);
    assert.equal(response.status,'answer',question);
    assert.ok(response.sources.some(source=>source.url.startsWith('/book-a-visit.html')),`${question}: ${JSON.stringify(response)}`);
    assert.match(response.text,/\bform\b|appointment|confirm/i);
  }
  const response=engine().ask('mouj admission');
  assert.equal(response.status,'answer');
  assert.match(response.text,/general|website/i);
  assert.ok(response.sources.some(source=>/admissions|apply-online/.test(source.url)));
});
test('campus programs qualify general information and special-day questions state published hours',()=>{
  const response=engine().ask('what programs in qurm');
  assert.equal(response.status,'answer');
  assert.match(response.text,/general|website/i);
  assert.match(response.text,/confirm/i);
  for(const question of ['open friday','are you open on friday']) {
    const answer=engine().ask(question);
    assert.equal(answer.status,'answer',question);
    assert.match(answer.text,/Sun.*Thu/);
    assert.match(answer.text,/published/i);
  }
});
test('short-question support never supplies unrelated or unpublished facts',()=>{
  for(const question of ['hours for hospital','phone number for apple','qurm parking','open at T-Mobile on friday','mouj wheelchair access','qurm admission fees'])assert.equal(engine().ask(question).status,'unknown',question);
});

test('published Al Mouj parking detail remains available',()=>{
  const response=engine().ask('mouj parking');
  assert.equal(response.status,'answer');
  assert.match(response.text,/visitor parking/i);
});
test('partial GES role titles do not identify a different published role',()=>{
  for(const question of ['GES president','president GES','head of GES','GES director']) {
    const response=engine().ask(question);
    assert.ok(['clarify','unknown'].includes(response.status),`${question}: ${response.text}`);
  }
});
test('bare personal contact followups do not masquerade as nursery contacts',()=>{
  const chat=engine();chat.ask('who is julanda');
  for(const question of ['phone?','email?','address?']) {
    const response=chat.ask(question);
    assert.equal(response.status,'unknown',question);
    assert.doesNotMatch(response.text,/24555515|24600610/);
  }
  assert.equal(chat.ask('nursery phone?').status,'answer');
});
test('campus followups retain scope after general program and admission answers',()=>{
  for(const [question,campus] of [['qurm programs','alqurm'],['mouj admission','almouj']]) {
    const chat=engine();chat.ask(question);
    for(const followup of ['email?','hours?']) {
      const response=chat.ask(followup);
      assert.equal(response.status,'answer');
      assert.ok(response.sources.every(source=>source.url===`/contact.html#${campus}`),`${question} -> ${followup}: ${JSON.stringify(response.sources)}`);
    }
  }
});
