import { error, json } from '@sveltejs/kit';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { equipment, item, warehouse } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const user = locals.user;
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const offset = (page - 1) * limit;

	// Enforce laboratory filtering based on user role
	const isRestrictedRole = user.role === 'kepalaLab' || user.role === 'laboran';
	const queryLabId = url.searchParams.get('laboratoriumId');
	const targetLabId = isRestrictedRole
		? (user.laboratorium?.id || 'none')
		: (queryLabId && queryLabId !== '' && queryLabId !== 'all' ? queryLabId : null);

	// Summary data
	const [totalResult] = await db
		.select({ value: count() })
		.from(equipment)
		.where(targetLabId ? eq(equipment.laboratoriumId, targetLabId) : undefined);

	const [baikResult] = await db
		.select({ value: count() })
		.from(equipment)
		.where(
			targetLabId
				? and(eq(equipment.condition, 'BAIK'), eq(equipment.laboratoriumId, targetLabId))
				: eq(equipment.condition, 'BAIK')
		);

	const [rusakResult] = await db
		.select({ value: count() })
		.from(equipment)
		.where(
			targetLabId
				? and(eq(equipment.condition, 'RUSAK'), eq(equipment.laboratoriumId, targetLabId))
				: eq(equipment.condition, 'RUSAK')
		);

	// Per-item aggregated counts filter
	const queryCategoryId = url.searchParams.get('categoryId');
	const conditions = [];
	if (targetLabId) {
		conditions.push(eq(equipment.laboratoriumId, targetLabId));
	}
	if (queryCategoryId) {
		conditions.push(eq(item.categoryId, queryCategoryId));
	}
	if (search) {
		conditions.push(sql`${item.name} LIKE ${'%' + search + '%'}`);
	}
	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
		],
		items: itemStats,
		pagination: { totalItems, totalPages, currentPage: page, limit }
	});
};

