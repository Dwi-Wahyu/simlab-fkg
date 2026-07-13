---
name: aggregate-child-counts
description: Aggregate child records (equipment/items) with conditional status/condition counts per parent using SQL CASE WHEN, with pagination over distinct parents.
source: auto-skill
extracted_at: '2026-06-20T22:35:19.766Z'
---

# Aggregate child record counts per parent (conditional + paginated)

Use when building a table that shows each parent item (e.g., inventory item) with counts of its child records (e.g., equipment units) broken down by status/condition — without fetching individual child details.

## Pattern

### 1. Single SQL query with conditional aggregates

Use `count(sql\`CASE WHEN ... THEN 1 END\`)`inside a single`GROUP BY` query instead of fetching all children and aggregating in JS:

```ts
import { count, eq, sql } from 'drizzle-orm';

const results = await db
	.select({
		id: item.id,
		name: item.name,
		total: count(),
		baik: count(sql`CASE WHEN ${equipment.condition} = 'BAIK' THEN 1 END`),
		rusakRingan: count(sql`CASE WHEN ${equipment.condition} = 'RUSAK_RINGAN' THEN 1 END`),
		rusakBerat: count(sql`CASE WHEN ${equipment.condition} = 'RUSAK_BERAT' THEN 1 END`),
		ready: count(sql`CASE WHEN ${equipment.status} = 'READY' THEN 1 END`)
	})
	.from(equipment)
	.innerJoin(item, eq(equipment.itemId, item.id))
	.groupBy(item.id)
	.orderBy(item.name)
	.limit(limit)
	.offset(offset);
```

### 2. Pagination over distinct parents

Total count of distinct parents (not total child rows):

```ts
const [totalResult] = await db
	.select({ value: sql<number>`count(distinct ${item.id})` })
	.from(equipment)
	.innerJoin(item, eq(equipment.itemId, item.id))
	.where(whereClause);
```

### 3. Search filtering

Pass search condition as optional `whereClause`:

```ts
const whereClause = search ? sql`${item.name} LIKE ${'%' + search + '%'}` : undefined;
```

Include `whereClause` in **both** the aggregate query and the count(distinct) query so pagination stays consistent.

## When to use

- Table shows parent items (rows) with child status breakdown (columns)
- No need for individual child record details in the list view
- Performance: avoids N+1 queries or fetching all child rows to the app server

## Variants

- Any enum field works: replace `condition` / `status` with your own enum columns
- Works for any one-to-many relation: orders→line-items, tickets→status-updates, etc.
- For boolean flags: `count(sql\`CASE WHEN ${table}.is_active THEN 1 END\`)`
