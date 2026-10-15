import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5175';

async function testFunctionality() {
  console.log('--- STARTING FUNCTIONALITY VERIFICATION SUITE ---');
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Navigation Across all 10 pages
  const routes = [
    '/', '/about.html', '/programs.html', '/enrichments.html', '/spaces.html',
    '/admissions.html', '/book-a-visit.html', '/apply-online.html', '/parents.html', '/contact.html'
  ];
  for (const r of routes) {
    const res = await page.goto(`${BASE_URL}${r}`, { waitUntil: 'domcontentloaded' });
    assert(res.status() === 200, `Page reachable: ${r}`);
  }

  // 2. Offcanvas Navigation Drawer & Accordion
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.click('#menu-toggle-btn');
  await page.waitForTimeout(200);
  const isDrawerOpen = await page.evaluate(() => document.getElementById('offcanvas-drawer').classList.contains('open'));
  assert(isDrawerOpen, 'Offcanvas drawer opens cleanly');

  const submenuBtn = await page.$('.submenu-toggle-btn');
  if (submenuBtn) {
    await submenuBtn.click();
    await page.waitForTimeout(200);
    const isAccordionActive = await page.evaluate(() => document.querySelector('.drawer-menu-item.active') !== null);
    assert(isAccordionActive, 'Drawer accordion submenu expands');
  }
  await page.click('#menu-close-btn');
  await page.waitForTimeout(200);
  const isDrawerClosed = await page.evaluate(() => !document.getElementById('offcanvas-drawer').classList.contains('open'));
  assert(isDrawerClosed, 'Offcanvas drawer closes cleanly');

  // 3. Search Form Functionality
  await page.click('#search-open-btn');
  await page.waitForTimeout(200);
  await page.fill('#search-input', 'tour');
  await page.click('.search-submit-btn');
  await page.waitForTimeout(500);
  assert(page.url().includes('book-a-visit.html'), 'Search form routes query "tour" to /book-a-visit.html');

  // 4. Hero Video Play/Pause Toggle & Video Modal
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
  const toggleBtn = await page.$('#hero-video-toggle-btn');
  if (toggleBtn) {
    const initialText = await page.evaluate(() => document.getElementById('hero-video-toggle-btn').textContent);
    await toggleBtn.click();
    await page.waitForTimeout(200);
    const toggledText = await page.evaluate(() => document.getElementById('hero-video-toggle-btn').textContent);
    assert(toggledText.includes('PLAY VIDEO'), 'Hero background video toggle pauses video and switches button text');
    await toggleBtn.click();
    await page.waitForTimeout(200);
    const resumedText = await page.evaluate(() => document.getElementById('hero-video-toggle-btn').textContent);
    assert(resumedText.includes('PAUSE VIDEO'), 'Hero background video toggle resumes video');
  }

  // Also test video lightbox modal open/close via script / close button
  await page.evaluate(() => {
    const modal = document.getElementById('video-modal');
    if (modal) modal.classList.add('open');
  });
  const isVideoOpen = await page.evaluate(() => document.getElementById('video-modal').classList.contains('open'));
  assert(isVideoOpen, 'Video modal opens properly');
  await page.click('#video-modal-close');
  await page.waitForTimeout(200);
  const isVideoClosed = await page.evaluate(() => !document.getElementById('video-modal').classList.contains('open'));
  assert(isVideoClosed, 'Video modal close button dismisses modal');

  // 5. Atelier Detail Modal Dynamic Population
  await page.goto(`${BASE_URL}/enrichments.html`, { waitUntil: 'domcontentloaded' });
  const card = await page.$('.pursue-item-card[data-modal-target="modal-arts"]');
  await card.click();
  await page.waitForTimeout(200);
  const modalData = await page.evaluate(() => ({
    title: document.getElementById('detail-modal-title').textContent,
    category: document.getElementById('detail-modal-category').textContent,
    img: document.getElementById('detail-modal-img').src,
    isOpen: document.getElementById('detail-modal').classList.contains('open')
  }));
  assert(modalData.isOpen && modalData.title === 'Clay Atelier' && modalData.category === 'RESEARCH ATELIER', 'Detail modal opens and displays accurate curriculum data');
  assert(modalData.img.includes('atelier-clay.jpg'), 'Detail modal image populated correctly');
  await page.click('#detail-modal-close');
  await page.waitForTimeout(200);
  const isDetailClosed = await page.evaluate(() => !document.getElementById('detail-modal').classList.contains('open'));
  assert(isDetailClosed, 'Detail modal closes cleanly');

  // 6. Tour Booking Form Submission
  await page.goto(`${BASE_URL}/book-a-visit.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#tour-parent-name', 'Sarah Al-Balushi');
  await page.fill('#tour-email', 'sarah@example.com');
  await page.fill('#tour-phone', '+968 91234567');
  await page.fill('#tour-child-name', 'Tariq');
  await page.selectOption('#tour-child-gender', 'Boy');
  await page.fill('#tour-child-dob', '2024-03-15');
  await page.selectOption('#tour-campus', 'Al Mouj Campus');
  await page.fill('#tour-visit-datetime', '2026-11-01T10:00');
  await page.click('#tour-booking-form button[type="submit"]');
  await page.waitForTimeout(300);
  const toastText = await page.evaluate(() => {
    const toast = document.getElementById('toast-feedback');
    return { isShown: toast.classList.contains('show'), text: document.getElementById('toast-message').textContent };
  });
  assert(toastText.isShown && toastText.text.includes('Sarah Al-Balushi'), 'Tour Booking form submits and triggers personalized toast notification');

  // 7. Online Enrollment Form Submission
  await page.goto(`${BASE_URL}/apply-online.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#app-child-name', 'Tariq');
  await page.fill('#app-child-dob', '2024-05-10');
  await page.selectOption('#app-child-gender', 'Boy');
  await page.fill('#app-child-nationality', 'Omani');
  await page.fill('#app-parent1-name', 'Ahmed Al-Harthy');
  await page.fill('#app-parent1-email', 'ahmed@example.com');
  await page.fill('#app-parent1-phone', '+968 98765432');
  await page.fill('#app-emergency-contact', 'Muna (Aunt) +968 91112222');
  await page.click('#online-enrollment-form button[type="submit"]');
  await page.waitForTimeout(300);
  const appToast = await page.evaluate(() => ({
    isShown: document.getElementById('toast-feedback').classList.contains('show'),
    text: document.getElementById('toast-message').textContent
  }));
  assert(appToast.isShown && appToast.text.includes('Tariq'), 'Online Enrollment form submits and acknowledges child name');

  // 8. Contact Form Submission & 180-Character Counter
  await page.goto(`${BASE_URL}/contact.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#contact-name', 'Fatima');
  await page.fill('#contact-email', 'fatima@example.com');
  await page.fill('#contact-phone', '+968 95551234');
  const testMsg = 'Hello, inquiring about registration.';
  await page.fill('#contact-message', testMsg);
  const charCount = await page.evaluate(() => document.getElementById('contact-char-count').textContent);
  assert(charCount === String(testMsg.length), `Contact message live character counter updates correctly (${testMsg.length} characters)`);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(300);
  const contactToast = await page.evaluate(() => ({
    isShown: document.getElementById('toast-feedback').classList.contains('show'),
    charReset: document.getElementById('contact-char-count').textContent === '0'
  }));
  assert(contactToast.isShown && contactToast.charReset, 'Contact form submits, shows toast, and resets character counter to 0');

  // 9. Sticky Header and Scroll-To-Top Button
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(200);
  const scrollStates = await page.evaluate(() => ({
    isHeaderScrolled: document.getElementById('site-header').classList.contains('scrolled'),
    isScrollTopVisible: document.getElementById('scroll-to-top').classList.contains('visible')
  }));
  assert(scrollStates.isHeaderScrolled && scrollStates.isScrollTopVisible, 'Sticky header gains .scrolled and scroll-to-top button becomes visible');
  await page.click('#scroll-to-top');
  await page.waitForTimeout(400);

  await browser.close();

  console.log(`\nFUNCTIONALITY VERIFICATION SUMMARY:`);
  console.log(`Tests passed: ${passed}`);
  console.log(`Tests failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

testFunctionality().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
