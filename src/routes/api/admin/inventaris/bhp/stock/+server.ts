import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { item, stock, warehouse, movement } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	let body: {
		itemId: string;
		eventType: 'RECEIVE' | 'ISSUE' | 'ADJUSTMENT';
		qty: number;
		notes?: string;
		laboratoriumId: string;
		warehouseId?: string;
	};
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { itemId, eventType, qty, notes, laboratoriumId, warehouseId: reqWarehouseId } = body;

	if (!itemId || !eventType || qty == null || !laboratoriumId) {
		throw error(400, 'itemId, eventType, qty, laboratoriumId required');
	}
	if (!['RECEIVE', 'ISSUE', 'ADJUSTMENT'].includes(eventType)) {
		throw error(400, 'eventType must be RECEIVE, ISSUE, or ADJUSTMENT');
	}

	// Fetch item
	const [targetItem] = await db.select().from(item).where(eq(item.id, itemId)).limit(1);
	if (!targetItem) throw error(404, 'Item not found');
	if (targetItem.type !== 'CONSUMABLE') throw error(400, 'Only CONSUMABLE items supported');

	// Get or create default warehouse
	let wid = reqWarehouseId;
	if (!wid) {
		let defaultWarehouse = await db.query.warehouse.findFirst();
		if (!defaultWarehouse) {
			const [{ insertId }] = await db
				.insert(warehouse)
				.values({ name: 'Gudang Utama', location: 'Default' });
			wid = String(insertId);
		} else {
			wid = defaultWarehouse.id;
		}
	}

	// Get current stock row (may not exist yet)
	const [existingStock] = await db
		.select()
		.from(stock)
		.where(and(eq(stock.itemId, itemId), eq(stock.warehouseId, wid)))
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
		if (existingStock) {
			await tx
				.update(stock)
				.set({ qty: newQty, updatedAt: new Date() })
				.where(eq(stock.id, existingStock.id));
		} else {
			await tx.insert(stock).values({
				id: crypto.randomUUID(),
				itemId,
				warehouseId: wid,
				qty: newQty
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
	});

	return json({
		success: true,
		movementId,
		newQty,
		itemName: targetItem.name
	});
};