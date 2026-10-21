# Shomoukh website assistant

This is a local extractive website assistant, not a generative language model. It needs no AI provider, API key, account, inference service or paid dependency. It answers with local website content and reviewed facts from official GES sources, with clickable references.

## Run and maintain

Use Node 20.19+ or Node 22.12+ and `npm ci` to install build/test tools. Run `npm run dev` for the website. The assistant is installed on all ten pages through the existing shared `main.js` module.

- `npm run chatbot:build`: rediscover root public HTML and the public enrichment modal data in `main.js`; regenerate the inventory, knowledge records and question dataset.
- `npm test`: run deterministic engine, entity scope and source validation tests.
- `npm run chatbot:evaluate`: measure factual/status correctness, returned-source accuracy and combined grounded accuracy separately; save `chatbot/evaluation/results.json`.
- `npm run build`: regenerate knowledge automatically, then build every existing Vite entry point into `dist`.
- `npx playwright install chromium`: install a browser once for tests.
- Start `npm run dev` in another terminal, then run `npm run test:browser`. Set `CHATBOT_TEST_URL` to test a preview/deployment, or `CHROMIUM_EXECUTABLE` to use an existing Chromium binary.

Deploy the complete generated `dist` folder using the site's normal static hosting process. No chatbot server is required. This implementation has not been published to a live host.

## Content and approval boundary

`chatbot/inventory.json` inventories each discovered public page: title, URL, extracted text, topics, keywords, related valid pages, category, language, source path and timestamp when published. No authoritative update timestamps exist in these sources; null means unavailable, rather than inventing freshness.

`chatbot/knowledge.json` contains deduplicated sections with unique IDs, extracted answers, alternative questions, keywords, category, language, source anchors and verification/conflict metadata. `chatbot/test-questions.json` is generated from those records. `docs/chatbot-content-audit.md` records source conflicts, missing categories and preexisting invalid links.

The builder scans public root HTML, excluding navigation repetition, scripts, hidden implementation UI, generated output and dependencies. It explicitly extracts static public form labels/options without reading input values. Its sole dynamic-content adapter parses the existing public enrichment modal data; it does not execute website or visitor code. Do not add ERP, administrative, secret, draft or unpublished files to its inputs. `content.txt` is not a public content source. New CMS/dynamic data sources need an explicit adapter and review. New public root HTML is discovered, but must also be added to Vite's entry list to be deployed.

Edit facts in their original public HTML or public modal data, then rebuild. Do not hand-edit generated answers. Resolve age inconsistencies in the website first; update the conflict detection only when the sources agree. Existing broken website fragments are reported in the inventory and never emitted as chatbot source links.

## Retrieval and interface

The engine normalizes Unicode, punctuation, synonyms and common plurals, conservatively corrects spelling, classifies supported intents, and ranks with BM25, title, intent and recent-topic signals. It builds and caches its search maps once per opened widget. Controlled extractive responses retain published facts; conservative relevance gates and conflict checks return clarification/unknown instead of unsupported claims. Confidence is a heuristic relevance score, not a calibrated probability of correctness.

The small launcher loads with the shared site script. The widget, scoped CSS, engine and knowledge load on first open. Messages use DOM text nodes, never visitor-provided HTML. Links are restricted to indexed same-origin pages and the three exact official GES URLs explicitly allowlisted in `chatbot/source-policy.js`. GES links open in a separate tab with `noopener noreferrer`. Conversations stay in page memory and reset on navigation/reload; no visitor chat text is persisted or transmitted. The existing website's external font/icon/media requests are separate from the chatbot. After its assets load, replies work with the network disconnected; navigating a source page still requires that page to be available.

The nonmodal dialog supports labelled controls, a live conversation log, keyboard opening, Escape, focus restoration, reset, reduced motion, touch targets, safe-area offsets and narrow/landscape layouts. It sits above the existing scroll-to-top control. It does not submit existing enquiry/application forms; those existing forms currently show local feedback only.

## Limits and unsupported questions

Only English official content is present. Arabic input receives an explicit English-source fallback, with automatic direction on message text. The homepage Arabic selector does not provide an Arabic source corpus. Add reviewed Arabic public pages and language-specific engine/templates before advertising Arabic answers; official policies must not be automatically translated.

The assistant cannot confirm unpublished tuition amounts, live vacancies/availability, individual admissions eligibility, child records, private parent portal information, personalized medical advice, real-time news, or facts outside the indexed website and reviewed GES snapshots. It cannot book a visit or submit an application on a visitor's behalf. Conflicting age ranges receive a confirmation request. Public bus-request options do not establish route, availability or pricing. Suggestions and navigation use actual published topics and valid routes.

