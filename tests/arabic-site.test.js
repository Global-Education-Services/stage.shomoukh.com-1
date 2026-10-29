// The generated Arabic pages: complete translations, RTL markup, SEO links and the Arabic 404.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import worker from '../worker/index.js';
import {flipDeclaration} from '../scripts/lib/rtl-css.mjs';

const pages = ['index', 'about', 'programs', 'enrichments', 'spaces', 'admissions', 'book-a-visit', 'apply-online', 'parents', 'contact'];

test('every English string has an Arabic translation', () => {
  // Exits non-zero and lists the strings when a translation is missing.
  execFileSync(process.execPath, ['scripts/build-arabic.mjs'], {stdio: 'pipe'});
});

test('Arabic pages are right-to-left with Arabic SEO metadata and Arabic links', () => {
  for (const page of pages) {
    const html = readFileSync(`ar/${page}.html`, 'utf8');
    const path = page === 'index' ? '/' : `/${page}`;
    assert.match(html, /<html lang="ar" dir="rtl">/, page);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://shomoukh.com/ar${path === '/' ? '/' : path}">`), page);
    assert.match(html, new RegExp(`hreflang="en" href="https://shomoukh.com${path}"`), page);
    assert.match(html, /hreflang="x-default"/, page);
    assert.match(html, /<meta property="og:locale" content="ar_OM">/, page);
    assert.match(html, /href="\/style\.rtl\.css"/, page);
    assert.match(html, /<option value="ar" selected>/, page);
    assert.doesNotMatch(html, /<a [^>]*href="\/(about|programs|admissions|contact|book-a-visit)"/, `${page} links to an English page`);
    const english = readFileSync(`${page}.html`, 'utf8');
    assert.match(english, new RegExp(`hreflang="ar" href="https://shomoukh.com/ar${path === '/' ? '/' : path}"`), page);
  }
});

test('CSS mirroring swaps sides, shorthands, corners and horizontal movement', () => {
  assert.deepEqual(flipDeclaration('margin-left', '8px'), ['margin-right', '8px']);
  assert.deepEqual(flipDeclaration('padding', '1px 2px 3px 4px'), ['padding', '1px 4px 3px 2px']);
  assert.deepEqual(flipDeclaration('border-radius', '1px 2px 3px 4px'), ['border-radius', '2px 1px 4px 3px']);
  assert.deepEqual(flipDeclaration('text-align', 'left'), ['text-align', 'right']);
  assert.deepEqual(flipDeclaration('transform', 'translateX(6px) rotate(90deg)'), ['transform', 'translateX(-6px) rotate(-90deg)']);
  assert.deepEqual(flipDeclaration('border-top-left-radius', '4px'), ['border-top-right-radius', '4px']);
});

test('unknown addresses under /ar/ get the Arabic not-found page', async () => {
  const env = {ASSETS: {fetch: async request => {
    const {pathname} = new URL(request.url);
    return pathname === '/ar/404' ? new Response('arabic 404', {headers: {'content-type': 'text/html'}}) : new Response('english 404', {status: 404});
  }}};
  const arabic = await worker.fetch(new Request('https://shomoukh.com/ar/missing'), env);
  assert.equal(arabic.status, 404);
  assert.equal(await arabic.text(), 'arabic 404');
  const english = await worker.fetch(new Request('https://shomoukh.com/missing'), env);
  assert.equal(await english.text(), 'english 404');
});

test('Arabic search answers the suggested chatbot questions and shows the matching sentence', async () => {
  const {searchWebsite} = await import('../site/search-ar.js');
  for (const [question, expected] of [
    ['ما الأعمار التي تقبلونها؟', /عمر 6 أشهر/],
    ['أين تقع الفروع؟', /فرع/],
    ['ما هي المستندات المطلوبة للتسجيل؟', /المستندات المطلوبة/],
    ['كيف أحجز زيارة؟', /احجز/],
    ['ما هي المشاغل؟', /مشاغل/],
  ]) {
    const [best] = searchWebsite(question, 3);
    assert.ok(best, `no result for ${question}`);
    assert.match(best.excerpt, expected, question);
  }
  assert.match(searchWebsite('ما هي الرسوم؟', 1)[0].excerpt, /رسوم/);
});
