import { json } from '@sveltejs/kit';
import { and, count, eq, like, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { equipment, item, warehouse } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, params }) => {
	const { id } = params;
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const offset = (page - 1) * limit;

	try {
		// Prepare where clause for items

		const baseCondition = eq(equipment.itemId, id);
		const whereClause = search
			? and(baseCondition, like(equipment.serialNumber, `%${search}%`))
			: baseCondition;

		const equipmentData = await db.select().from(item).where(eq(item.id, id));

		if (equipmentData.length === 0) {
			throw Error('Alat tidak ditemukan');
		}

		// Get total items for this search (for pagination)
		const [totalItemsResult] = await db
			.select({ value: count() })
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.where(whereClause);

		const totalItems = Number(totalItemsResult.value);
		const totalPages = Math.ceil(totalItems / limit);

		/* Aggregate equipments per item and apply pagination */

		// Fetch all matching equipment with related item and warehouse
		const equipments = await db
			.select({
				id: equipment.id,
				serialNumber: equipment.serialNumber,
				brand: equipment.brand,
				condition: equipment.condition,
				status: equipment.status,
				warehouseName: warehouse.name,
				warehouseLocation: warehouse.location,
				itemName: item.name,
				itemCategory: item.equipmentType,
				storageLocation: equipment.storageLocation,
				createdAt: equipment.createdAt
			})
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
			.where(whereClause)
			.orderBy(equipment.createdAt)
			.limit(limit)
			.offset(offset);

		// Total items for pagination (distinct items)
		const distinctTotalItems = equipments.length;
		const distinctTotalPages = Math.ceil(distinctTotalItems / limit);

		// Apply pagination on aggregated items
		const startIdx = (page - 1) * limit;
		const paginatedItems = equipments.slice(startIdx, startIdx + limit);

		return json({
			equipment: equipmentData[0],
			equipments,
			pagination: {
				totalItems,
				totalPages,
				currentPage: page,
				limit
			}
		});
	} catch (error) {
		return json({
			equipment: null,
			equipments: [],
			pagination: {
				totalItems: 0,
				totalPages: 0,
				currentPage: page,
				limit
			}
		});
	}
};
