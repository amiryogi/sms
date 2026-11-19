# Visual redesign: from "generic card kit" to "the school register"

Brief pasted 2026-11-18. **All four waves are done.** Waves 0–3 were merged to `main` on
2026-11-18 by pull request #8; wave 4 is on `feature/visual-redesign-wave4` and waits in
**pull request #9, based on `main`**. The rules this plan produced are
[`frontend/DESIGN.md`](../../frontend/DESIGN.md) — read that first, then §5a here for what was
deliberately left for a later pass. §3 is the trap to know about before touching any token.

> **Resuming on another machine?** Everything you need is in this repo:
>
> ```bash
> git fetch origin
> git checkout feature/visual-redesign-wave4   # or main, once PR #9 is merged
> cd frontend && npm install          # node_modules may be incomplete; see "Machine notes"
> npm run lint && npm test && npm run build
> git checkout -- package-lock.json   # on Windows, npm install churns it; see "Machine notes"
> ```
>
> That confirms the baseline: 0 lint errors, 119 vitest tests, a clean build. No dependency
> changed in any wave, so an existing `node_modules` is already correct.

---

## 1. State

| Wave | Scope | State |
|---|---|---|
| 0 | Write the direction down | **Done** — `frontend/DESIGN.md`, `docs/ui-ux/README.md` |
| 1 | Tokens, one file, no page edits | **Done** — `app.css` `@theme`, `index.html` fonts, `src/styles/__tests__/palette.test.js` |
| 2 | Kit + shell | **Done** — kit restyled, `PageShell` / `SegmentedControl` / `Radio` added, `DataTable` register treatment, nav labels de-capsed |
| 3 | Data-dense screens (**the owner's priority**) | **Done** (2026-11-18) — one `StatCard`/`StatGroup`, six screens restyled; see §4a |
| 4 | The long tail | **Done** (2026-11-19) — every page, the kit reference, the copy pass; see §5a |

**Verified for waves 0–2:** `npm run lint` 0 errors (5 pre-existing
`react-hooks/exhaustive-deps` warnings, in files this work did not touch), `npm run build`
passes, `npm test` 106 frontend tests pass (55 of them new, in `palette.test.js`). The
print-pin guard was mutation-tested: breaking the pin produced exactly 1 failure, restoring
it returned to green.

**Waves 0–2 were written on a machine with no test database, so the e2e suite could not run
there.** It has since run twice, and it earned its keep: the run after wave 3 caught a real
print regression that waves 0–2 had introduced and that no unit test or browser check had
found (§3). Current state, after wave 4: **e2e 90 passed, 1 skipped**, including both
report-card pixel baselines. Details in §5a.

The lesson, for the next person: **the Playwright baselines are the only thing that catches a
token change reaching print.** Run them before shipping anything that touches `app.css`, and
do not treat lint + vitest + a browser sweep as a substitute.

---

## 2. The direction, in short

The full version with every measured contrast ratio is `frontend/DESIGN.md`. The summary:

This software replaces paper objects — the ruled attendance register, the marks ledger, the
carbon-copy receipt book, the boxed NEB grade sheet. The app already *prints* a beautiful
boxed grade sheet while the screen looked nothing like it. Closing that gap gives the
product a character specific to it, and suits people who sit in these screens all day.

- **Spend the boldness on the data.** `92.7%`, `Rs 47,200`, `B+`, `61/70` are the content.
  Chrome stays quiet.
- **Colour means something.** Brand marks two things only: where you are, and the primary
  action. Status colour means status, never decoration.
- **Rules, not boxes.** A line where there is alignment to express; enclosure only for
  genuinely separate things. `--shadow-card` is `none` — a surface is a 1px rule.
- **One of everything:** one container width (`PageShell`), one radius ladder, one type
  scale, one definition per status.
- **Density is respect for the user's time.**

### What Wave 1 actually changed

The highest-leverage move: `@theme` **redefines Tailwind's `slate`** as a warm ink ladder,
so every existing `text-slate-500` / `border-slate-200` / `bg-slate-50` in 65 pages retoned
with **zero page edits**. That forced a useful constraint — `slate-400` and `slate-500` must
themselves clear AA, which fixed all 98 low-contrast call sites at once. `slate-400` is the
lightest value allowed on text; `slate-300` is a control boundary (3:1); decorative icons sit
at `slate-300`.

Status is four tokens — `ok` / `warn` / `risk` / `info`, each with `-surface`, `-line` and
`-strong`.

The font is **IBM Plex Sans + IBM Plex Sans Devanagari** (+ Mono for identifiers). This fixes
a real defect, not a taste: 113 files contain Devanagari, and Inter has **zero** Devanagari
coverage, so every Nepali string was falling back to an unmatched system font.

---

## 3. ⚠ The print trap — read this before touching tokens

**The original plan asserted the Playwright pixel baselines were safe because no print file
was being edited. That was wrong, and it is the single most dangerous thing about this work.**

`reportcard/nebSheetStyles.js` resolves `var(--rc-font-family, var(--font-sans, sans-serif))`,
`reportcard/designVars.js` maps `inter: 'var(--font-sans, "Inter", sans-serif)'`, and the fee
slips use Tailwind `slate` utilities. So changing `--font-sans` or the slate ladder reaches
printed output and **would have moved printed metrics, page counts and both pixel baselines**
without a single print file appearing in the diff.

The fix, which is now in place: `app.css` **shadows** `--font-sans` and the whole
pre-redesign cool slate ladder inside

```css
.report-card-a4, .report-a4, .perf-sheet, .rc-grade-legend, .bill-slip, .receipt-slip
```

No print file was edited. `index.html` still loads Inter solely for this. It is verified by
computed style in a real browser (6/6) and guarded by the `"print surfaces stay pinned"`
block in `src/styles/__tests__/palette.test.js`.

**If you add a new print surface, add its class to that pin rule and to the test.** If a
report-card test starts failing on page count or pixels, suspect this first.

**The first pin was incomplete, and the e2e run after wave 3 proved it.** It covered the
font and the greys but not the type scale. Tailwind's default line heights are ratios
(`calc(1.75 / 1.25)`); the redesign's are fixed rems. The NEB sheet's `h2`/`h3` take their
line height from the base `h2 { @apply text-xl }` rule, so the title block lost 0.73px and
the whole sheet below it moved up a pixel. Found by rendering the same card on the
pre-redesign commit and on HEAD against the same database and diffing every element box
(all 158 now match). The pin now also restores Tailwind's default `--text-*` sizes and line
heights, and covers `.statement-sheet` and `.daybook-sheet`, which had been missing (the A4
statement and day book were printing in the new font and greys). Tests guard all three.

Two more things that run taught:

- **The baselines are stale on data.** They were captured on a database where STU20240001
  was "Rajan Rai"; it is "Vishal Gurung" now. The 1% tolerance absorbs that, which is why
  they pass — but it also means they have less margin than they appear to. Re-take them
  (`--update-snapshots=all`, after looking at the result) the next time the test database
  is rebuilt on purpose.
- **Compare like with like.** The test opens the *first* card of the class, so run order
  and data decide what it shows. To isolate a code change, render both commits against
  the same database, as above.

---

## 4. Wave 3 — Data-dense screens (as planned; §4a records what was done)

The screens staff live in, restyled to the register treatment and adopting `PageShell`:

- [`admin/Students.jsx`](../../frontend/src/pages/admin/Students.jsx)
- [`teacher/MarksEntry.jsx`](../../frontend/src/pages/teacher/MarksEntry.jsx)
- [`teacher/Attendance.jsx`](../../frontend/src/pages/teacher/Attendance.jsx)
- [`finance/Transactions.jsx`](../../frontend/src/pages/finance/Transactions.jsx)
- [`finance/Accounts.jsx`](../../frontend/src/pages/finance/Accounts.jsx)
- [`finance/AccountDetail.jsx`](../../frontend/src/pages/finance/AccountDetail.jsx)

1. **Consolidate the 7 stat-card implementations into `StatCard`.** The canonical one is used
   by only 4 pages; the 6 rivals are in `finance/Dashboard`, `portal/OverviewCards`,
   `finance/AccountDetail`, `finance/Collect`, `admin/ReportCards`, `portal/ResultsView` —
   between them 4 value sizes, 3 icon sizes and 2 label/value orders. Add `size`, `as`/`to`,
   `progress` and no-icon props to cover every current caller, then delete the 6 rivals.
2. **Strip decorative status colour.** `admin/Dashboard.jsx:136-139` uses `color="warning"`
   (amber) for *Classes*, `"success"` for *Teachers*, `"info"` for *Subjects* — in an app
   where amber and red genuinely mean "overdue" and "absent". These tiles become neutral.
3. **Give the hero numbers the display treatment** (`--text-display`, tabular figures). They
   are currently set at the same weight and size as a card title.
4. **Fix `finance/Dashboard.jsx:26`**, which pipes `SERIES.collected` (a *chart* colour) into
   a KPI progress bar via inline `style` — a chart colour used as UI chrome. Also the two
   hand-styled `<Link>` buttons at `finance/Dashboard.jsx:91,94`, which use `font-semibold`
   against the kit's `font-medium`.
5. **Adopt `SegmentedControl`** where these pages hand-roll one (attendance marks especially —
   it has `ok`/`warn`/`risk` selected tones for exactly that).
6. **Raise the row-action targets.** `Button xs` (28px) and `IconButton sm` (32px) are
   compliant (see §7) but tight for touch in a dense table. This is a usability call.

**After Wave 3, regenerate the marketing screenshots** — `cd e2e && PW_CHANNEL=chrome npm run
screenshots`. The public site displays images of the app; they are already stale (they show
native `mm/dd/yyyy` date inputs that no longer exist) and a restyle makes them visibly wrong.
Look at every image before committing it, per CLAUDE.md.

## 4a. Wave 3 — what was done (2026-11-18)

### Kit

- `components/ui/StatCard.jsx`: `StatCard` + `StatGroup`, documented in `DESIGN.md`
  ("Figures"). It replaced **nine** tiles, not seven: the plan's seven plus two added since
  (`AssistantSettings`, `AcademicCalendar`). `common/StatCard.jsx` is deleted.
- `components/ui/statValue.js`: the hero figure steps down by the tile's own width (container
  queries), tiered by the value's length; unit-tested so no figure is set larger than its tile.
