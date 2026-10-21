/** Local extractive retrieval. No network, HTML generation, or executable user input. */
import { isApprovedExternalSource } from './source-policy.js';
import { resolveRoleQuery } from './role-resolver.js';
import { createEntityResolver } from './entity-resolver.js';
import { createQueryProcessor } from './query-processor.js';
const STOP = new Set('a an the is are am be been being do does did can could would should i we you your our me my us it its this that these those there here their what which who when where why how about please tell show give take find want need know more information details of for to in on at and or with from have has available any currently arrange page pages website offer offers offering provide'.split(' '));
const ALIASES = {
  map: 'location', maps: 'location', ph: 'phone', tel: 'phone', addr: 'location', loc: 'location', hrs: 'hour', docs: 'document', qrum: 'qurm', camps: 'campus',
  programmes: 'program', programs: 'program', programme: 'program', curriculum: 'curriculum', courses: 'program', course: 'program', classes: 'program', class: 'program',
  services: 'program', service: 'program', offer: 'program', offers: 'program', offering: 'program', provide: 'program',
  cost: 'fee', costs: 'fee', price: 'fee', prices: 'fee', pricing: 'fee', fees: 'fee', tuition: 'fee', charges: 'fee',
  enrolling: 'admission', enroll: 'admission', enrol: 'admission', enrollment: 'admission', enrolment: 'admission', register: 'admission', registration: 'admission', admissions: 'admission', join: 'admission', application: 'apply',
  address: 'location', located: 'location', locations: 'location', campuses: 'campus', branches: 'campus', branch: 'campus',
  telephone: 'phone', number: 'phone', call: 'phone', contact: 'contact', email: 'email', e: 'email',
  visit: 'tour', visits: 'tour', visiting: 'tour', schedule: 'schedule', book: 'book', booking: 'book',
  babies: 'infant', baby: 'infant', infants: 'infant', toddlers: 'toddler', preschoolers: 'preschool', preschooler: 'preschool',
  hours: 'hour', opening: 'hour', timings: 'hour', timing: 'hour', schedules: 'schedule',
  facilities: 'space', facility: 'space', spaces: 'space', rooms: 'space', room: 'space', playground: 'garden', outdoor: 'garden',
  activities: 'enrichment', activity: 'enrichment', enrichments: 'enrichment', ateliers: 'atelier',
  location: 'location', nursery: 'nursery', school: 'nursery', teachers: 'teacher', staff: 'teacher',
  mission: 'mission', vision: 'vision', philosophy: 'philosophy', safety: 'safety', safe: 'safety',
  careers: 'career', jobs: 'career', job: 'career', vacancies: 'career', vacancy: 'career', employment: 'career',
  years: 'year', months: 'month', ages: 'age', old: 'age', children: 'child', kids: 'child',
  documents: 'document', documentation: 'document', required: 'requirement', requirements: 'requirement',
  buses: 'transportation', bus: 'transportation', transport: 'transportation',
  qurm: 'qurm', qurum: 'qurm', mouj: 'mouj', parents: 'parent', portal: 'portal', app: 'portal',
};
const INTENTS = {
  fees: ['fee'], transportation: ['transportation'], apply: ['apply', 'admission'], visit: ['tour', 'book'], contact: ['contact', 'phone', 'email'],
  location: ['location', 'campus', 'direction', 'map'], hours: ['hour', 'schedule', 'weekend'],
  programs: ['program', 'curriculum', 'infant', 'toddler', 'preschool', 'eyfs', 'reggio'],
  ages: ['age', 'month'], facilities: ['space', 'garden', 'piazza'], enrichment: ['enrichment', 'atelier', 'music', 'art', 'clay'],
  leadership: ['leadership', 'director', 'principal', 'manager'], careers: ['career'],
  about: ['about', 'mission', 'vision', 'philosophy', 'history', 'values'], safety: ['safety', 'health'], parents: ['parent', 'portal'],
};
export function normalizeText(text) {
  return String(text ?? '').normalize('NFKC').toLowerCase().replace(/([\p{L}])[’']s\b/gu, '$1').replace(/[’']/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().replace(/\b(?:shk|shkh|sheik|shiekh)\b/g, 'sheikh').replace(/\b(?:phone|contact|ph|tel) (?:no|num)\b/g, 'phone');
}
export function tokenize(text) {
  return normalizeText(text).split(' ').filter(word => word && !STOP.has(word)).map(word => ALIASES[word] || (word.length > 5 && word.endsWith('s') ? word.slice(0, -1) : word));
}
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (Math.min(...row) > max) return max + 1;
    previous = row;
  }
  return previous[b.length];
}
const unique = values => [...new Set(values)];
const clean = value => String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const safeURL = url => typeof url === 'string' && /^\/(?!\/)[a-z0-9/_-]*(?:\.html)?(?:#[a-z0-9_-]+)?$/i.test(url);
const intentOf = tokens => Object.keys(INTENTS).find(intent => tokens.some(token => INTENTS[intent].includes(token))) || 'search';
const CONTACT_QUESTION = 'How can I contact you?';

export function createChatEngine(knowledge = {}) {
  const pages = Array.isArray(knowledge.pages) ? knowledge.pages : [];
  const approvedURLs = new Set(pages.map(page => page.url).filter(safeURL));
  const allowedSource = url => safeURL(url) || isApprovedExternalSource(url, knowledge);
  const inputRecords = Array.isArray(knowledge.records) ? knowledge.records : [];
  const records = inputRecords.filter(record => record.language === 'en' && record.confidence?.verified === true && allowedSource(record.url) && (isApprovedExternalSource(record.url, knowledge) || !pages.length || approvedURLs.has(record.url) || approvedURLs.has(record.url.split('#')[0])) && clean(record.answer)).map(record => {
    const titleTokens = tokenize([record.title, record.question, ...(record.alternativeQuestions || []), ...(record.keywords || [])].join(' '));
    const tokens = tokenize(`${titleTokens.join(' ')} ${record.answer}`);
    const frequencies = new Map();
    for (const token of tokens) frequencies.set(token, (frequencies.get(token) || 0) + 1);
    return {...record, answer: clean(record.answer), title: clean(record.title || record.question), titleTokens: new Set(titleTokens), frequencies, length: tokens.length};
  });
  const vocabulary = new Set(records.flatMap(record => [...record.frequencies.keys()]));
  const documentFrequency = new Map();
  for (const record of records) for (const token of record.frequencies.keys()) documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
  const averageLength = records.reduce((sum, record) => sum + record.length, 0) / (records.length || 1);
  let context = null;
  let entityMemory={};
  const resolveEntity=createEntityResolver({index:knowledge.entityIndex,records,normalize:normalizeText});
  const inputVocabulary=new Set([...STOP,...'there teaches along before after until'.split(' '),...vocabulary,...Object.keys(ALIASES),...records.flatMap(record=>normalizeText(`${record.title} ${record.answer}`).split(' '))]);
  const processQuery=createQueryProcessor({normalize:normalizeText,vocabulary:inputVocabulary,entities:knowledge.entityIndex?.entities||[],records});
  function suggestions(intent) {
    const options = [
      ['programs', 'What programs are available?'], ['apply', 'How can I apply?'], ['visit', 'Can I book a tour?'],
      ['location', 'Where are your campuses?'], ['contact', CONTACT_QUESTION], ['facilities', 'What learning spaces do you have?'],
      ['enrichment', 'What enrichment activities are available?'], ['about', 'What is your philosophy?'],
      ['leadership', 'Who is Sheikh Julanda?'],
    ];
    if(intent==='facilities') return ['Tell me about Library','Tell me about The Organic Garden','Can I book a tour?'].filter(question=>question.includes('tour') || records.some(record=>question.endsWith(record.title)));
    if(intent==='enrichment') return ['Tell me about Art Atelier','Tell me about Clay Atelier','Tell me about Music & Movement'].filter(question=>records.some(record=>question.endsWith(record.title)));
    if (intent === 'leadership' || intent === 'organization') return ['Who is the MD of GES?', 'Who is the VP of GES?', 'Who is the CEO of GES?'];
    return options.filter(([key]) => key !== intent && records.some(record => INTENTS[key].some(token => record.frequencies.has(token)))).slice(0, 4).map(([, question]) => question);
  }
  function result(text, status, intent = 'search', confidence = 0, selected = []) {
    const recordIds=unique(selected.map(record=>record.id));
    const scoped=knowledge.entityIndex?.entities.filter(entity=>entity.recordIds.some(id=>recordIds.includes(id)))||[];
    // Fallback contact links are navigation aids, not evidence that an unknown
    // question is about the campus whose contact card happens to be linked.
    const attributable=status==='answer'||status==='clarify'?scoped:scoped.filter(entity=>['person','school','organization'].includes(entity.kind));
    const entityIds=unique(attributable.flatMap(entity=>[entity.id,...(entity.organizationId?[entity.organizationId]:[]),...(entity.parentId?[entity.parentId]:[])]));
    return {text, status, intent, confidence, recordIds, entityIds, language: 'en', sources: unique(selected.map(record => record.url)).map(url => ({url, title: selected.find(record => record.url === url).title})), suggestions: suggestions(intent)};
  }
  function unknown(intent, extra = '') {
    const labels = {fees: 'verified fee amounts', hours: 'the requested opening hours', careers: 'career or vacancy information', leadership: 'the requested leadership details'};
    const campus=context?.entities?.find(entity=>['mouj','qurm'].includes(entity));
    const contact=records.filter(record=>campus ? record.url===`/contact.html#${campus==='mouj'?'almouj':'alqurm'}` : /\/contact\.html/.test(record.url)).slice(0,1);
    return result(`I couldn’t find ${labels[intent] || 'a reliable answer to that question'} in the public website content.${extra ? ` ${extra}` : ''} Please contact the nursery to confirm.`, 'unknown', intent, 0, contact);
  }
  const wordsUnknownCampus=text=>text.split(' ').some(word=>!inputVocabulary.has(word)&&word.length>2);
  function answerProcessed(input) {
    const raw = String(input ?? '').slice(0, 2000);
    const normalized = normalizeText(raw);
    if (!normalized) return result('Please enter a question about the nursery.', 'clarify');
    if (/\p{Script=Arabic}/u.test(raw)) return result('The website knowledge available to me is in English. Please ask in English, or contact the nursery for help in Arabic.', 'unsupported-language');
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)( there)?$/.test(normalized)) return result('Hello! I can help you explore the nursery’s programs, campuses, admissions and other published website information. What would you like to know?', 'greeting');
    if (/^(thanks|thank you|bye|goodbye|cheers)( you)?$/.test(normalized)) return result('You’re welcome. I’m here if you have another question about the nursery.', 'greeting');
    if(/\b(?:available seats|vacant seats|spaces left|remaining seats|current availability)\b/.test(normalized))return unknown('apply','Live availability is not published in the indexed sources.');
    if (!records.length) return result('The website knowledge is unavailable right now. Please use the website navigation to contact the nursery.', 'unknown');
    if(/\bcampus\b/.test(normalized)&&/\bal\b/.test(normalized)&&!/\b(?:mouj|qurm|qurum)\b/.test(normalized)&&wordsUnknownCampus(normalized))return unknown('location','I could not identify that campus. Please specify Al Mouj or Al Qurm.');
    const entityReply=resolveEntity(normalized,entityMemory);
    if(entityReply) {
      const entity=(knowledge.entityIndex?.entities||[]).find(entity=>entity.id===entityReply.entityIds[0]);
      const campus=entity?.kind==='campus'?(entity.id==='campus-mouj'?'mouj':'qurm'):null;
      if(entityReply.entityIds.length) {entityMemory={entityId:entityReply.entityIds[0],topic:entityReply.intent};context={intent:entityReply.intent,entities:campus?[campus]:[],recordId:entityReply.selected[0]?.id,graphEntityIds:entityReply.entityIds};}
      return {...result(entityReply.text,entityReply.status,entityReply.intent,entityReply.status==='answer'?0.96:0,entityReply.selected),entityIds:entityReply.entityIds};
    }
    // A named person is an identity lookup, not a licence to answer every
    // question containing their name with their job title.
    const people=records.filter(record=>record.entity?.kind==='person');
    const words=normalized.split(' ');
    const fullNameMatches=people.map(record=>{
      const full=normalizeText(record.title);
      const variants=[full,full.replace(/^(?:sheikh|sheikha|mr|ms) /,'')];
      return {record,length:Math.max(0,...variants.filter(name=>(' '+normalized+' ').includes(' '+name+' ')).map(name=>name.length))};
    }).filter(match=>match.length).sort((a,b)=>b.length-a.length);
    const namedPeople=fullNameMatches.length ? fullNameMatches.filter(match=>match.length===fullNameMatches[0].length).map(match=>match.record) : people.filter(record=>(record.entity.aliases||[]).some(alias=>{
      const name=normalizeText(alias);
      if((' '+normalized+' ').includes(' '+name+' '))return true;
      return !name.includes(' ') && name.length>=6 && words.some(word=>word[0]===name[0] && editDistance(word,name,1)<=1);
    }));
    const groupMention=/\bges\b|global education services/.test(normalized);
    const identityTerms=new Set('identify role position holds hold published title management name information want know career job occupation work background he his she her ges global education service president vice chairman ceo managing director chief executive officer mr ms sheikh sheikha al'.split(' '));
    const requestedDetails=/\b(?:salary|pay|birthday|born|age|family|wife|husband|son|daughter|married|phone|email|address|appointed|appointment|when|where)\b/.test(normalized);
    const personFollowup=context?.entityId && /\b(?:he|his|she|her)\b/.test(normalized);
    const person=namedPeople.length===1?namedPeople[0]:(personFollowup?people.find(record=>record.id===context.entityId):null);
    if(person) {
      const names=new Set(tokenize([person.title,...person.entity.aliases].join(' ')));
      const leftover=tokenize(normalized).filter(word=>!names.has(word)&&!identityTerms.has(word)&&!words.some(rawWord=>rawWord===word && person.entity.aliases.some(alias=>!alias.includes(' ')&&alias.length>=6&&editDistance(rawWord,alias,1)<=1)));
      if((requestedDetails && !/^where does .+ work$/.test(normalized)) || leftover.length)return result('The official GES source lists this person’s published role, but does not provide those details. For nursery enquiries, please ask for the relevant campus contact.','unknown','leadership',0,[person]);
      context={intent:'leadership',entities:[],recordId:person.id,entityId:person.id};
      return result(person.answer,'answer','leadership',0.96,[person]);
    }
    if(context?.entityId && /^(?:(?:and|what about|his|her|their) )?(?:phone(?: number)?|email|address|hours|hrs|availability)$/.test(normalized)) {
      const previous=people.find(record=>record.id===context.entityId);
      return result('The indexed GES source publishes this person’s role, but not their personal contact details or availability. For nursery enquiries, ask for a campus phone number or email.','unknown','leadership',0,previous?[previous]:[]);
    }
    const roleQuery = resolveRoleQuery(normalized, people, context);
    if (roleQuery) {
      if (roleQuery.status !== 'answer') return result(roleQuery.reason,roleQuery.status,'leadership',0);
      const matches = roleQuery.matches;
      context={intent:'leadership',entities:[],organization:'GES',recordId:matches.length===1?matches[0].id:null,entityId:matches.length===1?matches[0].id:null};
      return result(matches.map(record=>record.answer).join('\n\n'),'answer','leadership',0.96,matches);
    }
    if(groupMention) {
      const roleMatches=people.filter(record=>record.entity.roleAliases.some(role=>(' '+normalized+' ').includes(' '+role+' ')));
      if(requestedDetails && roleMatches.length)return unknown('leadership');
      if(roleMatches.length && /^(?:who|tell me|what is|show)/.test(normalized)) {
        if(roleMatches.length===1)context={intent:'leadership',entities:[],recordId:roleMatches[0].id,entityId:roleMatches[0].id};
        return result(roleMatches.map(record=>record.answer).join('\n\n'),'answer','leadership',0.96,roleMatches);
      }
      if(/\b(?:management|leadership|team|leaders)\b/.test(normalized) && !requestedDetails && !/\b(?:nursery|campus)\b/.test(normalized)) {
        return result(people.map(record=>record.answer).join('\n\n'),'answer','leadership',0.95,people);
      }
      if (/\b(?:president|director|principal|manager|head|ceo|chairman)\b/.test(normalized)) return unknown('leadership', 'Please specify the published GES role, such as Vice President or Managing Director.');
      const relationship=records.find(record=>record.id==='ges-shomoukh');
      const group=records.find(record=>record.id==='ges-group');
      if(relationship && /\bshomoukh\b/.test(normalized) && /\b(?:related|relationship|connection|connected|part|group|owner|owns|owned)\b/.test(normalized)) {
        context={intent:'organization',entities:[],recordId:relationship.id};
        return result(relationship.answer,'answer','organization',0.96,[relationship]);
      }
      if(group && /^(?:what is|who is|tell me about)? ?(?:ges|global education services)$/.test(normalized)) {
        context={intent:'organization',entities:[],recordId:group.id};
        return result(group.answer,'answer','organization',0.96,[group]);
      }
    }
    // Timetables and live availability must not be confused with office hours.
    if(/\b(?:timetable|tomorrow|today)\b/.test(normalized) && /\b(?:class|classroom|lesson|schedule|timetable)\b/.test(normalized))return unknown('hours','A daily classroom timetable is not published in the indexed sources.');
    if(/\b(?:portal|password|credentials|invitation|login)\b/.test(normalized) && /\b(?:password|credentials|invitation|first|logging|login|reset)\b/.test(normalized)) {
      const portal=records.find(record=>record.title==='First Time Logging In?');
      const terms=tokenize(normalized);
      const allowed=new Set('portal parent password credential invitation first logging reset get receive access account help send temporary create forgot forgotten cant cannot'.split(' '));
      if(portal&&terms.every(term=>allowed.has(term))) {context={intent:'parents',entities:[],recordId:portal.id};return result(portal.answer,'answer','parents',0.95,[portal]);}
    }
    // Topic paraphrases select existing reviewed facts, never create new
    // details. Named corporate/school scopes were handled by typed lookup.
    const routes=[
      [/\b(?:apply|admission|admissions|registration|enrolment|enrollment|join)\b.*\b(?:midyear|mid year|middle of the year|during the year)\b/,'Education for Your Child at Shomoukh'],
      [/\b(?:form|application)\b.*\b(?:ask|include|field|list|collect)\b.*\b(?:allergies|health history|dietary needs|emergency contacts)\b/,'Online Enrollment Application — form requirements'],
      [/\b(?:vaccination|vaccine)\b.*\b(?:record|card|register)\b/,'Health & Vaccine Card'],
      [/\b(?:photographs|photos)\b.*\b(?:prepare|child|many)\b|\bhow many\b.*\bphotographs\b/,'4 Photographs'],
      [/\b(?:sending|sent|submit|submitted)\b.*\b(?:form|application)\b.*\b(?:back|reply|response|contact)\b/,'Student Registration Form'],
      [/\b(?:follows|after|next)\b.*\btour\b.*\b(?:enrollment|enrolment|admission)\b/,'Submit Details'],
      [/\b(?:class|school|regular)\b.*\b(?:start and finish|start|finish)\b.*\btime\b/,'Attendance Schedule Selection'],
      [/\b(?:before lessons|after lessons|pre care|after care)\b/,'Flex-Care (6–48 months)'],
      [/\b(?:whole year|across the year|twelve months|12 months|year round)\b/,'12-Month Continuous Learning'],
      [/\b(?:teacher|teachers)\b.*\b(?:investigation|child led|research)\b/,'The Teacher as Researcher'],
      [/\b(?:included|include|offer)\b.*\bmovement matters\b/,'Movement Matters'],
      [/\b(?:form|application)\b.*\b(?:bus|transportation)\b/,'Transportation Details'],
      [/\b(?:how long|duration|set aside)\b.*\b(?:guided|visit|tour)\b/,'45-Minute Guided Tour'],
      [/\bchild\b.*\b(?:come along|accompany|join)\b.*\btour\b/,'Bring Your Child'],
      [/\btour\b.*\b(?:see|explore)\b.*\bateliers\b/,'45-Minute Guided Tour'],
      [/\b(?:send|submit)\b.*\b(?:visit|tour)\b.*\brequest\b/,'Book Your Visit'],
      [/\b(?:message|messaging)\b.*\b(?:classroom|teacher|educator)\b/,'Direct Messaging'],
      [/\b(?:parent|portal|app)\b.*\b(?:photos|photographs)\b/,'Learning Stories & Photos'],
      [/\b(?:term dates|school celebrations)\b/,'Academic Calendar'],
      [/\bcurriculum\b.*\b(?:used|follow)\b.*\bnursery\b/,'Proven Approach to Education'],
      [/\b(?:android)\b.*\b(?:device|use|app)\b/,'Android App'],
      [/\b(?:browser|web app)\b.*\bparent portal\b/,'Web-App'],
      [/\b(?:first|temporary)\b.*\bcredentials\b/,'First Time Logging In?']
    ];
    if(!/\b(?:salary|refund|discount|scholarship|google|apple|sips|ges|investment|ramadan|holiday)\b/.test(normalized)) {
      const exactTopic=records.some(record=>normalizeText(record.title)===normalized.replace(/^tell me about /,''));
      const route=!exactTopic&&routes.find(([pattern])=>pattern.test(normalized));
      const fact=route&&records.find(record=>record.title===route[1]);
      if(fact) {
        context={intent:fact.intent,entities:context?.entities||[],recordId:fact.id};
        if(fact.confidence.conflicts?.length)return result('The published descriptions contain conflicting age details. Please confirm current eligibility with admissions. '+fact.answer,'clarify',fact.intent,0.35,[fact]);
        return result(fact.title+'. '+fact.answer,'answer',fact.intent,0.9,[fact]);
      }
    }
    const attendance=records.find(record=>/attendance schedule/i.test(record.title));
    // A question that names another record's exact heading (e.g. preferred days) is left to normal retrieval
    const namesOtherHeading=records.some(record=>record!==attendance&&normalized.includes(normalizeText(record.title)));
    if(attendance && !namesOtherHeading && /\b(?:attendance|enrollment|enrolment)\b/.test(normalized) && /\b(?:schedule|schedules|days|options)\b/.test(normalized)) {
      context={intent:'hours',entities:[],recordId:attendance.id};
      return attendance.confidence.conflicts?.length ? result('The public form lists attendance options, but published age ranges differ across the website. Please confirm eligibility and the current schedule with admissions. '+attendance.answer,'clarify','hours',0.35,[attendance]) : result(attendance.answer,'answer','hours',0.95,[attendance]);
    }
    let semanticQuery = /\bwhat (?:do|does) (?:you|the nursery|shomoukh) (?:do|offer|provide)\b/.test(normalized) ? `${raw} programs` : raw;
    if (/^where (?:are you|is the nursery)$/.test(normalized)) semanticQuery = 'location';
    const weekday = words.find(word=>['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].includes(word));
    const simpleOpening=/\b(?:open|close|closed)\b/.test(normalized) && tokenize(normalized).every(token=>['open','close','closed','nursery','shomoukh','campus','al','mouj','qurm'].includes(token));
    if (simpleOpening || (weekday && /\b(?:open|close|hours|schedule)\b/.test(normalized)) || (/\b(?:open|close|closing)\b/.test(normalized) && /\b(?:when|time|hour|hours|days)\b/.test(normalized)) || /^(?:what is|show me) (?:your|the school|the nursery) schedule$/.test(normalized)) {
      // Preserve who/what the question is about before replacing phrasing.
      // Nursery hours cannot establish GES office hours or holiday schedules.
      if(groupMention) {
        const source=records.find(record=>record.id==='ges-group');
        return result('The saved official GES sources do not publish its office opening hours. Please check with GES directly. Nursery campus hours apply to Shomoukh campuses only.','unknown','hours',0,source?[source]:[]);
      }
      const hourWords=new Set('open close closed closing time hour day days schedule nursery shomoukh campus al mouj qurm sunday monday tuesday wednesday thursday friday saturday'.split(' '));
      if(tokenize(normalized).some(word=>!hourWords.has(word)))return unknown('hours','I can share the published nursery campus hours; a different organization or special-date schedule needs its own verified source.');
      semanticQuery = 'opening hours ' + words.filter(word=>['mouj','qurm','qurum'].includes(word)).join(' ');
    }
    const tokens = unique(tokenize(semanticQuery));
    let intent = /\bhow much\b/.test(normalized)?'fees':intentOf(tokens);
    if(tokens.some(token=>['age','month'].includes(token)))intent='ages';
    if (tokens.includes('campus') && tokens.every(token=>['campus','all','both','two','many','mouj','qurm','al'].includes(token))) intent='location';
    const headingQuery = normalized.replace(/^(?:tell me about|what is|where can i find) /, '');
    const exact = records.find(record => normalizeText(record.title) === headingQuery);
    if (exact) {
      if (exact.confidence.conflicts?.length) return result('The website contains differing details on this topic. Please contact admissions to confirm the current information before making a decision.', 'clarify', intent, 0.35, [exact]);
      context = {intent, entities: tokens.filter(token => ['infant', 'toddler', 'preschool', 'mouj', 'qurm', 'eyfs', 'reggio'].includes(token)), recordId: exact.id};
      return result(exact.answer, 'answer', intent, 0.96, [exact]);
    }
    // Campus names constrain the requested location, while program/application
    // descriptions are published sitewide. Qualify that distinction explicitly.
    const campusEntity=tokens.find(token=>['mouj','qurm'].includes(token));
    const campusRecord=campusEntity?records.find(record=>record.url===`/contact.html#${campusEntity==='mouj'?'almouj':'alqurm'}`):null;
    if(intent==='apply' && tokens.every(token=>['admission','apply','process','step','steps'].includes(token))) {
      const steps=records.filter(record=>/^\/admissions\.html#step[123]$/.test(record.url) && !record.confidence.conflicts?.length);
      if(steps.length) {
        context={intent,entities:[],recordId:steps.find(record=>record.url.endsWith('step2'))?.id||steps[0].id};
        return result('Here is the published admissions process:\n\n'+steps.map(record=>record.answer).join('\n\n'),'answer',intent,0.95,steps);
      }
    }
    if(intent==='programs' && tokens.every(token=>['curriculum','eyfs','reggio','nursery','shomoukh'].includes(token))) {
      const curriculum=records.find(record=>record.title==='Proven Approach to Education');
      if(curriculum) {context={intent,entities:[],recordId:curriculum.id};return result(curriculum.answer,'answer',intent,0.95,[curriculum]);}
    }
    const overviewModifiers=['al','mouj','qurm','campus','nursery','shomoukh','all','both','two','learning'];
    if(intent==='facilities' && tokens.every(token=>[...overviewModifiers,'space'].includes(token))) {
      const spaces=records.filter(record=>record.url==='/spaces.html#all-spaces' && !record.title.startsWith('14 ') || record.url==='/spaces.html#piazza' || record.title==='The Organic Garden');
      if(spaces.length) {
        context={intent,entities:campusEntity?[campusEntity]:[],recordId:spaces[0].id};
        return result('Published learning spaces include:\n\n'+spaces.map(record=>`• ${record.title}`).join('\n')+(campusRecord?`\n\nThese are the website’s general facilities. Confirm details for ${campusRecord.title} with the campus.`:''),'answer',intent,0.9,spaces);
      }
    }
    if(intent==='enrichment' && tokens.every(token=>[...overviewModifiers,'enrichment','atelier'].includes(token))) {
      const activities=records.filter(record=>record.sourceReference?.kind==='public-modal-data');
      if(activities.length) {
        context={intent,entities:campusEntity?[campusEntity]:[],recordId:activities[0].id};
        return result('The website lists these enrichment areas:\n\n'+activities.map(record=>`• ${record.title}`).join('\n')+(campusRecord?`\n\nThese are general website descriptions. Confirm availability at ${campusRecord.title}.`:''),'answer',intent,0.9,activities);
      }
    }
    if(campusRecord && ['apply','programs'].includes(intent)) {
      const common=['al','mouj','qurm','campus','nursery','shomoukh'];
      const topic=intent==='apply'?['admission','apply','process','step','steps']:['program','curriculum','eyfs','reggio'];
      if(tokens.every(token=>[...common,...topic].includes(token))) {
        const general=intent==='apply'?records.filter(record=>/^\/admissions\.html#step[123]$/.test(record.url)) : records.filter(record=>record.title==='Proven Approach to Education');
        const safe=general.filter(record=>!record.confidence.conflicts?.length);
        if(safe.length) {
          context={intent,entities:[campusEntity],recordId:safe[0].id};
          return result(`Here is the website’s general ${intent==='apply'?'admissions process':'program information'}:\n\n${safe.map(record=>record.answer).join('\n\n')}\n\nPlease confirm current availability and campus-specific details with ${campusRecord.title}.`,'answer',intent,0.85,[...safe,campusRecord]);
        }
      }
    }
    if(intent==='visit' && tokens.some(token=>['long','duration','length'].includes(token)) && tokens.every(token=>['tour','long','duration','length','take','last'].includes(token))) {
      const duration=records.find(record=>record.title==='45-Minute Guided Tour');
      if(duration)return result(`${duration.title}. ${duration.answer}`,'answer','visit',0.95,[duration]);
    }
    if(intent==='visit' && tokens.every(token=>['tour','book','appointment','time','working','hour','during','al','mouj','qurm','campus','nursery','shomoukh'].includes(token))) {
      const booking=records.find(record=>record.title==='Book Your Visit' && record.url==='/book-a-visit.html');
      if(booking) {
        context={intent:'visit',entities:campusEntity?[campusEntity]:[],recordId:booking.id};
        return result(`${booking.answer} Use the linked visit page to request a tour${campusRecord?' of '+campusRecord.title:''}.`,'answer','visit',0.95,[booking,...(campusRecord?[campusRecord]:[])]);
      }
    }
    if (/^where\b/.test(normalized) && tokens.some(token => ['mouj', 'qurm', 'campus', 'nursery'].includes(token))) intent = 'location';
    if (intent === 'ages' && knowledge.conflicts?.length) return result('The website contains differing age ranges. Please contact admissions to confirm the right program and eligibility for your child.', 'clarify', intent, 0.35, records.filter(record => /\/admissions\.html/.test(record.url)).slice(0, 1));
    if ((tokens.includes('document') || tokens.includes('requirement') && tokens.some(token=>['admission','apply'].includes(token))) && (tokens.some(token => ['admission', 'apply', 'requirement'].includes(token)) || tokens.length === 1)) {
      const documents = records.filter(record => record.url === '/admissions.html' && /certificate|vaccine|passport|photograph/i.test(record.title));
      if (documents.length) return result(`The admissions page asks families to prepare:\n\n${documents.map(record => `• ${record.title}: ${record.answer}`).join('\n')}`, 'answer', 'apply', 0.95, documents);
    }
    const allCampuses = /\b(?:all|both|campuses|branches|locations|two)\b/.test(normalized);
    const shortCampusFollowup = !allCampuses && context?.entities?.some(entity => ['mouj','qurm'].includes(entity)) && tokens.length <= 2 && ['contact','location','hours'].includes(intent);
    const followup = shortCampusFollowup || /\b(it|its|them|they|those|that|there|these|their|also|instead)\b/.test(normalized) || /^(and|what about|how about|more|tell me more)/.test(normalized);
    if (intent === 'search' && followup && context) intent = context.intent;
    if (followup && context && tokens.every(token => ['more', 'also', 'instead', 'it', 'them', 'they', 'those', 'their'].includes(token))) {
      const previous = records.find(record => record.id === context.recordId);
      if (previous) return result(previous.answer, 'answer', context.intent, 0.75, [previous]);
    }
    if (!tokens.length || (tokens.length === 1 && ['help', 'more'].includes(tokens[0]) && !context)) return result('I can help with published information about programs, admissions, campus visits and contact details. Which topic would you like to explore?', 'clarify');
    if (/\b(?:ratio|per teacher|refund|scholarship|discount|salary|visa|bus route|transport fee)\b/.test(normalized)) {
      const subject = /ratio|per teacher/.test(normalized) ? /\b(?:ratio|per teacher)\b/i : new RegExp(`\\b${normalized.match(/refund|scholarship|discount|salary|visa|bus route|transport fee/)[0]}\\b`, 'i');
      if (!records.some(record => subject.test(`${record.title} ${record.answer}`))) return unknown(intent);
    }
    const terms = [...tokens];
    if (followup && context) terms.push(...context.entities);
    const mentionedEntities = tokens.filter(token => ['infant', 'toddler', 'preschool', 'mouj', 'qurm', 'eyfs', 'reggio'].includes(token));
    const inheritedEntities = !allCampuses && followup && context && (shortCampusFollowup || context.intent === intent || ['contact', 'location', 'hours'].includes(context.intent) && ['contact', 'location', 'hours'].includes(intent)) ? context.entities : [];
    const explicitEntities = mentionedEntities.length ? mentionedEntities : inheritedEntities;
    const ranked = records.filter(record => record.entity?.kind !== 'person' && (!isApprovedExternalSource(record.url, knowledge) || groupMention)).map(record => {
      let score = 0, matched = 0;
      for (const token of unique(terms)) {
        const frequency = record.frequencies.get(token) || 0;
        if (!frequency) continue;
        if (tokens.includes(token)) matched++;
        const idf = Math.log(1 + (records.length - documentFrequency.get(token) + 0.5) / (documentFrequency.get(token) + 0.5));
        score += idf * frequency * 2.2 / (frequency + 1.2 * (0.25 + 0.75 * record.length / averageLength));
        if (record.titleTokens.has(token)) score += 1.5;
      }
      const anchors = INTENTS[intent] || [];
      let anchored = !anchors.length || anchors.some(token => record.frequencies.has(token));
      const campusDetails = /\/contact\.html#(?:almouj|alqurm)$/.test(record.url) && /\+968/.test(record.answer);
      if (campusDetails && ['contact', 'location', 'hours'].includes(intent)) { anchored = true; score += 25; matched = Math.max(matched, tokens.filter(token => record.frequencies.has(token) || INTENTS[intent].includes(token)).length); }
      if (intent === 'apply' && /\/admissions\.html#step2$/.test(record.url)) { anchored = true; score += 25; matched = Math.max(matched, 1); }
      if (intent === 'programs' && !tokens.some(token => ['infant', 'toddler', 'preschool', 'eyfs', 'reggio'].includes(token)) && record.title === 'Proven Approach to Education') { anchored = true; score += 25; matched = Math.max(matched, 1); }
      const exactTitle = unique(tokenize(record.title));
      if (exactTitle.length && exactTitle.length === tokens.length && exactTitle.every(token => tokens.includes(token))) { score += 60; anchored = true; }
      if(intent==='enrichment') {
        const subjects=tokens.filter(token=>['art','clay','music','sensory','digital','light','drama','puppet','tiny'].includes(token));
        const titleWords=tokenize(record.title);
        if(subjects.length && subjects.every(subject=>titleWords.includes(subject)))score+=20;
      }
      if (explicitEntities.length) score += explicitEntities.every(entity => record.frequencies.has(entity)) ? 20 : -100;
      if (!anchored) score *= 0.1;
      if (record.intent === intent || record.category === intent) score += matched ? 0.8 : 0;
      return {record, score, matched, anchored};
    }).sort((a, b) => b.score - a.score);
    const top = ranked[0];
    const knownTokens = tokens.filter(token => vocabulary.has(token));
    const contentTokens = tokens.filter(token => !['help', 'detail', 'tell', 'explain', 'much', 'many', 'get', 'start', 'nursery', 'shomoukh', 'all', 'both', 'two'].includes(token));
    const campusAnswer = /\/contact\.html#(?:almouj|alqurm)$/.test(top?.record.url || '');
    const specificEnrichment = intent === 'enrichment' && tokens.some(token=>['art','clay','music','sensory','digital','light','drama','puppet','tiny'].includes(token));
    const coveredTokens = contentTokens.filter(token=>!specificEnrichment || token!=='enrichment');
    const programOverview = intent==='programs' && top?.record.url==='/#programs' && top?.record.title==='Proven Approach to Education';
    const coverage = coveredTokens.filter(token => top?.record.frequencies.has(token) || programOverview && ['program','curriculum'].includes(token) || campusAnswer && ['contact','location','hours'].includes(intent) && INTENTS[intent].includes(token)).length / Math.max(1, coveredTokens.length);
    if (!top || !top.anchored || !top.matched || top.score < 1.8 || (contentTokens.length > 0 && coverage < 0.7) || !knownTokens.length) return unknown(intent);
    // An intent label alone must never imply an unpublished factual detail.
    if (intent === 'fees' && !/\b(?:\d[\d,.]*\s*(?:omr|rial|riyal)|(?:omr|rial|riyal)\s*\d|free of charge)\b/i.test(top.record.answer)) return unknown(intent);
    if (intent === 'hours' && !/\b(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|opening hours|operating hours|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(top.record.answer)) return unknown(intent);
    if (top.record.confidence?.conflicts?.length || (intent === 'ages' && knowledge.conflicts?.length)) return result('The website contains differing details on this topic. Please contact admissions to confirm the current information before making a decision.', 'clarify', intent, 0.35, [top.record, ...records.filter(record => /\/admissions\.html/.test(record.url)).slice(0, 1)]);
    if (explicitEntities.length && !explicitEntities.every(entity => top.record.frequencies.has(entity))) return unknown(intent);
    const confidence = Math.min(0.96, 0.55 + Math.min(0.25, top.score / 50) + Math.min(0.16, coverage * 0.16));
    const overview = ['programs', 'location', 'contact', 'hours', 'facilities', 'enrichment'].includes(intent) && !explicitEntities.length && tokens.length <= 4;
    const selected = overview ? ranked.filter(item => item.anchored && item.score >= top.score * 0.6 && item.matched > 0 && !item.record.confidence?.conflicts?.length).slice(0, 3).map(item => item.record) : [top.record];
    if (!selected.length) return unknown(intent);
    context = {intent, entities: explicitEntities.length ? explicitEntities : (followup ? context?.entities || [] : []), recordId: top.record.id};
    const publishedHours = intent === 'hours' && selected.every(record => /\/contact\.html#(?:almouj|alqurm)$/.test(record.url));
    const text = publishedHours ? 'Published campus opening hours:\n\n' + selected.map(record => `${record.title}: ${record.answer.match(/Sun\s*[–-]\s*Thu:\s*\d{1,2}:\d{2}\s*AM\s*[–-]\s*\d{1,2}:\d{2}\s*PM/i)?.[0] || record.answer}`).join('\n') : selected.length === 1 ? selected[0].answer : `Here’s what the website says:\n\n${selected.map(record => `• ${record.answer}`).join('\n\n')}`;
    return result(publishedHours && weekday ? text + '\n\nThese are the published weekly hours; the indexed pages do not confirm special opening on the requested day.' : text, 'answer', intent, confidence, selected);
  }
  function respond(input) {
    const query=processQuery(input);
    const graph=knowledge.entityIndex?.entities||[];
    const priorMemory=entityMemory;
    const named=graph.filter(entity=>(entity.aliases||[]).some(alias=>` ${query.text} `.includes(` ${normalizeText(alias)} `)));
    const namedCampus=named.find(entity=>entity.kind==='campus');
    const explicitOtherScope=named.some(entity=>['school','person'].includes(entity.kind)||entity.id==='ges');
    if(namedCampus)entityMemory={entityId:namedCampus.id};
    const response=answerProcessed(query.text);
    const person=graph.find(entity=>entity.kind==='person'&&entity.recordIds.includes(context?.entityId));
    const campus=context?.entities?.find(entity=>['mouj','qurm'].includes(entity));
    if(person)entityMemory={entityId:person.id,topic:response.intent};
    else if(campus)entityMemory={entityId:campus==='mouj'?'campus-mouj':'campus-qurum',topic:response.intent};
    else if(context?.recordId==='ges-group')entityMemory={entityId:'ges',topic:response.intent};
    else if(response.status==='answer' && response.intent==='leadership')entityMemory={entityId:'ges',topic:response.intent};
    else if(response.status==='answer' && !['leadership','organization'].includes(response.intent) && !context?.graphEntityIds?.length)entityMemory={entityId:'shomoukh',topic:response.intent};
    if(namedCampus)entityMemory={entityId:namedCampus.id,topic:response.intent};
    else if(priorMemory.entityId?.startsWith('campus-')&&!explicitOtherScope&&!/\b(?:all|both|campuses|branches|locations)\b/.test(query.text))entityMemory={...priorMemory,topic:response.intent};
    return {...response,query:{original:query.original,interpreted:query.text,corrections:query.corrections}};
  }
  return {respond, ask: respond, answer: respond, reset() { context = null; entityMemory={}; }, getSuggestions: () => suggestions(context?.intent), suggestions: () => suggestions(context?.intent)};
}
