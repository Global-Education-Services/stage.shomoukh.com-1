# UI audit — 15 October 2026

**Final follow-up status:** 116/116 route QA,64/64 component QA and38/38 form-repair checks passed. The three earlier validation failures are resolved. Build passed; online delivery still needs a backend. Earlier sections preserve the initial audit history.

The current design is preserved. Three confirmed component defects were repaired: expanded drawer links were clipped, search extended below short desktop viewports, and rapid Escape/Tab entered closing dialogs. Existing business behavior was preserved. This report supersedes earlier audit conclusions for this working tree; earlier reports are archived under `audit-results/current-qa/previous-reports/`.

## Scope and architecture

The application is a public Vite multipage site using vanilla HTML, shared `main.js`, `ui-dialogs.js`, `style.css` and the preexisting `design.css` layer. Vite config declares ten pages; `/` aliases Home. There are no authenticated dashboards, role routes, database/server implementation, HTML tables, pagination or tab widgets in this repository. Empty `src` directories do not define additional routes.

The existing palette, Figtree/Playfair Display/Caveat typography, spacing, cards, layouts, branding and navigation structure are the protected baseline. Only submenu height, search-panel containment and closed-dialog keyboard isolation were changed.

| Page | Discovered sections and states |
|---|---|
| Home | Hero/pause control, key features, philosophy/mission/vision cards, program pillars, age/schedule cards, eight atelier dialogs, facilities, admissions, campuses |
| About | Welcome, philosophy, mission/vision/values, principles, health/safety |
| Programs | Promise, Reggio, EYFS, teachers, environment, focus areas, infant/toddler/preschool/flex-care anchors |
| Enrichments | Overview, descriptions, eight atelier detail triggers |
| Spaces | Environment, 14 facility cards, three linked gallery photos, piazza/garden/classrooms |
| Admissions | Introduction, enrollment steps, fee inquiry link, documents checklist |
| Book a visit | Tour guidance, nine-field form, expectations, feedback |
| Apply online | Single-page enrollment form: 18 named fields plus four checkboxes; no wizard |
| Parents | Three access-request platform cards, four informational cards, guidance |
| Contact | Two campuses/directions, six-field form, 180-character counter, feedback |

## Audit checklist and coverage

- [x] Discover all ten routes, shared design layers and static fragment destinations.
- [x] Capture 110 fresh full-page baselines before repair.
- [x] Inspect initial layouts at 320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920 and 2560px.
- [x] Inspect document/element overflow, text-range containment and header sibling geometry.
- [x] Exercise drawer and all seven accordion groups, search empty/no-match/matching states, close/Escape and focus return.
- [x] Exercise atelier detail content, keyboard activation, close and scroll containment.
- [x] Inspect narrow-screen forms, native controls, feedback, counter, hero video and jump links.
- [x] Capture 110 final full-page screens and verify source stability during the run.
- [x] Independently reproduce all three defects against saved original source and verify corrected behavior.
- [x] Build production assets and retain failing out-of-scope checks.
- [ ] Firefox/WebKit, real devices and virtual keyboard execution: not performed.
- [ ] Real submission delivery and server loading/error states: absent from implementation; not claimed as verified.

The responsive page scan found zero document overflow or visible out-of-bounds elements across all 110 cases. Text checks found intentional two-line atelier previews and screen-reader-only labels, which were excluded from defects. Interactive scans then exposed the two component defects, demonstrating why the initial page scan alone was insufficient.

## Defect inventory

| ID | Severity | Symptom | Disposition |
|---|---|---|---|
| UI-01 | High | Fixed 300px submenu cap hides wrapped/final links | Repaired and independently verified |
| UI-02 | Medium | Search panel extends below a 360px-tall desktop viewport | Repaired and independently verified |
| UI-03 | Medium | Immediate Tab after Escape enters a closing drawer | Repaired; independent review recorded separately |
| U-01 | High, behavior | Three forms report success without validation or delivery | Preserved and documented outside rendering scope |
| U-02 | Medium, behavior | Contact query parameters are not applied | Preserved and documented |
| U-03 | Low, unreachable | Video lightbox markup has no UI trigger | Preserved and documented |

