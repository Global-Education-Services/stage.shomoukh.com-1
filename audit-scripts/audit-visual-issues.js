import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5174';

const PAGES = [
  { name: 'home', path: '/index.html' },
  { name: 'about', path: '/about.html' },
  { name: 'programs', path: '/programs.html' },
  { name: 'enrichments', path: '/enrichments.html' },
  { name: 'spaces', path: '/spaces.html' },
  { name: 'admissions', path: '/admissions.html' },
  { name: 'book-a-visit', path: '/book-a-visit.html' },
  { name: 'apply-online', path: '/apply-online.html' },
  { name: 'parents', path: '/parents.html' },
  { name: 'contact', path: '/contact.html' }
];

const VIEWPORTS = [
  { name: '320px', width: 320, height: 800 },
  { name: '360px', width: 360, height: 800 },
  { name: '375px', width: 375, height: 812 },
  { name: '390px', width: 390, height: 844 },
  { name: '414px', width: 414, height: 896 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1024px', width: 1024, height: 768 },
  { name: '1280px', width: 1280, height: 900 },
  { name: '1440px', width: 1440, height: 900 },
  { name: '1920px', width: 1920, height: 1080 },
  { name: '2560px', width: 2560, height: 1440 }
];

async function runVisualAudit() {
  const outDir = path.resolve('audit-results/live');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });

  page.on('requestfailed', req => {
    failedRequests.push({ url: page.url(), requestUrl: req.url(), error: req.failure()?.errorText });
  });

  const visualIssues = [];

  for (const p of PAGES) {
    const pageDir = path.join(outDir, p.name);
    if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, { recursive: true });

    console.log(`Auditing page: ${p.name}`);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);

      // Check broken images
      const brokenImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(img => {
          // Ignore SVG data URIs
          if (img.src.startsWith('data:image/svg+xml')) return false;
          return !img.complete || img.naturalWidth === 0;
        }).map(img => ({
          src: img.src,
          alt: img.alt,
          id: img.id,
          className: img.className,
          rect: img.getBoundingClientRect()
        }));
      });

      // Check overflow
      const overflow = await page.evaluate((vpWidth) => {
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        const issues = [];
        if (scrollW > docW + 1) {
          const culprits = [];
          document.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > docW + 2) {
              culprits.push({
                tag: el.tagName,
                className: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
                id: el.id,
                overflow: Math.round(r.right - docW)
              });
            }
          });
          culprits.sort((a, b) => b.overflow - a.overflow);
          issues.push({
            type: 'HORIZONTAL_OVERFLOW',
            docW,
            scrollW,
            overflowAmount: scrollW - docW,
            topCulprits: culprits.slice(0, 3)
          });
        }
        return issues;
      }, vp.width);

      // Check for zero-height or invisible cards / sections
      const layoutAnomalies = await page.evaluate(() => {
        const anomalies = [];
        // Check grid cards
        const cards = document.querySelectorAll('.pursue-item-card, .program-card, .pillar-card, .facility-card, .campus-detail-card, .value-card');
        cards.forEach(card => {
          const r = card.getBoundingClientRect();
          if (r.height < 40 && r.width > 100) {
            anomalies.push({ type: 'COLLAPSED_CARD', class: card.className, text: card.textContent.slice(0, 30) });
          }
        });
        return anomalies;
      });

      if (brokenImages.length > 0 || overflow.length > 0 || layoutAnomalies.length > 0) {
        visualIssues.push({
          page: p.name,
          viewport: `${vp.width}x${vp.height}`,
          brokenImages,
          overflow,
          layoutAnomalies
        });
      }

      // Take screenshot at standard desktop and mobile
      if (vp.width === 1280 || vp.width === 375) {
        const ssPath = path.join(pageDir, `${vp.width}.png`);
        await page.screenshot({ path: ssPath, fullPage: true });
      }
    }
  }

  await browser.close();

  console.log('=== AUDIT COMPLETE ===');
  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length) console.log(JSON.stringify(consoleErrors, null, 2));
  console.log(`Failed Requests: ${failedRequests.length}`);
  if (failedRequests.length) console.log(JSON.stringify(failedRequests, null, 2));
  console.log(`Visual Issues: ${visualIssues.length}`);
  if (visualIssues.length) console.log(JSON.stringify(visualIssues, null, 2));
}

runVisualAudit().catch(console.error);
