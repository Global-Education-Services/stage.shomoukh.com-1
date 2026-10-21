/** Source-grounded checks; these metrics are regression proxies, not human semantic judgement. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {createChatEngine,normalizeText,tokenize} from '../chatbot/engine.js';
const root=new URL('../',import.meta.url);
const read=path=>JSON.parse(fs.readFileSync(new URL(path,root),'utf8'));
const contains=(text,term)=>String(text).toLowerCase().includes(String(term).toLowerCase());
export function evaluate10k(knowledge,corpus) {
 const started=performance.now(),engine=createChatEngine(knowledge),initializationMs=performance.now()-started;
 const results=[];
 for(const entry of corpus.cases) {
  engine.reset();const setupResults=[];
  for(const [index,turn] of (entry.setup||[]).entries()) {
   const actual=engine.ask(typeof turn==='string'?turn:turn.question),expected=entry.setupExpectations?.[index];
   if(expected){const pass=expected.expectedStatuses.includes(actual.status)&&(expected.all||[]).every(term=>contains(actual.text,term))&&(!(expected.any||[]).length||expected.any.some(term=>contains(actual.text,term)))&&(expected.none||[]).every(term=>!contains(actual.text,term))&&(!expected.sourceUrls?.length||actual.sources.some(source=>expected.sourceUrls.includes(source.url)));setupResults.push({turn,index,pass,...(!pass?{actual,expected}:{})});}
  }
  const setup=entry.setupExpectations?.length?setupResults.length===entry.setupExpectations.length&&setupResults.every(result=>result.pass):null;
  const begin=performance.now(),actual=engine.ask(entry.question),durationMs=performance.now()-begin;
  const status=entry.expectedStatuses.includes(actual.status);
  const facts=(entry.all||[]).every(term=>contains(actual.text,term))&&(!(entry.any||[]).length||entry.any.some(term=>contains(actual.text,term)))&&(entry.none||[]).every(term=>!contains(actual.text,term));
  const source=entry.sourceUrls?.length?actual.sources.some(source=>entry.sourceUrls.includes(source.url)):null;
  const wantedIntent=entry.expectedIntent;
  const intent=wantedIntent?(Array.isArray(wantedIntent)?wantedIntent:[wantedIntent]).includes(actual.intent):null;
  const wantedEntity=entry.expectedEntity;
  const entity=wantedEntity?(Array.isArray(wantedEntity)?wantedEntity:[wantedEntity]).every(id=>(actual.entityIds||[]).includes(id))&&!(entry.excludedEntityIds||[]).some(id=>(actual.entityIds||[]).includes(id)):null;
  const selection=entry.expectedRecordIds?.length?actual.recordIds?.some(id=>entry.expectedRecordIds.includes(id))??false:null;
  const interpretedTokens=new Set(tokenize(actual.query?.interpreted||''));
  const correction=entry.expectedCorrection?((entry.expectedCorrection.includes||[]).every(term=>tokenize(term).every(token=>interpretedTokens.has(token)))&&(entry.expectedCorrection.excludes||[]).every(term=>!contains(normalizeText(actual.query?.interpreted||''),normalizeText(term)))):null;
  const limits=entry.confidenceExpectation||{},confidence=(limits.min==null||actual.confidence>=limits.min)&&(limits.max==null||actual.confidence<=limits.max);
  const finalTurn=status&&facts&&source!==false&&selection!==false;
  const pass=finalTurn&&setup!==false;
  const unsupported=entry.expectedStatuses.every(status=>['unknown','clarify','unsupported-language'].includes(status));
  results.push({id:entry.id,category:entry.variationCategory||entry.category,pass,finalTurn,setupCorrect:setup,setupTurns:setupResults.length,setupTurnsPassed:setupResults.filter(result=>result.pass).length,...(setup===false?{setupFailures:setupResults.filter(result=>!result.pass)}:{}),status,facts,source,selection,intent,entity,correction,confidence,durationMs,unsupported,falsePositive:unsupported&&actual.status==='answer',context:!!entry.setup?.length,...(!pass?{question:entry.question,setup:entry.setup,expected:entry,actual}:{}),...((intent===false||entity===false||correction===false)&&pass?{question:entry.question,actual}: {})});
 }
 const ratio=(rows,key)=>{const eligible=rows.filter(row=>row[key]!==null);return {correct:eligible.filter(row=>row[key]).length,total:eligible.length,accuracy:eligible.length?eligible.filter(row=>row[key]).length/eligible.length:null};};
 function summarize(rows){const times=rows.map(row=>row.durationMs).sort((a,b)=>a-b);return {cases:rows.length,passed:rows.filter(row=>row.pass).length,failed:rows.filter(row=>!row.pass).length,accuracy:rows.length?rows.filter(row=>row.pass).length/rows.length:null,finalTurn:ratio(rows,'finalTurn'),precedingConversation:ratio(rows,'setupCorrect'),precedingTurns:{passed:rows.reduce((sum,row)=>sum+row.setupTurnsPassed,0),total:rows.reduce((sum,row)=>sum+row.setupTurns,0)},answerSelection:ratio(rows.map(row=>({...row,answer:row.status&&row.facts})),'answer'),sourceAttribution:ratio(rows,'source'),recordSelection:ratio(rows,'selection'),intentRecognition:ratio(rows,'intent'),entityRecognition:ratio(rows,'entity'),autocorrection:ratio(rows,'correction'),confidenceRange:ratio(rows,'confidence'),unsupportedCases:rows.filter(row=>row.unsupported).length,falsePositiveAnswers:rows.filter(row=>row.falsePositive).length,meanResponseMs:times.reduce((sum,time)=>sum+time,0)/(times.length||1),p95ResponseMs:times[Math.floor(times.length*.95)]||0};}
 return {evaluatedAt:new Date().toISOString(),seed:corpus.seed,corpusFingerprint:createHash('sha256').update(JSON.stringify(corpus)).digest('hex'),generatorHash:corpus.generatorHash||null,sourceFingerprint:corpus.sourceFingerprint||null,definitions:{pass:'Expected status, source-derived multiword factual assertions, supporting source and expected record selection when annotated; generated context cases additionally require every annotated preceding turn. Intent/entity/correction measured separately.',intent:'Expected externally annotated intent versus response intent; null annotations are unmeasured.',entity:'Annotated entity IDs versus response scope metadata; null annotations are unmeasured; absent response metadata on annotated cases counts as failure.',autocorrection:'Expected canonical topic tokens in interpreted query, normalized for the same public synonym/plural lexicon. This is not a complete word-level correction score.',falsePositive:'Answer status on a scenario explicitly requiring unknown/clarify/unsupported-language.',hallucination:'Not independently measurable by lexical tests. Grounding assertion failures and unsupported-answer counts are reported as proxies, never as a semantic hallucination rate.',annotation:'Generated/source-reviewed agent fixtures, not independent human-reviewed accuracy. Holdout wording authored separately from runtime templates; after inspection/fixes it is a disclosed regression set.'},initializationMs,summary:summarize(results),byCategory:Object.fromEntries([...new Set(results.map(row=>row.category))].map(category=>[category,summarize(results.filter(row=>row.category===category))])),context:summarize(results.filter(row=>row.context)),failures:results.filter(row=>!row.pass),metricFailures:results.filter(row=>row.pass&&(row.intent===false||row.entity===false||row.correction===false))};
}
export function run10k(){const knowledge=read('chatbot/knowledge.json'),corpus=read('chatbot/evaluation/10k-questions.json');const guards=read('chatbot/knowledge/word-guards.json').words;
 const currentSources=createHash('sha256').update(JSON.stringify({records:knowledge.records,entities:knowledge.entityIndex.entities,guards})).digest('hex');
 const currentGenerator=createHash('sha256').update(fs.readFileSync(new URL('scripts/generate-10k-questions.mjs',root))).digest('hex');
 if(corpus.sourceFingerprint!==currentSources||corpus.generatorHash!==currentGenerator)throw Error('10k corpus is stale. Run npm run chatbot:generate-tests before evaluating changed knowledge or generator code.');
 const report=evaluate10k(knowledge,corpus);report.datasetSha256=createHash('sha256').update(fs.readFileSync(new URL('chatbot/evaluation/10k-questions.json',root))).digest('hex');const holdoutPath=new URL('chatbot/evaluation/holdout.json',root);if(fs.existsSync(holdoutPath)){const holdout=JSON.parse(fs.readFileSync(holdoutPath));report.holdout=evaluate10k(knowledge,holdout);}const representative=read('chatbot/evaluation/representative.json');report.ambiguity=evaluate10k(knowledge,{description:'Preserved source-reviewed explicit ambiguous-role probes, separate from the 10k count.',cases:representative.cases.filter(entry=>entry.category==='ambiguous-role')});fs.writeFileSync(new URL('chatbot/evaluation/10k-results.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,byCategory:report.byCategory,context:report.context,holdout:report.holdout?.summary,ambiguity:report.ambiguity.summary},null,2));if(report.summary.accuracy<.95||report.summary.cases<10000)process.exitCode=1;return report;}
if(process.argv[1]===fileURLToPath(import.meta.url))run10k();