This is a lightweight retrieval system: unusual phrasing can lead to clarification, and source claims can be incorrect or outdated until site owners correct them. It does not independently authenticate marketing claims. Offline operation covers the already-loaded assistant, not a complete offline website or reload installation.

## Related GES sources

The visitor request to include the related education group extends the original local-site-only corpus. `chatbot/sources/ges.json` stores 17 reviewed facts from `https://www.ges.om/about.php`, `https://www.ges.om/index.php` and `https://www.ges.om/`, checked on 18 October 2026: six management roles, the chairman, group history/values/mission/vision, published institutions and the Shomoukh campus connection. The correct official domain is `ges.om`. No relationship with an unrelated company/domain is inferred.

The normal build validates this file's source URLs and section metadata, merges its records into the generated knowledge and question dataset, and saves related-source provenance in the inventory. It never fetches these sites while building or answering. To refresh, review the linked official pages, edit the factual summaries/role aliases in this source file, update `reviewedAt`, then rebuild and rerun tests. Adding a different external page requires an explicit source-policy change and reviewed source metadata; an arbitrary URL in a chat or knowledge record cannot authorize it.

Name lookup recognizes honorific variants such as Shk./Sheikh, supported name aliases and conservative unique-name typos. Pronoun followups retain the named person. GES roles are kept separate from nursery campus roles. Identity answers only establish the published role; they do not establish personal details, contact details, employment dates or live availability. Opening hours and attendance options come from nursery pages; a daily classroom timetable is unavailable.

## Short questions and campus conversations

`chatbot/role-resolver.js` matches reviewed role aliases from `sources/ges.json`, including MD/M.D. (Managing Director), VP/V.P. (Vice President), and CEO/C.E.O. Role questions work without a fixed sentence template. Standalone group-role answers explicitly identify GES. A campus-specific role or an unrelated company's role is not inferred from the group list. If a campus is already selected, a bare role asks the visitor to distinguish campus leadership from GES; suggested role questions explicitly name GES.

Short contact followups such as `phone?`, `email?`, `hrs?`, and `address?` retain a selected campus, including after a general program or admissions answer. A new campus name switches scope; `all campuses` requests both. Supported short forms include `tel`, `ph no`, `docs`, `opening hrs`, and the common Qrum/Qurm spelling variation. Personal contact questions after a leadership answer never silently reuse nursery contacts.

Campus program and admissions replies label sitewide information as general and request confirmation of campus-specific availability. Visit questions link the existing appointment request page. Weekday opening questions state the published weekly hours without claiming live or exceptional opening. Missing fees, campus leadership identities, personal contacts and unsupported facilities still receive clear unknown/clarification replies. Add regression questions in `tests/short-questions.test.js` when improving these rules.

## Question normalization and autocorrection

`chatbot/query-processor.js` runs before name lookup, role lookup, intent handling and search. `chatbot/knowledge/query-language.json` defines reviewed shorthand (whr, ur, phn, docs), common typing errors, phrase expansions and narrow spelling targets. Unknown company names, personal details, dates, negation and other qualifying words remain in the query. A unique one-edit or adjacent-transposition match can correct an unknown word. An ambiguous or protected real word is left unchanged; the assistant may need clarification. The input and message history retain exactly what the visitor typed. When correction occurs, the assistant shows a text-only “Understood as…” hint.

`chatbot/knowledge/word-guards.json` contains 835 checked-in real English words near approved targets and public topic-title vocabulary, preventing contract→contact, postal→portal and similar errors. The optional `npm run chatbot:word-guards -- /path/to/words` maintainer tool regenerates the set from a local public-domain dictionary (defaults to `/usr/share/dict/words` on macOS). The source is the public-domain Webster Second International/FreeBSD system list; the full dictionary is not distributed or loaded by the browser. Rebuild the guards when adding fuzzy spelling targets. The ordinary build needs neither this dictionary nor internet access. Add reviewed slang/common typos to the alias file rather than loosening correction thresholds.

`chatbot/knowledge/question-patterns.json` defines independent representative simple/short questions per verified topic. The knowledge builder validates their source titles and creates `chatbot/variation-test-questions.json`, including rephrasings, case/punctuation changes and safe generated spelling mutations. Protected real-word mutations are excluded from positive correction cases and tested as unknowns instead. These cases test retrieval; they do not provide duplicate runtime answers or bypass confidence checks. Run `npm run chatbot:build` and `npm test` after editing phrases, spelling targets, source content or question patterns. Current coverage is 329 cases across 26 topics, plus the 182-record heading dataset and scenario/security tests. This is finite regression coverage, not a guarantee of understanding every possible sentence.


