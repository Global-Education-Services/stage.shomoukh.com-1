// Builds the Arabic (right-to-left) website from the English pages:
//   ar/<page>.html      every page translated from i18n/ar/*.tsv, with RTL markup and links
//   style.rtl.css       style.css mirrored for RTL, plus the Arabic typography in i18n/ar.css
//   site/search-ar.json the Arabic site-search index
// Run with --allow-missing to build while translations are still being written.
import {mkdirSync, readdirSync, readFileSync, writeFileSync} from 'fs';
import {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';
import {attr, eachUnit, normalize, parse, serialize, setAttr, TEXT_ATTRIBUTES, walk, hasWords} from './lib/html-units.mjs';
import {flipCss, flipInlineStyle} from './lib/rtl-css.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(resolve(root, file), 'utf8');
const write = (file, content) => { mkdirSync(dirname(resolve(root, file)), {recursive: true}); writeFileSync(resolve(root, file), content); };

export const PAGES = ['index', 'about', 'programs', 'enrichments', 'spaces', 'admissions', 'book-a-visit', 'apply-online', 'parents', 'contact', '404'];
const ORIGIN = 'https://shomoukh.com';
const ARABIC_FONTS = 'https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Figtree:wght@400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800;900&display=swap';
const META_CONTENT = /^(description|keywords|og:title|og:description|og:site_name|twitter:title|twitter:description)$/;
const ICON_MIRRORS = {'fa-arrow-right': 'fa-arrow-left', 'fa-arrow-left': 'fa-arrow-right', 'fa-chevron-right': 'fa-chevron-left', 'fa-chevron-left': 'fa-chevron-right', 'fa-angle-right': 'fa-angle-left', 'fa-angle-left': 'fa-angle-right', 'fa-caret-right': 'fa-caret-left', 'fa-caret-left': 'fa-caret-right', 'fa-arrow-right-long': 'fa-arrow-left-long', 'fa-arrow-left-long': 'fa-arrow-right-long', 'fa-circle-arrow-right': 'fa-circle-arrow-left', 'fa-circle-arrow-left': 'fa-circle-arrow-right'};

const pagePath = page => page === 'index' ? '/' : `/${page}`;
export const arabicPath = path => path === '/' ? '/ar/' : `/ar${path}`;
const pageSlugs = new Set(PAGES.filter(page => page !== '404').map(pagePath));

// i18n/ar/*.tsv: one "English<TAB>Arabic" pair per line; English is the page text with
// whitespace collapsed and entities decoded. Lines starting with # are comments.
export function loadDictionary() {
  const entries = {};
  for (const file of readdirSync(resolve(root, 'i18n/ar')).filter(name => name.endsWith('.tsv')).sort()) {
    read(`i18n/ar/${file}`).split('\n').forEach((line, index) => {
      if (!line.trim() || line.startsWith('#')) return;
      const tab = line.indexOf('\t');
      if (tab < 0) throw new Error(`i18n/ar/${file}:${index + 1} has no tab between English and Arabic`);
      const [key, value] = [line.slice(0, tab).trim(), line.slice(tab + 1).trim()];
      if (Object.hasOwn(entries, key) && entries[key] !== value) throw new Error(`i18n/ar/${file}:${index + 1} translates "${key}" differently from an earlier file`);
      entries[key] = value;
    });
  }
  return entries;
}
const dictionary = loadDictionary();
const missing = new Map();
const translate = (key, page) => {
  if (Object.hasOwn(dictionary, key)) return dictionary[key];
  if (!missing.has(key)) missing.set(key, new Set());
  missing.get(key).add(page);
  return null;
};
const escapeText = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function localizeLink(href) {
  const match = href.match(/^(\/[^?#]*)([?#].*)?$/);
  if (!match || match[1].startsWith('/ar/')) return href;
  const path = match[1].replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
  return pageSlugs.has(path) ? arabicPath(path) + (match[2] || '') : href;
}

function textOf(node) {
  if (node.type === 'text') return node.raw ? '' : node.value;
  if (node.type === 'element' && ['script', 'style', 'noscript'].includes(node.tag)) return '';
  return (node.children || []).map(textOf).join(' ');
}
const plain = node => normalize(textOf(node)).replace(/\s+([.,:;!؟،])/g, '$1');

function translatePage(page) {
  const tree = parse(read(`${page}.html`));
  const label = node => plain(node).replace(/\*/g, '').trim();

  // Data sent by the forms stays in English: option values and the enrolment labels used in emails.
  walk(tree, node => {
    if (node.type !== 'element') return;
    if (node.tag === 'option' && attr(node, 'value') === null) setAttr(node, 'value', plain(node));
    const className = attr(node, 'class') || '';
    if (/\b(form-label|form-section-header)\b/.test(className)) setAttr(node, 'data-en', label(node));
  });

  const units = [];
  eachUnit(tree, unit => units.push(unit));
  for (const {parent, start, end, key} of units.reverse()) {
    const value = translate(key, page);
    if (value === null) continue;
    const run = parent.children.slice(start, end);
    const lead = run[0].type === 'text' ? run[0].value.match(/^\s*/)[0] : '';
    const trail = run.at(-1).type === 'text' ? run.at(-1).value.match(/\s*$/)[0] : '';
    const html = /<[a-z]/i.test(key) || /<[a-z]/i.test(value) ? value : escapeText(value);
    parent.children.splice(start, end - start, {type: 'text', value: lead}, ...parse(html).children, {type: 'text', value: trail});
  }

  walk(tree, node => {
    if (node.type !== 'element') return;
    for (const name of TEXT_ATTRIBUTES) {
      const value = attr(node, name);
      if (value && (hasWords(value) || Object.hasOwn(dictionary, normalize(value)))) { const translated = translate(normalize(value), page); if (translated !== null) setAttr(node, name, translated); }
    }
    const metaName = attr(node, 'name') || attr(node, 'property') || '';
    if (node.tag === 'meta' && META_CONTENT.test(metaName)) {
      const translated = translate(normalize(attr(node, 'content')), page);
      if (translated !== null) setAttr(node, 'content', translated);
    }
    if (node.tag === 'html') { setAttr(node, 'lang', 'ar'); setAttr(node, 'dir', 'rtl'); }
    if (node.tag === 'meta' && metaName === 'og:locale') setAttr(node, 'content', 'ar_OM');
    if (node.tag === 'meta' && metaName === 'og:locale:alternate') setAttr(node, 'content', 'en_GB');
    if ((node.tag === 'link' && attr(node, 'rel') === 'canonical') || (node.tag === 'meta' && metaName === 'og:url')) {
      const key = node.tag === 'link' ? 'href' : 'content';
      setAttr(node, key, ORIGIN + arabicPath(attr(node, key).replace(ORIGIN, '') || '/'));
    }
    if (node.tag === 'link' && attr(node, 'href') === '/style.css') setAttr(node, 'href', '/style.rtl.css');
    if (node.tag === 'link' && attr(node, 'href')?.startsWith('https://fonts.googleapis.com/css2')) setAttr(node, 'href', ARABIC_FONTS);
    if (node.tag === 'a' && attr(node, 'href') && attr(node, 'rel') !== 'alternate') setAttr(node, 'href', localizeLink(attr(node, 'href')));
    if (node.tag === 'option' && attr(node, 'value') === 'ar') setAttr(node, 'selected', null);
    if (node.tag === 'option' && attr(node, 'value') === 'en') node.attrs = node.attrs.filter(([name]) => name !== 'selected');
    const className = attr(node, 'class');
    if (className && /\bfa-/.test(className)) setAttr(node, 'class', className.replace(/\bfa-[a-z-]+\b/g, name => ICON_MIRRORS[name] || name));
    const style = attr(node, 'style');
    if (style) setAttr(node, 'style', flipInlineStyle(style));
  });
  return tree;
}

// One search entry per page and per section with an id that has its own heading.
function searchEntries(page, tree) {
  const entries = [];
  const path = arabicPath(pagePath(page));
  let title = '';
  let description = '';
  let main;
  walk(tree, node => {
    if (node.type !== 'element') return;
    if (node.tag === 'title') title = plain(node).split('|')[0].trim();
    if (node.tag === 'meta' && attr(node, 'name') === 'description') description = attr(node, 'content');
    if (node.tag === 'main') main = node;
  });
  if (!main) return entries;
  entries.push({title, url: path, text: description});
  walk(main, node => {
    const id = node.type === 'element' && attr(node, 'id');
    if (!id || node === main) return;
    let heading;
    walk(node, child => { if (!heading && child.type === 'element' && /^h[1-4]$/.test(child.tag)) heading = child; });
    // Paragraphs and list items only, so button and card labels don't crowd the excerpt.
    const parts = [];
    walk(node, child => { if (child.type === 'element' && ['p', 'li'].includes(child.tag)) parts.push(plain(child)); });
    const text = parts.filter(Boolean).join(' ');
    if (heading && text.length > 40) entries.push({title: plain(heading), url: `${path}#${id}`, text: text.slice(0, 1200)});
  });
  return entries;
}

const search = [];
for (const page of PAGES) {
  const tree = translatePage(page);
  write(`ar/${page}.html`, serialize(tree));
  if (page !== '404') search.push(...searchEntries(page, tree));
}
write('site/search-ar.json', JSON.stringify(search));
write('style.rtl.css', `/* Generated by scripts/build-arabic.mjs from style.css and i18n/ar.css. Do not edit. */\n${flipCss(read('style.css'))}\n${read('i18n/ar.css')}`);

if (missing.size) {
  const report = [...missing].map(([key, pages]) => `  [${[...pages].join(', ')}] ${key}`).join('\n');
  console.error(`Missing Arabic translations for ${missing.size} strings:\n${report}`);
  if (!process.argv.includes('--allow-missing')) process.exit(1);
}
console.log(`Built ${PAGES.length} Arabic pages, style.rtl.css and ${search.length} Arabic search entries.`);