- **`lib/cn.js` bug fix.** tailwind-merge took the custom `text-display` / `text-2xs` sizes for
  colours, so `cn("text-display", "text-slate-900")` dropped the size and hero figures rendered
  at 16px. Found in the browser. `cn` now declares them; `lib/__tests__/cn.test.js` fails if a
  new `--text-*` size token is added to `app.css` without being declared there.
- `IconButton` takes `to` (renders a router `Link`) for row actions that navigate.
- `DataTable`: a column may set `action: true` (4px vertical cell padding, so a 36px target
  still gives a ~45px row); both toolbar rows wrap, so a page with many filters no longer
  pushes its actions out of the card.

### Pages

- Dashboards (admin, teacher, finance, student/parent): hero figures at `text-display`, all
  ink. The decorative amber *Classes* / green *Teachers* / sky *Subjects* tiles are gone. The
  finance progress bar no longer uses the chart's series colour; its header buttons use
  `buttonClasses`; its date pickers no longer overflow the filter card.
- `PageShell` on the six target screens plus Collect, the finance and role dashboards,
  My Students.
- **Students**: one line per row, 45px (was ~61px). The email moved out of the register (it is
  in the details dialog); a username shows only when it differs from the admission number.
- **Accounts**: 45px rows, no horizontal scroll at 1440px (the chevron duplicated the name
  link and was removed); the balance turns `risk` itself when all of it is overdue instead of
  printing the same amount twice. Status filter is a `SegmentedControl`.
