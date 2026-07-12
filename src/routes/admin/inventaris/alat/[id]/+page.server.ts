import { db } from '$lib/server/db';
import { item, equipment, inventoryReport, movement, stockBatch, itemUnitConversion } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const itemData = await db.select().from(item).where(eq(item.id, id));

	if (itemData.length === 0) {
		throw error(404, 'Alat tidak ditemukan');
	}

	return {
		item: itemData[0]
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		try {
			// Check if equipment exists
			const [eqp] = await db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
			if (!eqp) return fail(404, { message: 'Alat tidak ditemukan' });

			await db.delete(equipment).where(eq(equipment.id, id));
			return { success: true, message: 'Alat berhasil dihapus' };
		} catch (err) {
			console.error('Error deleting equipment:', err);
			return fail(500, { message: 'Gagal menghapus alat. Alat mungkin sudah digunakan di jadwal praktikum, peminjaman, atau pemeliharaan.' });
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
			if (!itm) return fail(404, { message: 'Item tidak ditemukan' });

			// Delete all related records in a transaction
			await db.transaction(async (tx) => {
				// Check if there are active equipment entries for this item
				const eqps = await tx.select().from(equipment).where(eq(equipment.itemId, id)).limit(1);
				if (eqps.length > 0) {
					throw new Error('Item ini masih memiliki data unit alat aktif. Hapus semua unit alat terlebih dahulu.');
				}

				// Delete inventoryReport referencing this itemId
				await tx.delete(inventoryReport).where(eq(inventoryReport.itemId, id));

				// Delete movement referencing this itemId (and nullify stockBatch references first)
				const movements = await tx.select({ id: movement.id }).from(movement).where(eq(movement.itemId, id));
				if (movements.length > 0) {
					const movementIds = movements.map(m => m.id);
					await tx.update(stockBatch).set({ movementId: null }).where(sql`${stockBatch.movementId} IN (${sql.join(movementIds)})`);
					await tx.delete(movement).where(eq(movement.itemId, id));
				}

				// Delete item unit conversion
				await tx.delete(itemUnitConversion).where(eq(itemUnitConversion.itemId, id));

				// Finally delete the item itself
				await tx.delete(item).where(eq(item.id, id));
			});

			return { success: true, message: 'Item berhasil dihapus' };
		} catch (err: any) {
			console.error('Error deleting item:', err);
			return fail(400, { message: err.message || 'Gagal menghapus item.' });
		}
	}
};
