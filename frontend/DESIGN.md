# Design system — Vidyalaya SMS

The visual rules for the signed-in app. Every token below has a **value** and a
**role**; if you are about to write a colour, size or radius that is not here, the
answer is to use one of these or to change this file first.

Scope: the signed-in app only. Three areas are deliberately outside this system and
must not be restyled to match it:

- `src/components/reportcard/**` and `src/components/finance/print/**` — A4 print
  sheets with their own unlayered CSS. Page counts are verified by Playwright.
- `src/pages/public/**`, `src/components/public/**`, `src/layouts/PublicLayout.jsx` —
  the marketing site.
- `src/examAdmin/**` — the react-admin/MUI pilot, which has its own theme.

---

## The idea

This software replaces paper: the ruled attendance register, the marks ledger, the
receipt book, the boxed NEB grade sheet. It already *prints* a boxed grade sheet. The
screen should feel like it belongs to the same family — ruled, calm, dense, legible —
rather than like a generic dashboard of floating cards.

Two rules follow from that, and they decide most arguments:

1. **The data is the design.** Numbers — `92.7%`, `Rs 47,200`, `B+`, `61/70` — get the
   boldest treatment on the page. Everything around them stays quiet.
2. **Rules, not boxes.** Separate things with a line where there is alignment to
   express. Reserve an enclosing box for things that are genuinely separate. Do not nest
   a box inside a box inside a box.

---

## Colour

### Neutral — the warm ink ladder

The neutral is warm, not the cool blue-grey of Tailwind's `slate`. It is installed by
**redefining `--color-slate-*`** in `@theme`, so every existing `text-slate-500` and
`border-slate-200` in the app picks up the new tone with no page edits. The `slate-*`
class names stay; only the values change.

Every ratio below is measured against the three backgrounds text actually sits on —
**paper** `#FFFFFF`, **ground** `slate-50`, **fill** `slate-100` — and is asserted by a
unit test.

| Shade | Value | Role | Paper | Ground | Fill |
|---|---|---|---|---|---|
| `50` | `#F7F6F4` | **ground** — the page, and subtle fill inside paper (`thead`, dialog footer) | — | — | — |
| `100` | `#EFEDEA` | **fill** — tabs track, icon chip, neutral badge | — | — | — |
| `200` | `#E2DFDB` | **rule** — dividers, table row rules, card edges | — | — | — |
| `300` | `#8F8780` | **control border** — inputs, checkboxes, secondary button ring | 3.53 | 3.27 | 3.02 |
| `400` | `#6B645F` | **lightest value allowed on text** | 5.81 | 5.38 | 4.97 |
| `500` | `#5C5651` | **muted** — secondary text, hints, labels | 7.23 | 6.69 | 6.19 |
| `600` | `#46413D` | body text | 10.08 | 9.33 | 8.62 |
| `700` | `#332F2C` | strong label | 13.26 | 12.28 | 11.35 |
| `800` | `#262220` | heading | 15.76 | 14.60 | 13.49 |
| `900` | `#1C1917` | **ink** — primary text, tooltip fill | 17.49 | 16.19 | 14.97 |
| `950` | `#0C0A09` | deepest | 19.8 | 18.3 | 16.9 |

`50` does double duty as the page ground *and* as a subtle fill inside white paper,
which is how the app already works (`body` and the layout root are both `bg-slate-50`,
and so are table headers and dialog footers). Keeping that one value rather than
splitting it avoids churning every call site for no visible gain.

Two things worth knowing about this ladder:

- **`400` is the lightest value allowed on text.** The old palette used
  `text-slate-400` (87×) at ≈2.7:1 and `text-slate-300` (11×) at ≈1.8:1, both failing
  WCAG 1.4.3. Making `400` itself text-safe fixes all of them at once. Decorative icons
  also sit at `400` and are simply a little darker than before.
