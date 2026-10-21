import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChatEngine} from '../chatbot/engine.js';
const knowledge=JSON.parse(fs.readFileSync(new URL('../chatbot/knowledge.json',import.meta.url)));
const cases=JSON.parse(fs.readFileSync(new URL('../chatbot/variation-test-questions.json',import.meta.url)));
test('generated simple, short, rephrased and misspelled corpus stays grounded',()=>{
 const chat=createChatEngine(knowledge);
 const failures=[];
 for(const entry of cases) {
  chat.reset();
  const response=chat.ask(entry.question);
  const valid=response.status===entry.expectedStatus &&
   (!entry.expectedSourceUrls.length || response.sources.some(source=>entry.expectedSourceUrls.includes(source.url))) &&
   (!entry.textAny.length || entry.textAny.some(text=>response.text.toLowerCase().includes(text.toLowerCase())));
  if(!valid)failures.push({question:entry.question,topic:entry.topic,expected:entry.expectedStatus,status:response.status,sources:response.sources,text:response.text.slice(0,150)});
 }
 assert.deepEqual(failures,[],`${failures.length}/${cases.length} language examples failed`);
 console.log(`Verified ${cases.length} source-backed short/typo/rephrased examples across ${new Set(cases.map(entry=>entry.topic)).size} topics.`);
});
