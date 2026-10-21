import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChatEngine} from '../chatbot/engine.js';
const knowledge=JSON.parse(fs.readFileSync(new URL('../chatbot/knowledge.json',import.meta.url)));
const engine=()=>createChatEngine(knowledge);
test('visitor example and abbreviated leadership names resolve with an official source',()=>{
  for(const question of ['who is. shk julanda','Who is Sheikh Julanda?','who is julanda','Who is Shk. Julanda Al Hashmi?','Who is Julannda?']) {
    const response=engine().ask(question);
    assert.equal(response.status,'answer',question);
    assert.match(response.text,/Julanda Salim Hamood Al Hashmi/);
    assert.match(response.text,/Vice President/);
    assert.ok(response.sources.some(s=>s.url==='https://www.ges.om/about.php'));
  }
});
test('related group questions use GES facts without assigning group roles to the nursery',()=>{
  assert.match(engine().ask('What is GES?').text,/Global Education Services/);
  assert.match(engine().ask('How is Shomoukh related to GES?').text,/Shomoukh|Al Mouj/);
  assert.match(engine().ask('Who is the CEO of GES?').text,/Janat/);
  assert.equal(engine().ask('Who is the nursery principal?').status,'unknown');
});
test('identity followups preserve person while private or unpublished details remain unknown',()=>{
  const chat=engine();chat.ask('who is shk julanda');
  assert.match(chat.ask('What is his role?').text,/Vice President/);
  assert.equal(chat.ask('What is his salary?').status,'unknown');
  assert.equal(engine().ask('Who is Sheikh Unknown Person?').status,'unknown');
});
test('schedule variations give published hours or distinguish unpublished classroom timetables',()=>{
  for(const question of ['What is your schedule?','What time do you close?','When does Al Mouj open?']) {
    const response=engine().ask(question);
    assert.equal(response.status,'answer',question);
    assert.match(response.text,/7:00 AM|4:00 PM/);
  }
  assert.match(engine().ask('What attendance schedules can I choose?').text,/5 Days|days|schedule/i);
  assert.equal(engine().ask('What is the classroom timetable for tomorrow?').status,'unknown');
});

test('external citations are limited to reviewed exact official pages',()=>{
  for(const url of ['https://www.ges.om.evil.example/about.php','https://www.ges.om/about.php?next=evil','https://www.ges.om/private.php','http://www.ges.om/about.php','javascript:alert(1)']) {
    const candidate={...knowledge.records.find(record=>record.id==='ges-julanda'),url};
    const response=createChatEngine({externalSources:[{url}],records:[candidate]}).ask('who is julanda');
    assert.equal(response.status,'unknown',url);
    assert.deepEqual(response.sources,[]);
  }
  const response=createChatEngine({records:[knowledge.records.find(record=>record.id==='ges-julanda')]}).ask('who is julanda');
  assert.equal(response.status,'unknown','Even an allowed page needs explicit snapshot metadata');
});
test('mentioning a known name or GES cannot invent unrelated roles or personal details',()=>{
  for(const question of ['Who is the president of GES?','What is Julanda salary?','Where does Julanda live?','Who is Sheikh Julanda Smith?','Who is the nursery director?'])assert.equal(engine().ask(question).status,'unknown',question);
});
test('hours never leak between nursery, GES and unrelated organizations',()=>{
  for(const question of ['When does GES close?','What time does GES open?','When does T-Mobile close?','When does an unknown office open?','What time do you close for the holiday?']) {
    const response=engine().ask(question);
    assert.equal(response.status,'unknown',question);
    assert.doesNotMatch(response.text,/7:00 AM|4:00 PM/);
  }
});
test('full names without honorifics distinguish family members',()=>{
  for(const [name,role] of [['Julanda','Vice President'],['Janat','Chief Executive Officer'],['Jinan','Managing Director']]) {
    const response=engine().ask(`Who is ${name} Salim Hamood Al Hashmi?`);
    assert.equal(response.status,'answer',name);
    assert.ok(response.text.includes(role),response.text);
  }
});