- **`200` → `300` is a deliberate jump.** `200` is a decorative line; `300` is the
  boundary of an interactive control and must clear 3:1 (WCAG 1.4.11). They are not two
  steps of one ramp — they do different jobs.
- **Decorative icons belong at `300`, not `400`.** An icon that sits beside its own text
  label carries no information of its own, so it only needs the 3:1 of a non-text
  element. Putting it at `400` — a text weight — makes the interface feel heavy, which
  the token specimen showed clearly. Reserve `400`+ for things that are read.

### Brand

`brand-50 … brand-950` plus `brand-fg` are generated at runtime from `School.brandColor`
by `src/lib/brand.js`, which derives an OKLCH lightness ladder and picks an AA-safe
foreground. **Do not hand-write brand shades and do not change that file's maths.**

The brand colour marks exactly two things:

- **where you are** — the active nav item, the current tab;
- **the primary action** — one per view.

It is never decoration, never a section accent, never an icon tint. A school may pick
any hue, so nothing may depend on it being blue or on it contrasting with a specific
status colour.

### Status

One definition per meaning. These replace ~287 hand-picked `emerald/amber/red/sky`
utilities that previously spanned about 40 different shades, with `text-emerald-700`
and `text-emerald-600` both meaning "good".

| Token | Text | Surface | Line | Means | Paper | Ground | Fill | On surface |
|---|---|---|---|---|---|---|---|---|
| `ok` | `#15703A` | `#E8F3EB` | `#BFDDC8` | present · paid · passed · published | 6.16 | 5.70 | 5.27 | 5.41 |
| `warn` | `#9A4A08` | `#FAF0E2` | `#EBD3AE` | late · partial · due soon · draft | 6.26 | 5.79 | 5.35 | 5.55 |
| `risk` | `#B91C1C` | `#FBEBEB` | `#F0C4C4` | absent · overdue · failed · reversed | 6.47 | 5.99 | 5.54 | 5.60 |
| `info` | `#0369A1` | `#E7F1F8` | `#BBD8EA` | informational only, never a state | 5.93 | 5.49 | 5.08 | 5.18 |

The text colour clears AA on white, on both neutral fills **and** on its own muted
surface — all four columns are measured, because a `success` badge sits on its surface
while a `success` figure sits on paper. These are deliberately darker than the old
`emerald-500`/`amber-500`: they read as ink annotations rather than SaaS pills, and the
old pairings did not clear AA.

**Status colour may only express status.** A count of classes is not a warning. If a
number is neutral, it is `ink`.

### Charts

`src/components/finance/charts/chartTheme.js` keeps its own colour-blind-validated
blue/orange pair, deliberately independent of the brand hue. That is intentional and is
left alone. A chart colour must never be used as UI chrome — if you need a progress bar,
use a token.

---

## Typography

### Families

| Family | Role |
|---|---|
| **IBM Plex Sans** + **IBM Plex Sans Devanagari** | everything |
| **IBM Plex Mono** | identifiers only: admission numbers, receipt numbers, usernames |

The Devanagari companion is not decoration. The app renders real Nepali UI text and
Devanagari numerals — `हाजिरी`, `कक्षा`, Nepali month names, `१२३` in the date picker
and calendar — across 113 files. The previous stack was Inter, which has **no Devanagari
coverage at all**, so every Nepali string fell back to whatever the OS supplied,
unmatched in weight and colour. IBM Plex is the one widely-available superfamily with a
weight-matched Devanagari companion, and it has true tabular figures.

Weights: **400** body, **500** labels and buttons, **600** headings and emphasis. That
is the whole set — the old system was already 91% two-weight, which is right. No 700 in
the app (print sheets are exempt).

### Scale

Sizes are close to the previous effective values on purpose: the character comes from
the typeface and from how numbers are set, not from re-scaling 65 pages.