- **Transactions**: one-line rows except where a reference or reversal badge adds real data;
  entry-type and reversal-status filters are `SegmentedControl`s.
- **AccountDetail / Collect**: figures in a ruled `StatGroup`; status colour via tokens.
- **Attendance**: marks are a `SegmentedControl` per student, labelled with the name. Only the
  exceptions are coloured (absent `risk`, late `warn`); **present is the quiet selected state**,
  like a paper register, so absences stand out. The day's tally is a `StatGroup` well.
- **MarksEntry**: rows ~41px (were ~48px); register header; absent toggle on the risk tokens,
  with a focus ring it lacked; unsaved rows marked in `warn` (a draft), not brand.

**Verified:** `npm run lint` 0 errors (the same 5 warnings), `npm test` 117 pass (11 new),
`npm run build` passes and the built CSS contains every container-query step. In the browser
on the dev database at 1440px: admin, finance and teacher dashboards, Accounts, Transactions,
Students, Attendance and Marks Entry render with a clean console; row heights measured as
above; no table or page overflows; teacher pages have no horizontal page scroll at 390px.

**E2E, after wave 3 (2026-11-18), on the local MySQL `sms_test`:** the first run gave 88
passed and the two pixel baselines failed. The cause was a real print regression from wave 1
(the type-scale gap in §3), now fixed. The full suite then passed: **90 passed, 1 skipped**,
the documented baseline.

