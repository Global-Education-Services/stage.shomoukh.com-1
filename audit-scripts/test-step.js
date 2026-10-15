import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('http://localhost:5175/enrichments.html', { waitUntil: 'domcontentloaded' });
  
  // 1. Menu toggle
  const menuBtn = await page.$('#menu-toggle-btn');
  console.log('Menu btn visible:', await menuBtn.isVisible());
  await menuBtn.click();
  await page.waitForTimeout(400);
  console.log('Body overflow after menu open:', await page.evaluate(() => document.body.style.overflow));
  const menuClose = await page.$('#menu-close-btn');
  await menuClose.click();
  await page.waitForTimeout(400);
  console.log('Body overflow after menu close:', await page.evaluate(() => document.body.style.overflow));

  // 2. Search modal
  const searchBtn = await page.$('#search-open-btn');
  console.log('Search btn visible:', await searchBtn.isVisible());
  await searchBtn.click();
  await page.waitForTimeout(400);
  console.log('Body overflow after search open:', await page.evaluate(() => document.body.style.overflow));
  const searchClose = await page.$('#search-close-btn');
  console.log('Search close btn visible:', await searchClose.isVisible());
  await searchClose.click();
  await page.waitForTimeout(400);
  console.log('Body overflow after search close:', await page.evaluate(() => document.body.style.overflow));
  console.log('Search modal open class:', await page.evaluate(() => document.getElementById('search-modal').classList.contains('open')));

  // 3. Pursue card
  const cards = await page.$$('.pursue-item-card');
  console.log('Pursue cards found:', cards.length);
  try {
    await cards[0].click({ timeout: 5000 });
    console.log('Card 0 clicked successfully!');
  } catch (e) {
    console.log('Card 0 click failed:', e.message);
  }

  await browser.close();
})();