| Token | Size / line | Use |
|---|---|---|
| `text-2xs` | 11 / 16 | micro only — table superscripts |
| `text-xs` | 12 / 18 | hints, captions, badge text |
| `text-sm` | 14 / 20 | **the workhorse** — body, table cells, controls |
| `text-base` | 15 / 22 | prose paragraphs |
| `text-lg` | 18 / 26 | card titles |
| `text-2xl` | 24 / 30 | page title |
| `text-3xl` | 30 / 36 | rare — empty-state hero |
| `text-display` | 40 / 40, `-0.02em` | **the hero number**, tabular |

`text-xl` is retired. It had 10 uses against `text-lg`'s 33 and `text-2xl`'s 19, and it
survived only in the two stat tiles that looked wrong next to everything else. It stays
defined so nothing breaks; do not reach for it.

### Setting numbers

Numbers are the content of this product, so they get the care:

- **always `tabular-nums`** in any column, tile or total — figures must align down a column;
- **right-align** numeric table columns, left-align text ones;
- the headline figure on a tile uses `text-display` in `ink`;
- an identifier (`STU20240020`, `RCP-2083-84-00042`) is `font-mono`, never the sans.

### Prose

Body text runs 60–75 characters. Use `max-w-[68ch]` on any block of real prose — help
text, descriptions, assistant answers.

---

## Shape and depth

### Radius

The old ladder was non-monotonic and actively misleading: `--radius-lg` and
`--radius-card` were both 14px while `rounded-xl` was 12px, so `rounded-xl` was
*smaller* than `rounded-lg`. The new ladder only goes up:

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 4px | badge, chip, small ring |
| `rounded-md` | 6px | `xs`/`sm` buttons, inline inputs |
| `rounded-lg` | 8px | **default control** — buttons, inputs, nav items, menu rows |
| `rounded-xl` | 12px | **surface** — card, dialog, popover, menu panel |
| `rounded-2xl` | 16px | mobile bottom sheet |
| `rounded-full` | — | avatar, pill, dot |

`rounded-card` is an alias of `rounded-xl` and is kept for the existing call sites.

The headline change: controls drop from 14px to **8px**. A 36px-tall button at a 14px
radius reads as a lozenge; at 8px it reads as a control. This single change does most of
the work of removing the generic look.

### Elevation

**One shadow, and it is only for things that float.**

| Token | Value | Use |
|---|---|---|
| `shadow-card` | **none** | surfaces do not float — a 1px `slate-200` rule defines them |
| `shadow-pop` | the existing soft drop | dialog, menu, popover, toast, tooltip — nothing else |

A card is paper on a desk, not a card hovering above one.

### Surfaces — three tiers

The old system had exactly one surface treatment, which is why a KPI tile, a page
section and a nested subject tile looked identical and produced boxes inside boxes.

| Tier | Build | Use |
|---|---|---|
| **ground** | `bg-slate-50` | the page itself (`body`, the layout root) |
| **paper** | `bg-white` + `border border-slate-200` + `rounded-xl`, no shadow | a content surface |
| **well** | `bg-slate-50` + inset `border-slate-200` | a data region *inside* paper — `thead`, a totals strip, a dialog footer |
| **overlay** | `bg-white` + `shadow-pop` + `rounded-xl` | dialog, menu, popover, toast |

Nesting rule: **ground → paper → well, and stop.** A well never contains another paper.

---

## Spacing

The existing Tailwind 4px scale stays. What was missing was agreement on which steps to
use, so these are the steps:

`1` `1.5` `2` `2.5` `3` `4` `5` `6` `8` `10` `12`

| Decision | Value |
|---|---|
| Page container | `max-w-[88rem]` — **one width**, via `PageShell` |
| Page gutter | `px-4 sm:px-6 lg:px-8` |
| Page rhythm | `space-y-6` between major blocks — **one rhythm** |
| Card padding | `p-5` (`sm` = `p-4`, `lg` = `p-6`) |
| Table cell | `px-4 py-2.5` |
| Table row height | ~44px (was ~61px) |
| Control gap | `gap-2` |

