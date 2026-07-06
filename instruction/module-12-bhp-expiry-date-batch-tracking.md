# Instruction: BHP stock expiry-date tracking (batch/lot model)

## Context & design decision (read first)

`src/lib/server/db/schema.ts`'s `stock` table is **one aggregated row per
`(itemId, laboratoriumId, brand, variant)`** — a single running `qty`. It cannot represent
"8 pcs expire tomorrow, 2 pcs of the same item/lab expire next month" because there is only one
row to attach a date to.

**Do not add `expiryDate` directly to `stock`.** Instead, add a new **`stock_batch`** table: one
row per "Receive" event, holding the _remaining_ qty of that specific batch, its own
`expiryDate`, and its own `receivedAt` ("Tanggal Masuk"). `stock.qty` remains the fast aggregate
(sum of its batches' remaining qty) for existing list/summary views — nothing that already reads
`stock.qty` needs to change. `stock_batch` is the consumable-world equivalent of what `equipment`
already is for asset-type items (per-unit rows vs. an aggregate).

This instruction has 5 parts. Implement in this order — each depends on the previous:

1. Schema: add `stock_batch` table.
2. BHP creation (`bhp/tambah`): add expiry date input, create the first batch.
3. Stock mutation endpoint (`api/admin/inventaris/bhp/stock`) + the "Ubah Stok" modal in
   `bhp/+page.svelte`: add expiry date input for RECEIVE, create/deduct batches.
4. New BHP detail page `bhp/[id]` (currently doesn't exist — only `bhp/[id]/edit` does),
   mirroring `alat/[id]`'s three-file pattern, sorted by longest expiry date first.
5. Wire up the "Detail" link from the BHP list page.

---

## Part 1 — Schema: `stock_batch` table

### File: `src/lib/server/db/schema.ts`

Add `date` to the existing `drizzle-orm/mysql-core` import list:

```ts
import {
	mysqlTable,
	varchar,
	text,
	timestamp,
	int,
	boolean,
	mysqlEnum,
	index,
	uniqueIndex,
	unique,
	foreignKey,
	json,
	date
} from 'drizzle-orm/mysql-core';
```

Add the new table directly after the existing `stock` table definition:

```ts
export const stockBatch = mysqlTable(
	'stock_batch',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		stockId: varchar('stock_id', { length: 36 })
			.notNull()
			.references(() => stock.id, { onDelete: 'cascade' }),

		// Remaining quantity in this batch (decremented on ISSUE/ADJUSTMENT, never negative)
		qty: int('qty').notNull().default(0),

		// Quantity originally received in this batch — kept for audit/history, never mutated after insert
		initialQty: int('initial_qty').notNull(),

		// Nullable: not every BHP item is perishable (e.g. non-expiring lab hardware consumables)
		expiryDate: date('expiry_date'),

		// "Tanggal Masuk" — always set to now() at insert time by the server, never user-editable
		receivedAt: timestamp('received_at').defaultNow().notNull(),

		// Optional link back to the movement row that created this batch, for traceability
		movementId: varchar('movement_id', { length: 36 }).references(() => movement.id),

		notes: text('notes'),

		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('stock_batch_stock_idx').on(table.stockId),
		index('stock_batch_expiry_idx').on(table.expiryDate)
	]
);

export const stockBatchRelations = relations(stockBatch, ({ one }) => ({
	stock: one(stock, {
		fields: [stockBatch.stockId],
		references: [stock.id]
	}),
	movement: one(movement, {
		fields: [stockBatch.movementId],
		references: [movement.id]
	})
}));
```

Also add a `batches` relation on the existing `stock` table's relations block (find
`export const stockRelations = relations(stock, ...)` — if it doesn't exist yet, create it; if it
exists, just add the `batches` field to it):

```ts
export const stockRelations = relations(stock, ({ one, many }) => ({
	item: one(item, { fields: [stock.itemId], references: [item.id] }),
	warehouse: one(warehouse, { fields: [stock.warehouseId], references: [warehouse.id] }),
	laboratorium: one(laboratorium, {
		fields: [stock.laboratoriumId],
		references: [laboratorium.id]
	}),
	batches: many(stockBatch)
}));
```

(If a `stockRelations` already exists with different fields, merge — don't duplicate — the
`item`/`warehouse`/`laboratorium` relations; only add what's missing.)

### Migration

Run your project's normal Drizzle migration flow (`drizzle-kit generate` then apply/push per
`DEPLOYMENT.md` / existing scripts) to create the new `stock_batch` table. Do not hand-write SQL.

---

## Part 2 — BHP creation: expiry date input + first batch

### File: `src/routes/admin/inventaris/bhp/tambah/+page.svelte`

Find the initial-stock input field (`initialStock`). Add an expiry date input right next to/below
it:

```svelte
<div class="flex flex-col gap-2">
	<Label for="expiryDate">Tanggal Kedaluwarsa (opsional)</Label>
	<Input type="date" id="expiryDate" name="expiryDate" />
	<p class="text-xs text-gray-400">Kosongkan jika bahan ini tidak memiliki tanggal kedaluwarsa.</p>
</div>
```

Place it near `initialStock`'s field so it reads naturally as "how much, expiring when."

### File: `src/routes/admin/inventaris/bhp/tambah/+page.server.ts`

1. Import `stockBatch` alongside the existing schema imports.
2. Read the new field: `const expiryDateRaw = formData.get('expiryDate') as string;` and convert
   to a value Drizzle's `date` column accepts (`expiryDateRaw || null`).
3. Inside the same `db.transaction`, **after** the existing stock insert/update block and **after**
   the `if (initialStock > 0) { ... insert movement ... }` block, insert the batch row using the
   same `movementId` used for that movement insert (hoist a `const movementId = uuidv4();` above
   the movement insert so both rows share it):

   ```ts
   if (initialStock > 0) {
   	const movementId = uuidv4();
   	await tx.insert(movement).values({
   		id: movementId,
   		itemId: itemId,
   		eventType: 'RECEIVE',
   		qty: initialStock,
   		unit: baseUnit,
   		laboratoriumId: labId,
   		notes: 'Stok awal saat pendaftaran item',
   		picId: session.id,
   		createdAt: new Date()
   	});

   	const stockRowId = existingStockRow ? existingStockRow.id : /* id used in the insert above */;
   	await tx.insert(stockBatch).values({
   		stockId: stockRowId,
   		qty: initialStock,
   		initialQty: initialStock,
   		expiryDate: expiryDateRaw || null,
   		movementId
   		// receivedAt: omitted — defaultNow() handles "Tanggal Masuk" automatically
   	});
   }
   ```

   Note: the existing code generates a new `uuidv4()` for the `stock` insert inline
   (`id: uuidv4()`) without storing it in a variable — hoist that into a local `const newStockId =
uuidv4();` too, so `stockRowId` above can reference it when `existingStockRow` is absent. Make
   this same small refactor (capture the id in a variable before `tx.insert(stock).values({...})`)
   rather than calling `uuidv4()` twice.

---

## Part 3 — Stock mutation: expiry input on Receive + batch bookkeeping

### File: `src/routes/admin/inventaris/bhp/+page.svelte`

In the "Ubah Stok" modal, right after the `stockQty` `<Input>` block and before the `stockNotes`
block, add (only relevant/visible for RECEIVE):

```svelte
{#if stockEventType === 'RECEIVE'}
	<div class="flex flex-col gap-2">
		<Label for="stockExpiryDate">Tanggal Kedaluwarsa (opsional)</Label>
		<Input type="date" id="stockExpiryDate" bind:value={stockExpiryDate} />
		<p class="text-xs text-gray-400">
			Kosongkan jika batch stok ini tidak memiliki tanggal kedaluwarsa.
		</p>
	</div>
{/if}
```

Add the backing state near the other `stock*` state declarations:

```ts
let stockExpiryDate = $state<string>('');
```

Reset it in `openStockModal` alongside the existing resets (`stockQty = 0; stockNotes = '';`):

```ts
stockExpiryDate = '';
```

Include it in the `submitStockChange` request body (only meaningful for RECEIVE, but harmless to
always send):

```ts
body: JSON.stringify({
	itemId: stockItem.id,
	eventType: stockEventType,
	qty: stockQty,
	notes: stockNotes || undefined,
	laboratoriumId: labId,
	expiryDate: stockEventType === 'RECEIVE' ? stockExpiryDate || undefined : undefined
})
```

**Do not** add a "Tanggal Masuk" / received-date input anywhere — that must always be the
server's `now()`, never user-supplied. This satisfies the "automatically use current date" part
of the request by omission: there is simply no field for it.

### File: `src/routes/api/admin/inventaris/bhp/stock/+server.ts`

1. Import `stockBatch` and `sql`, `asc` (or reuse existing `eq`/`and`) from `drizzle-orm` as
   needed.
2. Destructure the new field from the body: `const { itemId, eventType, qty, notes,
laboratoriumId, warehouseId: reqWarehouseId, expiryDate } = body;` (update the `body` type
   above it to include `expiryDate?: string;`).
3. Inside the existing `db.transaction(async (tx) => { ... })`, after the `stock`
   insert/update branch (so you have a definite `stockId` to attach to — capture it in a local
   `const stockId = existingStock ? existingStock.id : <the id used in the insert>` the same way
   as Part 2), add event-specific batch handling **before** the `movement` insert (or after — order
   between batch and movement insert doesn't matter, both are in the same transaction):

   **On RECEIVE** — insert one new batch:

   ```ts
   if (eventType === 'RECEIVE') {
   	await tx.insert(stockBatch).values({
   		stockId,
   		qty,
   		initialQty: qty,
   		expiryDate: expiryDate || null,
   		movementId
   		// receivedAt: defaultNow() — always "now", per requirement
   	});
   }
   ```

   **On ISSUE** — deduct FEFO (First-Expired-First-Out): consume from the batch with the
   _soonest_ expiry date first, so what's closest to expiring gets used up before longer-dated
   stock. Batches with a `null` expiryDate (non-perishable) are treated as expiring last.

   ```ts
   if (eventType === 'ISSUE') {
   	let remaining = qty;
   	const batches = await tx.query.stockBatch.findMany({
   		where: and(eq(stockBatch.stockId, stockId), sql`${stockBatch.qty} > 0`),
   		orderBy: (b, { asc, sql }) => [sql`${b.expiryDate} IS NULL`, asc(b.expiryDate)]
   	});
   	for (const batch of batches) {
   		if (remaining <= 0) break;
   		const take = Math.min(batch.qty, remaining);
   		await tx
   			.update(stockBatch)
   			.set({ qty: batch.qty - take })
   			.where(eq(stockBatch.id, batch.id));
   		remaining -= take;
   	}
   	// If remaining > 0 here, batch records are short vs. stock.qty (e.g. legacy stock created
   	// before this feature existed, with no batches at all). This is not an error — stock.qty
   	// is still the source of truth for totals; batches are best-effort detail. Do not throw.
   }
   ```

   **On ADJUSTMENT** — `qty` is the _final target_ stock level, so the delta vs. `currentQty` can
   be positive or negative:

   ```ts
   if (eventType === 'ADJUSTMENT') {
   	const delta = newQty - currentQty; // newQty/currentQty already computed above in this file
   	if (delta > 0) {
   		// Treat like an unattributed receive — no expiry info available for a manual adjustment
   		await tx.insert(stockBatch).values({
   			stockId,
   			qty: delta,
   			initialQty: delta,
   			expiryDate: null,
   			movementId,
   			notes: 'Batch dari penyesuaian stok (tanggal kedaluwarsa tidak diketahui)'
   		});
   	} else if (delta < 0) {
   		// Same FEFO deduction loop as ISSUE, with remaining = Math.abs(delta)
   	}
   }
   ```

   Factor the FEFO deduction loop out into a small local helper function (e.g.
   `deductFefo(tx, stockId, amount)`) and call it from both the ISSUE and ADJUSTMENT-decrease
   branches instead of duplicating it.

4. Hoist `const movementId = crypto.randomUUID();` (it already exists further down before the
   `movement` insert — just make sure it's declared before these new batch inserts so they can
   reuse the same id) — no separate id needed for batches, reuse the movement's.

---

## Part 4 — BHP detail page: batch table sorted by longest expiry

Currently `src/routes/admin/inventaris/bhp/[id]/` only has `edit/`. Add a sibling detail view,
mirroring `src/routes/admin/inventaris/alat/[id]/`'s three-file pattern exactly (server load →
client load → API entry endpoint → svelte table).

### New file: `src/routes/admin/inventaris/bhp/[id]/+page.server.ts`

Mirror `alat/[id]/+page.server.ts` structure, but for CONSUMABLE items (no `delete` action needed
here since deleting stock isn't in scope of this task — omit `actions` entirely, or keep it empty,
whichever matches your project's lint rules for unused exports):

```ts
import { db } from '$lib/server/db';
import { item } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const itemData = await db.select().from(item).where(eq(item.id, id));

	if (itemData.length === 0) {
		throw error(404, 'BHP tidak ditemukan');
	}

	return {
		item: itemData[0]
	};
};
```

### New file: `src/routes/admin/inventaris/bhp/[id]/+page.ts`

Mirror `alat/[id]/+page.ts` exactly, pointing at a new API path:

```ts
import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch, url, params, data }) => {
	const { id } = params;

	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';
	const search = url.searchParams.get('search') || '';

	const fetchData = async () => {
		const query = new URLSearchParams({ page, limit, search });
		const res = await fetch(`/api/admin/inventaris/bhp/${id}/entry?${query.toString()}`);
		if (!res.ok) throw new Error('Gagal memuat data stok BHP');
		return await res.json();
	};

	return {
		...data,
		bhpBatchPromise: fetchData()
	};
};
```

### New file: `src/routes/api/admin/inventaris/bhp/[id]/entry/+server.ts`

Mirror `api/admin/inventaris/alat/[id]/entry/+server.ts`'s shape, but query `stockBatch` joined
through `stock` (filtered to this item across all labs/warehouses), **sorted by longest expiry
date first** as requested (furthest-away expiry date first; `NULL` = no expiry, treated as
"longest" and sorted first — flip the `desc`/ordering below to `asc` with nulls-last if you'd
rather default to FEFO/soonest-expiring-first visibility instead, which is what most lab staff
actually want to see first when opening this page — flag this design choice to the requester
before finalizing):

```ts
import { json } from '@sveltejs/kit';
import { and, count, eq, like, sql, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { stockBatch, stock, item, warehouse, laboratorium } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, params }) => {
	const { id } = params;
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const offset = (page - 1) * limit;

	try {
		const itemData = await db.select().from(item).where(eq(item.id, id));
		if (itemData.length === 0) {
			throw new Error('BHP tidak ditemukan');
		}

		const baseCondition = eq(stock.itemId, id);
		const whereClause = search
			? and(baseCondition, like(laboratorium.name, `%${search}%`))
			: baseCondition;

		const [totalItemsResult] = await db
			.select({ value: count() })
			.from(stockBatch)
			.innerJoin(stock, eq(stockBatch.stockId, stock.id))
			.leftJoin(laboratorium, eq(stock.laboratoriumId, laboratorium.id))
			.where(whereClause);

		const totalItems = Number(totalItemsResult.value);
		const totalPages = Math.ceil(totalItems / limit);

		const batches = await db
			.select({
				id: stockBatch.id,
				qty: stockBatch.qty,
				initialQty: stockBatch.initialQty,
				expiryDate: stockBatch.expiryDate,
				receivedAt: stockBatch.receivedAt, // "Tanggal Masuk"
				laboratoriumName: laboratorium.name,
				warehouseName: warehouse.name,
				brand: stock.brand,
				variant: stock.variant
			})
			.from(stockBatch)
			.innerJoin(stock, eq(stockBatch.stockId, stock.id))
			.leftJoin(laboratorium, eq(stock.laboratoriumId, laboratorium.id))
			.leftJoin(warehouse, eq(stock.warehouseId, warehouse.id))
			.where(whereClause)
			// Longest expiry first; NULL (no expiry) sorts first, ahead of any dated batch
			.orderBy(sql`${stockBatch.expiryDate} IS NULL DESC`, desc(stockBatch.expiryDate))
			.limit(limit)
			.offset(offset);

		return json({
			item: itemData[0],
			batches,
			pagination: { totalItems, totalPages, currentPage: page, limit }
		});
	} catch {
		return json({
			item: null,
			batches: [],
			pagination: { totalItems: 0, totalPages: 0, currentPage: page, limit }
		});
	}
};
```

### New file: `src/routes/admin/inventaris/bhp/[id]/+page.svelte`

Copy `alat/[id]/+page.svelte` as the starting point and adapt:

- Replace `data.alatPromise` → `data.bhpBatchPromise`, `res.equipment` → `res.item`,
  `res.equipments` → `res.batches`.
- Table columns (replacing Serial Number / Merk / Lokasi / Tanggal Ditambahkan):

  | Column              | Source                                           |
  | ------------------- | ------------------------------------------------ |
  | Merk/Varian         | `batch.brand`, `batch.variant`                   |
  | Sisa Jumlah         | `batch.qty` (+ `item.baseUnit`)                  |
  | Tanggal Masuk       | `batch.receivedAt`, formatted                    |
  | Tanggal Kedaluwarsa | `batch.expiryDate`, formatted, or "-" if null    |
  | Status              | derived badge — see below                        |
  | Lab/Gudang          | `batch.laboratoriumName` / `batch.warehouseName` |

- Add a small derived helper for the status badge (reuse `Badge` the way `alat`'s page already
  uses badges for condition):
  ```ts
  function expiryStatus(expiryDate: string | null) {
  	if (!expiryDate) return { label: 'Tidak Kedaluwarsa', variant: 'secondary' as const };
  	const days = Math.ceil(
  		(new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  	);
  	if (days < 0) return { label: 'Kedaluwarsa', variant: 'destructive' as const };
  	if (days <= 3) return { label: `${days} hari lagi`, variant: 'destructive' as const };
  	if (days <= 14) return { label: `${days} hari lagi`, variant: 'default' as const };
  	return { label: `${days} hari lagi`, variant: 'secondary' as const };
  }
  ```
- Skip the "Tambah Alat" button and delete-confirmation dialog entirely — this page is read-only
  (no create/delete action defined for batches in this task).
- Keep the same search/pagination/limit URL-param wiring, skeleton loading state, and back button
  pattern as `alat/[id]/+page.svelte` uses.

---

## Part 5 — Link the BHP list to the new detail page

### File: `src/routes/admin/inventaris/bhp/+page.svelte`

In the "Aksi" `DropdownMenu.Content` for each row (currently: Ubah Stok → separator → Edit),
add a "Detail" item before "Ubah Stok", matching the `alat` list's `Eye`/Detail pattern:

```svelte
<a href="/admin/inventaris/bhp/{item.id}">
	<DropdownMenu.Item>
		<Eye /> Detail
	</DropdownMenu.Item>
</a>
<DropdownMenu.Separator />
```

Import `Eye` from `@lucide/svelte` if not already imported in this file.

---

## Verification checklist

1. `git diff --stat` — confirm the touched files match: `schema.ts`, `bhp/tambah/+page.svelte`,
   `bhp/tambah/+page.server.ts`, `bhp/+page.svelte`, `api/admin/inventaris/bhp/stock/+server.ts`,
   plus 3 new files under `bhp/[id]/` and 1 new file under `api/admin/inventaris/bhp/[id]/entry/`.
2. Run the migration `bun run db:generate && bun run db:migrate`; confirm `stock_batch` table exists with the columns above.
3. Create a new BHP with an expiry date and initial stock > 0 → confirm one `stock_batch` row is
   created with that `expiryDate` and `receivedAt` = now.
4. Use "Ubah Stok" → Receive on an existing BHP with an expiry date → confirm a second batch row
   is created (not merged into the first), with its own `receivedAt` = now regardless of what
   date is picked for `expiryDate`.
5. Issue stock via "Ubah Stok" → Issue, qty large enough to span two batches → confirm the
   soonest-expiring batch is drawn down to 0 before the next batch is touched.
6. Open `/admin/inventaris/bhp/{id}` → confirm the table lists all batches for that item across
   labs, sorted with the longest-remaining-expiry (or no-expiry) batches first, each row showing
   its own qty, Tanggal Masuk, and expiry status badge.
7. `bun run check` / `bun run build` pass with no type errors from the new `stockBatch` schema
   export or its usages.
