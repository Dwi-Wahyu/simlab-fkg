import { db } from '$lib/server/db';
import { item, equipment } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
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
	}
};
