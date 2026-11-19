# The UI kit

The components in this folder, plus `DataTable` and `DashboardGreeting` from
`components/common/`. Import kit pieces from `components/ui`:

```jsx
import { Button, Card, PageShell, StatCard, toast } from "../../components/ui";
```

Every colour, size, radius and shadow these use is a token defined in
[`frontend/DESIGN.md`](../../../DESIGN.md). This page says what each component is for
and how to call it; DESIGN.md says why it looks the way it does.

## Before you add a component

Check the index below first. Most hand-rolled markup in this app (seven stat tiles, six
segmented switches, twenty-two empty states) was written because someone did not know
the kit already had the piece, or because it lacked one prop. If something is missing,
add a prop or a component **here**, document it on this page, and follow the rules in
[`DESIGN.md`](../../../DESIGN.md). Do not build it inside a page.

## Which component?

| You need | Use |
|---|---|
| A page container with the standard width and spacing | `PageShell` |
| A page title, description and page actions | `PageHeader` |
| A dashboard's opening line ("Good morning, Sita") | `DashboardGreeting` |
| A white content surface | `Card` (+ `CardHeader`) |
| An action | `Button` |
| An icon-only action, or an icon link in a table row | `IconButton` (`to` for a link) |
| A `<Link>` that looks like a button | `buttonClasses()` |
| A labelled form control with a hint or an error | `Field` + `TextInput` / `SelectInput` / `TextArea` |
| A date | `NepaliDatePicker` (or `DateInput` in `common/FormElements` with react-hook-form) |
| On/off | `Switch` (instant setting) or `Checkbox` (part of a form) |
| One of a few choices in a form, as a list | `Radio` |
| One of a few choices inline: a filter, a view, an attendance mark | `SegmentedControl` |
| Switching between panels of content | `Tabs` |
| A number on a slider | `RangeField` |
| A headline figure, or a row of related figures | `StatCard`, `StatGroup` |
| A small status label | `Badge` |
| A list of records with search and pages | `DataTable` |
| A menu of row or page actions | `Menu` + `MenuItem` |
| A form or detail in a modal | `Dialog` + `DialogActions` |
| "Are you sure?" | `confirmDialog()` |
| "Saved" | `toast.success()` |
| A message inside the page | `Alert` |
| Nothing to show yet | `EmptyState` (`compact` inside a card) |
| Waiting for a region | `LoadingBlock` |
| Waiting for a tile or a line | `Skeleton` |
| A person's photo or initials | `Avatar` |

---

## Layout

### PageShell

The one page container: a single maximum width (`88rem`) and a single vertical rhythm
(`space-y-6`). Wrap every page in it. The outer padding comes from `DashboardLayout`.

| Prop | Default | Notes |
|---|---|---|
| `width` | `"default"` | `"prose"` (`max-w-3xl`) for a page that is mostly reading or one narrow form |
| `className` | | |
| ...rest | | spread onto the `<div>` |

```jsx
<PageShell>
  <PageHeader title="Students" actions={<Button icon={Plus}>Add student</Button>} />
  <DataTable … />
</PageShell>
```

### PageHeader

The page's `h1`, an optional description and the page's actions on the right.

| Prop | Default | Notes |
|---|---|---|
| `title` | | rendered as the `h1` (`text-2xl`) |
| `description` | | string or node, limited to 68 characters per line |
| `actions` | | node; wraps under the title on narrow screens |
| `children` | | rendered after the actions, inside the same row |
| `className` | | |

An `icon` prop is **ignored on purpose**: a decorative tile beside a title adds no
information. Remove it from a page when you next touch that page.

### DashboardGreeting

`components/common/DashboardGreeting.jsx`. The head of every role's dashboard: today's
date, "Good morning/afternoon/evening, &lt;first name&gt;" from the signed-in user, a
subtitle and an aside. It renders the page's `h1`, so do not add a `PageHeader` too.

| Prop | Default | Notes |
|---|---|---|
| `subtitle` | | string or node under the heading |
| `aside` | | node on the right, such as the academic year badge |
| `leading` | | node before the text, such as an `<Avatar size="lg">` |
| `className` | | |

```jsx
<DashboardGreeting
  subtitle={`Here's what's happening at ${user.school.name}.`}
  aside={<Badge tone="brand" icon={CalendarRange}>Academic year {year.name}</Badge>}
/>
```

