# UI/UX redesign on Tailwind CSS 4 — all roles

## Context

The frontend (React 19 + Vite 7) is styled by one 2,351-line global `src/index.css`,
15 page-level `<style>` blocks and ~200 inline `style={{}}`s. It looks dated and is
inconsistent:
- several pages redefine `.badge`, `.filter-card` and `.form-group` globally, so the
  look depends on which page mounted first;
- there is no mobile layout (the sidebar never collapses into a drawer);
- feedback is `alert()` / `confirm()`;
- dashboards are bare number cards, and the accountant has none;
- quick-action links are `<a href>`, which reloads the app.

The owner wants a quality SaaS look across all roles, built on the latest Tailwind
(4.3.5; `@tailwindcss/vite` supports Vite 7). Decisions taken:
- **phased waves**, each tested in the browser and committed separately;
- **light theme only**;
- **charts in a later wave**, backed by new summary endpoints;
- **brand colour set per school** in School Settings.

Design direction:
- Modern school/SaaS dashboards: role-tailored home pages, a minimal but data-dense UI,
  accessible contrast.
- Visual language: neutral slate surfaces, one brand accent, 8-px spacing, rounded-xl
  cards with hairline borders, Inter, quiet shadows, clear empty and loading states.
- In the style of Linear / Vercel / Stripe dashboards.

This replaces CLAUDE.md §9's "vanilla CSS only" rule. The print exception stays: the
report-card components keep their own local `<style>` blocks.

## Architecture (Wave 1 sets this up; later waves follow it)

**Tailwind setup**
- Add `tailwindcss@^4.3`, `@tailwindcss/vite`, `clsx`, `tailwind-merge`. Add the
  `tailwindcss()` plugin in `frontend/vite.config.js`.
- New entry `src/styles/app.css`:
  - `@layer theme, base, legacy, components, utilities;`
  - `@import "tailwindcss";`
  - `@theme` tokens: `--font-sans` Inter, the slate neutrals, and a brand palette
    `--color-brand-50…950` that points at runtime variables `var(--brand-50)…`
    (via `@theme inline`).
- The old `index.css` is imported **into `@layer legacy`**. Tailwind utilities then
  override legacy rules, while unconverted pages keep working.
- Each wave deletes the legacy sections its pages no longer use. Wave 6 deletes
  `index.css` and the dead `App.css`.
- Load Inter once, from `index.html` (it is currently loaded twice).

**Print safety**
- The report-card components keep their unlayered local `<style>` blocks:
  `NepalReportCard`, `BulkReportCardPrint`, `reportcard/PerformanceSheet`,
  `GradeLegend`, `ReportSheet`.
- Unlayered CSS beats Tailwind's preflight. Add a small scoped reset for what they never
  set themselves: `img` / `svg` display, heading sizes, line-height. Scope it under
  `.report-card-a4, .report-a4, .perf-sheet, .rc-grade-legend`.
- They print exactly as today, including the Inter text inside the NEB/bulk sheets.
  Changing those fonts is out of scope.

**Dormant utility names**
These class names already sit in JSX but do nothing today, because nothing defines
them: `flex` ×28, `gap-2`, `grid-cols-2`, `hidden`, `table`, `text-sm`, …
- Tailwind will make them live, in about 14 files: `SubjectImportModal`,
  `ClassSubjects`, `Exams`, `FeePayments`, `FeeStructures`, `FeeTypes`, `Notices`,
  `Promotions`, `Students`, `Subjects`, `Teachers`, `parent/Fees`, `student/Fees`,
  `Assignments`.
- Wave 1 reviews each one (grep list) so nothing shifts unexpectedly.

**Class helper**
- `src/lib/cn.js`: `cn(...)` = `twMerge(clsx(...))`.

**School brand colour (per school)**
- Backend:
  - `School.brandColor String? @map("brand_color") @db.VarChar(7)`, plus a migration.
  - Accept and validate it as `#rrggbb` in `school.controller.js` /
    `school.validators.js` (`PUT /school`, admin only).
  - Return it in the login / `me` `user.school` and in `GET /public/school/:code`, so the
    login page is branded too.
