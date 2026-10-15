import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5175';

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
  { width: 320, height: 600, label: '320px' },
  { width: 360, height: 740, label: '360px' },
  { width: 375, height: 667, label: '375px' },
  { width: 390, height: 844, label: '390px' },
  { width: 414, height: 896, label: '414px' },
  { width: 768, height: 1024, label: '768px' },
  { width: 1024, height: 768, label: '1024px' },
  { width: 1280, height: 800, label: '1280px' },
  { width: 1440, height: 900, label: '1440px' },
  { width: 1920, height: 1080, label: '1920px' },
  { width: 2560, height: 1440, label: '2560px' }
];

const MODE = process.env.AUDIT_MODE || 'baseline'; // baseline or after
const OUT_DIR = path.resolve('audit-results', MODE);

async function runAudit() {
  console.log(`Starting UI Audit in mode: ${MODE}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });

  const auditReport = {
    timestamp: new Date().toISOString(),
    mode: MODE,
    pagesAudited: [],
    defects: [],
    consoleErrors: [],
    networkErrors: []
  };

  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      auditReport.consoleErrors.push({
        url: page.url(),
        text: msg.text()
      });
    }
  });

  page.on('pageerror', err => {
    auditReport.consoleErrors.push({
      url: page.url(),
      text: err.toString()
    });
  });

  for (const pageDef of PAGES) {
    const pageDir = path.join(OUT_DIR, pageDef.name);
    fs.mkdirSync(pageDir, { recursive: true });
    console.log(`\nAuditing page: ${pageDef.name} (${pageDef.path})`);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const fullUrl = `${BASE_URL}${pageDef.path}`;
      
      try {
        await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        // Fallback to domcontentloaded if networkidle takes long
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(500);
      }

      // Check stability
      await page.waitForTimeout(400);

      const screenshotPath = path.join(pageDir, `${vp.width}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Run deep in-browser inspection
      const analysis = await page.evaluate((viewportWidth) => {
        const issues = [];
        const docElem = document.documentElement;
        const body = document.body;

        // 1. Horizontal Overflow Detection
        const scrollWidth = Math.max(docElem.scrollWidth, body.scrollWidth);
        const clientWidth = docElem.clientWidth;
        if (scrollWidth > clientWidth + 2) {
          // Identify culprits
          const overflowingElements = [];
          document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.right > clientWidth + 2 || rect.left < -2) {
              overflowingElements.push({
                tag: el.tagName,
                className: el.className,
                id: el.id,
                rect: { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) },
                htmlSnippet: el.outerHTML.substring(0, 100)
              });
            }
          });
          issues.push({
            type: 'HORIZONTAL_OVERFLOW',
            severity: 'HIGH',
            scrollWidth,
            clientWidth,
            overflowAmount: scrollWidth - clientWidth,
            culprits: overflowingElements.slice(0, 10)
          });
        }

        // 2. Broken Images
        const brokenImages = [];
        document.querySelectorAll('img').forEach(img => {
          if (img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('data:')) {
            brokenImages.push({
              src: img.src,
              alt: img.alt,
              className: img.className
            });
          }
        });
        if (brokenImages.length > 0) {
          issues.push({
            type: 'BROKEN_IMAGE',
            severity: 'HIGH',
            images: brokenImages
          });
        }

        // 3. Text Clipping / Truncation Unintentional
        const clippedElements = [];
        document.querySelectorAll('h1, h2, h3, h4, h5, p, span, button, a').forEach(el => {
          // Only visible elements
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const style = window.getComputedStyle(el);
            if (style.overflow === 'hidden' || style.textOverflow === 'ellipsis') {
              // Intended or unintended clipping check
              if (el.scrollWidth > el.clientWidth + 4 && !el.classList.contains('marquee')) {
                clippedElements.push({
                  tag: el.tagName,
                  text: el.textContent.trim().substring(0, 50),
                  scrollWidth: el.scrollWidth,
                  clientWidth: el.clientWidth,
                  className: el.className
                });
              }
            }
          }
        });
        if (clippedElements.length > 0) {
          issues.push({
            type: 'TEXT_CLIPPING',
            severity: 'MEDIUM',
            count: clippedElements.length,
            elements: clippedElements.slice(0, 8)
          });
        }

        // 4. Overlapping Fixed/Sticky Elements or Hidden Interactive Elements
        const header = document.querySelector('.site-header');
        if (header) {
          const headerRect = header.getBoundingClientRect();
          const hamburger = document.querySelector('.menu-toggle-btn');
          if (hamburger) {
            const hRect = hamburger.getBoundingClientRect();
            if (hRect.width === 0 || hRect.height === 0 || window.getComputedStyle(hamburger).display === 'none') {
              issues.push({
                type: 'HAMBURGER_HIDDEN',
                severity: 'CRITICAL',
                message: 'Navigation toggle button is not visible or has zero dimension'
              });
            }
          }
        }

        // 5. Touch Target Size for Mobile (< 40px)
        if (viewportWidth <= 414) {
          const smallTouchTargets = [];
          document.querySelectorAll('button, a, input, select').forEach(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0) {
              if (rect.width < 38 || rect.height < 38) {
                // Ignore inline breadcrumbs or footnote links if natural text
                if (el.tagName === 'BUTTON' || el.classList.contains('btn') || el.classList.contains('header-icon-btn')) {
                  smallTouchTargets.push({
                    tag: el.tagName,
                    text: el.textContent.trim().substring(0, 30),
                    className: el.className,
                    dimensions: { width: Math.round(rect.width), height: Math.round(rect.height) }
                  });
                }
              }
            }
          });
          if (smallTouchTargets.length > 0) {
            issues.push({
              type: 'SMALL_TOUCH_TARGETS',
              severity: 'LOW',
              targets: smallTouchTargets.slice(0, 5)
            });
          }
        }

        // 6. Contrast & Readability checks
        // Check elements with text over background
        const contrastIssues = [];
        document.querySelectorAll('.hero-caption, .badge, .btn, .footer-bottom-bar, .marquee-pill').forEach(el => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const bg = style.backgroundColor;
          // check for transparent or identical color
          if (color === bg && color !== 'rgba(0, 0, 0, 0)') {
            contrastIssues.push({
              text: el.textContent.trim().substring(0, 40),
              color,
              bg,
              className: el.className
            });
          }
        });
        if (contrastIssues.length > 0) {
          issues.push({
            type: 'CONTRAST_DEFECT',
            severity: 'HIGH',
            elements: contrastIssues
          });
        }

        return {
          scrollWidth,
          clientWidth,
          issues
        };
      }, vp.width);

      if (analysis.issues.length > 0) {
        for (const iss of analysis.issues) {
          auditReport.defects.push({
            page: pageDef.name,
            path: pageDef.path,
            viewport: vp.label,
            width: vp.width,
            ...iss
          });
        }
      }
    }

    // Inspect interactive states on this page at mobile (375) and desktop (1280)
    for (const testWidth of [375, 1280]) {
      await page.setViewportSize({ width: testWidth, height: 800 });
      await page.goto(`${BASE_URL}${pageDef.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);

      // A. Test Offcanvas Drawer
      try {
        const menuBtn = await page.$('#menu-toggle-btn');
        if (menuBtn && await menuBtn.isVisible()) {
          await menuBtn.click({ timeout: 4000 });
          await page.waitForTimeout(400);
          const drawer = await page.$('#offcanvas-drawer');
          const isOpen = drawer ? await drawer.evaluate(el => el.classList.contains('open')) : false;
          
          const drawerShot = path.join(pageDir, `drawer-${testWidth}.png`);
          await page.screenshot({ path: drawerShot });

          if (!isOpen) {
            auditReport.defects.push({
              page: pageDef.name,
              path: pageDef.path,
              viewport: `${testWidth}px`,
              type: 'DRAWER_FAIL_TO_OPEN',
              severity: 'CRITICAL',
              message: 'Offcanvas drawer did not open on menu toggle click'
            });
          } else {
            // Check drawer layout and submenu toggles
            const submenuToggles = await page.$$('.submenu-toggle-btn');
            if (submenuToggles.length > 0) {
              await submenuToggles[0].click({ timeout: 2000 }).catch(() => {});
              await page.waitForTimeout(200);
            }
            // Close drawer
            const closeBtn = await page.$('#menu-close-btn');
            if (closeBtn) {
              await closeBtn.click({ timeout: 3000 });
              await page.waitForTimeout(300);
            }
          }
        }
      } catch (err) {
        auditReport.defects.push({
          page: pageDef.name,
          path: pageDef.path,
          viewport: `${testWidth}px`,
          type: 'DRAWER_INTERACTION_ERROR',
          severity: 'HIGH',
          message: err.message
        });
      } finally {
        await page.evaluate(() => {
          document.body.style.overflow = '';
          const d = document.getElementById('offcanvas-drawer');
          if (d) d.classList.remove('open');
        });
      }

      // B. Test Search Modal
      try {
        const searchBtn = await page.$('#search-open-btn');
        if (searchBtn && await searchBtn.isVisible()) {
          await searchBtn.click({ timeout: 4000 });
          await page.waitForTimeout(300);
          const searchModal = await page.$('#search-modal');
          const isSearchOpen = searchModal ? await searchModal.evaluate(el => el.classList.contains('open')) : false;
          
          const searchShot = path.join(pageDir, `search-modal-${testWidth}.png`);
          await page.screenshot({ path: searchShot });

          if (!isSearchOpen) {
            auditReport.defects.push({
              page: pageDef.name,
              path: pageDef.path,
              viewport: `${testWidth}px`,
              type: 'SEARCH_MODAL_FAIL',
              severity: 'HIGH',
              message: 'Search modal failed to open'
            });
          } else {
            // Close search modal
            const searchClose = await page.$('#search-close-btn');
            if (searchClose) {
              await searchClose.click({ timeout: 3000 });
              await page.waitForTimeout(300);
            }
          }
        }
      } catch (err) {
        auditReport.defects.push({
          page: pageDef.name,
          path: pageDef.path,
          viewport: `${testWidth}px`,
          type: 'SEARCH_MODAL_INTERACTION_ERROR',
          severity: 'HIGH',
          message: err.message
        });
      } finally {
        await page.evaluate(() => {
          document.body.style.overflow = '';
          const sm = document.getElementById('search-modal');
          if (sm) sm.classList.remove('open');
        });
      }

      // C. Page-specific modal & form interactions
      if (pageDef.name === 'home') {
        try {
          const videoBtn = await page.$('#open-video-lightbox-btn');
          if (videoBtn && await videoBtn.isVisible()) {
            await videoBtn.click({ timeout: 4000 });
            await page.waitForTimeout(400);
            const videoModal = await page.$('#video-modal');
            const isVideoOpen = videoModal ? await videoModal.evaluate(el => el.classList.contains('open')) : false;
            await page.screenshot({ path: path.join(pageDir, `video-modal-${testWidth}.png`) });
            const videoClose = await page.$('#video-modal-close');
            if (videoClose) await videoClose.click({ timeout: 3000 });
            await page.waitForTimeout(300);
          }
        } catch (err) {
          auditReport.defects.push({
            page: pageDef.name,
            path: pageDef.path,
            viewport: `${testWidth}px`,
            type: 'VIDEO_MODAL_ERROR',
            severity: 'MEDIUM',
            message: err.message
          });
        } finally {
          await page.evaluate(() => {
            document.body.style.overflow = '';
            const vm = document.getElementById('video-modal');
            if (vm) vm.classList.remove('open');
          });
        }
      }

      if (pageDef.name === 'enrichments') {
        try {
          const cards = await page.$$('.pursue-item-card');
          if (cards.length > 0) {
            await cards[0].scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
            await cards[0].click({ timeout: 5000 });
            await page.waitForTimeout(350);
            await page.screenshot({ path: path.join(pageDir, `detail-modal-${testWidth}.png`) });
            const detailClose = await page.$('#detail-modal-close');
            if (detailClose) await detailClose.click({ timeout: 3000 });
            await page.waitForTimeout(300);
          }
        } catch (err) {
          auditReport.defects.push({
            page: pageDef.name,
            path: pageDef.path,
            viewport: `${testWidth}px`,
            type: 'DETAIL_MODAL_ERROR',
            severity: 'MEDIUM',
            message: err.message
          });
        } finally {
          await page.evaluate(() => {
            document.body.style.overflow = '';
            const dm = document.getElementById('detail-modal');
            if (dm) dm.classList.remove('open');
          });
        }
      }

      // Sticky Header check after scroll
      try {
        await page.evaluate(() => window.scrollTo(0, 450));
        await page.waitForTimeout(200);
        const isScrolledHeader = await page.evaluate(() => {
          const h = document.getElementById('site-header');
          return h ? h.classList.contains('scrolled') : false;
        });
        if (!isScrolledHeader) {
          auditReport.defects.push({
            page: pageDef.name,
            path: pageDef.path,
            viewport: `${testWidth}px`,
            type: 'STICKY_HEADER_FAIL',
            severity: 'MEDIUM',
            message: 'Header did not gain .scrolled class after scrolling down 450px'
          });
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(100);
      } catch (err) {}
    }

    auditReport.pagesAudited.push(pageDef.name);
  }

  await browser.close();

  const reportPath = path.join(OUT_DIR, 'audit-summary.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));
  console.log(`\nAudit completed! Summary written to: ${reportPath}`);
  console.log(`Total defects logged: ${auditReport.defects.length}`);
  console.log(`Total console errors: ${auditReport.consoleErrors.length}`);
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
