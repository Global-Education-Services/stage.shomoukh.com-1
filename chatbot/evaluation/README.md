# Source-grounded chatbot evaluation

Run from the website root:

```sh
node scripts/build-question-evaluation.mjs
node scripts/evaluate-chatbot.mjs
node --test tests/expanded-coverage.test.js
```

`representative.json` is a manually authored **agent source-reviewed** set. It is not independent human annotation. It includes exact short role lookups, campus contact and schedule assertions, explicit organization names, unpublished facts, conflicting ages, language fallback, and replayed multi-turn conversations. Expectations were written from public HTML and the saved approved GES facts, not generated from chatbot responses. Each factual answer has expected source URLs and concrete assertions such as a person's name and role, a campus phone/email, or published times. Equivalent website sections are accepted only where they publish the same requested fact. A clarification counts as correct only when the scenario explicitly calls for it.

`generated-questions.json` is regenerated deterministically from verified English public knowledge records plus the representative lexical variations. It covers short topic requests, distinct conversational paraphrases, informal wording, common spelling mistakes, and omitted spaces. Duplicate question/setup pairs are removed. Capitalization and punctuation-only changes are not used to inflate query counts. Generated cases carry their source record ID or inherit a source-reviewed scenario. An engine answer is never used as an expected answer. The generated suite is deliberately broad and diagnostic: do not hide its failures or describe its template-based score as independent human accuracy.

`results.json` reports **answer accuracy** (expected status plus factual text assertions) separately from **retrieval source-hit accuracy** (an expected source among returned links, excluding scenarios without a source expectation). Answer correctness does not automatically pass because the correct source was returned. This source-hit measure evaluates the sources exposed to visitors; it is not internal top-k retrieval recall. Both summaries include numerator, denominator, per-category breakdowns and full failed examples.

The existing tests and 329-case corpus are separate and remain intact. `expanded-coverage.test.js` checks corpus integrity and independent metric behavior. The evaluation runner reports failures without silently changing expectations or treating arbitrary clarification as success. Read and investigate `failures` before making a quality claim. The target of 95% on an independently human-verified representative set cannot be claimed solely from this agent-reviewed dataset.

`groundedAccuracy` is the stricter combined metric: factual/status assertions must pass, and source-eligible cases must also return a supporting source. Generated records with flagged conflicting age claims require an explicit clarification rather than an unqualified answer. Duplicate normalized headings accept verified alternate sections and their factual tokens. GES school-count cases require the published count, the incomplete institution list qualification, and confirmation guidance; either an answer or clarification status is accepted only when those concrete assertions pass.


The expanded suite is separate: `npm run chatbot:generate-tests`, `npm run chatbot:test-10k`, then `npm run chatbot:coverage`. See `10k-questions.json` and `10k-results.json`. Its positive topic oracles require multiword source excerpts and expected record IDs; every generated context setup turn has a source-only assertion. Null intent/entity annotations remain unmeasured, while missing actual metadata in annotated cases fails. Fingerprints reject stale corpora. The separately authored 100-case `holdout.json` was subsequently inspected for fixes and is now a disclosed regression set; its first untouched result is preserved in `holdout-baseline.json`. The final report records both results and the remaining failures without claiming unseen or human-reviewed accuracy.
