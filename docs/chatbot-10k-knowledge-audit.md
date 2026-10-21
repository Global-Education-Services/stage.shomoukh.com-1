# Knowledge audit for expanded question coverage

Reviewed 18 October 2026. This audit uses the existing public corpus and exact approved GES pages. It does not introduce new factual records, search private systems, or change the widget.

## Reproducible corpus counts

The checked-in `chatbot/knowledge.json` contains 182 deduplicated source records: 165 local records and 17 reviewed GES summaries. A record is a source section or paragraph, not an independently atomized fact. `chatbot/entity-index.json` reports 46 entities, 47 relationships, 23 unique typed attribute facts and 31 source-backed attribute assertions. Duplicate assertions can cite the same fact from different pages. The original generated evaluation covers 142 record topics; that is a test-coverage count rather than the number of all possible visitor intentions.

| Entity kind | Count |
| --- | ---: |
| Organization | 1 |
| Nursery | 1 |
| Campus | 2 |
| School | 1 |
| Person | 7 |
| Program | 7 |
| Service | 9 |
| Curriculum | 2 |
| Enrichment | 8 |
| Facility | 8 |

The local public surface remains the ten HTML routes registered in `vite.config.js`, plus the eight literal public enrichment modal datasets in `main.js`. Their generated inventory and source references are in `chatbot/inventory.json`. The page set is home, about, programs, enrichments, spaces, admissions, booking, application, parents and contact. No additional published CMS or local content route was identified. Existing invalid site fragments are excluded from chatbot citations.

## Entity and source boundaries

The [official GES About page](https://www.ges.om/about.php), reopened during this audit, confirms the cached management identities and identifies SIPS and the two nursery campuses. GES management roles are group roles; they do not verify nursery or campus management posts. SIPS has its own published school profile and must not inherit nursery contacts or schedules. Its address and curriculum summary remain traceable to `ges-sips`. The page uses the spelling Al Saruj for Qurum; the detailed local contact source uses Al Suraj. Its Qurum age description conflicts with local eligibility statements. These discrepancies require qualifications rather than silent replacement.

The [official GES homepage](https://www.ges.om/index.php), also reopened, supports the cached founding year, chairman, mission, vision and ELEVATE values. Its four-school statistic does not identify the fourth school. The three names on the About page are therefore a published list, not a confirmed group total. Homepage statistical claims are undated marketing content; the cached review date is not an operational freshness guarantee.

Only `https://www.ges.om/`, `https://www.ges.om/index.php` and `https://www.ges.om/about.php` are currently approved external answer sources. Reopening them through the browsing tool confirms published content returned by that tool; it does not establish a live operational API or a complete crawl of every GES route. Local builds use reviewed snapshots in `chatbot/sources/ges.json`, without visitor-time external requests.

### Shomoukh International Investments

This requested company is not identified in the ten local pages, existing graph, or reviewed approved GES pages. It must remain a separately named unsupported organization, rather than an alias for the nursery or GES. Questions about its identity, directors, contacts, fees or legal ownership require an explicit unknown/clarification response. Searching found a separate corporate biography outside the approved source set, but no new source or relationship was admitted. Absence from this corpus is not a claim that the company does not exist.

## Source-grounded campus facts

| Fact | Al Mouj | Al Qurm | Source |
| --- | --- | --- | --- |
| Phone | +968 24555515 | +968 24600610 | Dedicated campus cards in `/contact.html#almouj` and `/contact.html#alqurm` |
| Email | info.almouj@shomoukh.com | info.alqurum@shomoukh.com | Same dedicated cards |
| Address | Al Mouj Main Street, Main Community Hub, Muscat | Al Suraj St, Shatti Al Qurm, Way 3046, Bldg 355, Muscat | Same dedicated cards |
| Office hours | Sun–Thu, 7:00 AM–4:00 PM | Sun–Thu, 7:00 AM–4:00 PM | Same dedicated cards |
| Specific published surroundings/facilities | Outdoor play gardens, specialized ateliers, visitor parking | Indoor gymnasiums, light ateliers, shaded outdoor discovery courtyards | `contact-38b7147ddc` and `contact-11dd2afb30`, `/contact.html` |

Regular infant/toddler/preschool program hours are 8:30 AM–1:30 PM; Flex-Care is 7:00 AM–4:00 PM. Those are program facts from home/program cards and attendance options, distinct from office hours. They do not establish a holiday, Ramadan, bus or individual classroom timetable. Nursery-wide program descriptions must not be represented as a verified list of current places available at each campus.

## High-value scenario expectations

- A campus identity followed by `phone`, `email`, `address`, `timing`, then an explicit other-campus name must preserve and switch the active campus correctly. Unknown fees must not erase the active campus.
- `md`, `vp` and `ceo` may identify verified GES positions with an explicit group qualification. Adding `nursery`, a campus name, SIPS or an investment company must prevent assigning those group posts to another organization.
- GES/SIPS contact details and office schedules are unavailable in the approved corpus. A prior Al Mouj discussion must not supply its telephone after switching to GES or SIPS.
- Asking for a named program can cite its published age card, with the known eligibility discrepancy disclosed. Definitive child admission eligibility needs admissions confirmation.
- Asking how to apply can cite the three enrollment steps and published document requirements. Asking whether an application was received cannot be answered from public content.
- Bus-service wording is a public form request option, not confirmation of a route, seat, fare or service availability.
- The parent page advertises calendar, messaging, attendance, stories and login guidance. It does not publish actual term dates, private conversations, passwords, attendance records or calendar events.
- A tour is described as a 45-minute guided visit and families can bring a child. A particular appointment cannot be booked or confirmed by the chatbot; the existing forms have demo frontend handlers.
- English is the only substantive indexed content language. Arabic exposure is a teaching topic, not evidence of an Arabic website knowledge base.

## Questions requiring human confirmation

Published age eligibility conflicts; current seats and program allocation; tuition, discounts and refund terms; transport operation/routes/fares; special opening schedules and daily class timetables; actual term/event dates; receipt of applications or appointments; current campus heads; GES/SIPS office contacts; the fourth school in GES's headline statistic; and investment-company relationships or legal ownership remain unverified. No test-generation expansion can turn missing published facts into verified answers.

The 10,000-question corpus should test these limits alongside positive facts. Generated pass rates measure the encoded, source-grounded expectations; independently human-reviewed accuracy remains a separate measurement.
