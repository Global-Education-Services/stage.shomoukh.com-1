# Independent 10,000-query review

Review date: 2026-10-18. This review is a separate agent's source/code review, not independent human annotation. The website UI is outside the implementation scope and must remain unchanged.

## Method

Inspected the deterministic generator, evaluator, existing source-derived evaluation generator, query correction, role resolver, entity resolver, conversation memory, and fixed holdout provenance. Ran additional unfamiliar scope, proper-name, unsupported schedule, and context-switching probes directly against the engine. Review findings were sent to the responsible NLP agent and coordinating agent before completion.

## Findings and correction tracking

| Severity | Finding | Required correction | Status |
|---|---|---|---|
| High | Source-derived topic fixtures accepted any one generic word, such as `Shomoukh`, `provide`, or `Download`, together with a page URL shared by many unrelated records. The expected record was not checked, allowing irrelevant same-page replies to pass. | Require correct selected record or documented equivalent public record independently of lexical assertions. Report selection separately; retain factual checks as a partial proxy rather than semantic correctness. | Fixed and verified by code inspection: required multiword source excerpts plus expected record/equivalent record IDs now participate in the pass result. |
| High | `sips` followed by `md` or `ceo` returned the GES executive directly although the active organization was the school. `shomoukh` followed by `md` had the same issue. | Consult school/nursery entity context in role resolution and ask which organization is intended unless the visitor explicitly requests GES. | Fixed and independently reproduced: school/nursery bare roles clarify; an explicit GES role still answers. |
| High | `qurm school time` and `schooltime at al mouj` returned office hours alone, while `school time` returns separately sourced programme hours. Campus wording could therefore change the meaning of school hours. | Distinguish programme/class hours from campus office hours; clarify campus-specific class arrangements where the public programme schedule is not campus-specific. | Fixed and independently reproduced: both queried campuses now distinguish published office hours from general programme hours and qualify current campus arrangements. |
| Medium | Entity annotation used the first graph entity referencing a record; some records concern more than one entity. | Use an explicitly relevant entity, accepted entity alternatives, or mark the metric unmeasured. Do not derive an arbitrary ground truth from graph order. | Assigned to coordinating agent; verification pending. |
| Medium | Contradiction detection compared status intersections only. Two answers with incompatible source records, campus facts or entities could share status `answer`. | Check source/record/entity and factual assertion consistency when normalized query plus conversation history collide. | Fixed: normalized-key collisions now also compare expected record and entity compatibility. |

## Dataset interpretation

The category minima total exactly 10,000. At initial inspection the corpus met every minimum and covered 142 source-record topics. Normalized case keys include the full preceding conversation; the same final question is therefore legitimate in a different campus or organization context. Punctuation/case-only variants are not counted separately. The contextual pool initially used 30 meaningful transition paths, covering two campuses and phone/email/address/hours follow-ups. This is 1,000 combinations, not 1,000 independent conversational designs.

The corpus contains repeated linguistic templates across topics. This is useful systematic coverage, but the count does not imply 10,000 independent knowledge facts or natural-language constructions. The separately authored fixed holdout initially contains unfamiliar wording and is explicitly agent-reviewed. Once failures are examined and corrected it becomes a disclosed regression set; its later accuracy is not an unbiased held-out or human-reviewed estimate.

Main pass/fail combines expected status, selected evidence and partial factual assertions. Intent, entity, correction, source, context and latency metrics must remain separately reported. Some cases have no intent/entity annotation and are excluded from those denominators; missing engine entity metadata should not silently disappear from annotated cases. Confidence range checks validate numeric metadata, not calibration. Unsupported-answer counts are a false-positive proxy. Neither substring checks nor source attribution measure a semantic hallucination rate.

Additional high-severity defect discovered during expanded evaluation: unresolved Qurum spellings in `shomoukh ece al quum campus ges listing`, `quurm` and `qurmu` returned the Al Mouj record. This was assigned to the NLP agent; fixed and independently verified: all three spellings resolve to the verified Qurum record. Unrecognized names (`foobar`, `xyz`, `neptune`) now return unknown rather than borrowing a campus or generic relationship answer. Shared nursery tokens do not establish a different campus.

## Additional probes

The initial independent probes correctly declined `who is Julian`, `who is Janan`, `who is Janina`, `what is quran phone`, unverified Ramadan/holiday schedules, SIPS contact numbers, Shomoukh International Investments information and airport-distance comparisons. Explicit campus switching after an unknown fee query retained the newly requested campus phone. Explicit SIPS curriculum switched away from nursery context, and its subsequent phone query correctly declined to borrow nursery contacts. `mouj` → `julanda` → `phone` correctly refused to provide personal contact details.

## Verification outcome

All high-severity review findings above were corrected and independently reproduced against the updated engine. `npm test` passed 86/86 tests in the final review snapshot, including the original 329-variation regression suite, exact-heading coverage, source scope, role scope, class/office-hour separation, typo safety and corpus integrity. The separate QA agent owns browser and final evaluation measurements. A later evaluation after fixes is a regression result, not independent human-reviewed accuracy.

The contextual generator now asserts both the final response and every preceding turn using a separate source-only oracle module. In the reviewed 10,000-case corpus this adds 2,265 checked preceding turns across 1,000 context cases. Missing response entity metadata counts as failure when an entity is annotated. The fixed holdout still has no preceding-turn oracle annotations; its measured score checks the final response only. Separate conversation tests assert representative turn sequences. Real-word typo candidates are excluded from positive autocorrection generation using a checked-in public-domain dictionary subset; independent probes verify that `pizza`, `heat`, and `tree` are preserved instead of being forced to `piazza`, `heart`, and `three`. This is a conservative data-quality correction, not a requirement to rewrite valid visitor words.


## Final change review

Re-inspected the expanded 835-word source guard subset, unique single-edit heading correction, trusted alias canonicalization, role grammar, active-campus location behavior, missing-entity metric handling, and source-only preceding-turn oracles. The heading correction requires one uncertain token, the same word order and token count, all remaining tokens matching a unique published heading, and a token absent from both verified vocabulary and protected words. Person records are excluded from that correction path. This additional path does not permit an unresolved multiword rewrite.

An independent exhaustive probe of all 835 guard words preserved 832 literally. The other three transformations were existing explicit, disclosed aliases: `sheik` → `sheikh`, `wat` → `what`, and `whats` → `what is`. Additional probes preserved real words `pizza`, `tree`, `heat` and `pubic`; unrelated names `Julian`, `Janan`, `Janina` and `Julandina` remained unknown. Requests concerning an unknown named campus, an extra unknown subject alongside a campus phone query, another company's MD, Shomoukh International Investments' CEO, and unpublished personal information all remained safe. `three stps to enrolmlent` remained unknown rather than forcing two uncertain heading changes; individually unambiguous lexical typos in `digital liht atelir` resolved to the published Digital and Light Atelier.

The final review found no new critical or high-severity defects. The inspected evaluation snapshot reported 9,997/10,000 grounded checks and 98/100 fixed holdout checks; these are snapshot regression measurements, not independently human-reviewed accuracy. Three corpus failures remain visible rather than being removed or weakened. Browser and final benchmark measurements remain owned by the coordinating/QA agent.
