import { error, json } from '@sveltejs/kit';
import { and, count, desc, asc, eq, sql } from 'drizzle-orm';
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
	const sort = url.searchParams.get('sort') || '';
	const offset = (page - 1) * limit;

	// Enforce laboratory filtering based on user role
	const isRestrictedRole = user.role === 'kepalaLab' || user.role === 'laboran';
	const queryLabId = url.searchParams.get('laboratoriumId');
	const targetLabId = isRestrictedRole
		? user.laboratorium?.id || 'none'
		: queryLabId && queryLabId !== '' && queryLabId !== 'all'
			? queryLabId
			: null;

	// Summary data
	const [totalResult] = await db
		.select({ value: count() })
		.from(equipment)
		.where(
			targetLabId
				? and(eq(equipment.laboratoriumId, targetLabId), eq(equipment.isDeleted, false))
				: eq(equipment.isDeleted, false)
		);

	const [baikResult] = await db
		.select({ value: count() })
		.from(equipment)
		.where(
			targetLabId
				? and(
						eq(equipment.condition, 'BAIK'),
						eq(equipment.laboratoriumId, targetLabId),
						eq(equipment.isDeleted, false)
					)
				: and(eq(equipment.condition, 'BAIK'), eq(equipment.isDeleted, false))
		);

	const [rusakResult] = await db
		.select({ value: count() })
		.from(equipment)
		.where(
			targetLabId
				? and(
						eq(equipment.condition, 'RUSAK'),
						eq(equipment.laboratoriumId, targetLabId),
						eq(equipment.isDeleted, false)
					)
				: and(eq(equipment.condition, 'RUSAK'), eq(equipment.isDeleted, false))
		);

	// Per-item aggregated counts filter
	const queryCategoryId = url.searchParams.get('categoryId');
	const conditions = [eq(equipment.isDeleted, false), eq(item.isDeleted, false)];
	if (targetLabId) {
		conditions.push(eq(equipment.laboratoriumId, targetLabId));
	}
	if (queryCategoryId) {
		conditions.push(eq(item.categoryId, queryCategoryId));
	}
	if (search) {
		conditions.push(sql`${item.name} LIKE ${'%' + search + '%'}`);
	}
	const whereClause = and(...conditions);

	const groupByParam = url.searchParams.get('groupBy') || url.searchParams.get('view');
	const isGroupedView = groupByParam === 'category' || groupByParam === 'grouped';
	const effectiveLimit = isGroupedView ? 1000 : limit;
	const effectiveOffset = isGroupedView ? 0 : offset;

	const itemStats = await db
		.select({
			id: item.id,
			name: item.name,
			categoryId: item.categoryId,
			equipmentType: item.equipmentType,
			createdAt: item.createdAt,
			hideNewBadge: item.hideNewBadge,
			total: count(),
			baik: count(sql`CASE WHEN ${equipment.condition} = 'BAIK' THEN 1 END`),
			rusak: count(sql`CASE WHEN ${equipment.condition} = 'RUSAK' THEN 1 END`),
			ready: count(sql`CASE WHEN ${equipment.status} = 'READY' THEN 1 END`)
		})
		.from(equipment)
		.innerJoin(item, eq(equipment.itemId, item.id))
		.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
		.where(whereClause)
		.groupBy(item.id, item.name, item.categoryId, item.equipmentType, item.createdAt, item.hideNewBadge)
		.orderBy(
			...(sort === 'asc'
				? [asc(item.name)]
				: sort === 'desc'
					? [desc(item.name)]
					: [desc(sql`MAX(${equipment.createdAt})`), desc(item.createdAt)])
		)
		.limit(effectiveLimit)
		.offset(effectiveOffset);

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
