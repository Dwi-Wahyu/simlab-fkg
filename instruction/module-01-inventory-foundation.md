# MODULE 1 — INVENTORY FOUNDATION (Schema + Roles + Page Split)

Status: fresh DB, seed data will be regenerated. Prioritize correctness over
backward-compat migrations — but DO NOT delete/rename any table or route that
isn't explicitly listed below.

Read `contexts/PROJECT_CONTEXT.md` and `src/lib/server/db/schema.ts` first.

---

## 1. SCHEMA CHANGES (`src/lib/server/db/schema.ts`)

### 1.1 New table: `equipmentCategory`

Groups item variants under one family (e.g. "Gunting" → "Gunting Bengkok",
"Gunting Lurus", "Gunting Tang"). Applies to `item`, not `equipment` (it
categorizes the catalog entry, not the physical instance), so it works for
both ASSET and CONSUMABLE if needed later.

```ts
export const equipmentCategory = mysqlTable('equipment_category', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull().unique(), // "Gunting"
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const equipmentCategoryRelations = relations(equipmentCategory, ({ many }) => ({
	items: many(item)
}));
```

Add to `item` table:

```ts
categoryId: varchar('category_id', { length: 36 }).references(() => equipmentCategory.id),
```

Add to `itemRelations`:

```ts
category: one(equipmentCategory, {
	fields: [item.categoryId],
	references: [equipmentCategory.id]
}),
```

`item.name` continues to be the specific variant name ("Gunting Bengkok").
`categoryId` is nullable — not every item needs a category.

### 1.2 Simplify equipment condition

Change in `equipment` table:

```ts
condition: mysqlEnum('condition', ['BAIK', 'RUSAK']).default('BAIK').notNull(),
```

Change in `lendingItem` table (same enum, used for return condition):

```ts
returnStatus: mysqlEnum('return_status', ['BAIK', 'RUSAK']),
```

### 1.3 Add storage location to equipment

```ts
storageLocation: varchar('storage_location', { length: 255 }),
```

