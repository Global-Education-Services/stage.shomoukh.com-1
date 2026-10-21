# Shomoukh chatbot accuracy, coverage and performance

Subsequent update, 19 October 2026: the [website audit](website-audit.md) resolved all 30 existing fragment defects, added site search/accessibility fixes and preserved the 9,997/10,000 chatbot result. The dated measurements below describe the earlier chatbot delivery; current test artifacts contain the regenerated source references and fingerprints.

Validated 18 October 2026. This expands the existing local assistant; website and widget design remain unchanged. No external AI API, paid inference, API key, administrative access or visitor-time GES request is used. Related content remains reviewed local snapshots.

## Coverage and execution

Generated and executed **10,000 unique normalized question/conversation combinations**, using deterministic seed **20261018**. There are **9,130 distinct normalized question texts**: repeated short follow-ups count separately only when their complete preceding conversation differs. Capitalization, punctuation and whitespace alone do not create extra cases. All nine requested category minima are met; no normalized conversation duplicates or contradictory status/record/entity annotations were found.

The knowledge remains **182 verified source records**, including **17 official GES records**, across **10 public HTML pages** plus **8 public enrichment modal datasets**. The graph remains **46 entities, 47 relationships, 23 unique typed attribute facts and 31 source-backed attribute assertions**. Generated coverage spans **142 record topics**. Records are factual paragraphs/sections, not 182 separately atomized facts. No new company fact or relationship was invented to enlarge the corpus.

| Category | Executed | Passed | Failed | Grounded selection accuracy |
| --- | ---: | ---: | ---: | ---: |
| short | 1500 | 1500 | 0 | 100.00% |
| typo | 1500 | 1497 | 3 | 99.80% |
| natural | 1500 | 1500 | 0 | 100.00% |
| campus | 1200 | 1200 | 0 | 100.00% |
| leadership | 800 | 800 | 0 | 100.00% |
| admissions | 1000 | 1000 | 0 | 100.00% |
| context | 1000 | 1000 | 0 | 100.00% |
| informal | 800 | 800 | 0 | 100.00% |
| negative | 700 | 700 | 0 | 100.00% |
| **Total** | **10000** | **9997** | **3** | **99.97%** |

A passing generated case requires expected behavior/status, source-derived multiword factual assertions, supporting source where annotated, and the expected record or a verified equivalent heading where annotated. Campus assertions exclude the other campus's contact details. Generated context cases additionally require every preceding annotated turn to pass. Expected facts never come from engine outputs. Record selection prevents an unrelated reply on the same page from passing merely because its URL and one generic word match.

## Separate metrics

| Measurement | Result | Scope |
| --- | --- | --- |
| Combined grounded selection | 9997/10000 (99.97%) | All generated combinations |
| Answer/status and factual assertions | 9997/10000 (99.97%) | All generated combinations |
| Expected record selection | 8813/8816 (99.97%) | Cases with annotated expected record IDs |
| Supporting source attribution | 9297/9300 (99.97%) | Source-eligible cases; returned citations, not internal top-k recall |
| Intent recognition | 2994/3000 (99.80%) | Independently annotated field/role scenarios only |
| Entity recognition | 6430/6432 (99.97%) | Cases with unambiguous graph scope annotations |
| Canonical correction tokens | 1482/1500 (98.80%) | 1,500 typo cases; synonym/plural normalization applied |
| Context scenarios | 1000/1000 (100.00%) | 30 distinct source-reviewed setup paths |
| Preceding-turn assertions | 2265/2265 | Every setup response, repeated as executed across scenarios |
| Explicit ambiguous-role probes | 2/2 | Preserved source-reviewed probes, separate from the 10k count |
| Unsupported-answer false positives | 0/1184 | Cases explicitly requiring unknown, clarification or language fallback |

Intent/entity denominators deliberately exclude unannotated cases; missing response metadata in an annotated case is a failure. Canonical correction checks topic tokens in the interpreted question, not full semantic correction quality. Confidence ranges check score sanity only and do not establish calibrated probabilities. **Semantic hallucination rate is not independently measurable with these lexical tests.** Zero unsupported-answer false positives does not prove zero hallucinations in arbitrary conversations.

## Independent wording and accuracy limits

A separately authored **100-case fixed holdout** included unfamiliar wording, realistic mistakes, 20 contextual setups and 30 unsupported/conflicting cases. It was saved before initial probing and did not copy the generator's templates. Its first untouched result was **52/100 answer checks, 50/100 grounded checks and 22/70 source hits**, preserved in holdout-baseline.json. Source-justified annotation corrections are recorded there.

After failures informed engine improvements, this set now achieves **99/100 answer checks**, **98/100 grounded checks** and **69/70 source hits**. It is now a disclosed regression set, **not an unseen or independently human-reviewed final benchmark**. A fresh blind human evaluation remains outstanding; the requested independent human 95% accuracy target is unmeasured.

The first expanded-corpus execution passed 6,743/10,000 under an earlier weaker oracle. During review we strengthened factual/record assertions, corrected address intent annotations, excluded real-word mutations from positive typo generation, added full setup-turn checks and revised entity annotations. Therefore that initial result and final result are not a clean same-fixture longitudinal comparison. All generation is source-derived and reproducible; the original legacy fixtures were not weakened.

