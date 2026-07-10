import { json } from '@sveltejs/kit';
import { and, count, desc, asc, eq, like, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { item, laboratorium, stock, stockBatch, warehouse } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, params }) => {
	const { id } = params;
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const sortExp = url.searchParams.get('sortExp') || 'asc';
	const offset = (page - 1) * limit;

	try {
		const itemData = await db.select().from(item).where(eq(item.id, id));
		if (itemData.length === 0) {
			throw new Error('BHP tidak ditemukan');
		}

		const baseCondition = eq(stock.itemId, id);
		const whereClause = search
			? and(
					baseCondition,
					or(
						like(laboratorium.name, `%${search}%`),
						like(stock.brand, `%${search}%`),
						like(stock.variant, `%${search}%`)
					)
				)
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
				createdAt: stockBatch.createdAt,
				laboratoriumName: laboratorium.name,
				laboratoriumId: stock.laboratoriumId,
				warehouseName: warehouse.name,
				brand: stock.brand,
				variant: stock.variant
			})
			.from(stockBatch)
			.innerJoin(stock, eq(stockBatch.stockId, stock.id))
			.leftJoin(laboratorium, eq(stock.laboratoriumId, laboratorium.id))
			.leftJoin(warehouse, eq(stock.warehouseId, warehouse.id))
			.where(whereClause)
			.orderBy(
				sql`${stockBatch.expiryDate} IS NULL ASC`,
				sortExp === 'desc' ? desc(stockBatch.expiryDate) : asc(stockBatch.expiryDate)
			)
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
