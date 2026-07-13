# Instruction: Soft delete (`is_deleted` flag) for crucial data

## Context & root cause (read first)

**Why delete currently fails on `alat/[id]` and `bhp/[id]`:** `deleteItem` in both
`src/routes/admin/inventaris/alat/[id]/+page.server.ts` and
`.../bhp/[id]/+page.server.ts` tries to hard-delete `item`/`equipment` inside a transaction after
manually deleting `inventoryReport`, `movement`, `itemUnitConversion` (and `stock`/`stockBatch` for
BHP). This misses other tables that reference `item`/`equipment` **without** `onDelete: 'cascade'`
— e.g. `lending_item`, `maintenance`, `maintenance_cost_item`, `practicum_schedule_module`-adjacent
history, `equipment` referencing `item.id` with no cascade from the item side. The moment any of
those rows exist, MySQL throws an FK constraint error and the transaction rolls back. The same
hard-delete pattern exists in 6 more places (see Part 4) and will eventually hit the same wall.

**The fix is not "delete more cascades correctly."** It's to stop physically deleting rows that have
history at all. Soft delete (`is_deleted` flag) solves the bug and the security concern
simultaneously: nothing is ever physically removed, so FK history is never broken, and if the app
is ever compromised, a malicious `DELETE`/data-wipe is far less likely to be reachable since the
delete actions themselves will no longer issue `DELETE` statements for these tables in normal
operation.

