# stage.shomoukh.com-1

dfdfdfdd
Run `npm run dev` for local development and `npm run build` for static deployment output in `dist`.

Website validation: `npm run audit:links`, `npm test`, and `npm run test:site` with a local server running. Chatbot validation: `npm run chatbot:generate-tests`, `npm run chatbot:evaluate`, `npm run chatbot:test-10k`, and `npm run test:browser`.

See [website audit](docs/website-audit.md) for verified fixes and remaining setup. Online form delivery has no backend in this static repository; the forms explicitly state this and retain entered values. Do not show a sent/received confirmation until a real submission endpoint confirms delivery. Verified social/app-store destinations still need owner input.

## Arabic website

The Arabic pages under `/ar/` are generated from the English pages by `npm run i18n:build` (run automatically before `dev` and `build`). Translations live in `i18n/ar/*.tsv` as `English<TAB>Arabic` lines; the build fails and lists any English text without a translation. `style.rtl.css` is `style.css` mirrored for right-to-left plus `i18n/ar.css`. Edit the English pages and the `.tsv` files, never the generated `ar/*.html`. Check with `node --test tests/arabic-site.test.js` and, with a dev server running, `node tests/arabic-audit.mjs`.
# KHULOOD-1
