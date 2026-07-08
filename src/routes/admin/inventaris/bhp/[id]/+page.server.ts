import { db } from '$lib/server/db';
import { item, stock, stockBatch } from '$lib/server/db/schema';
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
	}
};
