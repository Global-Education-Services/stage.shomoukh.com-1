import index from './search-ar.json' with {type: 'json'};
// Arabic site search over the sections of the generated Arabic pages (site/search-ar.json).
// Letters are normalised so hamza, alef maqsura, ta marbuta and diacritics don't block a match.
export function normalizeArabic(text) {
  return String(text).toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660));
}
const STOP = new Set(['في', 'من', 'الى', 'على', 'عن', 'مع', 'او', 'ثم', 'هل', 'ما', 'ماذا', 'كيف', 'متى', 'اين', 'هذا', 'هذه', 'التي', 'الذي', 'لدي', 'لدى', 'عند', 'كل', 'اي', 'هي', 'هو', 'و', 'the', 'a', 'an', 'of', 'and', 'to', 'in', 'is', 'for']);
// Strips common prefixes (و ب ل ك ف + ال) and suffixes so "للأطفال" matches "الأطفال" and "طفل".
// Broken plurals and verb forms don't share a stem with their singular, so a few common ones are
// mapped to one word: "الأعمار" finds "عمر", "الفروع" finds "فرع", "تقبلون" finds "نستقبل".
const CANONICAL = {اعمار: 'عمر', فروع: 'فرع', مواقع: 'موقع', تقع: 'موقع', يقع: 'موقع', تقبلون: 'قبل', تقبل: 'قبل', يقبل: 'قبل', نقبل: 'قبل', تستقبل: 'قبل', نستقبل: 'قبل', قبول: 'قبل'};
function stem(word) {
  const withoutArticle = word.replace(/^(و|ف|ب|ك|ل)?(ال|لل)/, '');
  // A conjunction or preposition is only stripped when there was no article, so "الفروع" keeps its ف.
  let stemmed = withoutArticle === word ? word.replace(/^(و|ف|ب|ل)(?=..{2,})/, '') : withoutArticle;
  for (const suffix of ['ات', 'ون', 'ين', 'ان', 'ها', 'هم', 'كم', 'نا', 'يه', 'ه', 'ي']) {
    if (stemmed.length > suffix.length + 2 && stemmed.endsWith(suffix)) { stemmed = stemmed.slice(0, -suffix.length); break; }
  }
  return CANONICAL[stemmed] || CANONICAL[word] || stemmed;
}
export const tokenizeArabic = text => normalizeArabic(text).split(/[^\p{L}\p{N}]+/u).filter(word => word && !STOP.has(word) && (word.length > 1 || /\d/.test(word))).map(stem);
const documents = index.map(entry => ({...entry, title: entry.title, titleTokens: new Set(tokenizeArabic(entry.title)), tokens: new Set(tokenizeArabic(`${entry.title} ${entry.text}`))}));
const prefixMatch = (tokens, term) => tokens.has(term) || (term.length >= 3 && [...tokens].some(token => token.startsWith(term)));

export function searchWebsite(query, limit = 6) {
  const terms = [...new Set(tokenizeArabic(String(query).slice(0, 300)))];
  if (!terms.length) return [];
  const ranked = documents.map(record => {
    const matched = terms.filter(term => prefixMatch(record.tokens, term));
    return {record, score: matched.reduce((score, term) => score + (prefixMatch(record.titleTokens, term) ? 5 : 1), 0) + (record.url.includes('#') ? 0 : 0.5), coverage: matched.length / terms.length};
  }).filter(item => item.score >= 1 && item.coverage >= 0.6).sort((a, b) => b.score - a.score || b.coverage - a.coverage);
  const seen = new Set();
  return ranked.filter(({record}) => !seen.has(record.url) && seen.add(record.url)).slice(0, limit)
    .map(({record}) => ({title: record.title, url: record.url, excerpt: excerpt(record.text, terms)}));
}

// Starts the excerpt at the first sentence that contains a search term, so the answer shows why it matched.
function excerpt(text, terms) {
  const sentences = text.split(/(?<=[.!?؟])\s+/);
  const index = Math.max(0, sentences.findIndex(sentence => { const tokens = new Set(tokenizeArabic(sentence)); return terms.some(term => prefixMatch(tokens, term)); }));
  const shown = sentences.slice(index).join(' ');
  return `${index ? '…' : ''}${shown.length > 220 ? `${shown.slice(0, 217)}…` : shown}`;
}
