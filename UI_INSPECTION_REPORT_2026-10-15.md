> Fix update: 20 UI findings addressed; 4 external integration/content dependencies remain. See [verification report](UI_COMPLETE_VERIFICATION_2026-10-15.md). The original observations below are retained as the inspection baseline.

# Original UI inspection — 15 October 2026

Historical baseline. See the linked current verification report for implemented changes and blockers.

## UI-01: Submission succeeds visually without sending data

Priority: P1. Type: Confirmed issue.

Each populated form shows a success toast, clears the entered name, and produces zero network requests during submission. The shared JavaScript only prevents default submission, shows a toast and resets the form.

Suggestion: Connect each form to a working submission endpoint; show success only after a confirmed response. Preserve entries on error, provide retry feedback and a request reference.

Reproduce: Fill a form and submit while watching Network; observe success, cleared values and no submission request.

Evidence: main.js:393; book-a-visit-submission.png; apply-online-submission.png; contact-submission.png

## UI-02: Required fields are not enforced

Priority: P1. Type: Confirmed issue.

All three forms use novalidate; their submit handlers do not call checkValidity or reportValidity. Empty submissions therefore reach the same success handler.

Suggestion: Enable native validation or add accessible field validation and an error summary. Prevent submission until required fields and formats pass.

Reproduce: Load a fresh form and press its submit button without entering anything.

Evidence: main.js:393; book-a-visit.html:309; apply-online.html:290; contact.html:345

## UI-03: Age eligibility contradicts itself

Priority: P2. Type: Confirmed issue.

Home and Programs say 6 months–4 years, infant cards say 3–11 months, and Admissions/Application say 6 months–6 years. This directly affects program selection.

Suggestion: Confirm the actual campus/program eligibility and use one consistent age table throughout the site and application. Explain any campus differences.

Reproduce: Compare Home age cards, Programs age section, Admissions introduction and Application introduction.

Evidence: index.html:542; programs.html:416; admissions.html:268; apply-online.html:268

## UI-04: App Store and Google Play buttons have the same website destination

Priority: P2. Type: Confirmed issue.

The web login, iOS download and Android download links all point to https://shomoukh.com/parents/. The two store buttons do not directly link to their advertised stores.

Suggestion: Use verified store listing URLs and a verified login URL; if downloads require an intermediary, label that step explicitly.

Reproduce: Inspect the three platform button destinations on Parents.

Evidence: parents.html:300; parents.html:313; parents.html:326

## UI-05: Privacy and terms links open About

Priority: P2. Type: Confirmed issue.

The footer Privacy Policy and Terms of Service links point to /about.html, which contains school information rather than those documents.

Suggestion: Publish dedicated privacy and terms content and link it consistently, including beside forms that collect family and health details.

Reproduce: Follow either footer policy link and inspect the destination.

Evidence: apply-online.html:595; contact.html:556; index.html:1027

## UI-06: Social icons link to generic platform homepages

Priority: P2. Type: Confirmed issue.

Facebook, Instagram, YouTube and LinkedIn links use the platform root URLs rather than school profiles.

Suggestion: Replace them with confirmed school profile URLs; remove any channel with no active profile.

Reproduce: Inspect the social icon hrefs in the menu/footer.

Evidence: about.html:242; parents.html:242

## UI-07: Drawer does not move keyboard focus into the open dialog

Priority: P2. Type: Confirmed issue.

After clicking Menu, activeElement remains menu-toggle-btn outside the drawer. The opening code sets visibility and scroll lock without focus management. Closing also lacks focus restoration.

Suggestion: Move focus to the close button or first navigation item, contain Tab within the drawer, make background content inert and restore focus when closing.

Reproduce: Focus Menu, open it, then use Tab/Shift+Tab; check the active element against the open dialog.

Evidence: main.js:31; index-mobile-menu.png

## UI-08: Dialogs lack consistent keyboard focus containment

Priority: P2. Type: Confirmed issue.

