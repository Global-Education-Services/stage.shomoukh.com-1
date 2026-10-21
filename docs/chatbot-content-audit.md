# Public content audit and knowledge generation

Update, 19 October 2026: the website audit added the three missing enrichment fragment targets, resolving all 30 references listed in the earlier findings. Current inventory reports zero invalid fragments. Business-content conflicts remain unresolved; see [website-audit.md](website-audit.md).

The original approved local public sources are the ten root HTML entry points registered in `vite.config.js`, plus the static `studentLifeData` literals in the public `main.js` enrichment modal. The site has no CMS, content API, Markdown publication pipeline, or additional public page routes. The build runs entirely locally and does not access a deployed website, a parent account, or an administrative service.

| Public page | Subjects |
| --- | --- |
| `/` | Nursery introduction, philosophy, programs, ages, enrichments, spaces, enrollment, campuses |
| `/about.html` | Mission, vision, values, community, sustainability, health and safety |
| `/programs.html` | EYFS, Reggio Emilia, teaching, bilingual exposure, movement, literacy, age groups, schedules |
| `/enrichments.html` | Clay, art, light and digital work, project learning, pretend play, sensory play, music, drama and PE |
| `/spaces.html` | Fourteen learning facilities, piazza, garden and classrooms |
| `/admissions.html` | Ongoing admissions, three enrollment steps, required documents |
| `/book-a-visit.html` | Tour information, family visit expectations and booking page |
| `/apply-online.html` | Public application introduction and admissions assistance |
| `/parents.html` | Public portal overview, advertised platforms, messaging, stories, calendar, pickup and login guidance |
| `/contact.html` | Two campus addresses, public phone numbers, email addresses and office hours |

`chatbot/inventory.json` is the full machine-readable inventory: page titles, routes, topics, extracted text, keywords, related validated pages/fragments, categories, language and source references. Last-updated fields are null because no editorial timestamps are published; filesystem mtimes are deliberately not treated as editorial dates. Footer links were inspected; repeated navigation and contact information are represented by their substantive public pages. Unique footer copyright/accreditation text is retained. Social links point to platform homepages rather than school-specific profiles, so these are not promoted as official school profiles.

## Build

Run `npm run chatbot:build` (equivalently `node scripts/build-chatbot.mjs`). Node's built-in modules are sufficient. The generator:

1. Discovers root `.html` files, parses their structure, and inventories internal routes and element IDs.
2. Extracts visible public sections into heading-sized records; omits scripts, forms, navigation, hidden dialogs, repeated action banners, visual badges and language controls. Public explanations, field labels, document checklists and select-option labels are indexed explicitly as static page information. Visitor input values and placeholders are never read. Options describe what the page lists and require admissions confirmation of current availability.
3. Reads only literal strings in the explicitly identified enrichment-modal dataset. It never evaluates JavaScript.
4. Preserves verbatim website facts, stable hash IDs, source filenames and heading line numbers.
5. Deduplicates identical title/answer pairs and builds a local inverted term index.
6. Validates every generated source URL, including its fragment. Generation fails if any generated source is invalid.
7. Writes `chatbot/knowledge.json`, `chatbot/inventory.json`, and `chatbot/test-questions.json`. Existing invalid website fragment links are listed in the inventory and never used as generated sources.

After publishing a new kind of content source, explicitly add its extraction rule and tests before relying on the chatbot to answer it. Private or unpublished content should never be added as a fallback source. The HTML reader intentionally supports this static site's markup rather than being a general browser rendering engine.

## Findings and limitations

- Only English substantive content exists. A homepage Arabic language selector has no translated content source or working translation implementation. Arabic curriculum exposure describes teaching provision; it does not establish Arabic website knowledge. Arabic questions therefore require the assistant's explicit English-content fallback.
- Age eligibility is inconsistent in the source: the programs introduction says 6 months to 4 years; the infant card says 3–11 months; admissions says 6 months to 6 years. These statements remain traceable and are flagged with `age-range` conflict metadata. Answers should disclose the inconsistency and direct families to admissions for confirmation.
- Fee amounts, discounts, refund terms, confirmed transport availability/prices, staff or leadership identities, a founding date, dated term calendars, job vacancies and dedicated policy documents are not published. Do not infer answers from loosely related paragraphs or form field names.
- Existing footer “Privacy Policy” and “Terms of Service” links lead to the general about page, which does not supply those policy texts. No policy content is fabricated.
- The existing application, contact and booking forms are demo frontend handlers: `main.js` displays success feedback without delivering submissions to a backend. The chatbot can navigate to these pages but cannot claim a booking or application was received or sent. Source claims of confirmation timing are website copy, not proof of delivery.
- The advertised iOS and Android download links both lead to the same external parent-portal URL. The chatbot uses the local parent information page and does not claim verified App Store or Google Play listings.
- The media assets contain local photographs and a video. Binary media is not OCRed or transcribed, so the assistant does not infer additional factual details from them. `content.txt` contains unpublished reference notes and is expressly excluded. Build outputs, dependencies, environment files, account data, private portals and administrative content are never indexed.
- Source verification means the text is present in the approved public website files. It is not an independent verification of marketing claims, availability, safety accreditation or current real-world operations.

