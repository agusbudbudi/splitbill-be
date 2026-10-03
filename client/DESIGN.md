# Design & Style Guide — Admin Client

Conventions for this React + Tailwind v4 admin dashboard (`client/`). Follow these when building or
redesigning pages so new work matches what already exists instead of drifting into one-off styles.

## Border radius

Scale is defined once in `src/index.css`:

```css
--radius: 14px;
--radius-2xl: calc(var(--radius) + 14px); /* 28px */
--radius-xl: calc(var(--radius) + 6px);   /* 20px */
--radius-lg: calc(var(--radius) - 2px);   /* 12px */
--radius-md: calc(var(--radius) - 4px);   /* 10px */
--radius-sm: calc(var(--radius) - 6px);   /*  8px */
--radius-xs: calc(var(--radius) - 8px);   /*  6px */
```

- **`rounded-xs` is the default radius for almost everything**: buttons, inputs, selects, badges/chips,
  dropdown panels, icon buttons, table thumbnails. Don't reach for `rounded-full` on text chips.
- `rounded-sm` is for larger surfaces: cards, modals.
- `rounded-full` is reserved for genuinely circular things: avatars, status dots, decorative blobs,
  circular icon-only buttons on colored hero backgrounds. Not for pill-shaped text chips.
- To change the whole scale, edit `--radius` only — everything else derives from it.

## Reusable `ui/` components — use these, don't hand-roll

All in `src/components/ui/`, exported from `src/components/ui/index.js`.

### `Badge` — status/tag chips
```jsx
<Badge variant="success" className="text-xs">Aktif</Badge>
```
- Variants: `success` | `warning` | `danger` | `info` | `neutral` (default). Each is a soft `/10` bg +
  matching border + text color.
