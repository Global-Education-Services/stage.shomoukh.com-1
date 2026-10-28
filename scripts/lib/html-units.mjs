// Minimal HTML tree for the site's hand-written pages: enough to find translatable text
// units and attributes, and to write the page back out unchanged apart from edits.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea']);
// Elements that may sit inside a sentence; a run of these and text is translated as one unit
// so Arabic word order can move them. Font Awesome <i> icons are excluded below.
const FORMATTING = new Set(['a', 'strong', 'em', 'b', 'u', 'br', 'sup', 'sub', 'small', 'abbr', 'mark', 'span', 'i', 'code']);
export const TEXT_ATTRIBUTES = ['alt', 'title', 'aria-label', 'placeholder', 'data-label'];

export function parse(html) {
  const root = {type: 'root', children: []};
  const stack = [root];
  const pattern = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
  let last = 0;
  let match;
  const top = () => stack.at(-1);
  const text = value => { if (value) top().children.push({type: 'text', value}); };
  while ((match = pattern.exec(html))) {
    text(html.slice(last, match.index));
    last = pattern.lastIndex;
    const [raw, closing, name, attrs] = match;
    if (closing) {
      const tag = closing.toLowerCase();
      const index = stack.findLastIndex(node => node.tag === tag);
      if (index > 0) stack.length = index;
      continue;
    }
    if (!name) { top().children.push({type: 'raw', value: raw}); continue; }
    const tag = name.toLowerCase();
    const element = {type: 'element', tag, attrs: parseAttributes(attrs), children: [], selfClosing: Boolean(match[4])};
    top().children.push(element);
    if (VOID.has(tag) || element.selfClosing) continue;
    if (RAW.has(tag)) {
      const end = html.toLowerCase().indexOf(`</${tag}`, last);
      const stop = end < 0 ? html.length : end;
      element.children.push({type: 'text', value: html.slice(last, stop), raw: true});
      const close = /<\/[a-z]+\s*>/iy;
      close.lastIndex = stop;
      last = close.exec(html) ? close.lastIndex : stop;
      pattern.lastIndex = last;
      continue;
    }
    stack.push(element);
  }
  text(html.slice(last));
  return root;
}

function parseAttributes(source) {
  const attrs = [];
  const pattern = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;
  while ((match = pattern.exec(source))) attrs.push([match[1], match[2] ?? match[3] ?? match[4] ?? null]);
  return attrs;
}

export const attr = (element, name) => element.attrs?.find(([key]) => key.toLowerCase() === name)?.[1] ?? null;
export function setAttr(element, name, value) {
  const entry = element.attrs.find(([key]) => key.toLowerCase() === name);
  if (entry) entry[1] = value; else element.attrs.push([name, value]);
}

const escapeAttribute = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/&amp;(#?\w+;)/g, '&$1');
export function serialize(node) {
  if (node.type === 'text' || node.type === 'raw') return node.value;
  const inner = node.children.map(serialize).join('');
  if (node.type === 'root') return inner;
  const attrs = node.attrs.map(([key, value]) => value === null ? ` ${key}` : ` ${key}="${escapeAttribute(value)}"`).join('');
  if (VOID.has(node.tag)) return `<${node.tag}${attrs}${node.selfClosing ? ' /' : ''}>`;
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
}

const isIcon = node => node.type === 'element' && node.tag === 'i' && /\bfa-/.test(attr(node, 'class') || '');
const isNoTranslate = node => node.type === 'element' && (attr(node, 'translate') === 'no' || RAW.has(node.tag));
// A node that may live inside a sentence unit: text, or formatting elements holding only the same.
function isPhrasing(node) {
  if (node.type === 'text') return true;
  if (node.type === 'raw') return true;
  if (node.type !== 'element' || !FORMATTING.has(node.tag) || isIcon(node) || isNoTranslate(node)) return false;
  return node.children.every(isPhrasing);
}

const ENTITIES = {amp: '&', copy: '©', bull: '•', rarr: '→', larr: '←', mdash: '—', ndash: '–', quot: '"', apos: "'", nbsp: '\u00a0', middot: '·', hellip: '…', rsquo: '’', lsquo: '‘', times: '×'};
export const decode = value => value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, name) => {
  if (name[0] === '#') return String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1)));
  return ENTITIES[name.toLowerCase()] ?? entity;
});
export const normalize = value => decode(value).replace(/[ \t\r\n]+/g, ' ').trim();
export const unitKey = nodes => normalize(nodes.map(serialize).join('').replace(/<!--[\s\S]*?-->/g, ''));
export const hasWords = value => /[A-Za-z]{2,}/.test(value.replace(/&[a-z]+;/g, '').replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+/g, ''));

/**
 * Calls visit(unit) for each translatable run of sibling nodes: {parent, start, end, key}.
 * The key is the run's inner HTML with whitespace collapsed; a run that is a single wrapper
 * element is descended into so keys hold no wrapping markup.
 */
export function eachUnit(node, visit) {
  if (node.type !== 'element' && node.type !== 'root') return;
  if (isNoTranslate(node)) return;
  const children = node.children;
  let index = 0;
  while (index < children.length) {
    if (!isPhrasing(children[index])) { eachUnit(children[index], visit); index += 1; continue; }
    let end = index;
    while (end < children.length && isPhrasing(children[end])) end += 1;
    emitRun(node, index, end, visit);
    index = end;
  }
}

function emitRun(parent, start, end, visit) {
  const run = parent.children.slice(start, end);
  const meaningful = run.filter(child => !(child.type === 'text' && !child.value.trim()) && child.type !== 'raw');
  const elements = meaningful.filter(child => child.type === 'element' && child.tag !== 'br');
  // A run with no loose text (a list of links, a wrapper span) is translated element by element.
  if (elements.length && meaningful.every(child => child.type === 'element')) {
    for (const element of elements) eachUnitInside(element, visit);
    return;
  }
  const key = unitKey(run);
  if (!hasWords(key.replace(/<[^>]+>/g, ' '))) return;
  visit({parent, start, end, key});
}

// The whole element is phrasing: treat its children as one run.
function eachUnitInside(element, visit) {
  if (!element.children.length) return;
  emitRun(element, 0, element.children.length, visit);
}

export function walk(node, visit) {
  visit(node);
  for (const child of node.children || []) walk(child, visit);
}