There were previously seven container widths plus 16 unconstrained pages, and
`space-y-6` and `space-y-4` were in a near-tie across the app. `PageShell` owns both so
they cannot drift again.

---

## Components

Use the kit in `src/components/ui/`. If something is missing, add it to the kit — do not
hand-roll it in a page. The audit found 7 stat cards and 6 segmented controls built
because the kit lacked them.

### Buttons

| Variant | Use |
|---|---|
| `primary` | the one main action in a view |
| `secondary` | supporting actions |
| `outline` | supporting action that needs brand emphasis |
| `ghost` | toolbar and row actions |
| `danger` / `danger-soft` | destructive, with a confirm |

Sizes `xs` `sm` `md` `lg`; weight is always `font-medium`. Every interactive element
shows `focus-visible:outline-2 outline-offset-2 outline-brand-600` — no exceptions.

`success` and `warning` button variants are **removed**: a button is an action, and its
colour should say how important it is, not what mood it is in. Use `primary`.

### States

Every interactive component defines: default, hover, focus-visible, active, disabled,
and — where it submits — loading. Every list view defines: loading, empty, error.

**One loading idiom per shape**: `LoadingBlock` for a whole region, `Skeleton` matching
the real content's height for tiles, and the `DataTable` row skeletons for tables. Never
substitute `"…"` for a value, and never dim a region with `opacity-60`.

**Empty states** use `EmptyState` — `compact` inside a card, default for a whole page.

### Copy

- Buttons are **sentence case**, verb first, and name the outcome: "Save attendance",
  not "Save Attendance" or "Submit".
- An action keeps its verb through the whole flow: a button that says "Publish" produces
  a toast that says "Published".
- Empty states say *what this is + why it is empty + how to start*, not just a fact.
  "No exams scheduled" becomes "No exams yet. Create one to enter marks."
- Errors say what happened and how to fix it. They do not apologise.
- No `→` appended to link text. Use an icon or nothing.
- No ALL-CAPS tracked labels, and no `·`-joined meta strings where a line break or a
  real label would be clearer.

---

## Icons and imagery

`lucide-react`, one size per context: 14px in `xs`/`sm` controls, 16–18px in body and
nav, 20px in tiles. Icons are `aria-hidden` when a text label is present; an icon-only
control must pass a `label` to `IconButton`.

**Do not put a decorative icon tile next to a page or card title.** The title already
says what the page is; the tile only adds chrome, and it was the most templated element
in the old design.

---

## Motion

| Token | Duration | Use |
|---|---|---|
| `fade-in` | 160ms | content swap |
| `pop-in` | 180ms | dialog, menu, toast appearing |
| `slide-in` | 220ms | mobile drawer |

Motion answers an action — something opened, expanded, confirmed. There are no
scroll-triggered reveals and no entrance animations on cards in the app.

**All of it is disabled under `prefers-reduced-motion: reduce`**, including the
`tw-animate-css` utilities. This was previously honoured only on the marketing site.

---

## Accessibility floor

Non-negotiable, and checked per wave:

- Text ≥ **4.5:1**, large text ≥ 3:1, control boundaries and meaningful graphics ≥ **3:1**.
  The ladder above is built to make this automatic.
- A visible focus indicator on **every** focusable element.
- Everything reachable and operable by keyboard; dialogs trap focus and restore it.
- Every input has a real label; errors use `role="alert"` and say how to fix it.
- Layout survives 200% zoom — the dense tables are the risk.
- Colour is never the only carrier of meaning: a status always has text or an icon too.

---

## Preserve

These exist for reasons outside the design system. Do not remove them while restyling:

- `data-guide="…"` attributes — the assistant's guided walkthroughs anchor to them.
- `.col-roll`, `.col-name`, `.col-marks`, `.col-remarks` — Playwright selectors.
- `print:hidden` / `print:p-0` / `print:bg-white` and the `report-print-isolate` body
  class — the print pipeline depends on them.
