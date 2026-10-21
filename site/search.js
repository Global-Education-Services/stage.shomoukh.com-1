import knowledge from '../chatbot/knowledge.json' with {type:'json'};
import {tokenize} from '../chatbot/engine.js';
import {isApprovedExternalSource} from '../chatbot/source-policy.js';
const records=knowledge.records.filter(record=>record.confidence?.verified&&(/^\/(?!\/)[a-z0-9/_-]*(?:\.html)?(?:#[a-z0-9_-]+)?$/i.test(record.url)||isApprovedExternalSource(record.url,knowledge)));
const documents=records.map(record=>({...record,tokens:new Set(tokenize(record.title+' '+record.answer))}));
/** Local public-content search. No redirects based on substrings of unrelated words. */
export function searchWebsite(query,limit=6){
 const terms=[...new Set(tokenize(String(query).slice(0,300)))];
 if(!terms.length)return [];
 const ranked=documents.map(record=>{
  const title=new Set(tokenize(record.title));
  const matched=terms.filter(term=>record.tokens.has(term));
  return {record,score:matched.reduce((score,term)=>score+(title.has(term)?5:1),0),coverage:matched.length/terms.length};
 }).filter(item=>item.score>0&&item.coverage>=.6).sort((a,b)=>b.score-a.score||b.coverage-a.coverage);
 const seen=new Set();return ranked.filter(item=>{if(seen.has(item.record.url))return false;seen.add(item.record.url);return true;}).slice(0,limit).map(({record})=>({title:record.title,url:record.url,excerpt:record.answer.length>220?record.answer.slice(0,217)+'…':record.answer}));
}
