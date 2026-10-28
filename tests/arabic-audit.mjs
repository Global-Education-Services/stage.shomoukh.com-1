// Browser audit of the Arabic website: RTL markup, untranslated text, horizontal overflow at
// four widths, language switching and memory, Arabic search, chatbot and form validation.
// Run with a dev server up: SITE_TEST_URL=http://127.0.0.1:5174 node tests/arabic-audit.mjs
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:5174';
const pages = ['', 'about', 'programs', 'enrichments', 'spaces', 'admissions', 'book-a-visit', 'apply-online', 'parents', 'contact'];
// Latin text that is correct on the Arabic pages: names, brands and abbreviations.
const ALLOWED_LATIN = /^(?:EYFS|KG1|KG2|iOS|iPhone|iPad|Android|Google|Play|HTML5|GES|Global|Education|Services|L\.L\.C\.?|English|Shomoukh|AM|PM|Facebook|Instagram|YouTube|LinkedIn|info\.\S+|\S+@\S+|name@example\.com|ADHD|ADD|config|script-blocked)$/;
const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {})});
const problems = [];
await fs.mkdir('test-results/arabic', {recursive: true});

try {
  for (const width of [1440, 768, 390, 320]) {
    const context = await browser.newContext({viewport: {width, height: 900}, hasTouch: width < 600, isMobile: width < 600});
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin || route.request().url().startsWith('https://fonts.') ? route.continue() : route.abort());
    for (const name of pages) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (new URL(response.url()).origin === new URL(base).origin && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      await page.goto(`${base}/ar/${name}`, {waitUntil: 'networkidle'});
      const report = await page.evaluate(allowed => {
        const allowedLatin = new RegExp(allowed);
        const visible = element => { const style = getComputedStyle(element); const box = element.getBoundingClientRect(); return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 0 && box.height > 0 && !element.closest('[aria-hidden="true"], [hidden]'); };
        const latin = new Set();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.parentElement || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName) || !visible(node.parentElement)) continue;
          for (const word of node.textContent.match(/[A-Za-z][\w.@'-]*/g) || []) if (!allowedLatin.test(word.replace(/[.']+$/, ''))) latin.add(word);
        }
        for (const element of document.querySelectorAll('[placeholder], [aria-label], [alt], [title]')) {
          for (const name of ['placeholder', 'aria-label', 'alt', 'title']) {
            const value = element.getAttribute(name) || '';
            for (const word of value.match(/[A-Za-z][\w.@'-]*/g) || []) if (!allowedLatin.test(word.replace(/[.']+$/, ''))) latin.add(`${name}: ${word}`);
          }
        }
        const overflow = [...document.querySelectorAll('main *, header *, footer *')].filter(element => {
          if (!visible(element) || element.closest('.offcanvas-drawer, .search-modal, .detail-modal, .video-modal, [class*="marquee"], [class*="carousel"], [class*="scroller"]')) return false;
          let parent = element.parentElement;
          while (parent && parent !== document.body) { const style = getComputedStyle(parent); if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) return false; parent = parent.parentElement; }
          const box = element.getBoundingClientRect();
          return box.right > innerWidth + 1 || box.left < -1;
        }).slice(0, 5).map(element => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')} [${Math.round(element.getBoundingClientRect().left)}, ${Math.round(element.getBoundingClientRect().right)}]`);
        return {lang: document.documentElement.lang, dir: document.documentElement.dir, scroll: document.documentElement.scrollWidth, width: innerWidth, latin: [...latin], overflow};
      }, ALLOWED_LATIN.source);
      const label = `${width} /ar/${name}`;
      if (report.lang !== 'ar' || report.dir !== 'rtl') problems.push(`${label}: html lang/dir is ${report.lang}/${report.dir}`);
      if (report.scroll > report.width + 1) problems.push(`${label}: page scrolls sideways (${report.scroll} > ${report.width})`);
      if (report.overflow.length) problems.push(`${label}: elements outside the viewport: ${report.overflow.join(', ')}`);
      if (report.latin.length && width === 1440) problems.push(`${label}: untranslated text: ${report.latin.join(', ')}`);
      if (errors.length) problems.push(`${label}: ${errors.join('; ')}`);
      if (width !== 768) await page.screenshot({path: `test-results/arabic/${width}-${name || 'home'}.png`, fullPage: true});
      await page.close();
    }
    await context.close();
  }

  // Switching language keeps the page and section, and the choice is remembered.
  const context = await browser.newContext({viewport: {width: 1280, height: 900}});
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(`${base}/programs#ages`);
  await page.getByLabel('Select language').selectOption('ar');
  await page.waitForURL(`${base}/ar/programs#ages`);
  assert.equal(await page.getByLabel('اختر اللغة').inputValue(), 'ar');
  await page.goto(`${base}/contact`);
  await page.waitForURL(`${base}/ar/contact`);
  await page.reload();
  assert.equal(new URL(page.url()).pathname, '/ar/contact', 'Arabic is remembered across refreshes');
  await page.getByLabel('اختر اللغة').selectOption('en');
  await page.waitForURL(`${base}/contact`);
  await page.goto(`${base}/ar/about`);
  await page.waitForURL(`${base}/about`);
  assert.equal(await page.locator('html').getAttribute('dir'), null);

  // Arabic search, chatbot and validation messages.
  await page.evaluate(() => localStorage.removeItem('shomoukh-lang'));
  await page.goto(`${base}/ar/`);
  await page.getByRole('button', {name: 'فتح نافذة البحث'}).click();
  await page.getByLabel('ابحث في هذا الموقع').fill('مشغل الطين');
  await page.getByRole('button', {name: 'بحث', exact: true}).click();
  await page.locator('.site-search-results li a').first().waitFor();
  assert.match(await page.locator('.site-search-results [role=status]').innerText(), /نتائج|نتيجة|نتيجتان/);
  assert.match(await page.locator('.site-search-results li a').first().getAttribute('href'), /^\/ar\//);
  await page.keyboard.press('Escape');
  await page.locator('#school-chat-launcher').click();
  await page.getByLabel('اسأل عن شموخ').fill('كيف أحجز زيارة؟');
  await page.getByRole('button', {name: 'إرسال'}).click();
  await page.locator('.school-chat-sources a[href^="/ar/"]').first().waitFor();
  assert.match(await page.locator('.school-chat-assistant').last().innerText(), /[؀-ۿ]/);
  await page.goto(`${base}/ar/book-a-visit`);
  const message = await page.locator('form[data-form-type] input[required]').first().evaluate(field => { field.reportValidity(); return field.validationMessage; });
  assert.match(message, /يُرجى/);
  await context.close();
} finally {
  await browser.close();
  if (problems.length) console.error(`Arabic audit problems:\n${problems.join('\n')}`);
}

if (problems.length) { console.error(`FAIL Arabic audit: ${problems.length} problems`); process.exit(1); }
console.log('PASS Arabic audit: 10 pages × 4 widths, switching, memory, search, chatbot and validation.');
