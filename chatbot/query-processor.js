import language from './knowledge/query-language.json' with { type: 'json' };
import guards from './knowledge/word-guards.json' with { type: 'json' };

// At most one edit or one adjacent transposition; long/unknown tokens are never
// forced to the closest topic. Exact vocabulary and protected real words win.
export function oneEdit(a,b) {
  if(Math.abs(a.length-b.length)>1)return false;
  if(a.length===b.length) {
    const differences=[];
    for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences.push(i);
    return differences.length===1 || differences.length===2 && differences[1]===differences[0]+1 && a[differences[0]]===b[differences[1]] && a[differences[1]]===b[differences[0]];
  }
  const [short,long]=a.length<b.length?[a,b]:[b,a];
  let i=0,j=0,skipped=false;
  while(i<short.length && j<long.length) {
    if(short[i]===long[j]) {i++;j++;}
    else {if(skipped)return false;skipped=true;j++;}
  }
  return true;
}
export function createQueryProcessor({normalize, vocabulary=new Set(),entities=[],records=[]}={}) {
  const protectedWords=new Set([...language.protectedWords,...guards.words]);
  const targets=[...new Set([...language.fuzzyTargets,...records.flatMap(record=>normalize(record.title).split(' ')).filter(word=>word.length>=4)])].filter(word=>vocabulary.has(word));
  const cache=new Map();
  const compact=new Map();
  function addPhrase(phrase,canonical=phrase) {
    const key=normalize(phrase).replace(/ /g,'');
    if(key.length<5||key.length>100||vocabulary.has(key)||protectedWords.has(key))return;
    const value=normalize(normalize(canonical).split(' ').map(word=>language.wordAliases[word]||word).join(' '));
    if(compact.has(key)&&compact.get(key)!==value)compact.set(key,null);else if(!compact.has(key))compact.set(key,value);
  }
  for(const phrase of ['where are you','how many campus','how many campuses','all campus','book a tour','how to apply','opening hours','school time','open time','how much','global education','parent portal'])addPhrase(phrase);
  for(const record of records) {
    for(const phrase of [record.title,`tell me about ${record.title}`,`what is ${record.title}`,`where can i read about ${record.title}`])addPhrase(phrase);
    for(const role of record.entity?.roleAliases||[])for(const prefix of ['who is','who','what is','please tell me'])addPhrase(`${prefix} ${role}`,`${prefix} ${record.entity.role}`);
  }
  for(const entity of entities)for(const alias of entity.aliases||[]) {
    addPhrase(alias);
    for(const prefix of ['who is','where is','tell me about','please'])addPhrase(`${prefix} ${alias}`);
    if(['campus','organization','school','nursery'].includes(entity.kind))for(const field of ['phone','email','address','hours','timing','open time','contact','number','programs','admission']) {
      addPhrase(`${alias} ${field}`);addPhrase(`${field} ${alias}`);addPhrase(`what is ${alias} ${field}`);
    }
  }


  // Bounded word breaking uses only approved entity/topic words and visitor
  // grammar. Every character must resolve; an unknown name is never discarded.
  const segmentWords=new Set([
    'a','i',...Object.keys(language.wordAliases),...language.fuzzyTargets,
    ...entities.flatMap(entity=>entity.aliases.flatMap(alias=>normalize(alias).split(' '))),
    ...records.flatMap(record=>(record.entity?.roleAliases||[]).flatMap(alias=>normalize(alias).split(' '))),
    ...'who whos what whats where which how many is are does do you your the of for have all time open hrs phone email contact timing campus campuses nursery school schools programs admission docs required documents book tour duration long take can visit fee fees cost costs join ages available tell me about library mission values curriculum stand global education services related and president director md vp ceo shk'.split(' ')
  ].filter(word=>/^(?:[a-z]{2,}|a|i)$/.test(word)));
  function splitKnown(word) {
    if(word.length<5||word.length>40||protectedWords.has(word)||vocabulary.has(word))return null;
    const paths=Array.from({length:word.length+1},()=>[]);paths[0]=[[]];
    for(let end=1;end<=word.length;end++)for(let start=0;start<end;start++) {
      const part=word.slice(start,end);if(!segmentWords.has(part))continue;
      for(const path of paths[start])if(path.length<9)paths[end].push([...path,part]);
      if(paths[end].length>20)paths[end]=paths[end].sort((a,b)=>a.length-b.length).slice(0,20);
    }
    const options=paths[word.length].filter(path=>path.length>1).sort((a,b)=>a.length-b.length);
    if(!options.length)return null;
    const best=options.filter(path=>path.length===options[0].length);
    return best.length===1?best[0].map(part=>language.wordAliases[part]||part).join(' '):null;
  }

  return input=>{
    const original=String(input??'').slice(0,2000);
    const normalized=normalize(original);
    const corrections=[];
    const pieces=normalized.split(' ').map((word,index)=>{
      if(index>=100 || !word || word.length>40 || !/^[a-z0-9]+$/.test(word))return word;
      const joined=compact.get(word)||(!language.wordAliases[word]&&!targets.some(target=>target[0]===word[0]&&oneEdit(word,target))?splitKnown(word):null);
      if(joined) {corrections.push({from:word,to:joined,kind:'spacing'});return joined;}
      const alias=language.wordAliases[word];
      if(alias) {corrections.push({from:word,to:alias,kind:'alias'});return alias;}
      if(word.length<5 || protectedWords.has(word) || vocabulary.has(word))return word;
      if(!cache.has(word)) {
        const matches=targets.filter(target=>target[0]===word[0] && oneEdit(word,target));
        // Several spellings which reduce to the same singular are equivalent;
        // different possible topics require the visitor to clarify instead.
        const families=new Set(matches.map(target=>target.length>5&&target.endsWith('s')?target.slice(0,-1):target));
        cache.set(word,families.size===1?matches.sort((a,b)=>a.length-b.length)[0]:word);
        if(cache.size>256)cache.delete(cache.keys().next().value);
      }
      const corrected=cache.get(word);
      if(corrected!==word)corrections.push({from:word,to:corrected,kind:'spelling'});
      return corrected;
    });
    let text=pieces.join(' ');
    for(const [from,to] of language.phraseAliases) {
      // All patterns are trusted local literal words, not visitor regexes.
      const pattern=new RegExp(`\\b${from}\\b`,'g');
      if(pattern.test(text)) {text=text.replace(pattern,to);corrections.push({from,to,kind:'phrase'});}
    }
    const phrasing=[
      [/^(?:please\s+)+/,''],
      [/^(?:can|could|would) (?:you )?(?:please )?(?:tell me about|explain|show me|tell me) /,'tell me about '],
      [/^(?:i (?:want|would like) to know about|i am looking for|looking for|help me understand|need details on|any details about|do you have information on|more about) /,'tell me about '],
      [/^(?:what does (?:the )?(?:website|site) say about|where can i read about|explain) /,'tell me about '],
      [/\s+(?:please|pls|info|information|details)$/,'']
    ];
    for(const [pattern,to] of phrasing)if(pattern.test(text)&&!(pattern.source.includes('information|details')&&records.some(record=>text.endsWith(normalize(record.title))))) {const from=text;text=text.replace(pattern,to);corrections.push({from,to:text,kind:'wording'});}
    // Interpret conversational wrappers only when the complete remaining text
    // names a published heading. Extra qualifiers never disappear.
    const canonicalTopic=value=>normalize(value).split(' ').map(word=>language.wordAliases[word]||(word==='admissions'?'admission':word)).join(' ');
    const frames=[
      /^(?:(?:hi|hey) )?(?:(?:can|could|would) you )?(?:give (?:me )?(?:a |an |the )?(?:summary|overview) of|(?:please )?describe|guide to|understand|overview of|summary of|meaning of|details on|more on|help with|find|need|tell me|information about|show information about|i have a question about|what should parents know about|what information is published about|i would like information about|i need to understand|i am interested in|just wondering about|any idea about|need a bit of info about|id like to know about|wanna know about|im looking into|lemme know about|hey any info on|hi tell me more about|tell me more about|tell me about|i want to know about|what do you mean by|can i learn more about|where can i find details on|i need help with|got details on|show|hi tell me more about) /,
      /^how does (.+) work$/,
      /^what is (.+) about$/,
      /^(.+) (?:summary|overview|explained)$/
    ];
    const prefixes=['about','tell me more about','give details about','what can you tell me about','need a bit of info about','hi tell me more about','hey tell me more about','i want to know','information about','please identify','identify','can i learn more about','what do you mean by','tell me about','need','show','tell me'];
    for(const prefix of prefixes.sort((a,b)=>b.length-a.length)) {
      if(!text.startsWith(prefix+' '))continue;
      const candidate=text.slice(prefix.length+1);
      const title=records.find(record=>canonicalTopic(record.title)===canonicalTopic(candidate));
      if(title){const before=text;text=`tell me about ${normalize(title.title)}`;corrections.push({from:before,to:text,kind:'wording'});break;}
    }
    for(const frame of frames) {
      const match=text.match(frame);if(!match)continue;
      const candidate=match[1]||text.replace(frame,'');
      const title=records.find(record=>canonicalTopic(record.title)===canonicalTopic(candidate));
      if(title) {const before=text;text=`tell me about ${normalize(title.title)}`;corrections.push({from:before,to:text,kind:'wording'});break;}
    }
    const heading=text.replace(/^tell me about /,'');
    const exactHeading=records.find(record=>canonicalTopic(record.title)===canonicalTopic(heading));
    if(exactHeading)text=(text.startsWith('tell me about ')?'tell me about ':'')+normalize(exactHeading.title);
    else {
      // A short misspelling can be disambiguated by a complete published
      // heading. Require every other token and the word order to match; never
      // rewrite an existing word, a person's name or multiple uncertain words.
      const inputTokens=canonicalTopic(heading).split(' ');
      const matches=records.filter(record=>record.entity?.kind!=='person').filter(record=>{
        const target=canonicalTopic(record.title).split(' ');
        if(target.length!==inputTokens.length)return false;
        const differing=inputTokens.map((word,index)=>word===target[index]?-1:index).filter(index=>index>=0);
        if(differing.length!==1)return false;
        const index=differing[0],word=inputTokens[index];
        return word.length>=3&&!protectedWords.has(word)&&!vocabulary.has(word)&&oneEdit(word,target[index]);
      });
      const headings=new Set(matches.map(record=>canonicalTopic(record.title)));
      if(headings.size===1){const before=text;text=(text.startsWith('tell me about ')?'tell me about ':'')+normalize(matches[0].title);corrections.push({from:before,to:text,kind:'contextual-spelling'});}
    }
    return {original,text:normalize(text),corrections};
  };
}
