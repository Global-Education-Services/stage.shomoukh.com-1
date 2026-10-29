# Website audit and fixes

Audited 19 October 2026 against all ten public pages and the production build. Scope: navigation, local pages/assets/anchors, search, forms, keyboard interaction, mobile layout, media loading, dependencies and chatbot regressions. The existing branding, chatbot and public business facts were preserved. No live deployment, private portal access or external message delivery was performed.

## Fixed

| Finding | Change and verification |
| --- | --- |
| 30 broken enrichment navigation links | Added the missing Tiny Town, Sensory Play and Music/Drama targets to the corresponding existing cards. All internal URLs, fragments, IDs and directly referenced local HTML assets now validate. |
| Search used substring redirects | Replaced misleading redirects (including contact page, registration and facilities) with lazy local-content results, excerpts, valid citations, no-match feedback and safe text rendering. No search/chat query is sent to a service. |
| Three forms falsely claimed successful delivery and discarded entries | Added a visible delivery notice, truthful feedback and campus contact fallback; preserved entered details. Native required/email validation now runs. Submit controls stay disabled until their JavaScript guard loads, and form methods avoid GET query-string exposure. |
| Future child birth dates and past visit requests were accepted | Added native local-date maximum/minimum constraints without inventing an admissions age policy. Browser checks assert range errors. |
| Keyboard users lost focus in overlays | Added focus entry, Tab/Shift+Tab containment and focus restoration for menu, search, video and enrichment dialogs. Opening visibility transitions no longer prevent focus. Added a named navigation dialog, labelled search input, main landmarks, skip links and visible focus indicators. |
| Language selection silently did nothing | Preserved the selector left of search on all pages, with readable mobile sizing. Selecting unavailable Arabic content now gives an explicit message and retains the actual English language. No official translations were fabricated. |
| Mobile inputs could trigger Safari focus zoom | Applied 16px text for coarse-pointer input/select controls and adjusted the narrow header spacing to fit at 320px. Actual handset behavior still needs device confirmation. |
| Icons disappeared when the CDN was blocked | Vendored the exact existing Font Awesome 6.5.1 stylesheet/fonts with their license and preserved stylesheet integrity. Core icons render with external requests blocked. Google text fonts remain optional with system fallbacks. |
| Background video transferred the 68.1 MiB original | Created a 20-second, approximately 2.0 MiB background copy from the same footage, about 97% smaller. The full original remains available on explicit lightbox playback. Reduced-motion visitors use the poster and do not download/autoplay the background movie; play/pause labels follow media state. |
| iOS/Android buttons claimed direct store downloads but linked to a parent information page | Updated the labels to describe the actual destinations. No app-store IDs were guessed. |
| Missing favicon and nonfunctional hidden initial success toast | Reused the existing approved logo as favicon. Initial toast messages are empty, hidden and polite; real feedback is announced when shown. |
| Small text and narrow touch targets | Restored 16px mobile body text; chat replies now use 16px, suggestions/source labels 14px and the privacy note 12px. Language, video, step, social and chat-source controls have at least 44px height; touch footer/campus/breadcrumb links also have 44px height. Existing branding is retained. Dimension checks passed at 320, 390 and 1440px; open-chat layout was visually inspected at 320px. Physical touch behavior remains unverified. |

## Checks completed

- Production build succeeds; **89/89 unit tests pass**, including the preserved chatbot suites and three new site-search tests.
- **10 pages × 3 viewport widths** (1440, 390, 320): no local asset errors, visible-control horizontal overflow or runtime errors. Header language/search order, main landmarks, required forms, keyboard search/menu focus and focus restoration pass.
- Search checks cover contact/registration/facilities, no results and inert XSS input. Forms cover required fields, dates, retained values, honest feedback and zero POST requests. Reduced-motion loading and the disabled no-script submit guard pass.
- Existing chatbot browser tests pass at **1440×1000, 390×844, 320×568 and 844×390**, across all ten entry points, including offline replies after assets load.
- Legacy evaluation remains **129/129 representative** and **2,497/2,497 generated**. The expanded corpus remains **9,997/10,000**, with **98/100** on the fixed diagnostic holdout. These are automated/source-reviewed fixtures, not independent human semantic accuracy.
- Local link/asset/duplicate-ID audit: **10 pages, zero failures**. The knowledge inventory also reports **zero broken fragment links**, down from 30.
- `npm audit`: **zero reported vulnerabilities** at audit time, including development dependencies. This is not a penetration test or a guarantee against future advisories.

