# Remaining limitations — 15 October 2026

## Submission backend unavailable

This repository contains a static Vite site with no submission API or configured delivery service. The follow-up fixes restore native required-field/email validation, prevent false success, and retain entered values. Valid submissions now explicitly state that nothing was sent and ask visitors to contact their selected campus. Actual online delivery still requires a backend and its deployment configuration; no production delivery is claimed.

## Existing unreachable video lightbox

Home includes lightbox markup/handlers but no visible lightbox trigger. Adding a new control would alter the protected design. Background video playback controls are tested; no reachable lightbox flow is claimed.

## Coverage limits

Executed browser: installed Google Chrome through Playwright. Firefox, WebKit/Safari, physical devices and OS virtual keyboards were not executed. No authenticated app, tables, pagination, tabs or server loading/error states exist in this repository. External fonts/icons/media remain provider dependencies.

Historical tests referencing removed wizards, APIs and contact widgets are not current coverage. Current Playwright scripts test the actual site. Screenshots and raw evidence remain local under ignored `audit-results/`; the source scripts and four current reports are committed.

Previously unresolved empty-form validation and query-prefill issues are now fixed. Prefills use a text field value, respect its 180-character limit, and update the counter; markup-like input stays plain text.
