# Visual regression report — 15 October 2026

The existing design was preserved while repairing drawer submenu clipping and search containment, and closing-dialog keyboard isolation. Evidence uses this run's saved original source and fresh captures rather than historical reports.

## Full-page comparisons

Ten routes × eleven requested widths were captured before and after repair: 220 full-page screenshots. All 110 pairs retain identical image dimensions. Final geometry checks report zero horizontal document overflow and zero visible elements outside the viewport; source hashes stayed stable throughout the final sweep.

| Comparison outcome | Pairs |
|---|---:|
| Pixel-identical | 101 |
| Home hero video frame differences; below first 900px identical | 8 |
| Minor raster differences, maximum RGB delta ≤1/255; geometry identical | 1 |
| Confirmed visual regressions | 0 |

The remaining minor raster difference is Admissions at 320px: maximum RGB channel difference is 1/255 and component geometry is unchanged. This is not presented as pixel-identical. These counts reflect the final recapture after the keyboard repair.

Evidence: `audit-results/current-run/baseline/`, `final/`, `screenshot-comparison.json`, `final-source-before.json`, `final-source-after.json` and `responsive-summary.md`.

## Independent interactive comparison

Independent reviewer intercepted CSS and JavaScript requests with saved originals, then repeated the same actions against final source. All seven accordions were observed at 320, 414, 768, 1024, 1440 and 2560px. Fifteen baseline submenu states clipped content; none clipped after the repair. Final-link visibility and Escape/focus return were verified.

At 1024×360 and 1440×360, the search bottom changed from y444 to y344; scrolling now brings the final quick link inside the viewport. At 320×360 the panel bottom remains y340. Normal-height search appearance is unchanged.

Independent decision: **both repairs approved; no unnecessary redesign found**. Evidence and explicit scope are in `audit-results/current-qa/independent-review.md`, with 102 A/B observations in `independent-results.json` and additional targeted screenshots/metrics.

## Practical limits

Executed browser: Google Chrome through Playwright. No Firefox/WebKit, physical device or virtual keyboard claim is made. Full-page pixel comparisons do not cover every interactive state; component scripts and independent screenshots cover the tested menu, search and detail states separately. Intentional card excerpt truncation remains unchanged. Out-of-scope form behavior failures are retained in `UNRESOLVED_ISSUES.md` and do not count as newly introduced visual regressions.

## Final keyboard repair review

The additional closed-dialog inert-state repair passed independent original/final A/B tests at 320px and 1440px: Escape immediately followed by Tab no longer enters the closing drawer. Reopening and 30 Tab presses preserve focus containment; search close/reopen also passes. Approval is in `audit-results/current-qa/dialog-independent-review.md`.

## Follow-up form repairs

The follow-up restores native validation and uses the existing feedback toast to state that delivery is unavailable, preserving field values. Contact query parameters populate the existing message field. No CSS, fonts, branding, page layout or navigation changed in this follow-up. Feedback containment passed for all three forms at all11 requested widths; desktop/mobile captures are local under `audit-results/form-repairs/`. The full before/after pixel counts above describe the earlier visual repairs, not a newly executed pixel comparison of native validation bubbles.
