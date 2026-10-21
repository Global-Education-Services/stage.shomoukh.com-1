/** Typed public entity/attribute lookup layered ahead of existing retrieval.
 * A source assertion belongs to exactly one entity; absent attributes never
 * fall back to an unrelated campus, person, or school. */
export function createEntityResolver({index,records,normalize}) {
 const entities=index?.entities||[],byRecord=new Map(records.map(record=>[record.id,record]));
 const aliases=entities.flatMap(entity=>[...entity.aliases,...(entity.id==='school-sips'?['private school']:[])].map(alias=>({entity,alias:normalize(alias)})));
 const grammar=new Set('a an the is are do does did can could would should i we you your our me my us it its their this that these those what which who when where why how about please tell show give take find want need know more information info details detail explain understand say says website site published read looking for call was start follow follows follow claim home page operating year get share list lists listed until four seven during week weekday weekdays reception enquiry street postal digits dial ring neighbourhood based holds post published job title position serve serves works identify identify current currently company of to in on at and or with from for publish have has available any currently many all both two there name stand stands mean means called'.split(' '));
 const fieldWords=new Set('phone number contact telephone tel ph email mail address location map maps campus campuses branch branches timing timings time times hours hour hrs open opening close closing schedule schedules office working nursery school nursery schools nurseries institution institutions count old founded established age curriculum teaches follow program programs education'.split(' '));
 const referenced=items=>[...new Set(items.flatMap(item=>item?.recordIds||item?.recordId?[...(item.recordIds||[]),...(item.recordId?[item.recordId]:[])]:[]))].map(id=>byRecord.get(id)).filter(Boolean);
 const campusReferences=campuses=>campuses.flatMap(entity=>Object.values(entity.attributes).flat());
 const find=id=>entities.find(entity=>entity.id===id);
 function reply(text,status,intent,items,entityIds=[]) {return {text,status,intent,selected:referenced(items),entityIds};}
 function attributes(entity,key) {return entity?.attributes?.[key]||[];}
 function renderCampus(entity,field) {
  if(field==='hours')return `${entity.name}: ${attributes(entity,'hours').map(fact=>fact.value).join('; ')}`;
  return `${entity.name}\n${['address','phone','email','hours'].flatMap(key=>attributes(entity,key).map(fact=>`${key==='phone'?'Phone: ':key==='email'?'Email: ':key==='hours'?'Published office hours: ':''}${fact.value}`)).join('\n')}`;
 }
 return (text,memory={})=>{
  let words=text.split(' ');const padded=` ${text} `;
  const negated=aliases.filter(item=>padded.includes(` not ${item.alias} `)).map(item=>item.entity.id);
  const mentions=aliases.filter(item=>padded.includes(` ${item.alias} `)&&!negated.includes(item.entity.id));
  // A named school/campus is more specific than the Shomoukh word in its name.
  const specific=mentions.filter(item=>['campus','school','person','program','service'].includes(item.entity.kind)).sort((a,b)=>b.alias.length-a.alias.length);
  const institution=specific.find(item=>['campus','school','person'].includes(item.entity.kind));
  const explicit=institution?.entity||specific[0]?.entity||mentions.sort((a,b)=>b.alias.length-a.alias.length)[0]?.entity;
  const explicitGroup=mentions.some(item=>item.entity.id==='ges');
  const selected=explicit||find(memory.entityId);
  const subjectWords=new Set(mentions.filter(item=>item.entity.id===explicit?.id||['organization','nursery'].includes(item.entity.kind)).flatMap(item=>item.alias.split(' ')));
  const negationWords=new Set(aliases.filter(item=>negated.includes(item.entity.id)).flatMap(item=>item.alias.split(' ')));
  if(negated.length)words=words.filter(word=>word!=='not'&&!negationWords.has(word));
  const residual=words.filter(word=>!subjectWords.has(word)&&!grammar.has(word));
  // Preserve the existing exact-heading contract and source-text behavior.
  const heading=text.replace(/^(?:tell me about|what is|where can i find) /,'');
  const scopedCampusField=!explicit&&selected?.kind==='campus'&&/^(?:campus )?(?:location|address|phone|email|hours)$/.test(heading);
  if(!scopedCampusField&&explicit?.kind!=='school' && records.some(record=>normalize(record.title)===heading))return null;
  let field=/\b(?:phone|number|contact|telephone|tel|ph|ring|dial)\b/.test(text)?'phone':/\b(?:email|mail)\b/.test(text)?'email':/\b(?:address|location|map|neighbourhood|where)\b/.test(text)?'address':/\b(?:timing|timings|time|hours|hrs|open|opening|close|closing|schedule|week)\b/.test(text)?'hours':null;
  if(/\b(?:hours|hrs|timing|opening|schedule)\b/.test(text))field='hours';
  const safeField=residual.every(word=>fieldWords.has(word));
  const campusMentions=[...new Map(mentions.filter(item=>item.entity.kind==='campus').map(item=>[item.entity.id,item.entity])).values()];
  const isCampusList=/\b(?:campus|campuses|branches|locations|nurseries)\b/.test(text)&&!campusMentions.length&&residual.every(word=>fieldWords.has(word));
  if(isCampusList && (selected?.kind!=='campus'||/\b(?:all|both|campuses|branches|locations|nurseries|many)\b/.test(text)) && !explicitGroup && selected?.id!=='ges' && !/\b(?:phone|email|hours|timing|fees|fee)\b/.test(text)) {
   const campuses=entities.filter(entity=>entity.kind==='campus'&&entity.parentId==='shomoukh');
   if(campuses.length) return reply(`Shomoukh has ${campuses.length===2?'two':campuses.length} published nursery campuses in Muscat:\n\n${campuses.map(entity=>renderCampus(entity)).join('\n\n')}`,'answer','location',campusReferences(campuses),['shomoukh']);
  }
  if(explicitGroup && !campusMentions.length && mentions.some(item=>item.entity.id==='shomoukh') && !/\b(?:fees|fee|phone|email|hours|schedule|ceo|md|vp|director)\b/.test(text)) {const fact=byRecord.get('ges-shomoukh');if(fact)return reply(fact.answer,'answer','organization',[{recordId:fact.id}],['shomoukh','ges']);}
  const group=explicitGroup || memory.entityId==='ges' && !mentions.some(item=>['campus','school','nursery','person'].includes(item.entity.kind));
  if(group) {
   if(/\bfourth\b/.test(text)){const fact=byRecord.get('ges-school-count');if(fact)return reply(fact.answer,'unknown','organization',[{recordId:fact.id}],['ges']);}
   const fact=/\b(?:schools|school|institutions|nurseries|campus|campuses|branches|locations)\b/.test(text)?byRecord.get(/\b(?:many|count|number)\b/.test(text)?'ges-school-count':'ges-institutions'):/\bvision\b/.test(text)?byRecord.get('ges-vision'):/\bmission\b/.test(text)?byRecord.get('ges-mission'):/\b(?:values|elevate)\b/.test(text)?byRecord.get('ges-values'):/\b(?:old|founded|established|age)\b/.test(text)?byRecord.get('ges-group'):null;
   const familyWords=new Set('ges global education services quality school group spell out begin operating year publish claim home page schools school institutions nurseries campus campuses branches locations vision mission values elevate old founded established age count number'.split(' '));
   if(fact&&words.every(word=>grammar.has(word)||familyWords.has(word)))return reply(fact.answer,'answer','organization',[{recordId:fact.id}],['ges']);
   if(!campusMentions.length && !explicit?.id?.startsWith('person-') && /\b(?:fees|fee|admission|admissions|apply|programs|curriculum|transport|bus|eligibility|enrolment|registration|tour|visit|calendar)\b/.test(text))return reply('The reviewed GES group sources do not publish that group-specific detail about programs, admissions or services. Do you mean the Shomoukh nursery campuses or Al Shomoukh International Private School? Their information must be checked separately.','clarify','organization',[find('ges')],['ges']);
   if(field&&safeField&&!campusMentions.length&&!/\b(?:school|class|program|programme)\b/.test(text))return reply('The reviewed GES group sources do not publish the requested office contact details or schedule. Please check with GES directly; nursery campus details are separate.','unknown',field==='hours'?'hours':'contact',[find('ges')],['ges']);
  }
  if(explicit?.id==='ges'&&residual.length===0) {const fact=byRecord.get('ges-group');if(fact)return reply(fact.answer,'answer','organization',[{recordId:fact.id}],['ges']);}
  if(explicit?.id==='shomoukh'&&residual.length===0) {
   const fact=records.find(record=>record.title==='Welcome to Shomoukh Nursery Schools'&&!record.confidence.conflicts?.length);
   if(fact)return reply(`${explicit.name}. ${fact.answer.split(/(?<=\.)\s+/).slice(0,3).join(' ')}`,'answer','about',[{recordId:fact.id}],['shomoukh']);
  }
  // A school remains the subject of short follow-ups even when the noun
  // (for example curriculum) also happens to be a nursery topic alias.
  const previousSchool=find(memory.entityId);
  const switchesInstitution=mentions.some(item=>['campus','school','organization','nursery','person'].includes(item.entity.kind));
  const school=explicit?.kind==='school'?explicit:previousSchool?.kind==='school'&&!switchesInstitution?previousSchool:null;
  if(school) {
   const fact=referenced([school])[0];if(!fact)return null;
   const academic=/\b(?:program|programs|programme|curriculum|education|founded|established)\b/.test(text);
   if((field||academic||explicit?.id===school.id&&residual.length===0)&&safeField) {
    if(field==='address'||academic||!field)return reply(fact.answer,'answer','organization',[school],[school.id]);
    return reply(`The reviewed source identifies ${school.name}, but does not publish its ${field==='hours'?'opening schedule':field==='phone'?'phone number':field}. Please confirm with the school; nursery campus details cannot establish this information.`,'unknown',field==='hours'?'hours':'contact',[school],[school.id]);
   }
   if(/\b(?:admission|admissions|apply|registration|tour|visit|fees|fee|transport|bus)\b/.test(text))return reply(`The reviewed source identifies ${school.name}, but does not publish the requested school-specific information. Please confirm with the school; nursery details cannot establish this information.`,'unknown','organization',[school],[school.id]);
  }
  // Programme hours are distinct from the campus office schedule and ages.
  if(/^(?:(?:what is|what are|tell me|show me|please) )?(?:the )?(?:regular )?(?:school|class|program|programme|regular|teaching) (?:time|timing|hours|schedule)$/.test(text)) {
   const programs=entities.filter(entity=>entity.kind==='program'&&entity.id.startsWith('program-')&&attributes(entity,'hours').length);
   const assertions=programs.flatMap(entity=>attributes(entity,'hours'));
   if(assertions.length)return reply(`Published regular programme hours: ${[...new Set(assertions.map(fact=>fact.value))].join('; ')} for the listed infant, toddler and preschool programmes. These are programme hours, separate from campus office hours. Confirm current class arrangements with admissions.`,'answer','hours',assertions,['shomoukh']);
  }
  if((explicit?.kind==='program'||explicit?.kind==='service')&&field==='hours'&&safeField) {
   const facts=attributes(explicit,'hours');
   if(facts.length)return reply(`${explicit.name}: published programme hours ${[...new Set(facts.map(fact=>fact.value))].join('; ')}. Confirm current arrangements with admissions.`,'answer','hours',facts,[explicit.id]);
  }
  const campuses=campusMentions.length?campusMentions:selected?.kind==='campus'&&!/\b(?:all|both|campuses|branches|locations)\b/.test(text)?[selected]:[];
  if(campuses.length&&field==='hours'&&/\b(?:school|class|programme|program)\b/.test(text)&&safeField) {
   const assertions=entities.filter(entity=>entity.kind==='program'&&entity.id.startsWith('program-')).flatMap(entity=>attributes(entity,'hours'));
   return reply(`For ${campuses.map(entity=>entity.name).join(' and ')}, published office hours are ${[...new Set(campuses.flatMap(entity=>attributes(entity,'hours').map(fact=>fact.value)))].join('; ')}. The website separately lists regular programme hours of ${[...new Set(assertions.map(fact=>fact.value))].join('; ')}. Confirm current campus class arrangements with admissions.`,'answer','hours',[...campusReferences(campuses),...assertions],campuses.map(entity=>entity.id));
  }
  if(campuses.length&&(safeField&&field||explicit?.kind==='campus'&&residual.every(word=>['nursery','campus','school','muscat'].includes(word)))) {
   const intent=field==='hours'?'hours':field==='phone'||field==='email'?'contact':'location';
   const missing=campuses.find(entity=>field&&!attributes(entity,field).length);
   if(missing)return reply(`The reviewed source does not publish that detail for ${missing.name}. Please confirm with the campus.`,'unknown',intent,[missing],[missing.id]);
   return reply((field==='hours'?'Published campus office opening hours:\n\n':'')+campuses.map(entity=>renderCampus(entity,field)).join('\n\n'),'answer',intent,campusReferences(campuses),campuses.map(entity=>entity.id));
  }
  return null;
 };
}