### Card and CardHeader

`Card` is the **paper** surface: white, a 1px rule, `rounded-xl`, no shadow. Do not nest
a card inside a card; inside paper, use a well (`bg-slate-50`) or a `StatGroup`.

| `Card` prop | Default | Notes |
|---|---|---|
| `as` | `"div"` | element to render |
| `padding` | `"md"` | `"sm"` (p-4), `"md"` (p-5), `"lg"` (p-6), `"none"` for edge-to-edge tables |
| `className`, ...rest | | |

| `CardHeader` prop | Notes |
|---|---|
| `title` | an `h3`, `text-lg` |
| `description` | muted line under it |
| `actions` | node on the right |
| `className` | |

`CardHeader` also ignores `icon`.

```jsx
<Card padding="none" className="overflow-hidden">
  <div className="px-5 pt-5"><CardHeader title="Payments" /></div>
  <table>…</table>
</Card>
```

---

## Actions

### Button

| Prop | Default | Notes |
|---|---|---|
| `variant` | `"primary"` | `primary` (the one main action of a view), `secondary`, `outline`, `ghost` (toolbars, rows), `danger`, `danger-soft` |
| `size` | `"md"` | `xs` 28px, `sm` 32px, `md` 36px, `lg` 44px |
| `icon` | | lucide component before the label |
| `iconRight` | | lucide component after the label (hidden while loading) |
| `loading` | `false` | shows a spinner in place of the icon, disables the button, sets `aria-busy` |
| `type` | `"button"` | pass `"submit"` explicitly in forms |
| `disabled`, `className`, ...rest | | |

States: hover per variant; `focus-visible` 2px brand outline, offset 2px; disabled at 50%
opacity with no pointer events. Weight is always `font-medium`.

`success` and `warning` variants still exist only for the marketing site's WhatsApp
button. Do not use them in the app: a button's colour says how important it is, not what
mood it is in.

Labels are sentence case, verb first, and name the outcome: "Save changes", "Add student".

```jsx
<Button icon={Save} loading={saving} type="submit">Save changes</Button>
```

### IconButton

A square, icon-only button. `label` is required: it becomes `aria-label` and the tooltip
(`title`).

| Prop | Default | Notes |
|---|---|---|
| `icon` | | lucide component |
| `label` | | required |
| `variant` | `"ghost"` | any `Button` variant |
| `size` | `"md"` | `sm` 32px, `md` 36px, `lg` 40px |
| `to` | | renders a router `Link` instead of a `<button>` (for row actions that navigate) |
| `type` | `"button"` | ignored when `to` is set |
| `className`, ...rest | | |