## Entity and variation maintenance

`npm run chatbot:build` now also regenerates `chatbot/entity-index.json` and the 2,497-case `chatbot/evaluation/generated-questions.json`. `scripts/build-entity-index.mjs` links organizations, people, campuses, schools, programmes and services to source records. Attribute values must retain their entity and scope (office hours versus programme hours), and missing fields must never borrow from a related entity. Update an adapter when adding a genuinely new source structure.

The fixed representative scenarios in `chatbot/evaluation/representative.json` are agent source-reviewed expectations. Add factual assertions and valid supporting sources independently of engine outputs; retain failing scenarios while fixing defects. Have a knowledgeable human review/extend this dataset before describing results as independently human-verified accuracy. Run the original 329-case suite, expanded unit tests, evaluation and production browser checks after source or correction changes. See `docs/chatbot-report.md` for current measurements and limitations.

Related GES facts remain curated in `chatbot/sources/ges.json`. Verify changes against the exact approved official page, update its review date and source section, then rebuild. Neither the build nor runtime consults an external AI service.


## Reproduce the 10,000-case suite

The expanded corpus is separate from the preserved 329-case and 2,497-case fixtures:

```sh
npm run chatbot:build
npm run chatbot:generate-tests
npm test
npm run chatbot:evaluate
npm run chatbot:test-10k
npm run chatbot:coverage
npm run build
```

`chatbot:generate-tests` runs `scripts/generate-10k-questions.mjs` and writes `chatbot/evaluation/10k-questions.json`. Seed 20261018 selects 10,000 normalized full-conversation combinations across nine required category quotas and 142 record topics. It uses verified answers/entities/attributes, reusable grammar, typo operations and source-only setup oracles; it never imports runtime answers. IDs, expected statuses, factual assertions, expected record IDs/category, expected sources, optional intent/entity/correction annotations, confidence bounds and full setup messages are stored per case. Missing intent/entity annotations mean unmeasured, not automatically correct.

`chatbot:test-10k` executes every generated combination and all annotated preceding turns, then runs the separately authored 100-case fixed holdout. Results go to `chatbot/evaluation/10k-results.json`; a score below 95% or fewer than 10,000 cases exits unsuccessfully. This threshold allows visible failures; always inspect `failures` and `metricFailures`, not just the exit code. It rejects stale generator/knowledge/word-guard fingerprints; regenerate after any such change. `chatbot:coverage` summarizes category counts and measured results, warning when the corpus fingerprint no longer matches the report. The corpus, source fingerprints, generator hash and dataset SHA256 make runs traceable. Test JSON and Node-only scripts are not imported by the browser.

Every generated contextual setup turn is asserted by `scripts/conversation-oracles.mjs`; new setup paths must add explicit source-derived expectations there or generation fails. Each terminal campus reply checks the correct attribute and excludes the other campus's contacts. A supporting source alone is insufficient: positive topic cases check multiword excerpts and the selected record/equivalent heading. Deduplication ignores punctuation/case/whitespace; incompatible statuses, record IDs or entity expectations for an identical normalized conversation fail generation. Keep name/scope qualifiers intact when adding grammar. Avoid increasing counts by capitalization, punctuation or meaningless filler.

The fixed holdout was written independently before probing, but was subsequently used to diagnose and fix failures. Its first untouched results are preserved in `holdout-baseline.json`. It is now a disclosed regression set. Do not call its final score unseen accuracy or independently human-verified accuracy; commission a fresh blind evaluation for that claim. Do not derive expectations from observed outputs or loosen assertions simply to improve scores. Source-justified oracle corrections need written evidence.

For new spelling targets, update source content/aliases, optionally regenerate public-domain word guards, regenerate the corpora and rerun all suites. Preserve legitimate words and proper names. Complete-heading one-edit correction requires one unique heading family, only one unknown differing token, all other tokens in order, and no person record. Prefer clarification for multiple possible entities. No generation change should alter the runtime UI or introduce an external service.

Current measured limits and all remaining cases are in `docs/chatbot-report.md`; specialized source, QA and independent review evidence is in `docs/chatbot-10k-knowledge-audit.md`, `docs/chatbot-10k-qa.md` and `docs/chatbot-10k-review.md`. Fees, eligibility conflicts, GES's fourth-school identity and Shomoukh International Investments still need approved public confirmation.