- Base style: `rounded-xs border text-xs font-semibold`. Never build a chip with a raw `<span>` and
  `bg-x-100 text-x-700 rounded-full` — use `Badge` and pick/extend a variant via `className` (it merges
  with `twMerge`, so e.g. `className="bg-black/40 border-transparent text-white"` cleanly overrides the
  variant's colors for on-image overlays).
- Accepts `...props` (so `style`, `title` etc. pass through) — needed for per-row dynamic colors
  (funnel steps, word clouds) or tooltips.

### `BackButton` — page-header back navigation
```jsx
<BackButton to="/entry-points" />        // navigate(to)
<BackButton onClick={customHandler} />   // custom
<BackButton />                           // navigate(-1)
```
Style: `bg-white border border-border shadow-soft rounded-xs`. Used in every detail page header next to
the title. Don't inline a raw `<button><ArrowLeft/></button>` — use this.

### `Select` — custom dropdown (not native `<select>`)
Same API as before: `<Select value={x} onChange={e => ...}><option value="a">A</option>...</Select>`.
Renders a styled trigger button + a `createPortal`-rendered option list (fixed-positioned off the
trigger's `getBoundingClientRect()`, closes on outside click/Escape). Parses `<option>` children so call
sites never changed when this was rewritten from native to custom.

### `DateInput` — custom date picker (not native `<input type="date">`)
```jsx
<DateInput value={startDate} onChange={e => setStartDate(e.target.value)} min={x} max={y} title="..." />
```
- Emits the same `{ target: { value: "YYYY-MM-DD" } }` shape as a native date input, so it's a drop-in
  replacement anywhere `onChange={(e) => setX(e.target.value)}` was already wired up.
- Custom calendar popover (Monday-start week, "Hari ini" / "Hapus" actions), portal-rendered for the
  same overflow-clipping reason as `Select`.
- **Disables all future dates by default** (today is the implicit max), in addition to any `min`/`max`
  passed in.

### `ResetFiltersButton` — "clear filters" action
```jsx
{hasActiveFilters && <ResetFiltersButton onClick={clearFilters} count={activeFilterCount} />}
```
One style everywhere: `text-xs text-muted-foreground hover:text-destructive` + `X` icon + "Reset"
(optionally "Reset (N)" via `count`). Don't write a bespoke destructive-badge or ghost-button version per
page.

### `StatCard` — KPI tile
```jsx
<StatCard title="..." value={...} icon={Icon} iconColor="text-primary" iconBg="bg-primary/10" />
<StatCard compact title="..." value={...} icon={Icon} iconColor="..." iconBg="..." />
```
- `compact` (boolean): smaller padding/icon/value text, icon **top-aligned** (`items-start`) instead of
  centered. Use `compact` when the stat card sits inline next to a page title instead of in a full grid
  (e.g. a single "Total Keseluruhan" tile).
- Prefer a compact `StatCard` next to the page title over a table-footer "aggregate total" row.

## Page structure patterns

### List page header
```jsx
<div className="space-y-3">
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <div>
      <h1 className="text-xl font-bold text-foreground">Page Title</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Description.</p>
    </div>
    {/* optional: compact StatCard(s) here, right-aligned */}
  </div>
  <Card className="overflow-hidden">...</Card>
</div>
```
- Outer page wrapper: `space-y-3` (not `space-y-6` — that's the old, looser spacing).
- `CardHeader` padding: `px-4` (not `px-6`).

### List page filter bar (inside the table `Card`'s `CardHeader`)
```jsx
<CardHeader className="py-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
  <SearchInput value={...} onChange={...} className="max-w-xs w-full" />
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
    <Select .../>
    <DateInput .../> <span>—</span> <DateInput .../>
    {hasActiveFilters && <ResetFiltersButton onClick={clearFilters} />}
  </div>
</CardHeader>
```
- **Search field is always alone on the far left.** Every other filter control (status selects, date
  range, reset) is grouped in one `div` on the right, pushed there via `justify-between` on the header.
  Don't let filters trail off to the right of search in one long `overflow-x-auto` row — that's the old
  pattern and it also breaks dropdown/calendar popovers (see below).
- `clearFilters`/`resetFilters` must clear **every** active filter (search, selects, dates) — not just
  one of them — and the "has active filters" check must include all of them too.

### Detail page header (`PageHero` component)
```jsx
<PageHero
  onBack={() => navigate(-1)}
  backLabel="Back"
  badges={<>{/* status Badge, "Lihat Halaman Publik" link, etc — right-aligned */}</>}
  title={record.name}
  meta={<>...</>}
  statLabel="Total Tagihan"
  statValue={formatCurrency(total)}
/>
```
- Back button and `badges` share **one top row** (`justify-between`), top-aligned, no extra margin
  pushing the title down.
- `badges` content renders in the **right-hand column**, stacked above `statLabel`/`statValue` — not
  mixed in next to the back button.
- Non-`PageHero` detail pages (plain admin forms) follow the same shape manually: `BackButton` + page
  title on the left, primary Save/Submit CTA on the right, both in one `flex items-center justify-between`
  row. No separate "Batal"/Cancel button — back navigation already covers that.

### Save/Submit CTA — disable when nothing changed
Pattern used on every edit form (`UserLevelDetail`, `EntryPointDetail`, blog editor, etc.):
```jsx
const [form, setForm] = useState(EMPTY_FORM);
const [savedForm, setSavedForm] = useState(EMPTY_FORM); // snapshot of last-saved state
const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

// on load: setForm(loaded); setSavedForm(loaded);
// after a successful save (if the page doesn't navigate away): setSavedForm(form again);

<Button disabled={saving || !isDirty} onClick={handleSave}>Simpan</Button>
```
Don't add a status toggle UI (e.g. a Draft/Published switch) if a Save CTA already sets status directly
on click — that's redundant and confusing; remove one or the other.

### Table rows with a primary clickable link
When a row's primary field (order ID, bucket/activity name, etc.) already navigates to its detail page:
- Style that link `text-primary` **always** (not just on `:hover`) so it visually reads as a link at
  rest, with `hover:underline`.
- Don't also add a trailing "Aksi" column with a "Detail →" button — it's redundant. Remove the column,
  its `<Th>`, and adjust every `colSpan` / `TableSkeleton cols={...}` that assumed it existed.

## Dropdowns, calendars, any floating panel

Any popover/dropdown that lives inside a `Card className="overflow-hidden"` (basically every table
toolbar in this app) **must** be rendered through `createPortal(..., document.body)` with `position:
fixed` coordinates computed from the trigger's `getBoundingClientRect()`. A plain `absolute`-positioned
panel gets clipped invisible by the card's `overflow-hidden`/`overflow-x-auto` ancestors — this was a
real bug (`DateInput`, `Select`). Reposition on `scroll`/`resize` while open; close on outside
`mousedown` and `Escape`. Copy the pattern from `DateInput.jsx` / `Select.jsx` rather than reinventing it.

## Custom form controls must emit native-shaped events

When replacing a native `<input>`/`<select>` with a custom component, emit
`onChange({ target: { name, value } })` matching what the native element would have produced. This keeps
every existing `onChange={(e) => setX(e.target.value)}` and generic `onChange={handleInputChange}` (that
reads `e.target.name`/`e.target.value`) working unchanged — no call-site rewrites needed.

## Icons

- Use `ReceiptText` (not the plain `Receipt` icon) everywhere in split-bill contexts — sidebar nav,
  empty states, table cells. Keep this consistent app-wide, don't mix the two.

## Misc

- `cn(...)` (clsx + tailwind-merge, in `src/lib/utils.js`) is the only way to merge className strings in
  a component — never string-concatenate.
- Before deleting backend logic because an admin-side feature using it was removed, check whether the
  same API route is also consumed by `splitbill-web` / `splitbill-native` — this backend is shared.
  Don't assume "unused in admin" means "unused everywhere."
