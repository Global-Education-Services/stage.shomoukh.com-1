/** Optional maintainer tool. The ordinary/offline build uses the saved subset. */
import {readFile,writeFile} from 'node:fs/promises';
import {oneEdit} from '../chatbot/query-processor.js';
const language=JSON.parse(await readFile(new URL('../chatbot/knowledge/query-language.json',import.meta.url),'utf8'));
const knowledge=JSON.parse(await readFile(new URL('../chatbot/knowledge.json',import.meta.url),'utf8'));
const targets=[...new Set([...language.fuzzyTargets,...knowledge.records.flatMap(record=>record.title.toLowerCase().replace(/[^a-z ]/g,' ').split(/\s+/)).filter(word=>word.length>=4)])];
const dictionaryPath=process.argv[2]||'/usr/share/dict/words';
const dictionary=await readFile(dictionaryPath,'utf8').catch(()=>{throw new Error('Provide a local public-domain English word list: npm run chatbot:word-guards -- /path/to/words');});
const words=[...new Set(dictionary.toLowerCase().split(/\r?\n/).filter(word=>word.length>=3 && /^[a-z]+$/.test(word) && !targets.includes(word) && targets.some(target=>target[0]===word[0] && oneEdit(word,target))))].sort();
await writeFile(new URL('../chatbot/knowledge/word-guards.json',import.meta.url),JSON.stringify({source:'Subset of the public-domain Webster Second International / FreeBSD system word list, containing real words within one edit of approved chatbot/topic-title targets. Full dictionary is not shipped.',words},null,2)+'\n');
console.log(`Saved ${words.length} real-word neighbors; no runtime dictionary service is needed.`);
