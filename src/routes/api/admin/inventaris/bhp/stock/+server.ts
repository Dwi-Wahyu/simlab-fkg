import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { item, stock, warehouse, movement, stockBatch } from '$lib/server/db/schema';
import { eq, and, sql, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

async function deductFefo(tx: any, stockId: string, amount: number) {
	let remaining = amount;
	const batches = await tx.query.stockBatch.findMany({
		where: and(
			eq(stockBatch.stockId, stockId),
			sql`${stockBatch.qty} > 0`,
			eq(stockBatch.isDeleted, false)
		),
		orderBy: (b: any, { asc, sql }: any) => [sql`${b.expiryDate} IS NULL`, asc(b.expiryDate)]
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
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	let body: {
		itemId: string;
		eventType: 'RECEIVE' | 'ISSUE' | 'ADJUSTMENT';
		qty: number;
		notes?: string;
		laboratoriumId: string;
		warehouseId?: string;
		expiryDate?: string;
	};
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const {
		itemId,
		eventType,
		qty,
		notes,
		laboratoriumId,
		warehouseId: reqWarehouseId,
		expiryDate,
		brand,
		variant
	} = body;

	const parsedExpiryDate =
		expiryDate && !isNaN(new Date(expiryDate).getTime())
			? new Date(expiryDate).toISOString().slice(0, 10)
			: null;

	if (!itemId || !eventType || qty == null || !laboratoriumId) {
		throw error(400, 'itemId, eventType, qty, laboratoriumId required');
	}
	if (!['RECEIVE', 'ISSUE', 'ADJUSTMENT'].includes(eventType)) {
		throw error(400, 'eventType must be RECEIVE, ISSUE, or ADJUSTMENT');
	}

	// Fetch item
	const [targetItem] = await db
		.select()
		.from(item)
		.where(and(eq(item.id, itemId), eq(item.isDeleted, false)))
		.limit(1);
	if (!targetItem) throw error(404, 'Item not found');
	if (targetItem.type !== 'CONSUMABLE') throw error(400, 'Only CONSUMABLE items supported');

	// Get or create default warehouse
	let wid = reqWarehouseId;
	if (!wid) {
		let defaultWarehouse = await db.query.warehouse.findFirst();
		if (!defaultWarehouse) {
			const newWarehouseId = crypto.randomUUID();
			await db
				.insert(warehouse)
				.values({ id: newWarehouseId, name: 'Gudang Utama', location: 'Default' });
			wid = newWarehouseId;
		} else {
			wid = defaultWarehouse.id;
		}
	}

	// Get current stock row (may not exist yet)
	const [existingStock] = await db
		.select()
		.from(stock)
		.where(
			and(
				eq(stock.itemId, itemId),
				eq(stock.laboratoriumId, laboratoriumId),
				brand ? eq(stock.brand, brand) : sql`(${stock.brand} IS NULL OR ${stock.brand} = '')`,
				variant
					? eq(stock.variant, variant)
					: sql`(${stock.variant} IS NULL OR ${stock.variant} = '')`
			)
		)
		.limit(1);

	const currentQty = existingStock?.qty ?? 0;

	let newQty: number;
	let movementQty: number;

	if (eventType === 'RECEIVE') {
		newQty = currentQty + qty;
		movementQty = qty;
	} else if (eventType === 'ISSUE') {
		newQty = currentQty - qty;
		movementQty = qty;
		if (newQty < 0) throw error(400, 'Stok tidak mencukupi untuk dikeluarkan');
	} else {
		// ADJUSTMENT — qty is the final target stock
		newQty = qty;
		movementQty = Math.abs(qty - currentQty);
	}

	const minStock = targetItem.minStock ?? 0;
	if (newQty < minStock) {
		throw error(400, `Stok akhir (${newQty}) tidak boleh kurang dari stok minimum (${minStock})`);
	}

	// Transaction: update stock + insert movement
	const movementId = crypto.randomUUID();
	await db.transaction(async (tx) => {
		const stockId = existingStock ? existingStock.id : crypto.randomUUID();
		if (existingStock) {
			await tx
				.update(stock)
				.set({ qty: newQty, updatedAt: new Date() })
				.where(eq(stock.id, existingStock.id));
		} else {
			await tx.insert(stock).values({
				id: stockId,
				itemId,
				warehouseId: wid,
				qty: newQty,
				laboratoriumId,
				brand: brand || '',
				variant: variant || ''
			});
		}

		await tx.insert(movement).values({
			id: movementId,
			itemId,
			eventType,
			qty: movementQty,
			unit: targetItem.baseUnit,
			laboratoriumId,
			notes: notes ?? null,
			picId: locals.user!.id
		});

		if (eventType === 'RECEIVE') {
			await tx.insert(stockBatch).values({
				stockId,
				qty,
				initialQty: qty,
				expiryDate: parsedExpiryDate as any,
				movementId
			});
		} else if (eventType === 'ISSUE') {
			await deductFefo(tx, stockId, qty);
		} else if (eventType === 'ADJUSTMENT') {
			const delta = newQty - currentQty;
			if (delta > 0) {
				await tx.insert(stockBatch).values({
					stockId,
					qty: delta,
					initialQty: delta,
					expiryDate: null,
					movementId,
					notes: 'Batch dari penyesuaian stok (tanggal kedaluwarsa tidak diketahui)'
				});
			} else if (delta < 0) {
				await deductFefo(tx, stockId, Math.abs(delta));
			}
		}
	});

	return json({
		success: true,
		movementId,
		newQty,
		itemName: targetItem.name
	});
};
