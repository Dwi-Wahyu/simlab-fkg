import { db } from '$lib/server/db';
import { item, stock, stockBatch, inventoryReport, movement, itemUnitConversion } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const itemData = await db.select().from(item).where(eq(item.id, id));

	if (itemData.length === 0) {
		throw error(404, 'BHP tidak ditemukan');
	}

	return {
		item: itemData[0]
	};
};

export const actions: Actions = {
	deleteBatch: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const batchId = formData.get('batchId') as string;

		if (!batchId) {
			return fail(400, { message: 'ID batch diperlukan' });
		}

		try {
			const batchData = await db.select().from(stockBatch).where(eq(stockBatch.id, batchId));
			if (batchData.length === 0) {
				return fail(404, { message: 'Batch tidak ditemukan' });
			}
			const batch = batchData[0];

			const stockData = await db.select().from(stock).where(eq(stock.id, batch.stockId));
			if (stockData.length === 0) {
				return fail(404, { message: 'Stock tidak ditemukan' });
			}
			const s = stockData[0];

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
				await tx.delete(stockBatch).where(eq(stockBatch.id, batchId));
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
			const [itm] = await db.select().from(item).where(eq(item.id, id)).limit(1);
			if (!itm) return fail(404, { message: 'BHP tidak ditemukan' });

			// Delete all related records in a transaction
			await db.transaction(async (tx) => {
				// Check if stock has any entries with non-zero qty
				const stocks = await tx.select().from(stock).where(eq(stock.itemId, id));
				const totalStockQty = stocks.reduce((sum, s) => sum + s.qty, 0);
				if (totalStockQty > 0) {
					throw new Error('Item ini masih memiliki stok aktif. Hapus atau sesuaikan stok terlebih dahulu.');
				}

				// Delete stock batches referencing these stocks
				const stockIds = stocks.map(s => s.id);
				if (stockIds.length > 0) {
					await tx.delete(stockBatch).where(sql`${stockBatch.stockId} IN (${sql.join(stockIds)})`);
					await tx.delete(stock).where(eq(stock.itemId, id));
				}

				// Delete inventoryReport
				await tx.delete(inventoryReport).where(eq(inventoryReport.itemId, id));

				// Delete movements (and clear stock_batch.movementId references first)
				const movements = await tx.select({ id: movement.id }).from(movement).where(eq(movement.itemId, id));
				if (movements.length > 0) {
					const movementIds = movements.map(m => m.id);
					await tx.update(stockBatch).set({ movementId: null }).where(sql`${stockBatch.movementId} IN (${sql.join(movementIds)})`);
					await tx.delete(movement).where(eq(movement.itemId, id));
				}

				// Delete item unit conversion
				await tx.delete(itemUnitConversion).where(eq(itemUnitConversion.itemId, id));

				// Delete the item
				await tx.delete(item).where(eq(item.id, id));
			});

			return { success: true, message: 'BHP berhasil dihapus' };
		} catch (err: any) {
			console.error('Error deleting BHP:', err);
			return fail(400, { message: err.message || 'Gagal menghapus BHP.' });
		}
	}
};
