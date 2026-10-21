import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build10kQuestions} from '../scripts/generate-10k-questions.mjs';
import {evaluate10k} from '../scripts/evaluate-10k.mjs';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url)));
const knowledge=read('../chatbot/knowledge.json');
const normalize=text=>String(text).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const key=entry=>JSON.stringify([(entry.setup||[]).map(turn=>normalize(typeof turn==='string'?turn:turn.question)),normalize(entry.question)]);
const minimum={short:1500,typo:1500,natural:1500,campus:1200,leadership:800,admissions:1000,context:1000,informal:800,negative:700};
test('10k generator is seeded, reproducible and meets each meaningful category quota',()=>{
 const first=build10kQuestions(knowledge,{seed:20261018}),second=build10kQuestions(knowledge,{seed:20261018});
 assert.deepEqual(first,second);
 assert.ok(first.cases.length>=10000);
 assert.equal(new Set(first.cases.map(key)).size,first.cases.length,'No punctuation/case-only duplicates across categories');
 for(const [category,count] of Object.entries(minimum))assert.ok(first.cases.filter(entry=>(entry.variationCategory||entry.category)===category).length>=count,category);
 assert.ok(first.cases.filter(entry=>entry.setup?.length).length>=1000);
 assert.ok(new Set(first.cases.map(entry=>entry.sourceRecordId).filter(Boolean)).size>=142,'Source topic breadth must not be replaced by campus-only permutations');
});
test('10k expectations have valid public references, explicit behavior and concrete assertions',()=>{
 const corpus=read('../chatbot/evaluation/10k-questions.json');
 const recordIds=new Set(knowledge.records.map(record=>record.id)),entityIds=new Set(knowledge.entityIndex.entities.map(entity=>entity.id));
 const urls=new Set(knowledge.records.map(record=>record.url));
 assert.equal(new Set(corpus.cases.map(entry=>entry.id)).size,corpus.cases.length);
 for(const entry of corpus.cases){
  assert.ok(entry.question&&entry.expectedStatuses?.length&&entry.variationCategory,entry.id);
  assert.ok(entry.expectedBehavior&&entry.expectedRecordOrCategory&&entry.confidenceExpectation,entry.id);
  for(const url of entry.sourceUrls||[])assert.ok(urls.has(url),entry.id+': '+url);
  if(entry.sourceRecordId)assert.ok(recordIds.has(entry.sourceRecordId),entry.id);
  for(const entity of entry.expectedEntity?(Array.isArray(entry.expectedEntity)?entry.expectedEntity:[entry.expectedEntity]):[])assert.ok(entityIds.has(entity),entry.id+': '+entity);
  if(entry.expectedStatuses.includes('answer'))assert.ok(entry.sourceUrls?.length&&(entry.all?.length||entry.any?.length),entry.id+' requires facts and sources');
 }
});
test('10k evaluator separates factual failures from source hits and unsupported false positives',()=>{
 const sample={pages:[{url:'/contact.html'}],records:[{id:'one',title:'Al Mouj',answer:'Al Mouj phone 24555515',url:'/contact.html',language:'en',confidence:{verified:true}}]};
 const report=evaluate10k(sample,{cases:[{id:'metric-control',question:'Al Mouj',expectedStatuses:['unknown'],sourceUrls:['/contact.html'],all:['WRONG NUMBER'],variationCategory:'control'}]});
 assert.equal(report.summary.sourceAttribution.correct,1);
 assert.equal(report.summary.passed,0);
 assert.equal(report.summary.falsePositiveAnswers,1);
 assert.equal(report.summary.intentRecognition.total,0,'Unannotated metrics must not count as successes');
});

test('a correct final reply cannot hide a failed preceding conversation turn',()=>{
 const sample={pages:[{url:'/contact.html'}],records:[{id:'one',title:'Al Mouj',answer:'Al Mouj phone 24555515',url:'/contact.html',language:'en',confidence:{verified:true}}]};
 const report=evaluate10k(sample,{cases:[{id:'setup-control',question:'Al Mouj',setup:['Al Mouj'],setupExpectations:[{expectedStatuses:['answer'],all:['WRONG PHONE'],sourceUrls:['/contact.html']}],expectedStatuses:['answer'],sourceUrls:['/contact.html'],all:['24555515'],variationCategory:'context'}]});
 assert.equal(report.summary.finalTurn.correct,1);
 assert.equal(report.summary.passed,0);
 assert.equal(report.summary.precedingConversation.correct,0);
 assert.equal(report.summary.precedingConversation.total,1);
 assert.equal(report.summary.precedingTurns.passed,0);
});

test('annotated entity cases with absent scope metadata do not disappear from denominators',()=>{
 const sample={pages:[],records:[]};
 const report=evaluate10k(sample,{cases:[{id:'entity-control',question:'phone',expectedStatuses:['unknown'],sourceUrls:[],all:[],variationCategory:'control',expectedEntity:'campus-mouj'}]});
 assert.equal(report.summary.entityRecognition.total,1);
 assert.equal(report.summary.entityRecognition.correct,0);
});
