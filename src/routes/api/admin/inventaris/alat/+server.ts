import { json } from '@sveltejs/kit';
import { count, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { equipment, item, warehouse } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const offset = (page - 1) * limit;

	// Summary data (always calculated from all data)
	const [totalResult] = await db.select({ value: count() }).from(equipment);
	const [baikResult] = await db
		.select({ value: count() })
		.from(equipment)
		.where(eq(equipment.condition, 'BAIK'));
	const [sedangResult] = await db
		.select({ value: count() })
		.from(equipment)
		.where(eq(equipment.condition, 'RUSAK_RINGAN'));
	const [rusakResult] = await db
		.select({ value: count() })
		.from(equipment)
		.where(eq(equipment.condition, 'RUSAK_BERAT'));

	// Prepare where clause for items
	let whereClause;
	if (search) {
		whereClause = sql`${item.name} LIKE ${'%' + search + '%'}`;
	}

	// Get total items for this search (for pagination)
	const [totalItemsResult] = await db
		.select({ value: count() })
		.from(equipment)
		.innerJoin(item, eq(equipment.itemId, item.id))
		.where(whereClause);

	const totalItems = Number(totalItemsResult.count || totalItemsResult.value);
	const totalPages = Math.ceil(totalItems / limit);

	const equipments = await db.query.equipment.findMany({
		where: (fields, { eq, and, or }) => {
			if (!search) return undefined;
			// Note: findMany's where doesn't easily support joins in the same way as select().from()
			// but we can use the results of the select if needed or stick to the simpler approach if it works.
			// Actually, better to use standard select().from() for complex joins with filters
			return undefined;
		},
		with: {
			item: true,
			warehouse: true
		}
	});

	// Re-doing with standard query to support search better with joins
	const itemsQuery = db
		.select({
			equipment: equipment,
			item: item,
			warehouse: warehouse
		})
		.from(equipment)
		.innerJoin(item, eq(equipment.itemId, item.id))
		.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
		.where(whereClause)
		.limit(limit)
		.offset(offset)
		.orderBy(item.name);

	const results = await itemsQuery;

	const data = results.map((r) => ({
		id: r.equipment.id,
		name: r.item.name,
		serialNumber: r.equipment.serialNumber || '-',
		brand: r.equipment.brand || '-',
		condition: r.equipment.condition,
		status: r.equipment.status,
		warehouse: r.warehouse?.name || '-',
		category: r.item.equipmentType || '-'
	}));

	return json({
		summary: [
			{
				label: 'Total Alat',
				value: totalResult.value,
				color: 'text-blue-600',
				icon: 'Package'
			},
			{
				label: 'Kondisi Baik',
				value: baikResult.value,
				color: 'text-green-600',
				icon: 'CheckCircle'
			},
			{
				label: 'Kondisi Sedang',
				value: sedangResult.value,
				color: 'text-yellow-600',
				icon: 'AlertTriangle'
			},
			{
				label: 'Kondisi Rusak',
				value: rusakResult.value,
				color: 'text-red-600',
				icon: 'XCircle'
			}
		],
		items: data,
		pagination: {
			totalItems,
			totalPages,
			currentPage: page,
			limit
		}
	});
};
