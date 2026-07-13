import { db } from '$lib/server/db';
import { item, equipment } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { notDeleted } from '$lib/server/db/soft-delete';
import { createAuditLog } from '$lib/server/audit';
import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const itemData = await db
		.select()
		.from(item)
		.where(and(eq(item.id, id), notDeleted(item)));

	if (itemData.length === 0) {
		throw error(404, 'Alat tidak ditemukan');
	}

	return { item: itemData[0] };
};

export const actions: Actions = {
	// Delete a single equipment unit (soft delete)
	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		try {
			const [eqp] = await db
				.select()
				.from(equipment)
				.where(and(eq(equipment.id, id), notDeleted(equipment)))
				.limit(1);
			if (!eqp) return fail(404, { message: 'Alat tidak ditemukan' });

			await db
				.update(equipment)
				.set({ isDeleted: true, deletedAt: new Date(), deletedBy: locals.user.id })
				.where(eq(equipment.id, id));

			await createAuditLog({
				userId: locals.user.id,
				action: 'SOFT_DELETE_EQUIPMENT',
				tableName: 'equipment',
				recordId: id,
				oldValue: eqp
			});

			return { success: true, message: 'Alat berhasil dihapus' };
		} catch (err) {
			console.error('Error deleting equipment:', err);
			return fail(500, { message: 'Gagal menghapus alat.' });
		}
	},

	// Delete the whole item catalog entry (soft delete, cascades to its equipment units)
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
			if (!itm) return fail(404, { message: 'Item tidak ditemukan' });

			await db.transaction(async (tx) => {
				await tx
					.update(item)
					.set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
					.where(eq(item.id, id));

				await tx
					.update(equipment)
					.set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
					.where(and(eq(equipment.itemId, id), notDeleted(equipment)));
			});

			await createAuditLog({
				userId: user.id,
				action: 'SOFT_DELETE_ITEM',
				tableName: 'item',
				recordId: id,
				oldValue: itm
			});

			return { success: true, message: 'Item berhasil dihapus' };
		} catch (err: any) {
			console.error('Error deleting item:', err);
			return fail(400, { message: err.message || 'Gagal menghapus item.' });
		}
	}
};
