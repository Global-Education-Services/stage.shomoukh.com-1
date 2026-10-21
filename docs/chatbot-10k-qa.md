# Expanded chatbot QA evidence

QA on 18 October 2026 uses local Node 20.20.2 and the installed Playwright Chromium on macOS. These are agent-run controlled checks, not independently human-reviewed semantic accuracy or physical mobile-device validation. No external AI service is used.

## Baseline before expanded-corpus fixes

- `npm test`: 72/72 tests passed, including the unchanged original 329-variation regression checks.
- `npm run chatbot:evaluate`: 129/129 source-reviewed representative cases and 2,497/2,497 generated cases passed answer and required-source assertions. Eligible source hits: 107/107 and 2,471/2,471 respectively.
- `npm run build`: passed; ten public pages, 182 deduplicated records, every generated source URL valid. Thirty preexisting website fragment-link defects are reported and excluded from chatbot references.
- First 10,000-case evaluation: 6,743 passed / 3,257 failed (67.43% grounded assertion accuracy). This is an initial diagnostic result, not the final implementation result. The initial corpus also had broad conflict annotations requiring review: a generic admissions question can safely return a verified admissions process even if another statement in its source section has conflicting ages.
- First production-browser pass exposed an outdated generic-programme expectation after GES context. The response correctly retained GES scope and clarified the institution, but the assertion expected a nursery-programme keyword. This was returned for an engine wording fix preserving correct scope rather than weakening source separation.

The initial corpus seed was `20261018`, with SHA-256 `eb3223412cb06cae55ecebb76949d716bb3156adc5bd961e44f01829ac34e3e6`. Exact metrics belong to the final generated corpus and engine version; intermediate JSON reports can be overwritten by later evaluations.

## Design preservation

The source root HTML pages and `style.css` have no Git changes. The existing `main.js` diff consists of the four-line chatbot-loader integration from earlier work. Built `dist/*.html` changes are generated asset references. No website or widget visual redesign is part of the expanded language work. Browser geometry and keyboard assertions are checked separately from source-diff evidence.

## Final validation

Final expanded evaluation ran at `2026-10-18T11:16:23.201Z`, seed `20261018`, on 10,000 normalized unique conversation/question combinations. There are 9,130 distinct final question texts; repeated short follow-ups have different preceding conversations, not punctuation-only variants. Coverage spans 142 source-record topics and 30 distinct preceding conversation paths. All 2,265 annotated preceding turns were executed and passed, alongside all 1,000 final contextual follow-ups.

| Category | Executed | Passed | Failed |
| --- | ---: | ---: | ---: |
| Short questions | 1,500 | 1,500 | 0 |
| Spelling variations | 1,500 | 1,497 | 3 |
| Natural wording | 1,500 | 1,500 | 0 |
| Campus questions | 1,200 | 1,200 | 0 |
| Leadership | 800 | 800 | 0 |
| Admissions/programmes/schedules | 1,000 | 1,000 | 0 |
| Contextual follow-ups | 1,000 | 1,000 | 0 |
| Informal wording | 800 | 800 | 0 |
| Unsupported/negative | 700 | 700 | 0 |
| **Total** | **10,000** | **9,997** | **3** |

Combined factual/status/source checks passed **99.97%**. Eligible source attribution was 9,297/9,300; record selection 8,813/8,816; intent 2,994/3,000; entity metadata 6,430/6,432. Canonical correction assertions passed 1,482/1,500 (98.8%), measured separately from useful answer correctness. All 1,184 scenarios annotated as requiring unknown/clarify produced no answer-status false positives. Confidence ranges are sanity checks, not calibrated probabilities.

The three failures involve `schedule a camps visit` (bare and prefixed) and `tell me about shomoukh atelies & enrichments`: responses contain verified relevant information, but fail required expected-record/source/factual specificity checks. They remain disclosed failures; expectations were not removed.

The separately authored agent holdout passed **98/100** combined checks, with 99/100 answer/status checks, 69/70 eligible sources and no unsupported false positives among 30 cases. Remaining failures concern pre-/after-care receiving unnecessary age-conflict qualification and educational-framework source specificity. It is an agent-authored holdout, not independent human-reviewed accuracy; inspected cases become regression evidence.

The original evaluation rerun passed 129/129 representative and 2,497/2,497 generated cases, including all required source checks. The final production build passed: main JS 14.32 kB (5.30 kB gzip), lazy widget/engine/knowledge 377.41 kB (83.08 kB gzip), lazy CSS 3.93 kB (1.36 kB gzip). Engine initialization measured 22.73 ms, average query 0.907 ms and p95 1.887 ms in this full local run.

The complete final unit suite passed **86/86** tests, including original regression variations and new checks that failed preceding turns or missing entity metadata cannot disappear from evaluation. Production Playwright passed **four viewports** (1440×1000, 390×844, 320×568, 844×390) and launcher integration across **all ten pages** on local preview port 5176. It exercised lazy loading, keyboard focus/Escape/reset, viewport fit, grounded role/campus follow-ups, correction hints, source navigation, no live GES requests, XSS as text and offline replies after assets loaded. The initial port-5176 connection refusal was resolved by starting the preview; the completed browser run passed.

### Reproducibility hashes

| Artifact | SHA-256 |
| --- | --- |
| `chatbot/evaluation/10k-questions.json` | `4d0868bcd0cf423e32993bc70ae08d28814fc11088b9df997842863d89811aaa` |
| `chatbot/evaluation/holdout.json` | `cd091989409b465769e9aa62022ca973341a5f9db9b35413483ddc1bdd6ca75d` |
| `chatbot/engine.js` | `fd3e345866e3c1d7e9cb7af1535856bb199d393b5c74f4aa1b83c26872994ceb` |
| `chatbot/query-processor.js` | `2664823e976365a3b5e2c3dd852ca450ef61c412e07e02ed6002c76a2cddf857` |
| `chatbot/entity-resolver.js` | `8d5f197ca1e5bdf3326bc7b91e2c2f4606dcf33c9b03d242181ca9b93e92e869` |
| `chatbot/role-resolver.js` | `4be9852a091232b238dbb5c64d690321dbc71b47ff9f24e2ef04cec7af49b5b1` |

Latency measurements report local in-process engine query time. They exclude typing animations, browser rendering, network startup and source-page navigation, and do not establish performance on low-end phones. Unsupported-answer counts and lexical grounding checks are useful failure proxies, not a measured semantic hallucination rate.
