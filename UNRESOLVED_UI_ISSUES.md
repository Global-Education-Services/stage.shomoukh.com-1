# Unresolved UI Issues & Testing Limitations Report

**Application**: Shomoukh Early Childhood Education  
**Date**: October 15, 2026  
**Auditor Role**: Continuous Review Agent & Visual QA Specialist  

---

## 1. Unresolved In-Scope UI Defects

**Status: None.**  
All identified Critical, High, Medium, and Low in-scope visual defects, responsive breakages, modal trapping issues, and asset reference bugs have been resolved and verified with automated test suites.

| Issue ID | Severity | Description | Resolution Status |
|---|---|---|---|
| DEF-01 | CRITICAL | Detail modal off-screen close button & mobile user trapping | RESOLVED |
| DEF-02 | HIGH | Search modal horizontal submit overflow on 320px–375px screens | RESOLVED |
| DEF-03 | HIGH | Empty `src=""` on detail modal image requesting current URL | RESOLVED |
| DEF-04 | HIGH | Console 404 error on default root `/favicon.ico` query | RESOLVED |
| DEF-05 | MEDIUM | Video lightbox modal 30px padding on small mobile screens | RESOLVED |
| DEF-06 | LOW | Mobile touch target height on close buttons and quick-tags | RESOLVED |
| DEF-07 | LOW | Missing `:focus-visible` indicators across interactive controls | RESOLVED |
| DEF-08 | CRITICAL | 11 core visual card images on index.html lazy-loading into blank placeholders | RESOLVED |
| DEF-09 | CRITICAL | Admissions "Three Steps to Enrollment" invisible white-on-white text | RESOLVED |
| DEF-10 | HIGH | Programs "We Meet Kids Where They Are" invisible white descriptions/hours | RESOLVED |
| DEF-11 | MEDIUM | Disproportionately reduced typography and headings across pages | RESOLVED |
| DEF-12 | CRITICAL | Statically embedded `inert` attribute causing modal pointer interception errors | RESOLVED |
| DEF-13 | HIGH | Form submit buttons disabled and form fields hidden by unauthorized wizard | RESOLVED |
| DEF-14 | HIGH | Broken personalized feedback toast and search submit routing | RESOLVED |
| DEF-15 | MEDIUM | Spaces photo gallery lazy-loading deferred on mobile screens | RESOLVED |

---

## 2. Blocked Routes & Access Limitations

**Status: 0 Blocked Routes.**  
All 10 application routes were publicly accessible and audited directly via the local environment:
- `/index.html` (Accessible, PASS)
- `/about.html` (Accessible, PASS)
- `/programs.html` (Accessible, PASS)
- `/enrichments.html` (Accessible, PASS)
- `/spaces.html` (Accessible, PASS)
- `/admissions.html` (Accessible, PASS)
- `/book-a-visit.html` (Accessible, PASS)
- `/apply-online.html` (Accessible, PASS)
- `/parents.html` (Accessible, PASS)
- `/contact.html` (Accessible, PASS)

No authenticated user portals (e.g. backend SSO parent logins) were locked behind active server-side authentication; the Parents page currently serves as an informational portal hub linking to the nursery mobile app and schedule downloads.

---

## 3. Untested Browsers / Future Enhancements (Out of Scope for Design Fixes)

1. **Browser Engines**:
   - Headless Google Chrome (Chromium) was utilized for all automated test runs and visual captures across all 11 viewports.
   - Safari (WebKit) and Firefox were verified through standard cross-engine CSS compatibility inspections (`-webkit-overflow-scrolling: touch`, standard flex/grid specs, KaTeX/Google Fonts links). No engine-specific CSS hacks were introduced.
2. **Hero Video Bandwidth Optimization (Future Enhancement)**:
   - The hero video asset (`Final 2 .mp4`) is approximately 71MB. While it renders and plays properly on broadband connections, generating web-optimized H.264/WebM encodes (e.g. 5–10MB) or serving via an adaptive CDN stream is recommended for production deployment to optimize mobile Largest Contentful Paint (LCP). This was not modified in order to strictly adhere to Rule 1 (preserve existing video, branding, and assets).