Add this column to the `equipment` table definition (simple text input, no
FK — matches the ask: "add Lokasi penyimpanan for equipment simply use
input"). Note: `admin/inventaris/tambah/+page.server.ts` already reads
`formData.get('location')` but never persists it — this column finally gives
it somewhere to go.

### 1.4 Brand + variant for BHP, and consistent variant for Alat

`brand` currently only exists on `equipment` (ASSET instances). BHP
(CONSUMABLE) has nowhere to record it, which matters because the same
`item` name legitimately has multiple brand batches with different
qty/condition (e.g. "Gunting jaringan" → Meyden / Arugamed / Yamaco / camed,
each its own count). **Do not put brand on `item`** — that would force
duplicate item names (one row per brand) and defeat the point of `item`
being the unique catalog entry. Brand belongs on the per-batch tables.

There is also a second, orthogonal axis: **variant** (called "TIPE" in the
lab's own spreadsheets) — a sub-spec of the _same_ item+brand that still
shares one name, e.g. "Root elevator (cryer)" brand Schezer → variant
"kanan" / "kiri"; "Ecosin" brand X → variant "isi 50 ampul" / "isi 40
ampul". This is **not** the same concept as `equipmentCategory` (§1.1,
which groups genuinely different item names like "Gunting Bengkok" vs
"Gunting Lurus"). A batch is uniquely identified by `(item, brand,
variant)`.

Add to `equipment` table:

```ts
variant: varchar('variant', { length: 255 }), // e.g. "kanan", "isi 50 ampul"
```

(`brand` already exists on `equipment` — no change needed there.)

Add to `stock` table:

```ts
brand: varchar('brand', { length: 100 }),
variant: varchar('variant', { length: 255 }),
laboratoriumId: varchar('laboratorium_id', { length: 36 }).references(() => laboratorium.id),
```

`laboratoriumId` is explained in §1.5 (gudang removal). Update the unique
index to include all three new columns:

```ts
uniqueIndex('stock_unique_idx').on(table.itemId, table.laboratoriumId, table.brand, table.variant);
```

Leave the old `warehouseId` column and its relation in place (nullable,
unused going forward) — do not drop it.

### 1.5 Remove gudang (warehouse) from the input flow — keep the schema

Equipment/stock will now be recorded directly against a **laboratorium**,
not a warehouse, since that's how they're physically stored. Both tables
already have (or now have, per §1.4) a `laboratoriumId` column, so:

- **Do not** delete `warehouse` table, `equipment.warehouseId`, or
  `stock.warehouseId` — a future gudang/central-warehouse management
  feature may still need them.
- In the Alat/BHP create & edit forms (§3), remove the warehouse
  Select entirely and stop writing to `warehouseId` (leave it `null` on
  insert). Make `laboratoriumId` the required field instead.
- Update `admin/inventaris/tambah/+page.server.ts`'s "get or create
  default warehouse" logic — this whole block becomes unnecessary once
  forms target lab directly; when splitting into alat/bhp actions (§3.1),
  drop it and insert `laboratoriumId` from the form instead of
  `toWarehouseId`/`warehouseId` wherever it was previously required. Movement
  records (`movement.toWarehouseId`) can stay `null` for now since
  `movement.laboratoriumId` already exists and is the field that matters.
- Any place that lists/filters equipment or stock **by warehouse** (check
  `admin/gudang/**` routes) should keep working as-is off existing data —
  just don't expose the warehouse picker in new/edit forms going forward.

### 1.6 Add BOTOL to base unit

```ts
baseUnit: mysqlEnum('base_unit', ['PCS', 'BOX', 'METER', 'ROLL', 'UNIT', 'BOTOL']).notNull(),
```

`BOTOL` is only meant for BHP (Consumable). Do not enforce this at the DB
level — restrict it at the UI level (see §3.2: the Alat form's unit Select
should not offer `BOTOL`; the BHP form's should).

Add to `stockRelations` (optional convenience relation):

```ts
laboratorium: one(laboratorium, {
	fields: [stock.laboratoriumId],
	references: [laboratorium.id]
}),
```

### 1.7 Regenerate migration

After editing schema.ts:

```bash
bun run db:generate
bun run db:push
```

Since this is a fresh DB, no manual data-migration script is needed. Just
make sure the seeders (Module 2 onward) use the new enum values.

---

## 2. ROLE CHANGES

### 2.1 Add `laboran` role

`src/lib/server/auth.roles.ts` — add a new role restricted to
inventory-only CRUD (no member/user management):

```ts
export const laboran = accessControl.newRole({
	inventory: ['create', 'update', 'delete', 'view']
});
```

`src/lib/server/auth.ts` — import `laboran` and add it to **both** the
`admin({ roles: {...} })` block and the `organization({ roles: {...} })`
block (mirror exactly how `teknisi` is wired in — same two spots).

`src/lib/server/db/seeds/index.ts` and `src/lib/server/db/seeds/users.ts` —
import `laboran` from `../../auth.roles`, add it to `allAuthRoles`, and seed
at least 1-2 `laboran` users (role slug: `'laboran'`).

**Important:** just like `kepalaLab`, a `laboran` user must get a
`laboratoriumMember` row (`{ userId, laboratoriumId, role: 'laboran' }`)
pointing at the lab they belong to. `customSession` in `auth.ts` already
generically resolves `locals.user.laboratorium` from the user's first
`laboratoriumMember` row regardless of role — no changes to `auth.ts` are
needed for this to work. This applies both to the seeder and to whatever
admin UI creates users under `admin/users/[role_slug]/tambah` — make sure
the `laboran` creation form requires picking a laboratorium and inserts the
membership row, the same way it already must for `kepalaLab`.

### 2.2 Route/permission guards

Laboran should only be able to access:

- `/admin/inventaris/**` (alat + bhp, both list/detail/create/edit)
- `/admin/inventaris/kategori` (new equipmentCategory CRUD, §3.3)

Find wherever route access is gated by role (check `hooks.server.ts` and
individual `+page.server.ts` / `+layout.server.ts` guards under
`src/routes/admin/`) and add `laboran` to the allow-list for inventory
routes only. Do not give it access to peminjaman, penilaian, pemeliharaan,
users, laboratorium, etc.

### 2.3 Sidebar

`src/lib/components/Sidebar.svelte` — add a nav entry for `laboran` showing
only Alat + BHP + Kategori links.

### 2.4 "PJ Mata Kuliah" label rename (display-only)

**Do not rename the `koordinator` role slug/key.** It stays `'koordinator'`
in the DB, in `auth.roles.ts`, in every `role === 'koordinator'` check, and
in seed data. Only change what's rendered to the user:

- `src/lib/components/Sidebar.svelte` — label text
- `src/lib/types/dashboard.ts` — any display label/title string
- `src/lib/components/dashboard/KoordinatorDashboard.svelte` — heading text
  (keep the filename/component name as-is, just change visible copy)
- `src/routes/admin/users/+page.svelte` — role label in filters/badges
- `src/routes/admin/users/[role_slug]/**` — wherever the role is rendered
  as a heading/breadcrumb (e.g. "Tambah Koordinator" → "Tambah PJ Mata
  Kuliah"), while the `[role_slug]` URL param itself stays `koordinator`
- Any other Indonesian-facing label found via `grep -rli "koordinator" src`
  that is user-visible text (not a code identifier)

A good sanity check when done: `grep -rn "role === 'koordinator'"` and
`grep -rn "role, 'koordinator'"` should return the exact same set of
matches as before this change (i.e. logic untouched, only strings shown to
the user changed).

---

## 3. SEPARATE ALAT / BHP INPUT PAGES

Currently `src/routes/admin/inventaris/tambah/+page.svelte` is one form
with a `type` Select toggling between ASSET and CONSUMABLE fields, and
`src/routes/admin/inventaris/[id]/edit/+page.svelte` is its shared edit
counterpart. Split both.

### 3.1 New routes

- `src/routes/admin/inventaris/alat/tambah/+page.svelte` (+ `.server.ts`)
- `src/routes/admin/inventaris/alat/[id]/edit/+page.svelte` (+ `.server.ts`)
- `src/routes/admin/inventaris/bhp/tambah/+page.svelte` (+ `.server.ts`)
- `src/routes/admin/inventaris/bhp/[id]/edit/+page.svelte` (+ `.server.ts`)

Split the existing `tambah/+page.server.ts` action logic (see the file for
reference — it's one transaction with an `if (type === 'ASSET')` branch and
an `else if (type === 'CONSUMABLE')` branch): the Alat action always does
the ASSET branch, the BHP action always does the CONSUMABLE branch. Remove
the `type` Select entirely from both forms — it's now implicit by route.

Same split for the edit action currently in
`src/routes/admin/inventaris/[id]/edit/+page.server.ts` — but note that file
today only edits the `item` catalog row (name/equipmentType/baseUnit/
description/minStock/qrCode), it does NOT edit the `equipment` instance
(condition/status/storageLocation/laboratoriumId/brand/serialNumber). The
new **Alat edit page** must also let the user edit those equipment-instance
fields (condition, status, storageLocation, laboratoriumId, brand,
serialNumber) since there is currently no UI for that at all outside of the
combined tambah form. The **BHP edit page** only needs the `item`
catalog fields (no equipment instance).

Once both are working, delete the old combined
`admin/inventaris/tambah/` and `admin/inventaris/[id]/edit/` routes, and
update every `href`/`goto` that pointed to them (check
`admin/inventaris/alat/+page.svelte` and `admin/inventaris/bhp/+page.svelte`
list pages for "Tambah" buttons, and any row-level "Edit" links).

### 3.2 Form field changes

Alat (`alat/tambah`, `alat/[id]/edit`):

- Add `categoryId` Select, sourced from `equipmentCategory` (load in
  `+page.server.ts`'s `load` function)
- Add `storageLocation` text Input, bound to the new column
- Add `brand` text Input (already existed) and `variant` text Input (new,
  optional — label it "Tipe/Varian", e.g. "kanan", "isi 50 ampul")
- Replace the warehouse Select with a `laboratoriumId` Select (required)
  — do not write to `equipment.warehouseId`
- Condition Select options: only `BAIK` / `RUSAK` (see §4 for full list of
  places using the old 3-value enum)
- Unit Select: do not include `BOTOL`

BHP (`bhp/tambah`, `bhp/[id]/edit`):

- Add `categoryId` Select (same source table — categories can apply to BHP
  too, e.g. a "Kapas" category with variants)
- Add `brand` and `variant` text Inputs on the **stock** record, not the
  `item` record — since one item can have several stock rows (one per
  brand/variant combo). This means the BHP create form should behave like
  a "record a batch of this item" form: if the `item` (by name) already
  exists, don't create a duplicate `item` row — let the user pick the
  existing item and add a new `stock` row with its own brand/variant/qty
  for the lab. If it doesn't exist yet, create both the `item` and its
  first `stock` row in one go (mirror the "search existing asset" dialog
  pattern already used in the old combined `tambah` form for ASSET, but
  for CONSUMABLE item-name lookup).
- Replace the warehouse Select with a `laboratoriumId` Select (required)
  on the `stock` record — do not write to `stock.warehouseId`
- Unit Select: include `BOTOL` alongside existing options
- No condition/status/storageLocation fields (those are ASSET-only,
  equipment-instance concepts)

### 3.3 New equipmentCategory CRUD page

Simple list + create/edit dialog (not a full page — follow the Dialog
pattern already used elsewhere in `admin/inventaris`, e.g. the search
dialog in `tambah/+page.svelte`, for UI consistency):

- `src/routes/admin/inventaris/kategori/+page.svelte` (+`.server.ts`)
  - Table: name, description, item count, actions (edit/delete)
  - "Tambah Kategori" button opens a Dialog with name + description fields
  - Edit reuses the same dialog, prefilled
  - Delete: block if `equipmentCategory` still has linked `item` rows (show
    a toast: "Kategori masih digunakan oleh N barang")

### 3.4 Deprecate `admin/barang`

`admin/barang/**` is a redundant BHP-only catalog form (hardcoded title
"Tambah Barang Habis Pakai") that overlaps with the new
`admin/inventaris/bhp/tambah`. Redirect its routes to the new BHP routes
and remove the old files, unless there's an existing use of `admin/barang`
elsewhere (`grep -rn "admin/barang" src` first to confirm nothing else
depends on it before deleting).

---

## 4. UPDATE ALL 3-VALUE CONDITION ENUM REFERENCES → 2-VALUE

Replace `RUSAK_RINGAN` / `RUSAK_BERAT` with a single `RUSAK` in the
following files (found via repo-wide grep — re-run the grep after schema
changes to confirm nothing is missed):

| File                                                                  | What to change                                                                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/lib/components/dashboard/TeknisiDashboard.svelte` (L15, L103)    | condition color/variant logic: `condition === 'RUSAK'`                                                          |
| `src/routes/admin/gudang/komunity/+page.server.ts` (L59-61)           | collapse the two `else if` branches into one `RUSAK` check                                                      |
| `src/routes/admin/gudang/komunity/+page.svelte` (L31-32)              | collapse the two color-map entries into one `RUSAK` entry                                                       |
| `src/routes/admin/peminjaman/[id]/+page.server.ts` (L63)              | type union → `'BAIK' \| 'RUSAK'`                                                                                |
| `src/routes/admin/peminjaman/[id]/+page.svelte` (L69-70)              | collapse Select options into one `{ value: 'RUSAK', label: 'Rusak' }`                                           |
| `src/routes/admin/peminjaman/+page.svelte` (L513)                     | collapse ternary branch                                                                                         |
| `src/routes/admin/inventaris/alat/[id]/+page.svelte` (L248, L255)     | collapse condition-based styling                                                                                |
| `src/routes/admin/inventaris/tambah/+page.svelte`                     | file is being deleted per §3.1 — no action needed, just don't port the 3-value options into the new split forms |
| `src/routes/admin/laporan/btk16/+page.server.ts` (L25-26)             | collapse the two `count(case when...)` SQL fragments into one `rusak: count(...)`                               |
| `src/routes/api/admin/inventaris/alat/+server.ts` (L22-26, L42-43)    | collapse stat aggregation into one `rusak` count                                                                |
| `src/routes/api/admin/dashboard/[role]/+server.ts` (L58-62, L150-154) | collapse both occurrences (dashboard summary + per-lab summary) into one `RUSAK` count                          |

Anywhere the old code produced two numbers (`rusakRingan`, `rusakBerat`),
the new code should produce one (`rusak`), and any UI displaying two badges
should now display one.

---

## 5. SEED DATA

Update `src/lib/server/db/seeds/index.ts`:

- Seed a handful of `equipmentCategory` rows (e.g. "Gunting", "Kaca Mulut",
  "Pinset", "Sonde") and assign `categoryId` to relevant seeded ASSET items.
- Equipment seed data: use only `BAIK` / `RUSAK` for condition, populate
  `storageLocation` with a plausible value (e.g. "Rak A1", "Lemari 2"), and
  give at least one `item` multiple `equipment` rows with different
  `brand`/`variant` (e.g. "Root elevator (cryer)" → Schezer/kanan +
  Schezer/kiri) to exercise the report grouping in Module 2.
- Stock seed data: give at least one CONSUMABLE `item` multiple `stock`
  rows across `brand`/`variant` combos in the same lab (e.g. "Ecosin" →
  brand X/"isi 50 ampul" + brand X/"isi 40 ampul"), and use `BOTOL` for at
  least one item to verify the enum end-to-end. All new stock rows should
  set `laboratoriumId`, not `warehouseId`.
- Seed 1-2 `laboran` users (role slug `laboran`), following the same
  pattern as existing `teknisi` seed users in `users.ts`.

---

## 6. ACCEPTANCE CHECKLIST

- [ ] `bun run db:generate && bun run db:push` succeeds with no manual SQL
- [ ] `/admin/inventaris/kategori` lists/creates/edits categories
- [ ] `/admin/inventaris/alat/tambah` creates an equipment item with
      category, storage location, and 2-value condition — no `type` Select
      visible
- [ ] `/admin/inventaris/bhp/tambah` creates a consumable item with
      category and can select `BOTOL` as unit — no `type` Select, no
      condition/status/storageLocation fields visible
- [ ] `/admin/inventaris/alat/[id]/edit` can edit both the catalog fields
      AND the equipment instance fields (condition/status/storageLocation)
- [ ] Old `/admin/inventaris/tambah`, `/admin/inventaris/[id]/edit`, and
      `/admin/barang/**` routes are removed and nothing else links to them
- [ ] `grep -rn "RUSAK_RINGAN\|RUSAK_BERAT" src` returns zero results
- [ ] A `laboran` user can log in and only sees Alat/BHP/Kategori in the
      sidebar; cannot access peminjaman/penilaian/pemeliharaan/users
- [ ] A `laboran` user has `locals.user.laboratorium` populated (via a
      `laboratoriumMember` row), same as `kepalaLab`
- [ ] The same `item` name can have two `equipment` rows with different
      `brand`/`variant`, or two `stock` rows with different
      `brand`/`variant`, without ever creating a second `item` row
- [ ] Alat/BHP create & edit forms no longer show a warehouse picker;
      `laboratoriumId` is required instead; `warehouse` table and
      `warehouseId` columns still exist and are untouched
- [ ] Every place that displayed "Koordinator" to a user now displays "PJ
      Mata Kuliah"; `grep -rn "role === 'koordinator'"` diff is unchanged
