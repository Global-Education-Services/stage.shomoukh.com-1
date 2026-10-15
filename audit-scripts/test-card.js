import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('http://localhost:5175/enrichments.html', { waitUntil: 'domcontentloaded' });
  const card = await page.$('.pursue-item-card');
  console.log('Card exists:', !!card);
  const rect = await card.boundingBox();
  console.log('Card boundingBox before scroll:', rect);
  try {
    await card.scrollIntoViewIfNeeded({ timeout: 3000 });
    console.log('Scrolled into view');
  } catch (e) {
    console.log('scrollIntoViewIfNeeded error:', e.message);
  }
  const rectAfter = await card.boundingBox();
  console.log('Card boundingBox after scroll:', rectAfter);
  try {
    await card.click({ timeout: 3000 });
    console.log('Card click succeeded!');
  } catch (e) {
    console.error('Click error:', e.message);
  }
  await browser.close();
})();