**Important MySQL caveat — read before writing any index.** You (Wahil) asked for a "partial index"
technique. MySQL 8.0 (this project's `mysql:8.0` image) **does not support Postgres-style partial
indexes** (`CREATE INDEX ... WHERE ...`). There is no direct equivalent. What we use instead, and
what this document means every time it says "partial index," is two different real MySQL
techniques depending on the goal:

1. **Query performance for "show only active rows"** → a normal **composite index with
   `is_deleted` as the leading column** (e.g. `(is_deleted, category_id)`). Since every hot query
   filters `is_deleted = false` first, MySQL's optimizer range-scans that leading column and the
   index behaves like a partial index in practice, even though it technically indexes all rows.
2. **Uniqueness that must ignore soft-deleted rows** (e.g. two different "Scaler Ultrasonik" items
   should be allowed to exist if the first one was soft-deleted) → a **generated column + unique
   index** trick: a stored generated column that evaluates to `NULL` when `is_deleted = true` and to
   the real value otherwise, with a `UNIQUE` index on that generated column. InnoDB allows multiple
   `NULL`s in a unique index, so soft-deleted rows stop competing for uniqueness while active rows
   still collide correctly. This is the standard MySQL emulation of a Postgres partial unique index.

**`user` table caveat.** `user` is managed by `better-auth` (`drizzleAdapter`). It already has a
`banned` column wired into the `admin` plugin, which `better-auth` uses natively to reject sign-in
and invalidate sessions for banned users. Reinventing an independent `is_deleted` check that
`better-auth`'s own `getSession`/sign-in flow doesn't know about would leave a soft-deleted user
still able to log in. So for `user` specifically: add `is_deleted`/`deleted_at` for record-keeping
and list filtering, but the **delete action must also set `banned = true`** so `better-auth` itself
enforces the access block. Do not rely on `is_deleted` alone for auth-path enforcement.

**Scope of this instruction — tables that currently hard-delete and get converted:**

| Table                | File(s) with the current hard delete                                                      |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `item`               | `admin/inventaris/alat/[id]/+page.server.ts`, `admin/inventaris/bhp/[id]/+page.server.ts` |
| `equipment`          | `admin/inventaris/alat/[id]/+page.server.ts`                                              |
| `stock_batch`        | `admin/inventaris/bhp/[id]/+page.server.ts`                                               |
| `laboratorium`       | `admin/laboratorium/+page.server.ts`                                                      |
| `practicum_schedule` | `admin/jadwal-praktikum/+page.server.ts`                                                  |
| `practicum_module`   | `admin/master/modul/+page.server.ts`                                                      |
| `kelompok_mahasiswa` | `admin/kelompok-mahasiswa/+page.server.ts`                                                |
| `user`               | `admin/users/[role_slug]/+page.server.ts`, `admin/users/laboran/+page.server.ts`          |

Implement in this order:

1. Schema: add soft-delete columns + indexes to all 8 tables.
2. Migration, including the generated-column unique-index trick for `user.username`,
   `user.email`, `laboratorium.slug`, `equipment.serialNumber`.
3. Central soft-delete helper module.
4. Rewrite the 8 hard-delete call sites to soft-delete (with cascade rules per entity).
5. Audit every read path for these 8 tables and add the `is_deleted = false` filter where it
   belongs (with a clear rule for where it must **not** be added).
6. Optional: minimal "Sampah" (trash) view + restore action.
7. Testing checklist.
8. Checklist to extend the same pattern to other tables later.

---

## Part 1 — Schema changes

### File: `src/lib/server/db/schema.ts`

Add a small reusable column set so every table stays consistent. Near the top of the file, after
the imports, add a helper (schema.ts already imports `boolean`, `timestamp`, `varchar` — no new
imports needed):

```ts
// Reusable soft-delete columns. Spread this into every table that needs soft delete.
// Usage: mysqlTable('item', { ...columns, ...softDeleteColumns }, (table) => [...])
const softDeleteColumns = {
	isDeleted: boolean('is_deleted').default(false).notNull(),
	deletedAt: timestamp('deleted_at'),
	deletedBy: varchar('deleted_by', { length: 36 })
};
```

Apply it to each table. Example for `item` (same pattern for the others):

```ts
export const item = mysqlTable(
	'item',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		categoryId: varchar('category_id', { length: 36 }).references(() => equipmentCategory.id),
		name: varchar('name', { length: 255 }).notNull(),
		type: mysqlEnum('type', ['ASSET', 'CONSUMABLE']).notNull(),
		equipmentType: mysqlEnum('equipment_type', [
			'DENTAL_UNIT',
			'LAB_INSTRUMENT',
			'IMAGING',
			'FURNITURE',
			'INSTRUMENT',
			'EQUIPMENT'
		]),
		minStock: int('min_stock').default(0),
		qrCodePath: text('qr_code_path'),
		baseUnit: mysqlEnum('base_unit', ['PCS', 'BOX', 'METER', 'ROLL', 'UNIT', 'BOTOL']).notNull(),
		description: text('description'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		...softDeleteColumns
	},
	(table) => [
		index('item_is_deleted_idx').on(table.isDeleted),
		index('item_is_deleted_category_idx').on(table.isDeleted, table.categoryId),
		index('item_is_deleted_type_idx').on(table.isDeleted, table.type)
	]
);
```

Do the equivalent for the other 6 tables in `schema.ts`. Concretely:

- **`equipment`**: add `...softDeleteColumns`. Add
  `index('equipment_is_deleted_idx').on(table.isDeleted)` and change/add
  `index('equipment_is_deleted_item_idx').on(table.isDeleted, table.itemId)`.
- **`stockBatch`**: add `...softDeleteColumns`. Add
  `index('stock_batch_is_deleted_idx').on(table.isDeleted)` and
  `index('stock_batch_is_deleted_stock_idx').on(table.isDeleted, table.stockId)`.
- **`practicumSchedule`**: add `...softDeleteColumns`. Add
  `index('practicum_schedule_is_deleted_idx').on(table.isDeleted)` and change the existing
  `practicum_schedule_time_idx` usage pattern by adding
  `index('practicum_schedule_is_deleted_time_idx').on(table.isDeleted, table.startTime, table.endTime)`.
- **`practicumModule`**: add `...softDeleteColumns`. Add
  `index('practicum_module_is_deleted_idx').on(table.isDeleted)`.
- **`kelompokMahasiswa`**: add `...softDeleteColumns`. Add
  `index('kelompok_mahasiswa_is_deleted_idx').on(table.isDeleted)`.

### File: `src/lib/server/db/auth.schema.ts`

`laboratorium` and `user` live here. This file doesn't currently import `boolean`/`int` used by the
new columns beyond what's already imported (`boolean` is already imported; add nothing new).

```ts
export const laboratorium = mysqlTable(
	'laboratorium',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: text('name').notNull(),
		slug: varchar('slug', { length: 255 }).unique(),
		logo: text('logo'),
		capacity: int('capacity').default(0),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		metadata: text('metadata'),
		isDeleted: boolean('is_deleted').default(false).notNull(),
		deletedAt: timestamp('deleted_at'),
		deletedBy: varchar('deleted_by', { length: 36 })
	},
	(table) => [index('laboratorium_is_deleted_idx').on(table.isDeleted)]
);

export const user = mysqlTable(
	'user',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 255 }).notNull(),
		username: varchar('username', { length: 255 }).notNull().unique(),
		displayUsername: varchar('displayUsername', { length: 255 }),
		email: varchar('email', { length: 255 }).notNull().unique(),
		emailVerified: boolean('email_verified').default(false).notNull(),
		role: varchar('role', { length: 255 }).notNull(),
		image: text('image'),
		banned: boolean('banned'),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		isDeleted: boolean('is_deleted').default(false).notNull(),
		deletedAt: timestamp('deleted_at'),
		deletedBy: varchar('deleted_by', { length: 36 })
	},
	(table) => [index('user_is_deleted_idx').on(table.isDeleted)]
);
```

Note: `laboratorium` and `user` need to become the 3-argument `mysqlTable(name, columns, extra)`
form (they're currently 2-argument) — add the `index` import to `auth.schema.ts` if not present
(`import { ... index ... } from 'drizzle-orm/mysql-core'`).

Don't remove the existing `.unique()` on `username`, `email`, `slug` yet — Part 2 replaces them.

---

## Part 2 — Migration: generate, then hand-write the partial-unique-index part

### Step 2a — generate the straightforward part

```bash
bun run db:generate
```

This produces a new file under `drizzle/` (e.g. `drizzle/0007_xxx.sql`) with the new
`is_deleted`/`deleted_at`/`deleted_by` columns and the new composite indexes. Review it — it should
contain only `ALTER TABLE ... ADD COLUMN` and `CREATE INDEX` statements, nothing destructive.

### Step 2b — hand-write the generated-column unique-index migration

`drizzle-kit` diffing of generated columns is unreliable across dialects, so write this part by
hand as its own migration file (e.g. `drizzle/0008_soft_delete_partial_unique.sql`) rather than
trusting `db:generate` for it. This is the actual "partial index" mechanism referenced in the
request, applied to the 4 columns whose plain `UNIQUE` constraint would otherwise block re-using a
value after a soft delete:

```sql
-- user.username: drop plain unique, add generated column + partial-unique emulation
ALTER TABLE `user` DROP INDEX `user_username_unique`;
ALTER TABLE `user`
  ADD COLUMN `username_active` VARCHAR(255)
  GENERATED ALWAYS AS (IF(`is_deleted` = 0, `username`, NULL)) STORED;
CREATE UNIQUE INDEX `user_username_active_uidx` ON `user` (`username_active`);

-- user.email
ALTER TABLE `user` DROP INDEX `user_email_unique`;
ALTER TABLE `user`
  ADD COLUMN `email_active` VARCHAR(255)
  GENERATED ALWAYS AS (IF(`is_deleted` = 0, `email`, NULL)) STORED;
CREATE UNIQUE INDEX `user_email_active_uidx` ON `user` (`email_active`);

-- laboratorium.slug
ALTER TABLE `laboratorium` DROP INDEX `laboratorium_slug_unique`;
ALTER TABLE `laboratorium`
  ADD COLUMN `slug_active` VARCHAR(255)
  GENERATED ALWAYS AS (IF(`is_deleted` = 0, `slug`, NULL)) STORED;
CREATE UNIQUE INDEX `laboratorium_slug_active_uidx` ON `laboratorium` (`slug_active`);

-- equipment.serialNumber
ALTER TABLE `equipment` DROP INDEX `equipment_serial_number_unique`;
ALTER TABLE `equipment`
  ADD COLUMN `serial_number_active` VARCHAR(100)
  GENERATED ALWAYS AS (IF(`is_deleted` = 0, `serial_number`, NULL)) STORED;
CREATE UNIQUE INDEX `equipment_serial_number_active_uidx` ON `equipment` (`serial_number_active`);
```

Check the real constraint names first (`SHOW CREATE TABLE user;` etc. via `db:studio` or a direct
`mysql` client) — Drizzle's auto-generated constraint names may differ slightly from the guesses
above; fix the `DROP INDEX` names to match before running.

Reflect the generated columns in `schema.ts`/`auth.schema.ts` too, purely so TypeScript knows they
exist (mark them clearly as DB-managed, never written to from app code):

```ts
// DB-managed generated column (see drizzle/0008_soft_delete_partial_unique.sql). Never write to this.
usernameActive: varchar('username_active', { length: 255 }).generatedAlwaysAs(
	sql`IF(\`is_deleted\` = 0, \`username\`, NULL)`,
	{ mode: 'stored' }
),
```

Add the same for `emailActive`, `slugActive`, `serialNumberActive` on their respective tables. Do
**not** add a `.unique()` here in the drizzle definition — the unique index is already created by
the raw SQL migration; declaring it again in schema.ts would make `db:generate` try to re-create it.

Run:

```bash
bun run db:migrate
```

Backfill nothing else is needed — existing rows all have `is_deleted = false` by default, so the
generated columns populate themselves from existing `username`/`email`/`slug`/`serial_number`
values automatically.

---

## Part 3 — Central soft-delete helper

### File: `src/lib/server/db/soft-delete.ts` (new)

```ts
import { eq, type AnyMySqlTable } from 'drizzle-orm';
import type { MySqlTableWithColumns } from 'drizzle-orm/mysql-core';
import { db } from './db';
import { createAuditLog } from '../audit';

// Any soft-delete-enabled table has these three columns.
type SoftDeletable = {
	isDeleted: any;
	deletedAt: any;
	deletedBy: any;
	id: any;
};

/** WHERE condition for "not soft-deleted." Use in every SELECT on a soft-delete table. */
export function notDeleted<T extends SoftDeletable>(table: T) {
	return eq(table.isDeleted, false);
}

/**
 * Soft-delete a single row by id. Pass an already-open transaction (`tx`) when part of a
 * larger transaction (e.g. cascading to child rows), or `db` directly for a single-table delete.
 */
export async function softDelete<T extends SoftDeletable>(
	executor: typeof db,
	table: T,
	id: string,
	actorId: string
) {
	return executor
		.update(table as unknown as AnyMySqlTable)
		.set({ isDeleted: true, deletedAt: new Date(), deletedBy: actorId } as any)
		.where(eq(table.id, id));
}

/** Restore a soft-deleted row. */
export async function restore<T extends SoftDeletable>(executor: typeof db, table: T, id: string) {
	return executor
		.update(table as unknown as AnyMySqlTable)
		.set({ isDeleted: false, deletedAt: null, deletedBy: null } as any)
		.where(eq(table.id, id));
}
```

If the generic typing above fights Drizzle's inference too much in practice, it's fine to skip the
generic helper and just inline `eq(table.isDeleted, false)` / `.set({ isDeleted: true, deletedAt:
new Date(), deletedBy: actorId })` at each call site — the important part is the **behavior**
(never `db.delete()` on these 8 tables again), not this exact helper shape. Keep `notDeleted()`
though; it's cheap and makes every read call site searchable (`grep -rn "notDeleted("`) so you can
audit coverage later.

---

## Part 4 — Rewrite the 8 hard-delete call sites

Cascade rule per entity (decide this once, apply consistently):

- **Delete `item`** → soft-delete the item, and cascade soft-delete its `equipment` rows (ASSET) or
  `stock`/`stock_batch` rows (CONSUMABLE), so nothing active is left dangling under a hidden item.
  `movement`, `inventoryReport`, `itemUnitConversion` stay untouched — they're history and must
  keep referencing the real row.
- **Delete `equipment`** (single unit) → soft-delete only that row.
- **Delete `stock_batch`** → soft-delete the batch, and re-subtract its remaining `qty` from the
  parent `stock.qty` (same effect the old code had via physical delete).
- **Delete `laboratorium`** → soft-delete it. Do not cascade to members/equipment; a lab typically
  gets deleted only once empty, but if not, those child rows just become "orphaned under a hidden
  lab," which is acceptable and reversible via restore.
- **Delete `practicum_schedule`**, **`practicum_module`**, **`kelompok_mahasiswa`** → soft-delete
  only the row itself; their history (assessments, logbooks) keeps referencing it.
- **Delete `user`** → soft-delete **and** set `banned = true` (see caveat in the Context section).

### File: `src/routes/admin/inventaris/alat/[id]/+page.server.ts`

Replace the whole file with:

```ts
import { db } from '$lib/server/db';
import { item, equipment } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { notDeleted } from '$lib/server/db/soft-delete';
import { createAuditLog } from '$lib/server/audit';
import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const itemData = await db
		.select()
		.from(item)
		.where(and(eq(item.id, id), notDeleted(item)));

	if (itemData.length === 0) {
		throw error(404, 'Alat tidak ditemukan');
	}

	return { item: itemData[0] };
};

export const actions: Actions = {
	// Delete a single equipment unit (soft delete)
	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		try {
			const [eqp] = await db
				.select()
				.from(equipment)
				.where(and(eq(equipment.id, id), notDeleted(equipment)))
				.limit(1);
			if (!eqp) return fail(404, { message: 'Alat tidak ditemukan' });

			await db
				.update(equipment)
				.set({ isDeleted: true, deletedAt: new Date(), deletedBy: locals.user.id })
				.where(eq(equipment.id, id));

			await createAuditLog({
				userId: locals.user.id,
				action: 'SOFT_DELETE_EQUIPMENT',
				tableName: 'equipment',
				recordId: id,
				oldValue: eqp
			});

			return { success: true, message: 'Alat berhasil dihapus' };
		} catch (err) {
			console.error('Error deleting equipment:', err);
			return fail(500, { message: 'Gagal menghapus alat.' });
		}
	},

	// Delete the whole item catalog entry (soft delete, cascades to its equipment units)
	deleteItem: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });
		const user = locals.user;
		if (!['kepalaLab', 'laboran', 'superadmin'].includes(user.role)) {
			return fail(403, { message: 'Anda tidak memiliki wewenang untuk menghapus item ini' });
		}

		const { id } = params;
		try {
			const [itm] = await db
				.select()
				.from(item)
				.where(and(eq(item.id, id), notDeleted(item)))
				.limit(1);
			if (!itm) return fail(404, { message: 'Item tidak ditemukan' });

			await db.transaction(async (tx) => {
				await tx
					.update(item)
					.set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
					.where(eq(item.id, id));

				await tx
					.update(equipment)
					.set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
					.where(and(eq(equipment.itemId, id), notDeleted(equipment)));
			});

			await createAuditLog({
				userId: user.id,
				action: 'SOFT_DELETE_ITEM',
				tableName: 'item',
				recordId: id,
				oldValue: itm
			});

			return { success: true, message: 'Item berhasil dihapus' };
		} catch (err: any) {
			console.error('Error deleting item:', err);
			return fail(400, { message: err.message || 'Gagal menghapus item.' });
		}
	}
};
```

The "masih memiliki data unit alat aktif" guard from the old code is gone on purpose — cascading
soft-delete replaces it. If you'd rather keep blocking item deletion while active equipment exists
(a business-rule choice, not a technical one), keep that check and drop the equipment cascade.

### File: `src/routes/admin/inventaris/bhp/[id]/+page.server.ts`

Same treatment. Key differences from `alat`: `deleteBatch` becomes a soft delete that still adjusts
`stock.qty` (unchanged behavior), and `deleteItem` cascades to `stock` (and each `stock`'s
`stock_batch` rows) instead of `equipment`. `stock` itself doesn't have `is_deleted` in this
instruction's scope (only `stock_batch` does, per your table list) — cascading "delete" for `stock`
rows under a deleted item means soft-deleting all their `stock_batch` children and zeroing `qty`;
the `stock` row itself just becomes inert (zero qty, unreachable because its parent `item` is
hidden from every item picker). Rewrite:

```ts
import { db } from '$lib/server/db';
import { item, stock, stockBatch } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notDeleted } from '$lib/server/db/soft-delete';
import { createAuditLog } from '$lib/server/audit';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;
	const itemData = await db
		.select()
		.from(item)
		.where(and(eq(item.id, id), notDeleted(item)));

	if (itemData.length === 0) throw error(404, 'BHP tidak ditemukan');
	return { item: itemData[0] };
};

