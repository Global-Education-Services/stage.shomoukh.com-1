import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5175';

const PAGES = [
  '/',
  '/about.html',
  '/programs.html',
  '/enrichments.html',
  '/spaces.html',
  '/admissions.html',
  '/book-a-visit.html',
  '/apply-online.html',
  '/parents.html',
  '/contact.html'
];

async function auditComponents() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage();
  const componentDefects = [];

  for (const p of PAGES) {
    for (const w of [320, 375, 768, 1024, 1440, 2560]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(`${BASE_URL}${p}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);

      const pageIssues = await page.evaluate((vpWidth) => {
        const issues = [];

        // 1. Check touch targets on mobile (w <= 414)
        if (vpWidth <= 414) {
          const smallButtons = [];
          document.querySelectorAll('button, a.btn, a.pill-btn, .header-icon-btn, .menu-toggle-btn, .video-control-pill, .quick-tag').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && (r.height < 40 || r.width < 40)) {
              // Exclude inline text links inside paragraphs
              smallButtons.push({
                tag: el.tagName,
                text: el.textContent?.trim().slice(0, 30),
                className: el.className,
                w: Math.round(r.width),
                h: Math.round(r.height)
              });
            }
          });
          if (smallButtons.length > 0) {
            issues.push({ type: 'SMALL_TOUCH_TARGETS', vpWidth, targets: smallButtons });
          }
        }

        // 2. Check for overlapping elements (excluding absolute overlays and backdrops)
        const cards = document.querySelectorAll('.feature-card, .program-card, .pursue-item-card, .space-card, .step-card, .campus-detail-card, .stat-counter-card, .testimonial-card');
        for (let i = 0; i < cards.length; i++) {
          for (let j = i + 1; j < cards.length; j++) {
            const r1 = cards[i].getBoundingClientRect();
            const r2 = cards[j].getBoundingClientRect();
            // Check bounding box intersection
            if (r1.width > 0 && r2.width > 0 && r1.height > 0 && r2.height > 0) {
              const xOverlap = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
              const yOverlap = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
              if (xOverlap > 5 && yOverlap > 5) {
                issues.push({
                  type: 'CARD_OVERLAP',
                  vpWidth,
                  card1: cards[i].className,
                  card2: cards[j].className,
                  xOverlap: Math.round(xOverlap),
                  yOverlap: Math.round(yOverlap)
                });
              }
            }
          }
        }

        // 3. Check footer copyright bar wrapping / overflow
        const footerBottom = document.querySelector('.footer-bottom-bar');
        if (footerBottom) {
          const r = footerBottom.getBoundingClientRect();
          if (r.right > window.innerWidth + 2) {
            issues.push({ type: 'FOOTER_BAR_OVERFLOW', vpWidth, right: r.right, winWidth: window.innerWidth });
          }
          const links = footerBottom.querySelector('.footer-legal-links');
          if (links) {
            const lr = links.getBoundingClientRect();
            if (lr.right > window.innerWidth + 2) {
              issues.push({ type: 'FOOTER_LEGAL_OVERFLOW', vpWidth, right: lr.right });
            }
          }
        }

        // 4. Check Drawer nav overflow on mobile
        const drawer = document.getElementById('offcanvas-drawer');
        if (drawer) {
          // Open drawer to inspect
          drawer.classList.add('open');
          const drawerContent = drawer.querySelector('.offcanvas-right') || drawer;
          const dr = drawerContent.getBoundingClientRect();
          if (dr.width > window.innerWidth + 1) {
            issues.push({ type: 'DRAWER_OVERFLOW', vpWidth, drawerWidth: dr.width, winWidth: window.innerWidth });
          }
          drawer.classList.remove('open');
        }

        // 5. Check missing alt text
        document.querySelectorAll('img').forEach(img => {
          if (!img.hasAttribute('alt') || (img.getAttribute('alt') === '' && !img.hasAttribute('role'))) {
            // Check if not purely decorative
            if (img.classList.contains('brand-logo-img') || img.classList.contains('footer-logo-img') || img.src.includes('showcase')) {
              issues.push({ type: 'MISSING_ALT_TEXT', src: img.src, className: img.className });
            }
          }
        });

        // 6. Check for empty src in img
        document.querySelectorAll('img').forEach(img => {
          const rawSrc = img.getAttribute('src');
          if (rawSrc === '' || rawSrc === '#') {
            issues.push({ type: 'EMPTY_IMG_SRC', id: img.id, className: img.className });
          }
        });

        return issues;
      }, w);

      if (pageIssues.length > 0) {
        componentDefects.push({ page: p, viewport: `${w}px`, issues: pageIssues });
      }
    }
  }

  await browser.close();
  console.log('Total component findings:', componentDefects.length);
  console.log(JSON.stringify(componentDefects, null, 2));
}

auditComponents().catch(console.error);
