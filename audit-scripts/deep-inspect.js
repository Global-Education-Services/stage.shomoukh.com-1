import { chromium } from 'playwright';

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
  320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920, 2560
];

async function deepInspect() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });

  const page = await browser.newPage();
  const findings = [];

  for (const pageDef of PAGES) {
    for (const w of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(`${BASE_URL}${pageDef.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);

      const pageReport = await page.evaluate((viewportWidth) => {
        const issues = [];
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;

        // Check horizontal overflow
        if (scrollWidth > docWidth + 1) {
          const culprits = [];
          document.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > docWidth + 2) {
              culprits.push({
                tag: el.tagName,
                className: typeof el.className === 'string' ? el.className : '',
                id: el.id,
                right: Math.round(r.right),
                overflow: Math.round(r.right - docWidth),
                text: el.textContent?.trim().slice(0, 30) || ''
              });
            }
          });
          // Sort by highest overflow
          culprits.sort((a, b) => b.overflow - a.overflow);
          issues.push({
            type: 'HORIZONTAL_OVERFLOW',
            viewportWidth,
            docWidth,
            scrollWidth,
            culprits: culprits.slice(0, 5)
          });
        }

        // Check header alignment & overflow
        const header = document.querySelector('.site-header');
        if (header) {
          const headerContainer = header.querySelector('.header-container');
          if (headerContainer) {
            const hRect = headerContainer.getBoundingClientRect();
            if (hRect.right > docWidth + 2) {
              issues.push({
                type: 'HEADER_OVERFLOW',
                viewportWidth,
                right: hRect.right,
                docWidth
              });
            }
          }
        }

        // Check form elements usability (if present)
        document.querySelectorAll('input, select, textarea').forEach(input => {
          const rect = input.getBoundingClientRect();
          if (rect.width > docWidth) {
            issues.push({
              type: 'INPUT_OVERFLOW',
              viewportWidth,
              tag: input.tagName,
              id: input.id,
              width: rect.width,
              docWidth
            });
          }
        });

        // Check cards layout / columns
        const cardsContainers = document.querySelectorAll('.programs-grid, .pursue-grid-eight, .spaces-grid-three, .stats-row, .admissions-grid, .contact-cards-grid, .footer-top-grid');
        cardsContainers.forEach(grid => {
          const rect = grid.getBoundingClientRect();
          if (rect.right > docWidth + 2) {
            issues.push({
              type: 'GRID_CONTAINER_OVERFLOW',
              viewportWidth,
              className: grid.className,
              rectRight: Math.round(rect.right),
              docWidth
            });
          }
        });

        return issues;
      }, w);

      if (pageReport.length > 0) {
        findings.push({
          page: pageDef.name,
          viewport: `${w}px`,
          issues: pageReport
        });
      }
    }
  }

  await browser.close();
  console.log('Deep Inspection Findings count:', findings.length);
  if (findings.length > 0) {
    console.log(JSON.stringify(findings, null, 2));
  } else {
    console.log('No layout container overflow detected by deep DOM query.');
  }
}

deepInspect().catch(console.error);
