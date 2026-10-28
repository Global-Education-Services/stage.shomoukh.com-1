// Mirrors left/right in CSS for the Arabic (right-to-left) pages: property names, keyword
// values, four-side shorthands, corner radii, horizontal translations and rotations.
import postcss from 'postcss';

const swapSides = value => value.replace(/\b(left|right)\b/g, side => side === 'left' ? 'right' : 'left');
const SIDE_PROPERTY = /(^|-)(left|right)(-|$)/;
const CORNER_PROPERTY = /^border-(top|bottom)-(left|right)-radius$/;
const KEYWORD_PROPERTIES = new Set(['float', 'clear', 'text-align', 'justify-self', 'caption-side', 'transition-property', 'transition', 'will-change']);
const FOUR_SIDES = new Set(['margin', 'padding', 'border-width', 'border-style', 'border-color', 'inset', 'scroll-margin', 'scroll-padding']);

// Splits on top-level whitespace, keeping function arguments such as calc(1px + 2px) whole.
function splitValues(value) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of value.trim()) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (/\s/.test(char) && depth === 0) { if (current) parts.push(current); current = ''; continue; }
    current += char;
  }
  if (current) parts.push(current);
  return parts;
}

const negate = value => {
  const trimmed = value.trim();
  if (/^0[a-z%]*$/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('-')) return trimmed.slice(1);
  if (/^[a-z]+\(/i.test(trimmed)) return `calc(${trimmed} * -1)`;
  return `-${trimmed}`;
};

function flipRadius(value) {
  const [horizontal, vertical] = value.split('/');
  const flip = part => {
    const [a, b = a, c = a, d = b] = splitValues(part);
    return [b, a, d, c].join(' ');
  };
  return vertical === undefined ? flip(horizontal) : `${flip(horizontal)} / ${flip(vertical)}`;
}

function flipTransform(value) {
  return value
    .replace(/translateX\(([^()]*(?:\([^()]*\))?[^()]*)\)/g, (_, x) => `translateX(${negate(x)})`)
    .replace(/translate\(([^,()]*(?:\([^()]*\))?[^,()]*)(,[^)]*)?\)/g, (_, x, y = '') => `translate(${negate(x)}${y})`)
    .replace(/translate3d\(([^,]*),/g, (_, x) => `translate3d(${negate(x)},`)
    .replace(/rotate(Z?)\(([^)]*)\)/g, (_, axis, angle) => `rotate${axis}(${negate(angle)})`)
    .replace(/skewX\(([^)]*)\)/g, (_, angle) => `skewX(${negate(angle)})`);
}

const flipGradient = value => value
  .replace(/(linear-gradient\(\s*)(-?[\d.]+)deg/g, (_, start, angle) => `${start}${(360 - Number(angle)) % 360}deg`)
  .replace(/\bto (left|right)\b/g, match => swapSides(match));

export function flipDeclaration(prop, value) {
  const name = prop.toLowerCase();
  if (CORNER_PROPERTY.test(name)) return [name.replace(/-(left|right)-/, match => swapSides(match)), value];
  if (SIDE_PROPERTY.test(name)) return [swapSides(name), value];
  if (KEYWORD_PROPERTIES.has(name)) return [prop, swapSides(value)];
  if (FOUR_SIDES.has(name)) {
    const parts = splitValues(value);
    return parts.length === 4 && !value.includes('!') ? [prop, [parts[0], parts[3], parts[2], parts[1]].join(' ')] : [prop, value];
  }
  if (name === 'border-radius') return [prop, flipRadius(value)];
  if (name === 'transform' || name === 'translate') return [prop, name === 'translate' ? (([x, ...rest]) => [negate(x), ...rest].join(' '))(splitValues(value)) : flipTransform(value)];
  if (name === 'rotate') return [prop, negate(value)];
  if (name.startsWith('background') || name === 'mask-image') return [prop, flipGradient(name === 'background-position' || name === 'background-position-x' ? swapSides(value) : value)];
  return [prop, value];
}

export function flipCss(css) {
  const plugin = {
    postcssPlugin: 'shomoukh-rtl',
    Declaration(declaration) {
      if (declaration.flipped) return;
      const [prop, value] = flipDeclaration(declaration.prop, declaration.value);
      declaration.flipped = true;
      declaration.prop = prop;
      declaration.value = value;
    },
  };
  return postcss([plugin]).process(css, {from: undefined}).css;
}

// Inline style="" attributes on the pages use the same rules.
export function flipInlineStyle(style) {
  return style.split(';').map(rule => {
    const index = rule.indexOf(':');
    if (index < 0) return rule;
    const prop = rule.slice(0, index);
    const value = rule.slice(index + 1);
    const [flippedProp, flippedValue] = flipDeclaration(prop.trim(), value.trim());
    return `${prop.replace(prop.trim(), flippedProp)}:${value.replace(value.trim(), flippedValue)}`;
  }).join(';');
}