export const actions: Actions = {
	deleteBatch: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const batchId = formData.get('batchId') as string;
		if (!batchId) return fail(400, { message: 'ID batch diperlukan' });

		try {
			const [batch] = await db
				.select()
				.from(stockBatch)
				.where(and(eq(stockBatch.id, batchId), notDeleted(stockBatch)));
			if (!batch) return fail(404, { message: 'Batch tidak ditemukan' });

			const [s] = await db.select().from(stock).where(eq(stock.id, batch.stockId));
			if (!s) return fail(404, { message: 'Stock tidak ditemukan' });

			if (user.role === 'kepalaLab' || user.role === 'laboran') {
				if (s.laboratoriumId !== user.laboratorium?.id) {
					return fail(403, { message: 'Anda tidak memiliki akses ke laboratorium ini' });
				}
			} else if (user.role !== 'superadmin') {
				return fail(403, { message: 'Forbidden' });
			}

			await db.transaction(async (tx) => {
				await tx
					.update(stock)
					.set({ qty: sql`${stock.qty} - ${batch.qty}` })
					.where(eq(stock.id, s.id));
				await tx
					.update(stockBatch)
					.set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
					.where(eq(stockBatch.id, batchId));
			});

			await createAuditLog({
				userId: user.id,
				action: 'SOFT_DELETE_STOCK_BATCH',
				tableName: 'stock_batch',
				recordId: batchId,
				oldValue: batch
			});

			return { success: true };
		} catch (e: any) {
			console.error(e);
			return fail(500, { message: 'Terjadi kesalahan sistem' });
		}
	},

	deleteItem: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });
		const user = locals.user;
		if (!['kepalaLab', 'laboran', 'superadmin'].includes(user.role)) {
			return fail(403, { message: 'Anda tidak memiliki wewenang untuk menghapus item ini' });
		}

		const { id } = params;
		try {
			const [itm] = await db
				.select()
				.from(item)
				.where(and(eq(item.id, id), notDeleted(item)))
				.limit(1);
			if (!itm) return fail(404, { message: 'BHP tidak ditemukan' });

			await db.transaction(async (tx) => {
				await tx
					.update(item)
					.set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
					.where(eq(item.id, id));

				const stocks = await tx.select().from(stock).where(eq(stock.itemId, id));
				const stockIds = stocks.map((s) => s.id);

				if (stockIds.length > 0) {
					await tx
						.update(stockBatch)
						.set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
						.where(
							and(sql`${stockBatch.stockId} IN (${sql.join(stockIds)})`, notDeleted(stockBatch))
						);
					await tx.update(stock).set({ qty: 0 }).where(eq(stock.itemId, id));
				}
			});

			await createAuditLog({
				userId: user.id,
				action: 'SOFT_DELETE_ITEM',
				tableName: 'item',
				recordId: id,
				oldValue: itm
			});

			return { success: true, message: 'BHP berhasil dihapus' };
		} catch (err: any) {
			console.error('Error deleting BHP:', err);
			return fail(400, { message: err.message || 'Gagal menghapus BHP.' });
		}
	}
};
```

Note this also removes the old "masih memiliki stok aktif" hard block — soft delete makes that
guard unnecessary. Keep it only if you want a business rule, not because of the technical FK issue.

### The remaining 5 hard-delete sites

Apply the same recipe (select-with-`notDeleted`-guard → transaction → `update(...).set({ isDeleted:
true, deletedAt: new Date(), deletedBy })` → `createAuditLog`) to:

- `src/routes/admin/laboratorium/+page.server.ts` — replace `db.delete(laboratorium).where(eq(laboratorium.id, id))`.
  Keep whatever `laboratoriumMember` cleanup already exists as-is (memberships are join rows, not
  in this instruction's soft-delete scope) unless you want to extend scope later (see Part 8).
- `src/routes/admin/jadwal-praktikum/+page.server.ts` — replace `db.delete(practicumSchedule).where(eq(practicumSchedule.id, id))`.
- `src/routes/admin/master/modul/+page.server.ts` — replace `db.delete(practicumModule).where(eq(practicumModule.id, id))`.
- `src/routes/admin/kelompok-mahasiswa/+page.server.ts` — replace `db.delete(kelompokMahasiswa).where(eq(kelompokMahasiswa.id, id))`.
- `src/routes/admin/users/[role_slug]/+page.server.ts` and `src/routes/admin/users/laboran/+page.server.ts`
  — replace `db.delete(user).where(eq(user.id, userId))` with:

  ```ts
  await db
  	.update(user)
  	.set({
  		isDeleted: true,
  		deletedAt: new Date(),
  		deletedBy: locals.user.id,
  		banned: true,
  		banReason: 'Akun dihapus (soft delete)'
  	})
  	.where(eq(user.id, userId));
  ```

  Check whether `banReason` exists on `user` already (it's a standard `better-auth` admin-plugin
  field but may not be declared in `auth.schema.ts` yet — if missing, either add it as a normal
  `text('ban_reason')` column or drop that field from the `.set()` call, `banned: true` alone is
  what matters for blocking sign-in).

---

## Part 5 — Audit every read path (making fetches "aware" of `is_deleted`)

This is the tedious but essential part. Run these to find every call site touching the 8 tables:

```bash
grep -rn "from(item)\|from(equipment)\|from(stockBatch)\|from(laboratorium)\|from(practicumSchedule)\|from(practicumModule)\|from(kelompokMahasiswa)\|from(user)" src
grep -rn "db\.query\.\(item\|equipment\|stockBatch\|laboratorium\|practicumSchedule\|practicumModule\|kelompokMahasiswa\|user\)\." src
```

For each hit, apply this rule — it's the part most agentic passes get wrong, so don't skip it:

- **Selection / picker / list queries** (dropdowns to pick an item for a new lending, active
  equipment lists, "tambah jadwal" lab pickers, user lists, active-lab lists, etc.) → **must** add
  `notDeleted(table)` to the `where`. These are queries whose result the user will act on going
  forward.
- **Historical / already-linked reference reads** (a `lending` row's item name, a
  `practicum_schedule`'s already-assigned `laboratorium`, a `movement` row's item, an old
  `practicumLogbook`'s module name, audit log display) → **do not** filter. The row must still
  render even if its parent was later soft-deleted — that's the entire point of soft delete over
  hard delete. Where it's cheap to do so, show a small "🗑 dihapus" badge when
  `relatedRow.isDeleted` is true, so staff understand why a picker no longer offers it.

For `db.select().from(table).where(...)` calls, add `notDeleted(table)` with `and()`:

```ts
// before
await db.select().from(item).where(eq(item.categoryId, catId));
// after
await db
	.select()
	.from(item)
	.where(and(eq(item.categoryId, catId), notDeleted(item)));