Use `md` in table rows (with the column's `action: true`); keep `sm` for dense toolbars.

```jsx
<IconButton icon={Printer} label={`Print ${t.receiptNumber}`} to={`/finance/receipts/${t.id}?print=1`} />
```

### buttonClasses and controlClasses

`styles.js` exports the class builders, for elements that are not `<button>` or a kit
input: usually a router `Link` that should look like a button.

```jsx
<Link to="/finance/collect" className={buttonClasses()}>Collect fees</Link>
<Link to="/finance/reports" className={buttonClasses({ variant: "secondary", size: "sm" })}>Reports</Link>
```

`buttonClasses({ variant, size, className })` and `controlClasses(invalid, className)`.
Add the icon yourself with `size={16}` and `aria-hidden="true"`.

---

## Forms

### Field

Label, control, and a hint or an error. Put one control inside it and give the control
the same `id` as `htmlFor`.

| Prop | Notes |
|---|---|
| `label` | the `<label>` |
| `htmlFor` | the control's `id` |
| `hint` | muted line under the control, shown when there is no error |
| `error` | replaces the hint; `role="alert"`, in the risk colour |
| `required` | adds a red `*` (hidden from screen readers; also set `required` on the control) |
| `className`, ...rest | |

`Field` does not pass `error` to the control: set the control's `invalid` yourself, and
point it at the message with `aria-describedby` if you need that.

```jsx
<Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
  <TextInput id="phone" invalid={!!errors.phone} {...register("phone")} />
</Field>
```

### TextInput, SelectInput, TextArea

Plain `<input>`, `<select>` and `<textarea>` with the kit's look. All forward `ref`
(react-hook-form's `register` works) and pass everything else through.

| Prop | On | Notes |
|---|---|---|
| `invalid` | all three | risk-coloured border and focus ring, `aria-invalid` |
| `icon` | `TextInput` | lucide component inside the left edge |
| `wrapperClassName` | `TextInput` | the wrapper `div`, only when `icon` is set |
| `className` | all three | on the control itself |

States: resting `slate-300` border (the 3:1 control boundary), hover `slate-400`, focus
brand border and a soft ring, disabled on `slate-50` with muted text. `SelectInput` draws
its own chevron. `TextArea` is at least `min-h-24` and resizes vertically.

### Checkbox and Radio

A native input with a label and an optional description underneath. Both forward `ref`.

| Prop | Notes |
|---|---|
| `id` | ties the `<label>` to the input |
| `label` | |
| `description` | muted line under the label |
| `className`, ...rest | rest goes to the `<input>` (`checked`, `onChange`, `name`, `value`, `disabled`) |

Group `Radio`s in a `<fieldset>` with a `<legend>` and give them the same `name`; the
browser then handles arrow keys and the group semantics. Neither has an error state.

```jsx
<fieldset>
  <legend className="text-sm font-medium text-slate-700">Send to</legend>
  <Radio id="to-all" name="audience" value="all" label="Everyone" checked={a === "all"} onChange={() => setA("all")} />
  <Radio id="to-class" name="audience" value="class" label="One class" checked={a === "class"} onChange={() => setA("class")} />
</fieldset>
```

### Switch

An on/off setting that applies straight away. Controlled.

| Prop | Notes |
|---|---|
| `checked` | boolean |
| `onChange` | called with the next boolean |
| `label`, `description` | shown on the left |
| `id` | links the label to the switch |
| `disabled` | |

It is a `<button role="switch" aria-checked>` with a focus outline. It takes no
`className`.

### RangeField

A slider with an exact-value box beside it. `onChange` receives a number already clamped
to `min`..`max`.

| Prop | Default | Notes |
|---|---|---|
| `id`, `label` | | the label is for the slider; the number box is labelled "&lt;label&gt; value" |
| `value`, `min`, `max` | | |
| `step` | `1` | |
| `unit` | `""` | text after the number box, such as `pt` or `mm` |
| `onChange` | | |
| `error` | | message under the slider, `role="alert"` |
| `className` | | |

### NepaliDatePicker

A date field with a Bikram Sambat calendar. **The value is always an AD date,
`"YYYY-MM-DD"`** (or `""`), which is what the API stores. People read, pick and type the
date in BS, or switch the calendar, language and numerals inside the picker. With
react-hook-form, use `DateInput` from `components/common/FormElements.jsx`, which wraps
this one; never use a native date input.

| Prop | Default | Notes |
|---|---|---|
| `value` | `""` | AD `YYYY-MM-DD` |
| `onChange` | | `(ad, { bs, bsText, adText })`; `ad` is `""` when cleared |
| `onBlur` | | |
| `min`, `max` | | AD dates |
| `isDateDisabled` | | `(ad) => boolean` for days that cannot be chosen |
| `invalid` | `false` | risk border, `aria-invalid` |
| `disabled` | `false` | |
| `clearable` | `true` | shows a "Clear date" button |
| `id`, `name` | | `name` adds a hidden input for plain forms |
| `placeholder` | `"Select a date"` | |
| `align` | `"start"` | popover alignment |
| `aria-label`, `aria-describedby` | | the trigger announces "&lt;label&gt;: &lt;date or 'no date'&gt;" |
| `className` | | on the wrapper; set the width here (`w-full`) |

Keyboard on the day grid: arrows move by day and week, Home and End go to the start and
end of the week, PageUp and PageDown change month (with Shift, the year), Enter or Space
chooses, Esc closes. Each day is labelled with both dates; today is `aria-current="date"`.
A typed date that cannot be read shows an error with `role="alert"`.

```jsx
<NepaliDatePicker aria-label="From date" value={from} max={todayAd()} onChange={(ad) => setFrom(ad)} className="w-full" />
```

---

## Choices

### SegmentedControl and Tabs: which one?

They look alike on purpose. **`Tabs` switch panels of content; `SegmentedControl` sets a
value.** A status filter, a view switch or an attendance mark is a `SegmentedControl`.
The Ledger and Reversal requests sections of Transactions are `Tabs`.

### SegmentedControl

Controlled; options are `[{ value, label, icon?, tone? }]`.

| Prop | Default | Notes |
|---|---|---|
| `options` | | `tone` is `"default"`, `"ok"`, `"warn"` or `"risk"`: the colour of that option when selected |
| `value`, `onChange` | | `onChange(value)` |
| `size` | `"md"` | `"sm"` or `"md"` |
| `label` | | the group's `aria-label` |
| `className` | | |

It is a `radiogroup` of `radio` buttons with a roving tab stop: Tab reaches the selected
option only, and every arrow key moves **and selects**. That includes ↑ and ↓, so do not
put it where ↑ and ↓ already mean "next row", as in Marks Entry.

Use a status tone only when the choice *is* a status. In the attendance register only
the exceptions are coloured: absent `risk` and late `warn`, while present stays
`default`.

```jsx
<SegmentedControl label="Fee status" value={status} onChange={setStatus}
  options={[{ value: "", label: "All" }, { value: "OVERDUE", label: "Overdue" }]} />
```

### Tabs

Controlled; tabs are `[{ value, label, icon?, count? }]`.

| Prop | Default | Notes |
|---|---|---|
| `tabs` | | `count` shows a small number pill |
| `value`, `onChange` | | `onChange(value)` |
| `size` | `"md"` | `"sm"` or `"md"` |
| `className` | | |

Renders `role="tablist"` and `role="tab"` with `aria-selected` and a focus outline. It
does not render the panels: show them yourself from `value`.

---

## Figures

### StatCard

One labelled figure: the stat tile. The number gets the boldest type on the page and
everything around it stays quiet.

| Prop | Default | Notes |
|---|---|---|
| `label` | | what the number is |
| `value` | | the figure; `null` shows "—" |
| `sub` | | one line of context; may be a node (an overdue amount in `text-risk`) |
| `icon` | | decorative, `slate-300`, before the label; optional |
| `tone` | `"ink"` | `"ok"`, `"warn"`, `"risk"` colour **the value only**, and only when the figure is a status |
| `size` | `"hero"` (`"md"` in a group) | `hero` is `text-display` and steps down by tile width; `md` is `text-2xl`; `sm` is `text-lg` |
| `surface` | `"paper"` (`"plain"` in a group) | `"plain"` when it sits inside another surface |
| `to` | | makes the tile a router link (hover, focus outline) |
| `progress` | | 0–100; a thin bar under the value, `role="progressbar"` |
| `progressTone` | `tone` | colour of the bar |
| `progressLabel` | "&lt;label&gt;: N%" | the bar's `aria-label` |
| `loading` | `false` | a `Skeleton` the size of the value; never pass `"…"` |
| `children` | | replaces the value, for content that is not a number ("All paid") |
| `className`, ...rest | | |

A hero tile assumes it is at least 11rem wide inside; the sizing rule lives in
`statValue.js` and is unit-tested. In a denser grid, use a `StatGroup`.

```jsx
<StatCard label="Collected this year" value={formatCurrency(k.collected)}
  progress={k.collectionRate} sub={`${k.collectionRate}% of the expected total`} />
```

### StatGroup

A row of related figures, separated by ruled lines like a ledger's totals line rather
than boxed one by one. Its `StatCard` children default to `surface="plain"` and to the
group's `size`.

| Prop | Default | Notes |
|---|---|---|
| `columns` | `4` | 2–5; collapses to two (or one) columns on narrow screens |
| `surface` | `"paper"` | `"well"`: a tinted strip inside a card (add the border on the side that touches the card); `"plain"`: rules only |
| `size` | `"md"` | passed to the children |
| `className`, ...rest | | |

```jsx
<StatGroup columns={4}>
  <StatCard label="Total fees" value={formatCurrency(t.amount)} />
  <StatCard label="Balance" value={formatCurrency(t.balance)} tone={t.overdue > 0 ? "risk" : "ink"} />
</StatGroup>
```

### Badge

A small status pill.

| Prop | Default | Notes |
|---|---|---|
| `tone` | `"neutral"` | `neutral`, `brand`, `success`, `warning`, `danger`, `info` |
| `dot` | `false` | a coloured dot before the text |
| `icon` | | lucide component before the text |
| `className` | | |

The status tones use the ok, warn, risk and info tokens; each clears 4.5:1 on its own
surface. Colour is never the only signal: the text says the status too.

```jsx
<Badge tone="success" dot>Paid</Badge>
```

---

## Data

### DataTable

`components/common/DataTable.jsx`. A table styled as a register: rules between rows,
a sentence-case header, no shadow. It includes optional search, toolbar, empty state and
pagination.

| Prop | Default | Notes |
|---|---|---|
| `columns` | | see the column table below |
| `data` | `[]` | |
| `loading` | `false` | five skeleton rows |
| `rowKey` | `row.id ?? index` | |
| `pagination` | `null` | `{ page, limit, total, totalPages }`; shows "Showing a–b of n" and previous/next |
| `onPageChange` | `null` | `(page)` |
| `searchValue`, `onSearchChange` | `""`, `null` | a search box appears when `onSearchChange` is set |
| `searchPlaceholder` | `"Search…"` | |
| `toolbar` | `null` | extra filters beside the search; the toolbar wraps |
| `actions` | `null` | buttons on the right of the toolbar |
| `emptyMessage`, `emptyDescription`, `emptyIcon` | `"No records found"`, —, `Inbox` | the empty state |
| `bare` | `false` | no card border, for a table already inside a card |
| `className` | | |

| Column key | Notes |
|---|---|
| `header` | text or node (use `<span className="sr-only">Actions</span>` for an action column) |
| `accessor` or `render(row)` | |
| `numeric` | right-aligned, tabular figures |
| `action` | 4px vertical padding, so a 36px button keeps the row at about 44px |
| `width`, `className`, `headerClassName` | |

Keep the semantic column classes (`col-roll`, `col-name`, `col-marks`, `col-remarks`)
where pages use them: the browser tests select by them.

```jsx
const columns = [
  { header: "Student", className: "col-name", render: (r) => r.name },
  { header: "Balance", numeric: true, render: (r) => formatCurrency(r.balance) },
  { header: <span className="sr-only">Actions</span>, action: true,
    render: (r) => <IconButton icon={Pencil} label={`Edit ${r.name}`} onClick={() => edit(r)} /> },
];
<DataTable columns={columns} data={rows} loading={loading} onSearchChange={setSearch} searchValue={search} />
```

### Avatar

A photo, or coloured initials when there is none or it fails to load. The tint is fixed
per name, so a person always gets the same colour; these tints tell people apart and are
not status colours.

| Prop | Default | Notes |
|---|---|---|
| `src` | | resolved through `resolveAssetUrl` |
| `name` | `""` | used for the initials, the tint and the image's `alt` |
| `size` | `"md"` | `xs` 24px, `sm` 32px, `md` 40px, `lg` 48px, `xl` 64px |
| `className` | | |

---

## Feedback

### EmptyState

What this place holds, why it is empty and how to start.

| Prop | Default | Notes |
|---|---|---|
| `icon` | | lucide component in a muted circle |
| `title` | | an `h3` |
| `description` | | |
| `action` | | node, usually a `Button` |
| `compact` | `false` | use inside a card or panel; the default is for a whole page |
| `className` | | |

```jsx
<EmptyState compact icon={FilePlus2} title="No fees for this year yet"
  description="Generate them from the class's fee structures."
  action={<Button icon={FilePlus2} onClick={generate}>Generate fees</Button>} />
```

### Alert

A message inside the page.

| Prop | Default | Notes |
|---|---|---|
| `tone` | `"info"` | `info`, `success`, `warning`, `danger` |
| `title` | | bold first line |
| `children` | | the message |
| `action` | | node on the right |
| `className` | | |

`danger` renders `role="alert"`; the others `role="status"`.

### Skeleton, Spinner and LoadingBlock

One loading pattern per shape:

- **`LoadingBlock`** for a whole region or page: a centred spinner and optional text.
  Props: `text` (default `"Loading…"`, pass `""` for none), `className`.
- **`Skeleton`** for a tile or a line: a grey bar sized by `className`, hidden from screen
  readers. Match the real content's height.
- **`DataTable`'s own skeleton rows** for tables (`loading`).
- **`Spinner`** inside other components. Props: `size` (default 16), `className`,
  `label`. With a `label` it is `role="status"`; without one it is hidden from screen
  readers. It takes the text colour.

Never show `"…"` as a value, and never dim a region with `opacity-60` while it reloads.

### Toasts and confirmDialog

Callable from anywhere, no hook needed. `<Toaster />` is mounted once in `App.jsx`.

```jsx
toast.success("Payment recorded");
toast.error(err.response?.data?.message || "Could not save the payment. Check the amount and try again.");

if (await confirmDialog({ title: "Delete this exam?", message: "Marks entered for it are deleted too.", tone: "danger" })) {
  …
}
```

| `toast.*(message, opts)` | Notes |
|---|---|
| tones | `success` (3.5s), `info` (4s), `warning` (5s), `error` (6s) |
| `opts.title` | bold first line |
| `opts.duration` | ms; `0` keeps it until dismissed |
| `opts.id` | replaces an existing toast with the same id |
| returns | the id, for `dismissToast(id)` |

Error toasts are `role="alert"`; the others `role="status"`, in a polite live region.

| `confirmDialog(options)` | Default | Notes |
|---|---|---|
| `title` | "Are you sure?" | |
| `message` | | line breaks are kept |
| `confirmLabel` | "Delete" (danger) or "Confirm" | name the outcome: "Delete exam" |
| `cancelLabel` | "Cancel" | |
| `tone` | | `"danger"` makes the confirm button `danger` |
| returns | | a promise of `true` or `false` |

The confirm button has focus when the dialog opens. A second `confirmDialog` call cancels
the first (it resolves `false`).

### Dialog and DialogActions

A modal: portalled to `<body>`, Esc closes it, focus moves in and is trapped, and returns
to where it was afterwards; page scroll is locked. On a phone it is a bottom sheet.
Clicking the backdrop does **not** close it, so a half-filled form is never lost.

| Prop | Default | Notes |
|---|---|---|
| `open`, `onClose` | | |
| `title` | | an `h2`, wired to `aria-labelledby` |
| `description` | | wired to `aria-describedby` |
| `size` | `"md"` | `sm`, `md`, `lg`, `xl`, `full` |
| `footer` | | a footer row for buttons |
| `hideClose` | `false` | hides the × button |
| `className`, `children` | | |

The first focusable element gets focus; mark a different one with `data-autofocus`. For a
form inside the body, end it with **`DialogActions`** (props `children`, `className`),
which reaches the dialog's edges and looks like the footer, so the submit button stays
inside the `<form>`.

```jsx
<Dialog open={open} onClose={close} title="Enrol student">
  <form onSubmit={handleSubmit(save)}>
    …
    <DialogActions>
      <Button variant="secondary" onClick={close}>Cancel</Button>
      <Button type="submit" loading={saving}>Enrol student</Button>
    </DialogActions>
  </form>
</Dialog>
```

### Menu

A small dropdown, portalled to `<body>` with fixed positioning, so tables and cards with
`overflow: hidden` never clip it. It flips above the trigger when there is no room below.
Clicking outside, Esc, scrolling or resizing closes it, and so does choosing an item.

| `Menu` prop | Default | Notes |
|---|---|---|
| `trigger` | | render function receiving `{ open, toggle, "aria-expanded", "aria-haspopup" }`; spread them onto your button |
| `align` | `"end"` | `"start"` or `"end"` |
| `children` | | `MenuItem`, `MenuLabel`, `MenuSeparator` |
| `className` | | on the panel |

| `MenuItem` prop | Notes |
|---|---|
| `icon` | lucide component |
| `onClick` | |
| `danger` | risk colour, for destructive items (confirm them) |
| `as` | another element, such as `Link` with `to` |
| `href` | renders an `<a>` that **opens in a new tab** |
| ...rest | |

```jsx
<Menu trigger={({ toggle, ...aria }) => <IconButton icon={MoreHorizontal} label={`Actions for ${r.name}`} onClick={toggle} {...aria} />}>
  <MenuItem icon={ReceiptText} as={Link} to={`/finance/receipts/${r.id}`}>View receipt</MenuItem>
  <MenuSeparator />
  <MenuItem icon={Undo2} danger onClick={() => reverse(r)}>Reverse payment</MenuItem>
</Menu>
```
