# MODULE 2 — INVENTORY XLSX EXPORT REPORT

Depends on Module 1 (needs `equipment.brand`/`variant`, `stock.brand`/
`variant`/`laboratoriumId`). Do this after Module 1 is merged.

Goal: `kepalaLab` and `laboran` can generate an on-demand `.xlsx` download
for **their own lab**, reproducing the structure of
`DAFTAR_INVENTARIS_ALAT_DAN_BAHAN_LAB_PREPARASI.xlsx` (2 sheets: Alat,
Bahan) grouped by item name with brand/variant sub-rows.

**Explicitly out of scope** (flagging, not building): the reference file's
"PENGGUNAAN BLOK ... SEMESTER AWAL 25/26" usage-tracking columns and the
"Rencana Pengadaan baru" (procurement request) sheet — neither has a
corresponding data model in SIM LAB today. Only replicate the inventory
listing itself (NO / URAIAN / MEREK / TIPE / JUMLAH / SATUAN / KONDISI).

---

## 1. ONE SMALL SCHEMA ADDITION: `stock.condition`

The reference "Bahan" sheet has a KONDISI column per stock row (values seen:
"baik", "lengkap/baru", "Tidak lengkap/lama" — free text, not a fixed
enum like equipment's BAIK/RUSAK). `stock` currently has no condition
field at all. Add:

```ts
condition: varchar('condition', { length: 100 }).default('baik'),
```

to the `stock` table in `src/lib/server/db/schema.ts`. Free text (not
`mysqlEnum`) since BHP condition descriptions vary more than ASSET's fixed
two states. Run `bun run db:generate && bun run db:push` after.

Add a `condition` text Input to the BHP create/edit forms (from Module 1
§3.2) next to brand/variant, defaulting to "baik".

---

## 2. DEPENDENCY

Add `exceljs` (supports cell merging + fill/bold styling needed to match
the reference sheet's header row and grouped NO/URAIAN cells):

```bash
bun add exceljs
```

---

## 3. QUERY LOGIC

### 3.1 Alat sheet (ASSET)

For a given `laboratoriumId`, fetch all `equipment` joined to `item` where
`item.type = 'ASSET'` and `equipment.laboratoriumId = :labId`. Group in
application code by `item.id`, then within each item group by
`(brand, variant, condition)`, counting rows per group (COUNT, since each
`equipment` row is one physical unit — there is no qty column on
`equipment`, the report's "JUMLAH TERSEDIA" is a count of matching
instances).

Sort items by `item.name` for stable NO numbering (one NO per item,
spanning all of that item's brand/variant/condition sub-rows).

### 3.2 Bahan sheet (CONSUMABLE)

For the same `laboratoriumId`, fetch all `stock` joined to `item` where
`item.type = 'CONSUMABLE'` and `stock.laboratoriumId = :labId`. Each
`stock` row is already one batch (brand/variant/condition/qty) — no
counting needed, `stock.qty` is used directly. Group by `item.id` the same
way as Alat, sort by `item.name`.

---

## 4. FILE STRUCTURE / LAYOUT

Create `src/lib/server/reports/inventoryExport.ts` exporting a function:

```ts
export async function generateInventoryExport(laboratoriumId: string): Promise<Buffer>;
```

Using `exceljs`:

- Sheet "Alat": columns `NO | URAIAN/NAMA BARANG | MEREK | TIPE | JUMLAH TERSEDIA | KONDISI`
- Sheet "Bahan": columns `NO | URAIAN/NAMA BARANG | MEREK | TIPE | JUMLAH TERSEDIA | SATUAN | KONDISI`
- Header row: bold, light-blue fill (`FF9FC5E8` to match the reference,
  or pick your own — not critical)
- For each item group spanning N sub-rows: merge the `NO` cell and the
  `URAIAN/NAMA BARANG` cell vertically across all N rows (`worksheet.mergeCells(...)`),
  write the item name once (top of the merge), then one row per
  brand/variant/condition (Alat) or per stock batch (Bahan) for MEREK,
  TIPE, JUMLAH, (SATUAN,) KONDISI
- If an item has only one sub-row (no brand variance), it's just a normal
  unmerged row — no special-casing needed, a 1-row merge is a no-op

Return the workbook as a `Buffer` (`workbook.xlsx.writeBuffer()`).

---

## 5. ROUTE + PERMISSION

New endpoint: `src/routes/admin/laporan/inventaris/export/+server.ts`

```ts
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401);
	if (!['kepalaLab', 'laboran', 'superadmin'].includes(locals.user.role)) throw error(403);

	// kepalaLab/laboran can only export their own lab (locals.user.laboratorium.id)
	// superadmin: allow a ?labId= query param to pick any lab
	...
	const buffer = await generateInventoryExport(labId);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="Daftar_Inventaris_${labSlug}_${dateStr}.xlsx"`
		}
	});
};
```

For `kepalaLab`/`laboran`, ignore any `labId` query param and always use
`locals.user.laboratorium.id` — don't trust a client-supplied lab id for
these two roles, to prevent exporting another lab's data.

---

## 6. UI TRIGGER

Add an "Export Laporan" button (visible only to `kepalaLab`/`laboran`,
and `superadmin` with a lab picker) on the inventory list pages
(`admin/inventaris/alat/+page.svelte` and `admin/inventaris/bhp/+page.svelte`,
or a shared `admin/laporan/inventaris/+page.svelte` landing page — pick
whichever fits the existing `admin/laporan/**` nav pattern already used for
`btk16`). Button triggers a plain `<a href="/admin/laporan/inventaris/export">`
download, no JS fetch needed since it's a GET file download.

---

## 7. ACCEPTANCE CHECKLIST

- [ ] `stock.condition` column exists, defaults to `'baik'`, editable in
      the BHP form
- [ ] Exported Alat sheet groups equipment by item name, one merged NO +
      URAIAN block per item, one row per brand/variant/condition
      combination with a correct count
- [ ] Exported Bahan sheet groups stock by item name the same way, with
      qty taken directly from `stock.qty` and includes `SATUAN`
- [ ] `kepalaLab` and `laboran` can only ever export their own
      lab's data, even if they tamper with a `labId` query param
- [ ] File downloads with a sensible filename including the lab name/slug
      and date