The generated question dataset has one traceable question per unique record. Retrieval accuracy, latency, behavior, mobile/accessibility and security tests are maintained separately from this inventory audit.

## Approved related-group extension (18 October 2026)

At the visitor's request, the corpus now also includes nine reviewed summaries from two official public GES pages, `https://www.ges.om/about.php` and `https://www.ges.om/`. They identify GES management, its chairman and founding year, and its published Shomoukh campus connection. Facts and review dates are stored in `chatbot/sources/ges.json`; these are locally cached source snapshots, not a runtime web search. The build rejects pages outside the exact allowlist in `chatbot/source-policy.js`. The inventory's `relatedPublicSources` records this provenance separately from the ten local pages. The local website still has no nursery leadership profiles or founding date; GES group facts must not be silently assigned to a nursery campus.

The language-coverage build also writes `chatbot/variation-test-questions.json` from reviewed question patterns. These are test inputs rather than new factual answers. Button-style link labels are excluded from extraction so responses do not repeat calls to action. This removes an otherwise empty record. “Aged” eligibility statements are included in age-conflict detection. The current runtime corpus contains 174 unique records.

## Entity and related-source re-audit (18 October 2026)

Re-inspected the ten root public HTML pages, their public section headings, navigation and footer links, static application/booking/contact form labels and options, and the literal `studentLifeData` enrichment details. There are no additional published local CMS records or content routes. The headline/topic counts differ intentionally: repeated footer navigation, search-dialog headings, empty headings, CTA-only headings and decorative labels do not supply factual answers. All substantive extracted source sections remain in the inventory. In particular, public parent-app descriptions are indexed, but portal account data is never accessed.

Rechecked the official [GES About page](https://www.ges.om/about.php). It identifies six management team members and three named institutions: Al Shomoukh International Private School (SIPS), Shomoukh ECE Al Qurum and Shomoukh ECE Al Mouj. The separately reviewed [official GES homepage](https://www.ges.om/index.php) identifies the chairman, founding year, mission, vision and ELEVATE values and displays a four-school statistic. `index.php` is now an additional exact allowlisted source; the previously approved root URL remains approved for backwards source compatibility. The list of three named institutions must not be represented as the total number of GES schools. No fourth school identity is inferred. SIPS is a separate K–12 school; nursery schedules and phone numbers must never be attached to it.

GES's Qurum description says ages one to four, while the local site has conflicting eligibility claims. The external address spells the street “Al Saruj” while the local contact page says “Al Suraj.” The assistant uses the more detailed local contact address and retains the discrepancy in graph metadata. These are reasons to preserve source scope and qualifications, not to choose one undocumented universal fact.

`buildEntityIndex` in `scripts/build-entity-index.mjs` creates the structured organization, person, school, campus, program, curriculum, service, enrichment and facility index from already verified knowledge records. Each entity stores canonical display names, reviewed search aliases, source record IDs and source URLs. Typed relation edges express `listedBy`, `campusOf`, `managementOf` and `publishedBy`; these do not assert legal ownership. Programs, facilities and nursery-wide services are not silently assigned campus-specific availability. The Al Mouj and Al Qurm telephone, email, detailed address and office-hours attributes are extracted only from their respective local contact cards.

Counting policy: knowledge records are unique heading-sized source sections and reviewed summaries, not a count of individual atomic facts. The entity graph separately counts explicit, source-linked attribute assertions (roles, phone numbers, emails, addresses, hours and age ranges). Its totals must be reported with those labels. Descriptive paragraphs can contain additional facts that this typed assertion counter does not split or count.

Remaining human confirmations: complete current GES institution list; nursery age eligibility; fees, discounts and refunds; current program/campus availability; bus provision and price; holiday or Ramadan opening schedules; actual appointment/application receipt; current term dates; individual campus heads and nursery-specific leadership assignments. The group MD, VP and CEO roles are verified for GES; they do not establish equivalent nursery-specific posts.
