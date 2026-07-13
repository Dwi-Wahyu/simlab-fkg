import { db } from '$lib/server/db';
import { item, stock, stockBatch } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notDeleted } from '$lib/server/db/soft-delete';
import { createAuditLog } from '$lib/server/audit';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;
	const itemData = await db
		.select()
		.from(item)
		.where(and(eq(item.id, id), notDeleted(item)));

	if (itemData.length === 0) throw error(404, 'BHP tidak ditemukan');
	return { item: itemData[0] };
};

export const actions: Actions = {
	deleteBatch: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const batchId = formData.get('batchId') as string;
		if (!batchId) return fail(400, { message: 'ID batch diperlukan' });

		try {
			const [batch] = await db
				.select()
				.from(stockBatch)
				.where(and(eq(stockBatch.id, batchId), notDeleted(stockBatch)));
			if (!batch) return fail(404, { message: 'Batch tidak ditemukan' });

			const [s] = await db.select().from(stock).where(eq(stock.id, batch.stockId));
			if (!s) return fail(404, { message: 'Stock tidak ditemukan' });

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
				await tx
					.update(stockBatch)
					.set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
					.where(eq(stockBatch.id, batchId));
			});

			await createAuditLog({
				userId: user.id,
				action: 'SOFT_DELETE_STOCK_BATCH',
				tableName: 'stock_batch',
				recordId: batchId,
				oldValue: batch
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
			const [itm] = await db
				.select()
				.from(item)
				.where(and(eq(item.id, id), notDeleted(item)))
				.limit(1);
			if (!itm) return fail(404, { message: 'BHP tidak ditemukan' });

			await db.transaction(async (tx) => {
				await tx
					.update(item)
					.set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
					.where(eq(item.id, id));

				const stocks = await tx.select().from(stock).where(eq(stock.itemId, id));
				const stockIds = stocks.map((s) => s.id);

				if (stockIds.length > 0) {
					await tx
						.update(stockBatch)
						.set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
						.where(
							and(sql`${stockBatch.stockId} IN (${sql.join(stockIds)})`, notDeleted(stockBatch))
						);
					await tx.update(stock).set({ qty: 0 }).where(eq(stock.itemId, id));
				}
			});

			await createAuditLog({
				userId: user.id,
				action: 'SOFT_DELETE_ITEM',
				tableName: 'item',
				recordId: id,
				oldValue: itm
			});

			return { success: true, message: 'BHP berhasil dihapus' };
		} catch (err: any) {
			console.error('Error deleting BHP:', err);
			return fail(400, { message: err.message || 'Gagal menghapus BHP.' });
		}
	}
};
