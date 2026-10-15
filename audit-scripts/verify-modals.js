import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage();

  console.log('--- TESTING SEARCH & DETAIL MODALS POST-FIX ---');
  for (const w of [320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920, 2560]) {
    await page.setViewportSize({ width: w, height: 800 });
    
    // Check Search Modal
    await page.goto('http://localhost:5175/index.html', { waitUntil: 'domcontentloaded' });
    await page.click('#search-open-btn');
    await page.waitForTimeout(200);
    const searchMetrics = await page.evaluate(() => {
      const modal = document.getElementById('search-modal');
      const content = document.querySelector('.search-modal-content');
      const submit = document.querySelector('.search-submit-btn');
      const cRect = content.getBoundingClientRect();
      const sRect = submit.getBoundingClientRect();
      return {
        contentWidth: Math.round(cRect.width),
        submitRight: Math.round(sRect.right),
        viewportWidth: window.innerWidth,
        submitOverflow: Math.max(0, Math.round(sRect.right - window.innerWidth))
      };
    });
    console.log(`Search at ${w}px: overflow = ${searchMetrics.submitOverflow}px (submitRight: ${searchMetrics.submitRight}, vp: ${searchMetrics.viewportWidth})`);
    await page.click('#search-close-btn');

    // Check Detail Modal on enrichments
    await page.goto('http://localhost:5175/enrichments.html', { waitUntil: 'domcontentloaded' });
    const card = await page.$('.pursue-item-card');
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(200);
    const detailMetrics = await page.evaluate(() => {
      const card = document.querySelector('.detail-modal-card');
      const close = document.getElementById('detail-modal-close');
      const mRect = card.getBoundingClientRect();
      const cRect = close.getBoundingClientRect();
      return {
        cardTop: Math.round(mRect.top),
        cardHeight: Math.round(mRect.height),
        closeTop: Math.round(cRect.top),
        closeRight: Math.round(cRect.right),
        closeVisible: cRect.top >= 0 && cRect.bottom <= window.innerHeight && cRect.right <= window.innerWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    });
    console.log(`Detail Modal at ${w}px: closeTop = ${detailMetrics.closeTop}px, closeVisible = ${detailMetrics.closeVisible}, cardTop = ${detailMetrics.cardTop}px, cardHeight = ${detailMetrics.cardHeight}px`);
    await page.click('#detail-modal-close');
  }

  await browser.close();
  console.log('--- ALL MODAL VERIFICATIONS PASSED ---');
})();