Template-derived coverage is broad but correlated: many topics share question grammar. Category names describe the generation family; a typo case can also mention a campus or programme. Some source headings are long, so the short category is bounded to ten words rather than claiming all 1,500 are one-word questions. The 1,000 conversations vary follow-ups across 30 setup paths; they are not 1,000 unrelated storylines.

## Changes and regression evidence

The existing local engine now handles more polite/informal framing, abbreviations, missing spaces, source-title spelling variants and campus fields. A complete published heading can disambiguate one short unknown misspelling only when all remaining tokens match in order and there is one candidate heading family. Known words, protected real words and person records are excluded from that contextual rewrite. Multiple uncertain words remain conservative.

The optional local dictionary builder now saves 835 real-word neighbors of approved topic words, preventing real words such as pizza, tree and heat from being silently rewritten. Ordinary build/runtime uses the checked-in subset and needs no dictionary download. Independent review probed all 835 guards: 832 stayed literal and three followed explicit existing aliases (sheik, wat, whats).

Scope fixes prevent SIPS admissions from borrowing nursery document requirements, GES roles from becoming campus roles, unknown campuses from becoming Al Mouj, and campus location follow-ups from becoming a list of both campuses. Programme hours and office hours are distinguished. Live seat availability, personal contacts and unavailable corporate details receive scoped fallbacks or clarification. Additive record/entity response metadata supports auditing without changing the UI.

**86/86 automated tests pass**, including all original 66 tests, original 329 variations, 129 source-reviewed scenarios and 2,497 legacy generated variations. The production build passes. Playwright passed **1440×1000, 390×844, 320×568 and 844×390**, and launcher integration on all ten pages: lazy loading, viewport fit, keyboard focus/Escape, reset, context, safe references, inert XSS input, no runtime GES requests and offline answers after loading.

No root website HTML, site CSS, widget CSS or widget DOM design was changed in this expansion. The unchanged widget CSS asset remains 3.93 kB / 1.36 kB gzip; changed production JS hashes reflect engine/knowledge changes. Browser screenshots and report are in ignored test-results/. Physical-device screen-reader and soft-keyboard checks remain human QA tasks. Offline coverage applies within the loaded page, not to reloads or source-page navigation.

## Performance and reproducibility

Final QA measured initialization **22.73 ms**, mean question response **0.907 ms**, p95 **1.887 ms** on local macOS/Node. Timings vary across repeated runs and hardware; setup turns are separately checked but excluded from the reported final-question latency. The original 5,000-record fixture passes. Production shared main JS is **14.32 kB / 5.30 kB gzip**, lazy widget/engine/knowledge **377.41 kB / 83.08 kB gzip**, lazy CSS **3.93 kB / 1.36 kB gzip**. No test corpus ships in the runtime bundle.

Run:

```sh
npm run chatbot:build
npm run chatbot:generate-tests
npm test
npm run chatbot:evaluate
npm run chatbot:test-10k
npm run chatbot:coverage
npm run build
# Start a local dev/preview server, then:
npm run test:browser
```

The evaluator rejects stale generator/knowledge/guard fingerprints rather than silently using obsolete fixtures. Results include seed, generator/source fingerprints and dataset SHA256. Dataset SHA256 at validation: **4d0868bcd0cf423e32993bc70ae08d28814fc11088b9df997842863d89811aaa**. Full machine-readable category metrics, failures and holdout results are in chatbot/evaluation/10k-results.json. All failures remain visible; the 95% CLI threshold is a regression floor, not a claim that every case passes.

## Remaining failures and human confirmation

Three generated cases remain strict failures: two phrasings of “schedule a camps visit” and “tell me about shomoukh atelies & enrichments.” They return alternate verified tour/enrichment information rather than the exact expected heading/source. The legitimate word camps is preserved; it is not silently forced to campus. These cases need better clarification/source selection, and are not counted as successes.

Two fixed holdout failures remain: before/after lesson care returns a safe age-conflict clarification instead of the fixture's required direct-answer status; the nursery framework question returns the correct EYFS/Reggio facts with a verified homepage citation instead of the fixture's narrower programmes-page citation. Neither fixture was relaxed to raise the final score.

Shomoukh International Investments is not verified in approved sources and is not treated as a GES/nursery alias. Its identity, ownership, contacts and leadership require approved public evidence. Other unresolved information includes nursery fee amounts, conflicting child age ranges, live vacancies/seats, holiday/Ramadan schedules, classroom timetables, exact bus routes/prices, missing GES/SIPS office contacts/hours/admissions details, and the unidentified fourth school behind GES's published count. GES's list names SIPS and two nursery campuses; no fourth identity is invented.

English remains the substantive indexed language; Arabic receives an explicit fallback. Related source snapshots require periodic official review. All generated links validate, and the 30 preexisting website fragment defects were subsequently resolved in the 19 October audit. No deployment to a public host was performed.

See chatbot-10k-knowledge-audit.md, chatbot-10k-qa.md and chatbot-10k-review.md for specialized agent evidence.