Browser evidence and screenshots: `test-results/site-audit.json`, `test-results/site-home-*.png` and `test-results/browser-report.json`. Generated results are ignored by Git. Physical iOS/Android devices, screen-reader announcements and live external-service availability were not tested.

### Extended responsive inspection, 19 October 2026

Inspected all ten pages at 320×568, 360×800, 390×844, 600×960, 768×1024, 1024×768, 1440×900 and 844×390: 80 page/viewport combinations, with no horizontal page overflow, out-of-bounds visible controls or header-control overlaps. Visually inspected phone, tablet and landscape homepage/chat captures. Fixed the missing flex layout on the homepage action group so its existing 12px gap separates the visit/application buttons. Rechecked the gap, page width and chat bounds at all eight sizes; production build and 89 unit tests pass. Short screens can scroll to content below the fold. This is browser emulation, not physical-device testing. Evidence: `test-results/responsiveness.json`, `test-results/responsive-fixes.json`, `test-results/responsive-home-*.png` and `test-results/responsive-chat-*.png`.

## Final English/Arabic audit, 28 October 2026

Clean `npm run build` (no warnings) of all 22 pages, served with `vite preview` and checked in Chromium.

| Finding | Fix |
| --- | --- |
| Arabic chatbot answered "ما هي الرسوم؟" (fees) with an unrelated admissions paragraph | Fee questions get the same answer as English (no published amounts; contact the nursery). Opening-hours questions answer with the contact page hours. |
| Two of the six Arabic suggested chatbot questions (ages, campus locations) returned no answer | `site/search-ar.js` no longer strips the ف of "الفروع" after the article, and maps a few broken plurals/verb forms (الأعمار، الفروع، تقع، تقبلون) to their singular. Excerpts start at the sentence that matched. |
| Colour contrast 2.33:1 on the Apply Online section headings, the menu's "Book a visit" pill and its script tagline | Text uses the existing `--shomoukh-coral-ink` / primary shades; coral fills are unchanged. |
| Phones got the 960×506 hero video stretched to the 650–844px-tall hero (soft image) | The rendition is chosen by the size it is drawn at: 1280×676 (HEVC where supported) normally, 960 only on data-saver or 2G/3G. |
| Accessibility audit covered English only | `tests/accessibility-audit.mjs` also scans the ten Arabic pages. |

Results: 105/105 unit tests; link audit 0 failures; site audit (10 pages × 3 widths), Arabic audit (10 pages × 4 widths, switching, memory, search, chatbot, validation) and chatbot browser test (4 viewports) pass; axe WCAG 2.1 AA: 48 scans, 0 violations. Language switching checked on all 20 pages (equivalent page, query and hash kept, lang/dir correct). All five videos are fast-start MP4s at the source's native 1280×676; the source on disk ("Final 2 .mp4") is no larger, so no higher-quality master exists to encode from.

Open: the film lightbox (`#video-modal`) has had no button to open it since September; the film is not captioned; the Apply Online page says ages 6 months–6 years while other pages say 6 months–4 years; `npm audit` reports advisories in `undici` via `wrangler` (development only; `--omit=dev` reports none).

## Remaining setup and content confirmation

1. **Real form delivery is not configured.** This repository is a static Vite site with no submission endpoint, mail transport or database. Validation now works honestly, but requests are not delivered. A production delivery endpoint must be supplied and verified before restoring a send/confirmation workflow. Campus phone/email links remain available.
2. **Arabic website content is absent.** The selector cannot translate public policies or claim a translated site without approved content.
3. Social icons still point to generic platform homepages, and direct App Store/Google Play URLs are not supplied. The owner must confirm the real profile/store destinations; none were invented.
4. The previously documented conflicting ages, unpublished fees, special-day hours and missing corporate details still require factual confirmation. These business claims were not silently rewritten.
5. The three generated-chatbot misses and two fixed-holdout mismatches remain visible in the chatbot report. No regression fixtures were weakened to claim a perfect score.

## Repeat the audit

```sh
npm run build
npm run audit:links
npm test
npm run chatbot:generate-tests
npm run chatbot:evaluate
npm run chatbot:test-10k
# Start npm run dev or npm run preview in another terminal:
SITE_TEST_URL=http://127.0.0.1:5174 npm run test:site
CHATBOT_TEST_URL=http://127.0.0.1:5174 npm run test:browser
```

Set `CHROMIUM_EXECUTABLE` to an installed Chromium binary, or install Playwright Chromium once. The test tools use local public content and local browser sessions. Deploy the full generated `dist` directory; unpublished source notes and private files are not deployment inputs. Font Awesome's original license is retained in `public/vendor/fontawesome/LICENSE.txt`.
