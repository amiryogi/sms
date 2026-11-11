# Tailwind design system audit (Phase 1, read-only)

Date: 2026-11-11.

## Correction to the brief

The brief says the Tailwind migration is "in progress". It is **finished**: every page was
converted in UI waves 1–6, and the old stylesheets (`index.css`, `bridge.css`, `App.css`) were
deleted on 2026-11-08. The brief's "approximately 289 unit tests" is also out of date: there
are 453 unit tests and 80 integration tests, run on MySQL and PostgreSQL in CI.

## What is installed

| Item | Version | Notes |
|---|---|---|
| Tailwind CSS | 4.3.5 | via `@tailwindcss/vite`; CSS-first config, no `tailwind.config.js` |
| React / React DOM | 19.2 | |
| React Router | 7.18 | `BrowserRouter`, lazy pages in `App.jsx` |
| radix-ui | 1.8 | behaviour for Tooltip, Accordion, Progress, Popover |
| cmdk | – | student search combobox |
| recharts | 3.10 | finance dashboard charts |
| tw-animate-css | – | animation utilities |
| Material UI, react-admin, Playwright | not installed | |

## The design system as it exists

- **One stylesheet:** `frontend/src/styles/app.css`, layers `theme, base, components,
  utilities`.
- **Tokens** (`@theme`):
  - font `Inter`;
  - `--radius-card` plus pinned `--radius-sm/md/lg` (6 / 8 / 14 px);
  - `--shadow-card`, `--shadow-pop`;
  - three animations.
- **Brand colour:** `brand-50 … brand-950` come from `School.brandColor` at runtime
  (`src/lib/brand.js`), defaulting to indigo. Neutral scale: Tailwind `slate`.
- **Component kit** (`src/components/ui/`):
  - `Button`, `IconButton`, `Field`, `TextInput`, `SelectInput`, `Card`, `Badge`, `PageHeader`,
    `Dialog`, `Tabs`, `Menu`, `EmptyState`, `Alert`, `LoadingBlock`, `Skeleton`, `Spinner`,
    `Avatar`, `toast`, `confirmDialog`;
  - class strings are centralised in `ui/styles.js` and merged with `cn()`.
- **Shared pieces:** `components/common/DataTable.jsx` (sortable columns, pagination footer,
  empty state), `StatCard`, `NoticesFeed`; `components/shadcn/` (Tooltip, Accordion, Progress);
  `components/finance/*`; `components/portal/*`.
- **Shell:** `layouts/DashboardLayout.jsx` with menus from `layouts/navigation.js`.

## Coverage against the brief's list

| Brief item | Status |
|---|---|
| Colour palette, typography, spacing, radius, shadows | Done (tokens above) |
| Buttons, inputs, cards, tables, dropdowns (Menu), modals (Dialog), alerts | Done (kit) |
| Loading, empty and error states | Done (`LoadingBlock`, `Skeleton`, `EmptyState`, `Alert`) |
| Responsive breakpoints | Done; pages checked at 1440 and 390 px |
| Drawers | Only the mobile navigation drawer; no general `Drawer` component |
| Avoid long duplicated class strings | Mostly; card-like wrappers are repeated in ~8 places |

## Gaps and inconsistencies

1. **No generic `Drawer`** (side sheet). Needed only if a design calls for one.
2. **No slider / range input** in the kit. The report-card design page will need one
   (`RangeField`).
3. **Repeated card wrapper classes** (`rounded-card border border-slate-200/80 bg-white
   shadow-card`) appear inline in about 8 files instead of using `Card`.
4. **`DataTable` is client-side only.** Sorting and paging work on the rows it is given.
   Server-driven pages wire their own pagination. Fine at this data size, but relevant to the
   React-admin question (see `docs/react-admin/examination-integration-plan.md`).
5. **Print sheets are outside the system by design** (local unlayered CSS). The report-card
   proposal reduces three such stylesheets to one or two.
6. **Five `react-hooks/exhaustive-deps` lint warnings** remain in older admin pages.

## Recommendation

No new design system work is needed before the report-card and examination tasks. Add
`RangeField` (and `Drawer` only if required) to the existing kit when those tasks need them,
and fold the repeated card wrappers into `Card` opportunistically.
