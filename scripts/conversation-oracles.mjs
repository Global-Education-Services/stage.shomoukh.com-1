/** Source-based assertions for each preceding turn of the fixed context paths.
 * This module deliberately has no chatbot/runtime imports. An unsupported path
 * fails generation rather than silently skipping its preceding-turn checks. */
const normalize=value=>value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export function buildSetupExpectations(knowledge,setup) {
 const entities=knowledge.entityIndex?.entities||[];
 const campuses=entities.filter(entity=>entity.kind==='campus');
 const records=new Map(knowledge.records.map(record=>[record.id,record]));
 const record=id=>{const result=records.get(id);if(!result)throw new Error(`Missing source record for conversation oracle: ${id}`);return result;};
 const answer=(all,sourceUrls,any=[],none=[])=>({expectedStatuses:['answer'],sourceUrls:[...new Set(sourceUrls)],all,any,none});
 const sourceAttribute=(campus,field)=>{
  const facts=campus.attributes[field]||[];
  if(!facts.length)throw new Error(`Missing ${field} facts for ${campus.id}`);
  return answer(facts.map(fact=>fact.value),facts.map(fact=>fact.url),[],campuses.filter(other=>other.id!==campus.id).flatMap(other=>['phone','email'].flatMap(key=>(other.attributes[key]||[]).map(fact=>fact.value))));
 };
 let activeCampus=null;
 return setup.map(turn=>{
  const question=typeof turn==='string'?turn:turn.question;
  const text=normalize(question);
  const campus=campuses.find(entity=>entity.aliases.some(alias=>text===normalize(alias)||['tell me about ','what about ','switch to '].some(prefix=>text===prefix+normalize(alias))));
  if(campus){
   activeCampus=campus;
   const attrs=['address','phone','email','hours'].flatMap(field=>campus.attributes[field]||[]);
   // The source heading or entity scope can name the campus; its body must
   // still supply that campus's actual contacts, never the other campus.
   const equivalent=knowledge.records.filter(fact=>fact.title===campus.name&&fact.answer.includes(campus.attributes.phone[0].value)&&fact.answer.includes(campus.attributes.email[0].value));
   return answer(['phone','email'].flatMap(field=>(campus.attributes[field]||[]).map(fact=>fact.value)),[...attrs.map(fact=>fact.url),...equivalent.map(fact=>fact.url)],[],campuses.filter(other=>other.id!==campus.id).flatMap(other=>(other.attributes.phone||[]).map(fact=>fact.value)));
  }
  if(['phone','email','address','hours','opening hours'].includes(text)){
   if(!activeCampus)throw new Error(`Campus attribute turn has no established campus: ${question}`);
   return sourceAttribute(activeCampus,text==='opening hours'?'hours':text);
  }
  if(text==='fees'){
   if(!activeCampus)throw new Error('Campus fee oracle requires a preceding campus.');
   return {expectedStatuses:['unknown'],sourceUrls:[],all:[],any:['fee','tuition'],none:[]};
  }
  if(text==='who is julanda'||text==='who is md'){
   activeCampus=null;
   const fact=record(text==='who is julanda'?'ges-julanda':'ges-jinan');
   return answer([fact.title,fact.entity.role],[fact.url]);
  }
  if(text==='ges'){
   activeCampus=null;
   const fact=record('ges-group');
   return answer(['Global Education Services','2012'],[fact.url]);
  }
  if(text==='sips'){
   activeCampus=null;
   const fact=record('ges-sips');
   return answer(['Al Shomoukh International Private School','Hay Al Hail','2015','K–12'],[fact.url]);
  }
  if(text==='programs'){
   activeCampus=null;
   const fact=record('programs-2b1ce89409');
   const equivalent=knowledge.records.filter(candidate=>/EYFS/i.test(candidate.answer)&&/Reggio/i.test(candidate.answer)&&['/#programs','/programs.html#eyfs'].includes(candidate.url));
   return answer(['EYFS','Reggio'],[fact.url,...equivalent.map(candidate=>candidate.url)]);
  }
  if(text==='campuses'){
   activeCampus=null;
   return answer(campuses.map(entity=>entity.name),[...campuses.flatMap(entity=>['address','phone','email'].flatMap(field=>(entity.attributes[field]||[]).map(fact=>fact.url))),record('ges-institutions').url]);
  }
  if(text==='registration'){
   const admissions=knowledge.records.filter(fact=>fact.url==='/admissions.html'||fact.url==='/apply-online.html'||fact.url.startsWith('/admissions.html#step'));
   return answer([],admissions.map(fact=>fact.url),['enrollment','application','ongoing']);
  }
  if(text==='tour'){
   const visit=knowledge.records.filter(fact=>fact.url.startsWith('/book-a-visit.html')||fact.title==='Book a Tour');
   return answer([],visit.map(fact=>fact.url),['tour','visit']);
  }
  throw new Error(`Unannotated preceding conversation turn: ${question}`);
 });
}