Details and reproduction evidence are in `UI_FIX_LOG.md` and `UNRESOLVED_ISSUES.md`. No critical in-scope defect was reproduced. This is not a claim that the application is ready for real submissions.

## Evidence and reproduction

Use the existing Node installation and installed Playwright/Chrome:

```sh
npm run dev
node audit-scripts/current-responsive.mjs final
node audit-scripts/current-text-geometry.mjs
node audit-scripts/current-qa.mjs
node audit-scripts/current-components-final.mjs
node audit-scripts/current-independent.mjs
node audit-scripts/current-dialog-independent.mjs
node audit-scripts/current-supplemental.mjs
npm run build
```

Scripts target local port 5174. Before/after component evidence is in `audit-results/current-components/`; full-page evidence is in `audit-results/current-run/`; independent A/B screenshots and QA results are in `audit-results/current-qa/`. The QA script intentionally exits nonzero for retained empty-form validation failures. Historical scripts referencing removed submission/wizard code are not used to claim current coverage. No configured unit/integration suite exists.

## Metrics

Final measured metrics from completed suites follow.

| Audit metric | Result |
|---|---|
| Total pages discovered | 10, plus `/` alias |
| Pages audited | 10; 110 baseline and 110 final page/viewport captures |
| Components tested | 12 families; 16 atelier trigger instances; 3 forms |
| UI issues detected | 3 confirmed component defects |
| UI issues fixed | 3, independently approved |
| Critical issues remaining | 0 reproduced in scope; high-severity form behavior remains outside repair scope |
| Responsive issues fixed | 2 component containment defects |
| Playwright tests passed | Final route/interaction QA: 113/116; 3 retained empty-form failures |
| Visual regressions | 0 confirmed in reviewed captures; 101/110 pairs pixel-identical |
| Unresolved issues | 3 existing behavior/unreachable-state groups, plus explicit browser/access limits |
| Design preserved | Yes; targeted `main.js`/`style.css`/`ui-dialogs.js` corrections only |

Twelve component families: header/navigation; drawer/accordions; search; atelier cards/detail dialog; form controls; feedback toast; background video; scroll-to-top; content cards/grids; CTA links; footer; gallery/directions. Components are counted by family rather than every repeated DOM instance.

Final route QA records no JavaScript runtime or browser console errors. All 110 menu/search/scroll interaction combinations passed, as did static internal links/fragments and matching-search navigation. The only final failing checks are the three documented empty-form validation checks. Production build passed.

Additional final checks: 64/64 component cases and 8/8 supplemental keyboard/search/scroll/counter cases passed. Both independent review reports approve the fixes: `audit-results/current-qa/independent-review.md` and `dialog-independent-review.md`. The final screenshot sweep was refreshed after UI-03; 101 pairs remain identical, eight differ only in the hero video, and one Admissions screenshot differs by at most 1/255 per channel.

## Follow-up before Git push — current status

The user subsequently requested fixes and a Git push. UI-04 corrects empty-form validation and false delivery feedback; UI-05 applies existing contact-link query prefills. These follow-up behavior corrections supersede the earlier retained-failure status above. The existing visual design is unchanged. Actual delivery remains unavailable because this repository has no backend.

| Follow-up metric | Result |
|---|---|
| Confirmed repairs completed | 5 total: three UI repairs, form validation/feedback, and contact prefill |
| Form-specific Playwright checks | 38/38 passed across all11 widths |
| Online delivery | Unavailable; honest feedback and input retention verified |
| Remaining limitations | Missing backend, unreachable lightbox trigger, unexecuted browsers/devices |

Screenshots and raw evidence are local in ignored `audit-results/`. Current test scripts and reports are included in Git; historical reports and generated screenshots are excluded.

Final follow-up regression:116/116 route checks,64/64 component checks,38/38 form-specific checks passed. No browser runtime errors or unexpected submission requests. Production build and source syntax/whitespace checks passed.
