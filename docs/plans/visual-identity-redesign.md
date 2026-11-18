# Visual redesign: from "generic card kit" to "the school register"

Brief pasted 2026-11-18. **Waves 0–2 are done, on branch `feature/visual-redesign` (not yet
merged to `main`); waves 3 and 4 are not started.** The rules this plan produced are
[`frontend/DESIGN.md`](../../frontend/DESIGN.md) — read that first, then this file for what
is left to do.

> **Resuming on another machine?** Everything you need is in this repo:
>
> ```bash
> git fetch origin && git checkout feature/visual-redesign
> cd frontend && npm install          # node_modules may be incomplete; see "Machine notes"
> npm run lint && npm test && npm run build
> git checkout -- package-lock.json   # on Windows, npm install churns it; see "Machine notes"
> ```
>
> That confirms the baseline (0 lint errors, 106 tests, a clean build). Then pick up at
> **wave 3**.

---

## 1. State

| Wave | Scope | State |
|---|---|---|
| 0 | Write the direction down | **Done** — `frontend/DESIGN.md`, `docs/ui-ux/README.md` |
| 1 | Tokens, one file, no page edits | **Done** — `app.css` `@theme`, `index.html` fonts, `src/styles/__tests__/palette.test.js` |
| 2 | Kit + shell | **Done** — kit restyled, `PageShell` / `SegmentedControl` / `Radio` added, `DataTable` register treatment, nav labels de-capsed |
| 3 | Data-dense screens (**the owner's priority**) | **Not started** |
| 4 | The long tail | **Not started** |

**Verified for waves 0–2:** `npm run lint` 0 errors (5 pre-existing
`react-hooks/exhaustive-deps` warnings, in files this work did not touch), `npm run build`
passes, `npm test` 106 frontend tests pass (55 of them new, in `palette.test.js`). The
print-pin guard was mutation-tested: breaking the pin produced exactly 1 failure, restoring
it returned to green.

**Not verified, and why:** the e2e suite (90 Playwright tests) has **not** been run against
these changes. The machine this was built on has no test database configured. **Run
`cd e2e && PW_CHANNEL=chrome npm test` before shipping**, and watch the two report-card
screenshot comparisons in particular — they are the thing most likely to catch a mistake
here.

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

---

## 4. Wave 3 — Data-dense screens (do this next)

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
