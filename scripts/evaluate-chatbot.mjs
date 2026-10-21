import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createChatEngine} from '../chatbot/engine.js';
const root=new URL('../',import.meta.url);
const load=path=>JSON.parse(fs.readFileSync(new URL(path,root),'utf8'));
const contains=(text,term)=>text.toLocaleLowerCase('en').includes(term.toLocaleLowerCase('en'));
export function evaluateCases(knowledge,cases) {
 const chat=createChatEngine(knowledge),results=[];
 for(const entry of cases) {
  chat.reset(); for(const turn of entry.setup||[])chat.ask(turn);
  const response=chat.ask(entry.question);
  const statusCorrect=entry.expectedStatuses.includes(response.status);
  const factCorrect=(entry.all||[]).every(term=>contains(response.text,term))&&(!(entry.any||[]).length||entry.any.some(term=>contains(response.text,term)))&&(entry.none||[]).every(term=>!contains(response.text,term));
  const eligible=!!entry.sourceUrls?.length;
  const sourceHit=eligible?response.sources.some(source=>entry.sourceUrls.includes(source.url)):null;
  results.push({id:entry.id,question:entry.question,category:entry.category,statusCorrect,factCorrect,answerCorrect:statusCorrect&&factCorrect,groundedCorrect:statusCorrect&&factCorrect&&sourceHit!==false,retrievalEligible:eligible,sourceHit, ...(!(statusCorrect&&factCorrect&&sourceHit!==false)?{setup:entry.setup||[],expected:entry,actual:response}: {})});
 }
 const summarize=rows=>{const retrieved=rows.filter(row=>row.retrievalEligible);return {cases:rows.length,answerCorrect:rows.filter(row=>row.answerCorrect).length,answerAccuracy:rows.length?rows.filter(row=>row.answerCorrect).length/rows.length:null,groundedCorrect:rows.filter(row=>row.groundedCorrect).length,groundedAccuracy:rows.length?rows.filter(row=>row.groundedCorrect).length/rows.length:null,retrievalCases:retrieved.length,retrievalSourceHits:retrieved.filter(row=>row.sourceHit).length,retrievalAccuracy:retrieved.length?retrieved.filter(row=>row.sourceHit).length/retrieved.length:null};};
 return {summary:summarize(results),byCategory:Object.fromEntries([...new Set(results.map(row=>row.category))].map(category=>[category,summarize(results.filter(row=>row.category===category))])),failures:results.filter(row=>!row.answerCorrect||row.sourceHit===false)};
}
export function runEvaluation() {
 const knowledge=load('chatbot/knowledge.json');
 const representative=load('chatbot/evaluation/representative.json');
 const generated=load('chatbot/evaluation/generated-questions.json');
 const report={evaluatedAt:new Date().toISOString(),annotation:representative.review,metricDefinitions:{groundedAccuracy:'Expected status and factual text assertions plus at least one expected source URL for source-eligible cases. Source-free safe fallback cases must meet their annotated factual/status assertions.',answerAccuracy:'Expected status and all factual text assertions; does not depend on source-hit. Clarifications are correct only when explicitly required by the annotated case.',retrievalAccuracy:'At least one expected source URL returned, among source-eligible cases. Measures returned-source relevance, not internal ranking recall.',generated:'Template/lexical robustness checks grounded in approved knowledge. Not an independent human accuracy benchmark.'},representative:evaluateCases(knowledge,representative.cases),generated:evaluateCases(knowledge,generated.cases)};
 fs.writeFileSync(new URL('chatbot/evaluation/results.json',root),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({representative:report.representative.summary,generated:report.generated.summary,report:'chatbot/evaluation/results.json'},null,2));
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))runEvaluation();
