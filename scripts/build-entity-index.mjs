/** Build a public-source-only entity graph from already verified knowledge records.
 * Attributes retain their exact record, source URL and scope; no cross-campus inheritance.
 * Does not execute source files or perform network requests.
 */
const DEFINITIONS = [
  ['ges','organization','Global Education Services (GES)',['ges','global education','global education services','ges quality education'],['Global Education Services (GES)','Education institutions listed by GES','GES vision','GES mission','GES values — ELEVATE','GES published school count']],
  ['shomoukh','nursery','Shomoukh Early Childhood Education',['shomoukh','shomoukh nursery','shomoukh ece','shomoukh nursery schools'],['Welcome to Shomoukh Nursery Schools','About Shomoukh Early Childhood Education','Shomoukh and GES']],
  ['campus-mouj','campus','Al Mouj Campus',['mouj','al mouj','almouj','al mouj nursery','mouj campus','al mouj muscat'],['Al Mouj Campus','Al Mouj Muscat','Shomoukh ECE Al Mouj Campus — GES listing']],
  ['campus-qurum','campus','Al Qurm Campus',['qurm','qurum','al qurm','al qurum','alqurum','alqurm','shatti al qurm','shatti al qurum','qurm nursery'],['Al Qurm Campus','Shatti Al Qurm','Shomoukh ECE Al Qurum Campus — GES listing']],
  ['school-sips','school','Al Shomoukh International Private School (SIPS)',['sips','al shomoukh international private school','shomoukh international school'],['Al Shomoukh International Private School (SIPS)']],
  ['program-infants','program','Infants',['infant','infants','baby','babies'],['Infants (3–11 months)']],
  ['program-toddlers','program','Toddlers',['toddler','toddlers'],['Toddlers (12–35 months)']],
  ['program-preschoolers','program','Preschoolers',['preschool','preschooler','preschoolers'],['Preschoolers (36–48 months)']],
  ['service-flex-care','service','Flex-Care',['flex care','flexcare','extended care','pre care','after care'],['Flex-Care (6–48 months)']],
  ['service-tour','service','Campus tours',['tour','tours','visit','booking','book tour'],['Schedule a Campus Visit','45-Minute Guided Tour','Book Your Visit','Bring Your Child']],
  ['service-admissions','service','Admissions and registration',['admissions','admission','apply','registration','enrollment','enrolment'],['Admissions & Enrollment','Education for Your Child at Shomoukh','Online Enrollment Application','Three Steps to Enrollment']],
  ['service-parent-portal','service','Parents portal',['parents portal','parent portal','parent app','login'],['Shomoukh Parents Portal','Web-App','iOS App','Android App','First Time Logging In?']],
  ['service-transport','service','Transportation request',['transport','transportation','bus','bus service'],['Transportation Details']],
  ['program-eyfs','curriculum','UK Early Years Foundation Stage (EYFS)',['eyfs','uk eyfs','early years foundation stage','curriculum'],['Our Programs & UK EYFS','Proven Approach to Education']],
  ['program-reggio','curriculum','Reggio Emilia approach',['reggio','reggio emilia','reggio approach'],['Reggio Emilia Approach','Reggio Emilia','Welcome to Shomoukh Nursery Schools']],
  ['service-summer','program','Summer camp',['summer','summer camp','holiday camp'],['12-Month Continuous Learning','Academic Year Selection']],
  ['service-language','program','Second language',['second language','arabic','english','bilingual'],['Second Language']],
  ['service-movement','program','Movement Matters',['movement matters','yoga','gymnastics'],['Movement Matters']],
  ['service-literacy','program','Handwriting and pre-literacy',['handwriting','pre literacy','literacy','writing'],['Handwriting & Pre-Literacy']],
  ['atelier-clay','enrichment','Clay Atelier',['clay','clay atelier','sculpting'],['Clay Atelier','Art and Clay Ateliers']],
  ['atelier-art','enrichment','Art Atelier',['art','art atelier','painting'],['Art Atelier','Art and Clay Ateliers']],
  ['atelier-light','enrichment','Digital and Light Atelier',['digital','light','digital atelier','light atelier','shadows'],['Digital & Light Atelier','Digital / Light Atelier']],
  ['enrichment-project','enrichment','Project-based learning',['project based learning','project approach','projects'],['Project-Based Learning','Project Approach']],
  ['enrichment-tiny-town','enrichment','Tiny Town',['tiny town','pretend play','roleplay'],['Tiny Town','Pretend Play Areas – Tiny Towns']],
  ['enrichment-sensory','enrichment','Sensory play',['sensory','sensory play'],['Sensory Play']],
  ['enrichment-music','enrichment','Music and movement',['music','dance','singing'],['Music & Movement']],
  ['enrichment-drama','enrichment','Drama, puppetry and PE',['drama','puppetry','pe','sports','physical education'],['Drama, Puppetry & PE','Drama, Puppetry & ECA / PE','Drama & ECA / PE','Drama Room']],
  ['space-gym','facility','Indoor Gymnasium',['gym','gymnasium','indoor gym'],['Indoor Gymnasium']],
  ['space-playground','facility','Playgrounds',['playground','playgrounds','indoor playground','outdoor playground'],['Indoor Playground','Modern Outdoor Playgrounds']],
  ['space-library','facility','Library',['library','books'],['Library']],
  ['space-clinic','facility',"Nurse's Clinic",['nurse','clinic','medical'],["Nurse's Clinic"]],
  ['space-sand','facility','Sand kitchens',['sand','sand kitchens'],['Sand Kitchens']],
  ['space-classrooms','facility','Classrooms',['classroom','classrooms'],['Spacious Classrooms With Natural Light','Sunlit Classrooms']],
  ['space-garden','facility','Organic garden',['garden','organic garden'],['Organic Garden','The Organic Garden']],
  ['space-piazza','facility','Central Piazza',['piazza','central square'],['Piazza (Central Square)','The Central Piazza']],
  ['service-calendar','service','Academic calendar',['calendar','term dates','events','school calendar'],['Academic Calendar']],
  ['service-pickup','service','Attendance and pick-up',['pickup','pick up','attendance'],['Attendance & Pick-up']],
  ['service-messaging','service','Parent messaging',['messaging','teacher messages','parent messages'],['Direct Messaging']],
  ['service-stories','service','Learning stories and photos',['photos','learning stories','portfolios'],['Learning Stories & Photos']],
];
const NAME_ALIASES = {
  'ges-julanda':['julanda','sheikh julanda','shk julanda','julanda al hashmi','julandah'],
  'ges-janat':['janat','sheikha janat','janat al hashmi'],
  'ges-jinan':['jinan','sheikha jinan','jinan al hashmi'],
};
export function buildEntityIndex({records, reviewedAt = '2026-10-18'} = {}) {
  if (!Array.isArray(records)) throw new TypeError('Verified knowledge records are required');
  const verified = records.filter(record => record.confidence?.verified === true);
  const byId = new Map(verified.map(record=>[record.id,record]));
  const entities = [];
  function make(id,kind,name,aliases,recordIds) {
    const refs=[...new Set(recordIds)].filter(id=>byId.has(id));
    if(!refs.length)return null;
    const entity={id,kind,name,aliases:[...new Set([name.toLowerCase(),...aliases])],recordIds:refs,attributes:{},sourceUrls:[...new Set(refs.map(id=>byId.get(id).url))]};
    entities.push(entity);return entity;
  }
  for(const [id,kind,name,aliases,titles] of DEFINITIONS)make(id,kind,name,aliases,verified.filter(r=>titles.includes(r.title)).map(r=>r.id));
  for(const record of verified.filter(record=>record.entity?.kind==='person')) {
    const entity=make(`person-${record.id.replace(/^ges-/,'')}`,'person',record.title,[...(record.entity.aliases||[]),...(NAME_ALIASES[record.id]||[])],[record.id]);
    entity.organizationId='ges';
    entity.attributes.role=[{value:record.entity.role,recordId:record.id,url:record.url,scope:'ges',conflicts:[]}];
    entity.roleAliases=record.entity.roleAliases||[];
  }
  const find=id=>entities.find(entity=>entity.id===id);
  const relationships=[];
  function relation(from,type,to,recordIds) {
    if(!find(from)||!find(to))return;
    const refs=recordIds.filter(id=>byId.has(id)); if(!refs.length)return;
    relationships.push({from,type,to,recordIds:refs,sourceUrls:[...new Set(refs.map(id=>byId.get(id).url))]});
  }
  relation('shomoukh','listedBy','ges',['ges-shomoukh']);
  relation('school-sips','listedBy','ges',['ges-sips']);
  for(const [id,fact] of [['campus-mouj','ges-mouj'],['campus-qurum','ges-qurum']]) {
    const campus=find(id); if(!campus)continue;campus.parentId='shomoukh';campus.organizationId='shomoukh';
    relation(id,'campusOf','shomoukh',campus.recordIds.filter(r=>byId.get(r).sourceReference?.file==='contact.html' && byId.get(r).title===campus.name));
    relation(id,'listedBy','ges',[fact,'ges-shomoukh']);
    // Only the dedicated campus contact card is authoritative for contact/hours.
    const record=verified.find(r=>r.title===campus.name&&r.sourceReference?.file==='contact.html');
    if(!record)continue;
    const assertions={phone:record.answer.match(/\+968\s*\d{8}/)?.[0],email:record.answer.match(/[\w.-]+@[\w.-]+\.[a-z]+/i)?.[0],address:record.answer.split(/\+968/)[0].trim(),hours:record.answer.match(/Sun\s*[–-]\s*Thu:\s*[^]*$/)?.[0]};
    for(const [attribute,value]of Object.entries(assertions))if(value)campus.attributes[attribute]=[{value,recordId:record.id,url:record.url,scope:id,conflicts:[]}];
  }
  for(const entity of entities) {
    if(entity.kind==='person'){relation(entity.id,'managementOf','ges',entity.recordIds);continue;}
    if(!['program','service','curriculum','enrichment','facility'].includes(entity.kind))continue;
    entity.organizationId='shomoukh'; relation(entity.id,'publishedBy','shomoukh',entity.recordIds);
    for(const recordId of entity.recordIds) {
      const record=byId.get(recordId);
      for(const [attribute,regex] of [['hours',/(?:Regular Hours|Extended Hours|Hours):\s*([\d:]+\s*[AP]M\s*[–-]\s*[\d:]+\s*[AP]M)/i],['ageRange',/\((\d+\s*[–-]\s*\d+\s*months)\)/i]]) {
        const match=(attribute==='ageRange'?record.title:record.answer).match(regex);if(!match)continue;
        (entity.attributes[attribute]??=[]).push({value:match[1],recordId,url:record.url,scope:entity.id,conflicts:attribute==='ageRange'?['age-range']:[]});
      }
    }
  }
  const assertions=entities.flatMap(entity=>Object.entries(entity.attributes).flatMap(([attribute,facts])=>facts.map(fact=>({entityId:entity.id,attribute,...fact}))));
  return {version:1,reviewedAt,entities,relationships,assertions,conflicts:[{id:'age-range',description:'Local published age ranges and GES Qurum age descriptions differ. Confirm eligibility with admissions.'},{id:'qurum-address-spelling',description:'GES uses Al Saruj St.; the local Shomoukh contact source uses Al Suraj St. Local source supplies the full address.'}],statistics:{entities:entities.length,relationships:relationships.length,verifiedAttributeAssertions:assertions.length,uniqueAttributeFacts:new Set(assertions.map(fact=>JSON.stringify([fact.entityId,fact.attribute,fact.value]))).size,knowledgeRecords:verified.length},scopeNotes:['Relationships are publication/listing relationships, not inferred legal ownership.','Program and facility records apply to the nursery; campus-specific availability is not inferred.','Phone, email and office hours come only from each dedicated local campus contact card.','Knowledge records are source sections; assertion count covers only explicitly extracted role, phone, email, address, hours and age attributes, not every atomic fact in prose.']};
}
