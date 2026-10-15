# stage.shomoukh.com-1

## Local UI regression checks

Install development dependencies with `npm ci`, then start `npm run dev` (port5174). These local browser checks require installed Google Chrome; the route suite currently uses its macOS executable path.

```sh
node audit-scripts/current-qa.mjs
node audit-scripts/current-form-repairs.mjs
node audit-scripts/current-components-final.mjs
node audit-scripts/current-supplemental.mjs
npm run build
```

For the form-specific script, set `AUDIT_BASE_URL=http://127.0.0.1:5174` when using the default dev port. The route and component suites also support this environment variable. Screenshots and raw JSON are generated under ignored `audit-results/`.

The site has no online submission backend. Forms validate and retain inputs while reporting unavailable delivery. See `UI_AUDIT_REPORT.md`, `UI_FIX_LOG.md`, `VISUAL_REGRESSION_REPORT.md`, and `UNRESOLVED_ISSUES.md` for audit findings and explicit coverage limits.