```

For Drizzle's relational query API (`db.query.item.findMany(...)`), the filter goes in `where`, and
**each nested `with` needs its own `where` too** if it's a picker-style nested list — this is the
easy-to-miss spot:

```ts
// before
const rows = await db.query.item.findMany({
	with: { equipment: true }
});

// after
const rows = await db.query.item.findMany({
	where: (item, { eq }) => eq(item.isDeleted, false),
	with: {
		equipment: {
			where: (equipment, { eq }) => eq(equipment.isDeleted, false)
		}
	}
});
```

Go table by table using the file lists already identified for you above (Part 4's table plus every
grep hit) and classify each hit as "selection" or "historical" before editing it. When genuinely
unsure which bucket a query falls into, default to filtering (`notDeleted`) — hiding a soft-deleted
row from a page that turns out to need it is a quick one-line fix later; leaking a soft-deleted row
into a picker is the bug we're fixing.

Skip `src/lib/server/db/seeds/**` entirely — seed scripts run against an empty or dev-only database
and don't need soft-delete awareness.

---

## Part 6 — Optional: minimal trash/restore view

Not required for the bug fix, but soft delete is much more useful with a way to undo. If you want
it, the cheapest version is one query + one button per entity, e.g. for items:

```ts
// list soft-deleted items
const trashed = await db.select().from(item).where(eq(item.isDeleted, true));
```

```ts
// restore action
import { restore } from '$lib/server/db/soft-delete';
await restore(db, item, id);
```

Skip this for now if you just need the delete buttons to stop breaking — it can be added later
without touching anything from Parts 1–5.

---

## Part 7 — Testing checklist

1. `bun run db:generate` then `bun run db:migrate` apply cleanly on a copy of the real database
   (one that already has `movement`/`lending`/`maintenance` history rows referencing `item`/
   `equipment` — that's the exact scenario that used to fail).
2. On `alat/[id]`, delete an equipment unit that has maintenance/lending history → succeeds (used to
   fail with FK error).
3. On `alat/[id]`, delete the whole item → item disappears from `alat` list and from the "tambah
   peminjaman" item picker, but an existing `lending` row that referenced it still shows the item's
   name correctly.
4. Same two checks on `bhp/[id]` for `deleteItem` and `deleteBatch`; confirm `stock.qty` still
   nets out correctly after a batch soft delete.
5. Create a new item with the same name as a soft-deleted one → succeeds (name isn't a unique
   constraint, so this always worked, but confirms nothing broke).
6. Try to register a new user with the same `username`/`email` as a soft-deleted user → succeeds
   (this is the case the generated-column unique index exists to fix — test it specifically).
7. Try to create a new equipment unit with the same `serialNumber` as a soft-deleted one → succeeds.
8. Delete a user → confirm they can no longer log in (banned enforcement via better-auth), and
   confirm they disappear from any "assign instructor"/user picker lists.
9. Soft-delete a `laboratorium`, `practicum_schedule`, `practicum_module`, `kelompok_mahasiswa` →
   each disappears from its respective list/picker, and existing linked records (assessments,
   logbooks, schedules referencing the module) still render.
10. `EXPLAIN` a couple of the hot list queries (e.g. `SELECT * FROM item WHERE is_deleted = false
AND category_id = ?`) to confirm the new composite index is actually used (`key` column in the
    `EXPLAIN` output should show the `_is_deleted_` index, not a full table scan).

---

## Part 8 — Extending this pattern to other tables later

When you decide to add soft delete to more tables (`warehouse`, `stock`, `lending`, `maintenance`,
`practicumClass`, etc.), repeat this exact recipe:

1. Add `...softDeleteColumns` (Part 1's spread) + at least one `index('<table>_is_deleted_idx').on(table.isDeleted)`,
   plus a composite `(is_deleted, <most-filtered column>)` index for its hottest list query.
2. If it has a `.unique()`/`uniqueIndex()` column that should be reusable after delete, apply the
   generated-column trick from Part 2b to that specific column.
3. Find its physical `db.delete(...)` call sites and convert to `update(...).set({ isDeleted: true,
deletedAt: new Date(), deletedBy })`, deciding cascade rules the same way Part 4 did.
4. Grep every `from(<table>)` / `db.query.<table>.` call site and classify each as
   selection-must-filter vs. historical-must-not-filter, per Part 5's rule.
5. Add it to the testing checklist.