- Frontend:
  - `src/lib/brand.js` `applyBrand(hex)` generates 50–950 shades, in OKLCH from the base
    hue, and sets them on `<html>`.
  - It also picks white or dark text on brand from contrast (WCAG AA). It falls back to
    a darker shade when the chosen colour is too light for text on white.
  - Called from `AuthContext` when the user / school loads, and from Login.
  - The default is today's indigo `#6366f1`.
- Printed report cards ignore the brand colour (black and white).

**Shared kit: `src/components/ui/`**

Tailwind only; no Radix or shadcn dependency:
- `Button` / `IconButton`: primary, secondary, outline, ghost, danger; sm, md; loading.
- `Input`, `Select`, `Textarea`, `Checkbox`, `Switch`, `Field` (label, hint, error).
- `Card` (+ header and body), `Badge` (tones), `PageHeader` (title, description,
  breadcrumbs, actions), `Tabs`, `EmptyState`, `Skeleton`, `Spinner`, `Avatar`,
  `DropdownMenu`.
- `Toast` plus a promise-based `confirm()` dialog. `PermissionNotice` becomes a toast.
  Pages move off `alert()` / `confirm()` as they are converted.

**Keep the existing component APIs, rebuild their insides.** This is what lets the
whole app change look in Wave 1:
- `common/FormElements` (Input, Select, Textarea, Button, FormRow, FileUpload; also fix
  FileUpload's hardcoded `id`);
- `common/DataTable` (same `columns` / `pagination` / `search` / `actions` props; adds a
  sticky header, row hover, skeleton loading, empty state, page-size info);
- `common/Modal` (same props; adds a focus trap, Esc to close, and a mobile full-screen
  sheet);
- `common/StatCard`, `common/LoadingSpinner`, `auth/ProtectedRoute` loading screen.

**App shell: rewrite `src/layouts/DashboardLayout.jsx`**
- **Sidebar:** light, with the school logo and name. Role navigation is grouped into
  sections:
  - Admin: Overview · Academics · People · Exams & Results · Finance · Communication ·
    Settings.
  - Other roles get short flat lists.
  - Active state in the brand colour; collapsible to icons.
  - Below `lg`, an off-canvas drawer with an overlay and focus handling.
- **Top bar:**
  - breadcrumbs from a route-title map, replacing "last path segment";
  - a current academic year chip;
  - the school's social links in the user menu;
  - a user menu: name, roles, logout.
- Keep the `PermissionNotice` mount and `<Outlet>` transitions (framer-motion stays,
  restrained).
- Redesign `Login.jsx` as a split screen: brand panel with the school banner or logo,
  and the form.
- Redesign the `Unauthorized` and `NotFound` pages in `App.jsx`.
- Replace `<a href>` with `<Link>`, including the dashboards' quick actions and the dead
  `/admin/academic` link.

## Waves

Each wave ends green on the verification below and is committed separately.

1. **Foundation**
   - Tailwind, tokens, legacy layer and print reset.
   - Brand colour: backend, migration, `applyBrand`, and the School Settings colour
     picker with presets, live preview and "reset to default".
   - The `ui/` kit, rebuilt shared components, new shell, Login and error pages.
   - Every page already wears the new chrome, controls and tables.
2. **Admin:** all 18 `/admin/*` pages.
   - Each page uses `PageHeader`, cards, filter bars, tables, forms and toasts.
   - Drop its `<style>` block and inline styles, and remove the matching legacy CSS.
   - Includes SchoolSettings and its GradeScale / ReportCardLayout cards, the
     ReportCards page chrome and WorkingDaysEditor, Notices composer, Exams, Promotions
     and Students (incl. the `readOnly` directory).
3. **Teacher + exam officer**
   - **MarksEntry:** spreadsheet-like grid, sticky header and first column, keyboard
     up/down/Enter navigation, a per-row error state, a save bar.
   - **Attendance:** P / A / L / E chips, "mark all present", counts.
   - **Assignments**, **MyStudents** (class cards), **Dashboard**.
4. **Student + parent + accountant**
   - **Student and parent:** mobile-first dashboards, results, the report-card *page
     chrome* only (the sheet is untouched), fees, attendance, assignments,
     notices / NoticesFeed. Parent child switcher as a segmented control.
   - **Accountant:** a real `/accountant/dashboard` page (cards from existing fee APIs),
     instead of reusing FeePayments.
5. **Charts**
   - Add `recharts` and role-guarded, school- and year-scoped summary endpoints in a
     new `dashboard.controller.js` / `dashboard.routes.js`:
     - `GET /dashboard/admin`: enrolment by class, attendance rate (last 30 school
       days), fee collected vs due by month, grade distribution of the latest
       published exam.
     - `GET /dashboard/accountant`: collection trend, outstanding by class.
     - `GET /dashboard/teacher`: today's attendance for their sections, pending marks
       entry.
   - Pure aggregation helpers in `utils/` with Jest tests; chart cards on the three
     dashboards.
6. **Cleanup**
   - Delete `index.css` / `App.css` and any leftover `<style>` blocks outside the print
     components.
   - Extract the duplicated `resolveAssetUrl` copies to `utils/assets.js`.
   - Rewrite CLAUDE.md §9: Tailwind rules, `ui/` kit, `cn()`, tokens, the brand colour,
     the print exception. Update STATUS.md and SETUP (migration count).

## Rules for converted code

- Tailwind utilities in JSX; tokens only (`bg-brand-600`, `text-slate-600`), no
  hard-coded hex.
- Shared patterns become `ui/` components, not `@apply` soup.
- No new inline `style={{}}` except truly dynamic values (e.g. chart widths).
- No academic inference in the UI (invariant 9); RBAC is unchanged.
- Accessibility:
  - visible `focus-visible` rings, labels on every control, icon buttons with
    `aria-label`;
  - AA contrast (`applyBrand` guards the brand);
  - tables keep semantic `<th>` and classes like `.col-roll`.

## Verification (every wave)

- `cd frontend && npm run build`; eslint on the changed files; `cd backend && npm test`.
- Browser sweep (scratchpad `uisweep.mjs`, headless Chrome): all 44 pages × 7 roles,
  super admin included. Expect 0 console errors and 0 failed API calls.
- Screenshots of every converted page at 1440 px and 390 px, reviewed for layout,
  overflow and the mobile drawer.
- Print regression: re-run the scratchpad print flows (single, bulk, student, parent,
  Performance Report).
  - Single card, student and parent prints stay at 1 page; bulk stays at N pages.
  - Compare rendered PNGs with today's.
- **Brand colour:** set a colour in School Settings. Check:
  - shell, buttons and login change;
  - a very light colour falls back to readable text;
  - reset to default works;
  - the API rejects a non-hex value.
- **Wave 5:** API tests per endpoint — role access 403/200, school scoping, numbers
  cross-checked against the database.
- The existing role probes (`rbac-api.mjs`, `sa-api.mjs`) still pass.

## Critical files

- **New:** `frontend/src/styles/app.css`, `src/lib/cn.js`, `src/lib/brand.js`,
  `src/components/ui/*`, and a migration `…_school_brand_color`.
- **Rewritten:** `vite.config.js`, `main.jsx`, `index.html`, `layouts/DashboardLayout.jsx`,
  `pages/Login.jsx`, `App.jsx` (error pages), and in `components/common/`:
  `FormElements.jsx`, `DataTable.jsx`, `Modal.jsx`, `StatCard.jsx`, `LoadingSpinner.jsx`,
  `PermissionNotice.jsx`, `NoticesFeed.jsx`.
- **Every page** under `src/pages/**`, wave by wave.
- **Backend:** `schema.prisma`, `school.controller.js`, `school.validators.js`, the
  public school route, `auth.controller.js` (school in the payload), plus
  `dashboard.*` (wave 5).
- **Untouched (print):** `NepalReportCard.jsx`, `BulkReportCardPrint.jsx`, and
  `reportcard/PerformanceSheet.jsx`, `ReportSheet.jsx`, `GradeLegend.jsx`,
  `usePrintIsolation.js`. Their surrounding page chrome is converted; the sheets
  are not.

## Outcome (2026-11-08)

Waves 1–3 shipped as planned. Wave 4 was done as Phases 4–7 of
`plans/finance-and-portals.md`. Wave 5 shipped only the finance dashboard charts (Phase 5);
admin and teacher charts are not built. Wave 6 was done in that plan's Phase 8: the legacy
stylesheets are deleted and verified by a computed-style diff (details there).
