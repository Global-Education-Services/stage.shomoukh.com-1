import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const knowledge=read('chatbot/knowledge.json'),corpus=read('chatbot/evaluation/10k-questions.json');
const resultsPath=new URL('../chatbot/evaluation/10k-results.json',import.meta.url);
const results=fs.existsSync(resultsPath)?JSON.parse(fs.readFileSync(resultsPath)):null;
const stale=!!results&&results.corpusFingerprint!==createHash('sha256').update(JSON.stringify(corpus)).digest('hex');
const counts={};for(const entry of corpus.cases){const category=entry.variationCategory||entry.category;counts[category]=(counts[category]||0)+1;}
console.log(JSON.stringify({records:knowledge.records.length,entities:knowledge.entityIndex.statistics,uniqueCombinations:corpus.cases.length,categoryCounts:counts,topics:corpus.statistics.topics,distinctQuestionTexts:corpus.statistics.distinctQuestionTexts,contextCases:corpus.cases.filter(entry=>entry.setup?.length).length,metrics:stale?'Report is stale: run npm run chatbot:test-10k':results?.summary||'Run npm run chatbot:test-10k first',reportStale:stale,limitations:'Agent-authored/source-derived fixtures; not independent human semantic validation. See docs/chatbot-report.md.'},null,2));
