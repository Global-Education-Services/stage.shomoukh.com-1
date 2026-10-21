import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildQuestionEvaluation} from '../scripts/build-question-evaluation.mjs';
import {evaluateCases} from '../scripts/evaluate-chatbot.mjs';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const knowledge=read('../chatbot/knowledge.json');
const representative=read('../chatbot/evaluation/representative.json');
test('expanded source-grounded corpus contains at least 1000 distinct questions and multiple variation types',()=>{
 const corpus=buildQuestionEvaluation(knowledge);
 assert.ok(corpus.cases.length>=1000);
 assert.equal(new Set(corpus.cases.map(entry=>JSON.stringify([entry.setup,entry.question]))).size,corpus.cases.length);
 for(const type of ['short','paraphrase','missing-space','typo-or-informal','informal'])assert.ok(corpus.cases.some(entry=>entry.variation===type),type);
 assert.ok(corpus.cases.every(entry=>entry.sourceRecordId||entry.id));
 assert.ok(representative.cases.some(entry=>entry.setup.length>=5));
});
test('evaluation reports source retrieval separately from factual answer correctness',()=>{
 const synthetic={pages:[{url:'/contact.html'}],records:[{id:'one',title:'Al Mouj',answer:'Al Mouj verified phone 24555515',url:'/contact.html',language:'en',confidence:{verified:true}}]};
 const result=evaluateCases(synthetic,[{id:'wrong-fact',category:'metric-control',question:'Al Mouj',expectedStatuses:['answer'],sourceUrls:['/contact.html'],all:['WRONG PHONE'],any:[],none:[]}]);
 assert.equal(result.summary.retrievalSourceHits,1);
 assert.equal(result.summary.answerCorrect,0);
 assert.equal(result.summary.answerAccuracy,0);
});
test('representative dataset uses explicit factual expectations and source references',()=>{
 assert.ok(representative.cases.length>=100);
 for(const entry of representative.cases) {
  assert.ok(entry.category&&entry.question&&entry.id);
  if(entry.expectedStatuses.includes('answer')) {
   assert.ok(entry.all.length||entry.any.length,entry.id);
   assert.ok(entry.sourceUrls.length,entry.id);
  }
 }
});
test('source-reviewed representative questions retain at least the current 95 percent regression floor',()=>{
 const report=evaluateCases(knowledge,representative.cases);
 assert.ok(report.summary.answerAccuracy>=0.95,JSON.stringify(report.summary));
 assert.ok(report.summary.retrievalAccuracy>=0.95,JSON.stringify(report.summary));
 console.log(`Agent source-reviewed representative: ${report.summary.answerCorrect}/${report.summary.cases} factual/status, ${report.summary.retrievalSourceHits}/${report.summary.retrievalCases} source hits. Not independent human annotation.`);
});