Search moves focus to its input but does not trap it or restore the opener. Enrichment detail dialogs leave focus on their underlying cards; shared handlers do not make the background inert.

Suggestion: Use a shared accessible dialog controller with initial focus, focus containment, Escape handling and focus return.

Reproduce: Open Search or an enrichment detail, then navigate using Tab and Shift+Tab.

Evidence: main.js:101; main.js:336; enrichments-detail-modal.png

## UI-09: Unknown search terms silently open About

Priority: P2. Type: Confirmed issue.

Submitting zzzauditnomatch redirects to /about.html. Search uses substring routing without results or a no-match message.

Suggestion: Provide matching results and an explicit no-results state that retains the query. Use topic shortcuts as clearly labelled shortcuts.

Reproduce: Search for zzzauditnomatch.

Evidence: main.js:132; inspection.json

## UI-10: Arabic language selection has no translation behavior

Priority: P2. Type: Confirmed issue.

The hero has English/Arabic options, but the shared script has no change handler or language routing for the selector.

Suggestion: Connect it to a complete Arabic version with RTL layout and translated navigation/content; otherwise remove the unsupported choice.

Reproduce: Select العربية in the hero selector and compare the page language and layout.

Evidence: index.html:339; main.js

## UI-11: Introductory paragraph is hard to read on its dark card

Priority: P2. Type: Confirmed issue.