**Not verified:**

- The student/parent portals, AccountDetail and Collect were checked by lint and build only,
  not in the browser.

**Deliberately left for wave 4** (copy pass and the rest):

- "Save Attendance", "Save Marks", "Marks Entry", "Generate Report Cards", "Print All" stay
  title case: the e2e tests, the assistant's help documents, `evals.json` and the walkthrough
  registry quote them, so they change together.
- `components/portal/FeesView.jsx` still has its own balance figure. **The smoke test reads it
  through `main .text-3xl`**, so migrating it to `StatCard` (whose hero uses container-query
  classes, not `.text-3xl`) needs that selector changed in the same commit.
- Finance dashboard dims stale data with `opacity-60` while refetching (a loading idiom
  DESIGN.md forbids; part of item 9's loading clean-up).
- MarksEntry's remarks inputs have no resting border (a WCAG 1.4.11 question).

**Kit requests raised during wave 3, not built:**

- `SegmentedControl` changes value on ↑/↓ as a radio group should, which fights MarksEntry's
  ↑/↓ row navigation; an `orientation="horizontal"` option would allow it there.
- A `size="lg"` `SegmentedControl` (attendance marks are 32px; fine for WCAG 2.2 AA, tight on
  a phone).
- A `muted` column option on `DataTable`.

## 5. Wave 4 — The long tail

7. Adopt `PageShell` across the remaining ~55 pages. Today: `max-w-7xl` ×18, `max-w-6xl` ×15,
   `max-w-5xl` ×9, `max-w-4xl` ×3, `max-w-3xl` ×2, and **16 pages with no constraint at all**.
   Four near-identical DataTable CRUD pages (`Sections`, `Classes`, `Subjects`, `Students`)
   use four different widths.
8. Route the remaining ad-hoc status colours through the tokens (287 utilities over ~40
   distinct shades; `text-emerald-700` ×25 and `text-emerald-600` ×16 both mean "good").
9. Replace the 22 ad-hoc empty states with `EmptyState compact` (the `compact` prop was added
   in Wave 2 precisely because `py-14` was too tall inside a card, which is *why* pages
   hand-rolled `<p>`), and the 5 coexisting loading idioms with the kit's.
10. Retire the four duplicated dashboard greeting blocks into one `DashboardGreeting`, and fix
    the three `text-lg` page titles (`ChangePassword`, `LoginSlips`, `Bills`) that are visibly
    smaller than every sibling.
11. Delete `gpaColor` / `gradeColor` from `utils/grades.js` — 8 unreferenced hex pairs, nothing
    imports them.
12. **Copy pass.** One casing rule for every button label (sentence case, verb first, matching
    the outcome — "Save Attendance" and "All present" currently sit in the same viewport).
    Empty states rewritten to *what + why + how to start*. Remove the `→` suffixes from link
    text. Keep the same verb through a whole flow, so the button that says "Publish" produces
    a toast that says "Published".
13. **Document the kit** — a short page per component covering variants, states, sizes and
    accessibility notes, so the next person extends the system instead of hand-rolling a
    seventh stat card. Coverage beats depth.

---

## 5a. Wave 4 — what was done (2026-11-19)

Branch `feature/visual-redesign-wave4`, off `feature/visual-redesign`. Done in parallel by
five agents, one per group of pages, each owning its own files, plus one writing the kit
reference. Labels that tests or help documents quote were left alone by the agents and
renamed afterwards in one pass.

### Kit and shared pieces

- `components/common/DashboardGreeting.jsx` replaces four drifted greeting blocks.
- Kit error and status colours (invalid inputs, error text, the danger menu item, toast icons,
  the date picker's holidays) are on the `risk/ok/warn/info` tokens.
- `SegmentedControl`: with nothing selected the first option takes the tab stop (an
  undecided promotion row was unreachable by keyboard); ← with nothing selected picks the last.
- `Switch` takes `aria-label` and `className`.
- `utils/grades.js`: `gpaColor` / `gradeColor` deleted (no callers).
- `components/ui/README.md`: a reference for every kit component, `DataTable` and
  `DashboardGreeting`.
- **Print pin:** `.calendar-sheet` added. The printed school calendar had been printing in
  the new font, greys and type scale since wave 1.

### Pages

- `PageShell` on every app page except Change password (rendered outside the app shell),
  Login, and LoginSlips (its slips print inside the container, kept on purpose).
- Raw colour utilities replaced by tokens; colour that was not a status made neutral (info
  badges for "submitted", brand chips and hovers, the green fee-type tile, the sky "normal"
  notice priority, and others).
- Empty states compact inside cards, written as what, why and how to start. The `opacity-60`
  refetch dimming is gone from Reports, the school calendar and the academic calendar.
- Hand-built filters and switches became `SegmentedControl`s (Exams, Notices, Discounts,
  My students, the payment and discount dialogs).
- Register tables: sentence-case headers, `slate-200` rules, numeric columns right-aligned,
  36px row actions, one-line rows (Classes, Sections, Subjects now match Students).
- Copy: `·`-joined strings rewritten, `→` removed from link text, the `text-lg` page titles
  (Change password, Login slips, Bills) fixed.
- **Attendance bar:** it no longer turns red or amber below 75% / 90%. Those thresholds were
  invented in the frontend with no backend flag (CLAUDE.md §4.9).
- **Assistant contrast bug:** the send button, launcher and user bubble used `text-white` on
  the brand colour; they now use `text-brand-fg`, readable on any school colour.
- Admin dashboard's "Fee payments" quick action pointed at the old redirect; it now opens
  Student accounts.

### The coordinated rename

Case-only, so the help documents keep pointing at the right things. 38 phrases across 76
files: page titles and sidebar items ("Teacher Assignment" → "Teacher assignment",
"Report Cards" → "Report cards", …) and buttons ("Save Attendance" → "Save attendance",
"Print All" → "Print all", …), applied together to `navigation.js`, the pages, the help
documents, `guides.json`, `evals.json`, the walkthrough registry and the e2e and capture specs.
Two wording changes: "CSV" → "Download CSV", "Print / Save as PDF" → "Print or save as PDF".
The exam schedule page title matches its sidebar item again ("Exam schedule"). The student
help document listed the assignment tabs wrongly; corrected.

Not renamed (quoted, and already fine or a separate decision): "New request", "Split",
"Submit" (a student's hand-in button), "Choose a class". The mobile app has its own labels
and was not touched.

### Verified

- Frontend lint 0 errors (the same 5 warnings), 119 vitest tests, build passes.
- Backend 706 unit tests (the assistant's knowledge and route checks among them).
- **E2E: 90 passed, 1 skipped**, including both report-card pixel baselines.
- By eye, at 1440px on the test database: Classes, Exams, Notices, Promotions, Teachers,
  Discounts, Reports, teacher Assignments, the student dashboard and attendance, parent fees
  and the school calendar. No console errors and no horizontal overflow on any of them.

### Left, for a later pass

- **Kit gaps found while writing the reference** (`components/ui/README.md` lists them):
  - `Tabs` lacks arrow keys and `tabpanel` wiring;
  - `Menu` doesn't move focus into the menu or return it;
  - `DataTable`'s sticky header never sticks, and its pager buttons lack a focus ring and a
    3:1 boundary;
  - Checkbox/Radio/Switch have no error state;
  - `Dialog` and `IconButton lg` are off the radius ladder.
- Row delete buttons are a red-tinted square in every row (Classes, Exams). A quiet icon
  that turns risk on hover would read calmer; it is a kit-wide choice.
- `SegmentedControl` still changes value on ↑/↓, which is why Marks entry and Promotions
  keep their own controls. A horizontal-only option would let them adopt it.
- The calendar's B.S./A.D. switch is styled like a segmented control but stays two buttons,
  because `calendar.spec.js` finds them by role `button`.
- `FeeStructures` adds per-class totals with `parseFloat` (display only). Use `utils/money`.
- Marketing screenshots were not re-taken after wave 4.

## 6. Constraints

- **Do not touch** `components/reportcard/` (8 files, 1,707 lines),
  `components/finance/print/` (7 files), the `@media print` rules, or the unlayered print CSS.
  See §3 for the trap this does *not* protect you from.
- **Do not touch** `pages/public/`, `components/public/`, `PublicLayout.jsx` — the owner
  scoped the marketing site out.
- **Do not touch** `src/examAdmin/` — the react-admin/MUI pilot has its own theme.
- **Preserve** the 32 `data-guide` attributes (the assistant walkthroughs break without them)
  and the 25 semantic column classes `.col-roll` / `.col-name` / `.col-marks` / `.col-remarks`
  (e2e selectors).
- **No backend, API, routing or business-logic change. No schema change.**
- Keep the `brand-*` runtime theming intact: `lib/brand.js` derives an 11-stop OKLCH ladder
  and a WCAG-checked foreground from one school hex, so the palette must hold for **any** hue.
- **No dark mode** (the owner's decision).
- e2e fails the run on any unexpected console error.

## 7. Verification, per wave

1. `cd frontend && npm run lint && npm run build` — 0 errors; the 5 pre-existing warnings must
   not grow.
2. `cd e2e && PW_CHANNEL=chrome npm test` — 90 tests. The report-card printing tests and the
   two screenshot comparisons must pass **untouched**, which is what proves print was not
   disturbed.
3. **Contrast** — every status token against paper, ground and fill at 4.5:1; UI boundaries at
   3:1. `palette.test.js` already asserts this against `app.css` itself, so a bad token fails
   the suite rather than needing a manual check.
4. **Keyboard only** — tab through a dialog, the user menu, `Tabs`, `SegmentedControl` and a
   data table; visible focus at every stop.
5. **Zoom to 200%** — the dense tables are the risk.
6. **Devanagari check** — open `/calendar` and an assistant walkthrough with the date
   preference set to Nepali numerals and confirm `१२३` and the month names render in Plex
   Devanagari, not a system fallback. This is invisible in an English-only pass.
   (Note: `document.fonts.check()` defaults to a *Latin* probe string, so it reports `false`
   for a Devanagari subset even when the font is loaded and working. Probe with Devanagari
   text, or measure rendered width against the named family.)
7. **Brand-hue check** — set `School.brandColor` to a hostile hue (maroon, then olive) and
   sweep the shell, a dashboard and a data table.
8. **Reduced-motion check** — enable the OS setting; dialogs, toasts, the drawer and the page
   fade should not animate.
9. **Density check** — screenshot `admin/Students` and `teacher/MarksEntry` before and after;
   rows per viewport should rise meaningfully.
10. Run all 7 roles on seeded demo data (`admin`, `teacher1`, `examofficer`, `accountant`, a
    student by admission number, a parent as `p.<admission>`, `superadmin`) with a clean
    console.

**WCAG note, for accuracy:** `Button xs` (28px) and `IconButton sm` (32px) **pass**. WCAG 2.1
AA has no target-size criterion — 2.5.5 is **AAA** at 44px — and WCAG 2.2 AA requires only
24×24. Some references list 2.5.5 as AA; they are wrong. Raise them in Wave 3 as a usability
improvement, not as a compliance fix.

---

## 8. Open decisions for the owner

| | |
|---|---|
| **Default brand colour** | `DEFAULT_BRAND = "#4f46e5"` (cool indigo) in `lib/brand.js` was chosen against the old cool slate and now sits slightly oddly against the warm neutrals. It only affects schools that have **not** set their own colour. Left alone deliberately. |
| **Chart palette** | `components/finance/charts/chartTheme.js` hard-codes blue/orange and documents why: a colour-blind-validated adjacent pair, deliberately *not* the brand colour, because an arbitrary brand hue could collide with status red. The counter-argument is real — a maroon-branded school gets blue charts. This is a decision, **not a defect**; left alone. |
| **UXKIN benchmarking** | The `plugin:website-design:uxkin` connector is not authorised, so this direction is derived from the product's own subject matter, its existing tokens and the real screenshots — **not** from a comparison against real school/admin design systems. Authorise it if you want the colour and type choices benchmarked before Wave 4. |

## 9. Machine notes

- `frontend/node_modules` and `e2e/node_modules` may be incomplete after a fresh clone —
  `npm install` in each. On Windows, `npm install` rewrites `frontend/package-lock.json` by
  stripping `libc` fields from optional rollup packages; that is pure noise that would churn
  on Linux CI, so revert it with `git checkout -- frontend/package-lock.json` afterwards.
- Frontend checks that need no database: `npm run lint`, `npm test` (vitest), `npm run build`.
- The e2e and integration suites need a configured backend and a test database — see
  CLAUDE.md §2 and `docs/SETUP-NEW-MACHINE.md`.
