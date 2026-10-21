/** Deterministic source-grounded evaluation generation; never asks engine for expected answers. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const clean=text=>text.replace(/\s+/g,' ').trim();
const headingKey=text=>clean(text.normalize('NFKC').toLowerCase().replace(/[&/]/g,' ').replace(/\band\b/g,' ').replace(/[^\p{L}\p{N}\s]/gu,' '));
const stop=new Set('a an the of and in to our your child children public page lists these school nursery see confirm current availability with admissions details options view more'.split(' '));
export function buildQuestionEvaluation(knowledge) {
 const cases=[],seen=new Set();
 const templates=[topic=>topic,topic=>`tell me about ${topic}`,topic=>`what is ${topic}`,topic=>`explain ${topic}`,topic=>`i want to know about ${topic}`,topic=>`can you explain ${topic} please`,topic=>`do you have information on ${topic}`,topic=>`need details on ${topic}`,topic=>`more about ${topic} pls`,topic=>`${topic} info`,topic=>`help me understand ${topic}`,topic=>`what does the website say about ${topic}`,topic=>`where can i read about ${topic}`,topic=>`could u tell me about ${topic}`,topic=>`looking for ${topic}`,topic=>`any details about ${topic}`];
 for(const record of knowledge.records||[]) {
  if(!record.confidence?.verified||record.language!=='en')continue;
  const title=clean(record.title);
  // Footer boilerplate and form field inventories are audited, but not useful visitor topics.
  if(/copyright holder|form requirements|public school accreditation|^Child Gender$|^Core Principles$/.test(title))continue;
  const factualTokens=[...new Set(`${record.answer}`.match(/[\p{L}\p{N}@.\-]+/gu)||[])].filter(word=>word.length>=5&&!stop.has(word.toLowerCase()));
  const equivalentRecords=knowledge.records.filter(candidate=>candidate.confidence?.verified&&candidate.language==='en'&&headingKey(candidate.title)===headingKey(title));
  const alternateTokens=equivalentRecords.flatMap(candidate=>[...new Set(candidate.answer.match(/[\p{L}\p{N}@.\-]+/gu)||[])].filter(word=>word.length>=5&&!stop.has(word.toLowerCase())).slice(0,6));
  const hasConflict=!!record.confidence.conflicts?.length;
  const any=hasConflict?['differ','conflict','confirm']:[...new Set(alternateTokens)];
  const personAssertions=record.entity?.kind==='person'?[record.title,record.entity.role]:[];
  const sourceUrls=[...new Set(knowledge.records.filter(candidate=>candidate.confidence?.verified&&candidate.language==='en'&&headingKey(candidate.title)===headingKey(title)).map(candidate=>candidate.url))];
  if(!any.length)continue;
  for(let index=0;index<templates.length;index++) {
   const question=templates[index](title.toLowerCase());const key=question.toLowerCase();if(seen.has(key))continue;seen.add(key);
   cases.push({id:`generated-${cases.length+1}`,category:record.category||'website-topic',variation:index===0?'short':'paraphrase',question,setup:[],expectedStatuses:hasConflict?['clarify']:['answer'],sourceUrls,all:personAssertions,any:personAssertions.length?[]:any,none:[],sourceRecordId:record.id});
  }
 }
 // Typo, informal and space-loss examples retain manually source-checked expectations.
 const seeds=JSON.parse(fs.readFileSync(new URL('chatbot/evaluation/representative.json',root),'utf8')).cases;
 const lexical=[['managing director','managin director'],['vice president','vice presdent'],['admission','admisn'],['registration','registraton'],['opening','opning'],['phone','phn'],['number','numbr'],['campus','campas'],['curriculum','curiculum'],['programs','progrms'],['where','whr'],['what is','whats'],['who is','whos']];
 for(const seed of seeds) {
  const variations=[];
  for(const [from,to] of lexical)if(seed.question.includes(from))variations.push(['typo-or-informal',seed.question.replace(from,to)]);
  if(seed.question.includes(' ')&&seed.question.length<=32)variations.push(['missing-space',seed.question.replace(/ /g,'')]);
  if(seed.expectedStatuses.includes('answer')) variations.push(['informal',`pls ${seed.question}`]);
  for(const [variation,question] of variations){const key=`${(seed.setup||[]).join('|')}::${question.toLowerCase()}`;if(seen.has(key))continue;seen.add(key);cases.push({...seed,id:`generated-${cases.length+1}`,variation,question});}
 }
 return {version:1,description:'Deterministic lexical/paraphrase checks grounded in verified records plus source-reviewed scenarios. Expectations are not engine-derived. Generated results are diagnostic; representative accuracy is reported separately.',topics:[...new Set(cases.map(entry=>entry.sourceRecordId).filter(Boolean))].length,cases};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 const knowledge=JSON.parse(fs.readFileSync(new URL('chatbot/knowledge.json',root),'utf8'));
 const corpus=buildQuestionEvaluation(knowledge);fs.writeFileSync(new URL('chatbot/evaluation/generated-questions.json',root),JSON.stringify(corpus,null,2)+'\n');console.log(`Generated ${corpus.cases.length} queries covering ${corpus.topics} verified records.`);
}
