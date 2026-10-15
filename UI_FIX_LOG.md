# UI fix log — 15 October 2026

This run uses the existing working tree, including its existing design.css layer, as the design baseline. Earlier reports are archived in `audit-results/current-qa/previous-reports/`. No historical fix is counted as a new fix.

## UI-01 — Expanded navigation links clipped (high)

Reproduction: open the navigation drawer, expand Programs and inspect the final link after the transition settles. At 320px its content needs 393px but the container was capped at 300px; at 1024/1440px content needs 310px. Links below the cap were hidden by overflow.

Root cause: a fixed `max-height: 300px` on every expanded submenu.

Repair: `main.js` measures the existing content height on initialization, expansion, font readiness and window resize; `style.css` uses that value for the existing max-height transition. Labels, link order, typography, colors, touch targets and accordion behavior remain unchanged.

Evidence: `audit-results/current-components/before-defects.json` and `after-defects.json`, plus before/after Programs drawer screenshots. The final content height equals the container height and the final link fits.

## UI-02 — Search panel below short viewport (medium)

Reproduction: open search at 1024×360 or 1440×360. The panel starts at y120 and previously ends at y444, while background scrolling is locked.

Root cause: `max-height: 90dvh` did not account for the existing 120px top inset.

Repair: constrain available panel height by the existing inset plus bottom margin. The existing mobile inset uses its own 32px total allowance. Internal scrolling remains available; the normal-height design stays unchanged.

Evidence: before/after defect metrics and short-search screenshots. Final desktop panel ends at y344 in a 360px viewport; mobile ends at y340. Reviewer verifies access to the bottom content by scrolling.

## Changes rejected or deferred

- No responsive page CSS changes: fresh 110-case geometry audit did not reproduce a page layout defect.
- Ordinary Escape focus return passed. A later rapid Escape/Tab check reproduced UI-03 and justified closed-dialog isolation.
- Intentional two-line card previews and screen-reader-only text were excluded from clipping defects.
- Submission delivery, validation behavior and query-prefill behavior require business-logic changes and are documented in `UNRESOLVED_ISSUES.md`.
- Initial QA encountered one detached element when Vite reloaded during the fix. Stable-source final QA is recorded separately; the interrupted run is retained as `qa-initial.json`.

Only application source files changed by this run: `main.js`, `style.css` and `ui-dialogs.js`. Production `dist/` was regenerated with `npm run build`. No framework or dependency was added.

## UI-03 — Rapid Tab enters a closing dialog (medium)

Reproduction: open drawer, press Escape, immediately press Tab. At 320px and 1440px, focus enters `.drawer-brand` while its enclosing drawer already has `aria-hidden="true"`. The closing CSS transition keeps its children briefly visible to sequential keyboard navigation.

Repair: the shared dialog controller initializes closed dialogs as inert, clears inert when opening, and sets inert immediately on closure. Existing animations, background isolation and focus-return behavior remain intact.

Evidence: `audit-results/current-qa/supplemental-before.json` records the hidden focus target; `supplemental.json` records the corrected keyboard checks. Full route and component matrices were repeated after this final change.

## Final verification

All three repairs independently approved. Final110 route/width interaction cases passed; total route QA113/116 with only3 retained business-validation failures. Component QA64/64 and supplemental checks8/8 passed. Final110 screenshot/geometry cases show zero overflow/out-of-bounds; source hashes stable. Production build and git diff whitespace check passed. The initial component harness used an absent main-form wrapper and attempted the unreachable video trigger; corrected selectors and an explicit trigger-presence guard passed the complete rerun. Initial harness output remains retained for transparency.

## Follow-up fixes requested before Git push

### UI-04 — Form validation and misleading delivery feedback

Removed `novalidate` from contact, tour and enrollment forms and guard submit handling with native `reportValidity()`. A static site without delivery configuration now reports unavailable submission instead of claiming success. Entered information stays in the form; no network transmission is attempted. Existing toast layout and palette remain, using an informational icon for unavailable delivery.

### UI-05 — Existing contact inquiry links lose their context

Read the existing `subject`/`inquiry` query parameters into the contact message field, limited to its existing 180 characters. The counter initializes from the same value. Assignment uses `.value`, so input is plain text. No new form controls or navigation were introduced.

Follow-up tests cover all three forms at all eleven widths, empty validation, valid input preservation, unavailable feedback containment and four query-prefill cases, including markup-like and overlong input. All38 checks passed. Broader route/component regression is recorded in the audit report. The prior three validation failures are resolved; real delivery remains blocked by the absent backend.