The guidance paragraph renders dark grey (#595D62) on dark teal (#1C3A47), approximately 1.81:1 contrast, visibly reducing legibility on desktop and mobile.

Suggestion: Use a light text token on the dark surface and verify contrast in normal, hover and focus states.

Reproduce: Read the paragraph immediately under the Campus Experience heading.

Evidence: book-a-visit.html:285; book-a-visit-mobile-frame.png; book-a-visit-desktop-full.png

## UI-12: Coral/white text combinations need stronger contrast

Priority: P2. Type: Confirmed issue.

Coral text on white and white text on coral appear in labels, links and primary buttons. The base coral #F28F79 versus white is approximately 2.34:1.

Suggestion: Use a darker coral text/button token or dark teal foreground; check each final rendered state rather than changing the decorative palette globally.

Reproduce: Inspect coral action labels and white text on coral CTAs at normal zoom.

Evidence: style.css:9; enrichments-desktop-full.png; book-a-visit-desktop-full.png

## UI-13: Date controls have no meaningful bounds

Priority: P2. Type: Confirmed issue.

Child birth-date inputs and the tour datetime control have no min/max attributes. The UI allows future birth dates and past visit dates.

Suggestion: Bound birth dates and tour dates, explain the visit timezone and available hours, and validate age against the chosen program. Repeat validation at the endpoint.

Reproduce: Open the date controls and choose a future birth date or past visit date.

Evidence: book-a-visit.html:357; apply-online.html:338; inspection.json

## UI-14: Required documents are pre-checked without upload or delivery instructions

Priority: P2. Type: Confirmed issue.

The four document boxes are already selected. There is no file upload and no clear next step for supplying the actual documents; Admissions says documentation is submitted with the application.

Suggestion: Start readiness boxes unchecked and distinguish preparation from delivery. Add secure uploads or an explicit later delivery step and document status.

Reproduce: Inspect the Required Documents section and compare Admissions Step 2.

Evidence: apply-online.html:428; admissions.html:340; apply-online-desktop-full.png

## UI-15: Expired seasonal application option remains selectable

Priority: P3. Type: Confirmed issue.

Summer Camp 2026 is offered alongside 2026–2027 even though this inspection is on 15 October 2026.

Suggestion: Confirm whether this is intentional; remove closed sessions or clearly label archived registrations and expose the next available session.

Reproduce: Open Academic Year Selection.

Evidence: apply-online.html:298

## UI-16: Long application has no progress, save or review step

Priority: P3. Type: UX recommendation.

The form requests enrollment, child, guardian, health and document information in one long page. A reset or navigation away loses entries.

Suggestion: Group the form into clear steps with progress, a review summary and a considered draft-saving flow for sensitive details. Preserve entries after failed submission.

Reproduce: Complete the first sections, navigate away and return.

Evidence: apply-online-desktop-full.png; apply-online-mobile-full.png

## UI-17: General inquiries unnecessarily require child information

Priority: P3. Type: UX recommendation.

The general Contact form requires a child birth date and limits messages to 180 characters. Visitors asking about fees, jobs or visits may not have that information or enough space.

Suggestion: Ask for inquiry type; make child data conditional and allow a longer message with helpful validation.

Reproduce: Inspect required fields and the message character limit.

Evidence: contact.html:345; contact-desktop-full.png

## UI-18: Campus addresses offer no directions action

Priority: P3. Type: UX recommendation.

Campus cards provide text addresses, phone and email links but no map or directions link.

Suggestion: Add verified Open in Maps / Get Directions links for each campus, with location context and accessible labels.

Reproduce: Inspect both campus contact cards.

Evidence: contact-desktop-full.png; contact.html:293

## UI-19: Large desktop section gaps slow scanning

Priority: P3. Type: Visual recommendation.

The desktop pages have substantial blank bands between content groups, especially before the philosophy/pillars and enrichment activity sections.

Suggestion: Reduce repeated vertical padding and use a consistent spacing scale. Keep separation where it communicates a new topic.

Reproduce: Scroll the desktop full-page captures and compare spacing between consecutive sections.

Evidence: about-desktop-full.png; programs-desktop-full.png; enrichments-desktop-full.png

## UI-20: Facility list is difficult to preview visually

Priority: P3. Type: Visual recommendation.

Fourteen spaces are primarily presented as icon/text cards and repeated textual highlights, with only one introductory photo.

Suggestion: Add representative photographs or a small accessible gallery, labelled by campus, so families can preview facilities before booking.

Reproduce: Review the facilities grid and signature spaces.

Evidence: spaces-desktop-full.png

## UI-21: Secure Your Place ends without an actionable next step

Priority: P3. Type: UX recommendation.

Step 3 tells families to pay within a given time frame but supplies no actual deadline, fee guidance or link to ask about payment.

Suggestion: Explain when the deadline is issued and how payment instructions arrive; add an admissions contact action and link to published fee information if available.

Reproduce: Read the third enrollment step after following Steps 1 and 2.

Evidence: admissions.html:349; admissions-desktop-full.png

## UI-22: Primary mobile task is pushed below introductory content

Priority: P3. Type: UX recommendation.

At 390×844, booking shows guidance before the form, Parents shows introduction before platform actions, and Contact shows campus details before the message form.

Suggestion: Add an early jump CTA to Book Your Visit, Sign In/Download or Send a Message, and reduce repeated introductory copy on mobile.

Reproduce: Open each page on mobile and locate the first task action.

Evidence: book-a-visit-mobile-frame.png; parents-mobile-frame.png; contact-mobile-frame.png

## UI-23: Closed navigation drawer remains in keyboard tab order

Priority: P2. Type: Confirmed issue.

On every page, pressing Tab after focusing the Menu button moves focus to an anchor inside the closed aria-hidden drawer. Keyboard users can land on invisible controls.

Suggestion: Use inert or equivalent focus suppression while the drawer is closed; restore tabbability only when it opens.

Reproduce: Close the menu, focus its trigger and press Tab once.

Evidence: interactions.json; main.js:31

## UI-24: Video button accessible label does not match its state

Priority: P3. Type: Confirmed issue.

After pausing the hero video, the visible button says PLAY VIDEO while its aria-label still says Pause background video.

Suggestion: Update the accessible name with the visible action or use a consistently named toggle with aria-pressed.

Reproduce: Click Pause Video and inspect the accessible button name.

Evidence: interactions.json; main.js:205
