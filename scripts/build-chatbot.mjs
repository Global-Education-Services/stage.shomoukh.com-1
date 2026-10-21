import {buildQuestionEvaluation} from './build-question-evaluation.mjs';
/** Approved public-source extraction. No crawling, executable-source evaluation, or network access. */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { buildEntityIndex } from './build-entity-index.mjs';
import { APPROVED_EXTERNAL_URLS } from '../chatbot/source-policy.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'chatbot');
const entities = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',hellip:'…',copy:'©'};
const decode = value => value.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (all, key) => {
  if (key.startsWith('#')) { const n = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2),16) : +key.slice(1); return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''; }
  return entities[key] ?? all;
});
const clean = text => decode(text).replace(/\s+/g,' ').trim();
const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
function parse(html) {
  const tree = {tag:'root',attrs:{},children:[],start:0}; const stack=[tree];
  for (const match of html.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+/g)) {
    const token=match[0];
    if (token.startsWith('<!')) continue;
    if (token.startsWith('</')) { const tag=token.match(/^<\/([\w-]+)/)?.[1].toLowerCase(); const i=stack.findLastIndex(n=>n.tag===tag); if(i>0) stack.length=i; continue; }
    if(token.startsWith('<')) {
      const tag=token.match(/^<([\w-]+)/)[1].toLowerCase(); const attrs={};
      for(const a of token.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[a[1].toLowerCase()]=decode(a[2]??a[3]??a[4]);
      const node={tag,attrs,children:[],parent:stack.at(-1),start:match.index}; stack.at(-1).children.push(node);
      if(!voidTags.has(tag)&&!token.endsWith('/>')) stack.push(node);
    } else stack.at(-1).children.push({tag:'#text',text:token,parent:stack.at(-1),start:match.index});
  }
  return tree;
}
function* walk(node) { yield node; for(const child of node.children??[]) yield* walk(child); }
const excluded = node => (node.tag==='a' && /(?:^|\s)btn-/.test(node.attrs?.class??'')) || ['script','style','nav','header','footer','aside','form','button','svg','select','video'].includes(node.tag) || node.attrs?.['aria-hidden']==='true' || /\b(cta-action-banner|page-breadcrumb|badge-pill|detail-modal|search-modal|toast-feedback|pursue-category|hero-bottom-actions|step-number|feature-number)\b/.test(node.attrs?.class??'');
function visible(node) { if(excluded(node))return ''; return node.tag==='#text'?node.text:(node.children??[]).map(visible).join(' '); }
const stop = new Set('the and for with our your from this that are you can have has into their child children shomoukh nursery school of to in a an on as by is we at it or be each all through'.split(' '));
function keywords(text) { return [...new Set(clean(text).toLowerCase().match(/[\p{L}\p{N}]+/gu)??[])].filter(w=>w.length>2&&!stop.has(w)).slice(0,70); }
const categories = {'index.html':'overview','about.html':'about','programs.html':'programs','enrichments.html':'enrichments','spaces.html':'facilities','admissions.html':'admissions','apply-online.html':'application','book-a-visit.html':'visit','parents.html':'parents','contact.html':'contact'};
const files=(await readdir(root)).filter(f=>f.endsWith('.html')&&f!=='404.html').sort();
const sources=new Map();
for(const file of files) { const html=await readFile(resolve(root,file),'utf8');const tree=parse(html);sources.set(file,{html,tree,ids:new Set([...walk(tree)].map(n=>n.attrs?.id).filter(Boolean))}); }
function validUrl(url) { const parsed=new URL(url,'https://local.invalid'); const file=parsed.pathname==='/'?'index.html':parsed.pathname.slice(1);return sources.has(file)&&(!parsed.hash||sources.get(file).ids.has(decodeURIComponent(parsed.hash.slice(1)))); }
function anchor(node,file) { for(let p=node;p;p=p.parent) if(p.attrs?.id&&p.tag!=='main') return `${file==='index.html'?'/':`/${file}`}#${encodeURIComponent(p.attrs.id)}`;return file==='index.html'?'/':`/${file}`; }
const pages=[];const records=[];const seen=new Set();const brokenLinks=[];
function addRecord({title,answer,url,file,line,category,language='en',sourceKind='html'}) {
  answer=clean(answer);title=clean(title); if(answer.length<18||!title||seen.has(`${title.toLowerCase()}|${answer.toLowerCase()}`))return;
  if(!validUrl(url))throw Error(`Invalid generated source URL ${url}`);
  seen.add(`${title.toLowerCase()}|${answer.toLowerCase()}`);
  const id=`${file.replace('.html','')}-${createHash('sha256').update(title+'|'+answer).digest('hex').slice(0,10)}`;
  const conflicts=/\b(months?|years?)\b/i.test(title+' '+answer)&&/\b(ages?|aged|infants?|toddlers?|preschoolers?|flex-care|six months)\b/i.test(title+' '+answer)?['age-range']:[];
  records.push({id,title,question:`Tell me about ${title}`,answer,keywords:keywords(title+' '+answer),alternativeQuestions:[`What is ${title}?`,`Where can I find ${title}?`],intent:category,category,url,sourceReference:{file,line,heading:title,kind:sourceKind},confidence:{verified:true,conflicts},language});
}
for(const [file,{html,tree}] of sources) {
  const nodes=[...walk(tree)]; const url=file==='index.html'?'/':`/${file}`; const title=clean(visible(nodes.find(n=>n.tag==='h1')??nodes.find(n=>n.tag==='title'))); const language=nodes.find(n=>n.tag==='html')?.attrs.lang??'en';const category=categories[file]??'information';
  const related=new Set();
  for(const n of nodes.filter(n=>n.tag==='a')) { const href=n.attrs.href;if(!href||!href.startsWith('/')&&!href.startsWith('#'))continue;const u=new URL(href,'https://local.invalid'+url);const path=u.pathname+u.hash;if(validUrl(path))related.add(path);else brokenLinks.push({file,url:path}); }
  const sections=nodes.filter(n=>n.tag==='section'&&!excluded(n)); const pageText=[];const topics=[];
  for(const section of sections) {
    let chunk=null;
    const flush=()=>{if(chunk&&chunk.parts.length){const answer=clean(chunk.parts.join(' '));pageText.push(answer);topics.push(chunk.title);addRecord({...chunk,answer,file,category,language});}chunk=null;};
    function visit(n) {
      if(excluded(n))return;
      const heading=/^h[1-6]$/.test(n.tag)||/\bstat-title\b/.test(n.attrs?.class??'');
      if(heading) { flush();chunk={title:clean(visible(n)),url:anchor(n,file),line:html.slice(0,n.start).split('\n').length,parts:[]}; return; }
      if(n.tag==='#text') { const text=clean(n.text);if(text){if(!chunk)chunk={title,url:anchor(section,file),line:html.slice(0,section.start).split('\n').length,parts:[]};chunk.parts.push(text);}return; }
      for(const child of n.children??[])visit(child);
    }
    visit(section);flush();
  }
  // Static public form labels/options only: never input attributes, values, or placeholders.
  for(const form of nodes.filter(n=>n.tag==='form'&&!/search/.test(n.attrs?.id??''))) {
    const fields=[...walk(form)].filter(n=>n.tag==='label');
    if(!fields.length)continue;
    const fieldText=fields.map(n=>clean(visible(n)).replace(/\s*\*$/, '')).filter(Boolean);
    const formTitle=`${title} — form requirements`;
    const answer=`The public form lists these fields and document checklist items: ${fieldText.join('; ')}. Asterisks on the page identify required fields.`;
    pageText.push(answer);topics.push(formTitle);
    addRecord({title:formTitle,answer,url:anchor(form,file),file,line:html.slice(0,form.start).split('\n').length,category,language,sourceKind:'public-form-labels'});
    for(const select of [...walk(form)].filter(n=>n.tag==='select')) {
      const label=fields.find(n=>n.attrs.for===select.attrs.id);
      const options=(select.children??[]).filter(n=>n.tag==='option'&&n.attrs.value).map(n=>clean(visible(n))).filter(Boolean);
      if(!options.length)continue;
      const optionTitle=label?clean(visible(label)).replace(/\s*\*$/, ''):'Public form options';
      const qualification=/year|schedule|transportation|campus/i.test(optionTitle)?'Confirm current availability with admissions.':'See the linked form for details.';
      const optionAnswer=`The public page lists these ${optionTitle.toLowerCase()} options: ${options.join('; ')}. ${qualification}`;
      pageText.push(optionAnswer);topics.push(optionTitle);
      addRecord({title:optionTitle,answer:optionAnswer,url:anchor(select,file),file,line:html.slice(0,select.start).split('\n').length,category,language,sourceKind:'public-form-options'});
    }
  }
  // Preserve unique public footer facts, while excluding repeated navigation/contact blocks.
  for (const footerFact of nodes.filter(n => /\b(copyright-text|footer-blurb|footer-accred-badges)\b/.test(n.attrs?.class??''))) {
    const answer=clean((footerFact.children??[]).map(n=>n.tag==='#text'?n.text:(n.children??[]).map(c=>c.tag==='#text'?c.text:visible(c)).join(' ')).join(' '));
    if(answer.length<18)continue;
    const factTitle=/copyright-text/.test(footerFact.attrs.class)?'Website copyright holder':'Public school accreditation and overview';
    pageText.push(answer);topics.push(factTitle);
    addRecord({title:factTitle,answer,url,file,line:html.slice(0,footerFact.start).split('\n').length,category:'about',language});
  }
  pages.push({id:file.replace('.html',''),title,url,topics:[...new Set(topics)],text:pageText.join('\n\n'),keywords:keywords(title+' '+pageText.join(' ')),relatedPages:[...related],lastUpdated:null,category,language,sourceReference:{file,kind:'public-html'}});
}
// Only extract the known, public, literal modal dataset. Never execute JavaScript.
const js=await readFile(resolve(root,'main.js'),'utf8');
const data=js.match(/const studentLifeData = \{([\s\S]*?)\n  \};/)?.[1]??'';
const unquote=s=>s.replace(/\\'/g,"'").replace(/\\n/g,' ').replace(/\\\\/g,'\\');
for(const block of data.matchAll(/'(modal-[\w-]+)': \{([\s\S]*?)\n    \}/g)) {
  const field=name=>unquote(block[2].match(new RegExp(`${name}: '((?:\\\\.|[^'\\\\])*)'`))?.[1]??'');
  const bullets=[...(block[2].match(/bullets: \[([\s\S]*?)\]/)?.[1]??'').matchAll(/'((?:\\.|[^'\\])*)'/g)].map(m=>unquote(m[1]));
  const title=field('title');const answer=[field('desc'),...bullets].join(' ');if(!title||!answer)throw Error('Public modal extraction failed');
  addRecord({title,answer,url:'/#enrichments',file:'main.js',line:js.slice(0,js.indexOf(block[0])).split('\n').length,category:'enrichments',sourceKind:'public-modal-data'});
}
// Related organization facts are explicitly reviewed, local snapshots, never a
// visitor-triggered crawl. Only these exact official pages can be cited.
const relatedFile='chatbot/sources/ges.json';
const related=JSON.parse(await readFile(resolve(root,relatedFile),'utf8'));
if(related.version!==1 || !/^\d{4}-\d{2}-\d{2}$/.test(related.reviewedAt))throw Error('Invalid related-source review metadata');
const externalSources=related.pages.map(page=>{
  if(!APPROVED_EXTERNAL_URLS.has(page.url)||!page.title||!page.sections?.length)throw Error('Unapproved related source');
  return {...page,language:'en',reviewedAt:related.reviewedAt,sourceReference:{file:relatedFile,kind:'reviewed-official-source'}};
});
for(const fact of related.facts) {
  const source=externalSources.find(page=>page.url===fact.url);
  if(!source || !source.sections.includes(fact.section) || !fact.answer || !fact.id || records.some(record=>record.id===fact.id))throw Error('Invalid reviewed fact');
  records.push({id:fact.id,title:clean(fact.title),question:`Tell me about ${fact.title}`,answer:clean(fact.answer),
    keywords:keywords([fact.title,fact.answer,...(fact.keywords||[]),...(fact.entity?.aliases||[])].join(' ')),
    alternativeQuestions:fact.entity?.aliases?.map(alias=>`Who is ${alias}?`)||[],
    intent:fact.category,category:fact.category,url:fact.url,language:'en',entity:fact.entity,
    sourceReference:{file:relatedFile,url:fact.url,heading:fact.section,kind:'reviewed-official-source',reviewedAt:related.reviewedAt},
    confidence:{verified:true,conflicts:[]}});
}
const conflicts=[{id:'age-range',description:'Published age ranges differ: the programs introduction says 6 months to 4 years; the infant card says 3–11 months; admissions says 6 months to 6 years. Confirm eligibility with admissions.',sourceUrls:['/programs.html#ages','/programs.html#infants','/admissions.html']}];
const generatedAt=new Date().toISOString();
const entityIndex=buildEntityIndex({records,reviewedAt:related.reviewedAt});
const knowledge={version:1,generatedAt,entityIndex,languages:[...new Set(pages.map(p=>p.language))],pages,externalSources,records,conflicts};
// Precomputed inverted index is reusable by local engines and avoids per-question scans.
knowledge.searchIndex={documentCount:records.length,postings:{}};
for(const record of records)for(const word of keywords(record.title+' '+record.answer)) (knowledge.searchIndex.postings[word]??=[]).push(record.id);
await mkdir(output,{recursive:true});
const inventory={version:1,generatedAt,pages,relatedPublicSources:externalSources,publicSources:[...files,'main.js (studentLifeData literals only)'],excludedSources:['content.txt (unpublished source notes)','dist (build output)','node_modules','media binaries (not transcribed)','private data and parent portal contents'],brokenExistingLinks:[...new Map(brokenLinks.map(x=>[x.file+'|'+x.url,x])).values()],conflicts};
const testQuestions=records.map(record=>({question:record.question,expectedRecordId:record.id,expectedSourceUrl:record.url,language:record.language,requiresQualification:record.confidence.conflicts.length>0}));
for(const [name,value]of Object.entries({'knowledge.json':knowledge,'entity-index.json':entityIndex,'inventory.json':inventory,'test-questions.json':testQuestions}))await writeFile(resolve(output,name),JSON.stringify(value,null,2)+'\n');
// Independent, source-traceable language regression corpus. These phrases do
// not supply answers or bypass engine confidence rules.
const questionPatterns=JSON.parse(await readFile(resolve(root,'chatbot/knowledge/question-patterns.json'),'utf8'));
const queryLanguage=JSON.parse(await readFile(resolve(root,'chatbot/knowledge/query-language.json'),'utf8'));
const wordGuards=JSON.parse(await readFile(resolve(root,'chatbot/knowledge/word-guards.json'),'utf8'));
const protectedMutations=new Set([...queryLanguage.protectedWords,...wordGuards.words]);
const variationQuestions=[];
for(const pattern of questionPatterns) {
  const matching=records.filter(record=>(pattern.recordTitles||[]).includes(record.title));
  if(pattern.status==='answer' && !matching.length)throw Error(`Question topic has no approved source: ${pattern.topic}`);
  const sourceUrls=[...new Set(matching.map(record=>record.url))];
  const questions=new Set(pattern.questions);
  for(const question of pattern.questions) {
    questions.add(question.toUpperCase()+'?');
    const word=question.split(' ').find(word=>word.length>=6 && queryLanguage.fuzzyTargets.includes(word.toLowerCase()));
    if(word) {
      const middle=Math.floor(word.length/2);
      const mutations=[word.slice(0,middle)+word.slice(middle+1),word.slice(0,middle)+word[middle+1]+word[middle]+word.slice(middle+2)];
      for(const mutation of mutations)if(!protectedMutations.has(mutation))questions.add(question.replace(word,mutation));
    }
  }
  for(const question of questions)variationQuestions.push({question,topic:pattern.topic,expectedStatus:pattern.status,expectedSourceUrls:sourceUrls,textAny:pattern.textAny});
}
await writeFile(resolve(output,'variation-test-questions.json'),JSON.stringify(variationQuestions,null,2)+'\n');
await writeFile(resolve(root,'chatbot/evaluation/generated-questions.json'),JSON.stringify(buildQuestionEvaluation(knowledge),null,2)+'\n');
console.log(`Chatbot knowledge: ${pages.length} public pages, ${records.length} unique records, ${knowledge.languages.join(', ')}; ${inventory.brokenExistingLinks.length} existing invalid fragment links reported. Every generated source URL is valid.`);
