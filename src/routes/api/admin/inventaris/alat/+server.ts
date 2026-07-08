import { json } from '@sveltejs/kit';
import { count, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { equipment, item, warehouse } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const offset = (page - 1) * limit;

	// Summary data
	const [totalResult] = await db.select({ value: count() }).from(equipment);
	const [baikResult] = await db
		.select({ value: count() })
		.from(equipment)
		.where(eq(equipment.condition, 'BAIK'));
	const [rusakResult] = await db
		.select({ value: count() })
		.from(equipment)
		.where(eq(equipment.condition, 'RUSAK'));
	const [readyResult] = await db
		.select({ value: count() })
		.from(equipment)
		.where(eq(equipment.status, 'READY'));

	// Per-item aggregated counts
	const whereClause = search ? sql`${item.name} LIKE ${'%' + search + '%'}` : undefined;

	const itemStats = await db
		.select({
			id: item.id,
			name: item.name,
			equipmentType: item.equipmentType,
			total: count(),
			baik: count(sql`CASE WHEN ${equipment.condition} = 'BAIK' THEN 1 END`),
			rusak: count(sql`CASE WHEN ${equipment.condition} = 'RUSAK' THEN 1 END`),
			ready: count(sql`CASE WHEN ${equipment.status} = 'READY' THEN 1 END`)
		})
		.from(equipment)
		.innerJoin(item, eq(equipment.itemId, item.id))
		.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
		.where(whereClause)
		.groupBy(item.id)
		.orderBy(desc(item.createdAt))
		.limit(limit)
		.offset(offset);

	// Total distinct items for pagination
	const [totalItemsResult] = await db
		.select({ value: sql<number>`count(distinct ${item.id})` })
		.from(equipment)
		.innerJoin(item, eq(equipment.itemId, item.id))
		.where(whereClause);

	const totalItems = Number(totalItemsResult.value);
	const totalPages = Math.ceil(totalItems / limit);

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
				label: 'Kondisi Rusak',
				value: rusakResult.value,
				color: 'text-red-600',
				icon: 'XCircle'
			}
			// { label: 'Ready', value: readyResult.value, color: 'text-emerald-600', icon: 'ShieldCheck' }
		],
		items: itemStats,
		pagination: { totalItems, totalPages, currentPage: page, limit }
	});
};
