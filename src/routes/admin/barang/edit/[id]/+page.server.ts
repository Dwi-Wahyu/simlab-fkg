import { db } from '$lib/server/db';
import { item } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const data = await db.query.item.findFirst({
		where: and(eq(item.id, params.id), eq(item.type, 'CONSUMABLE'))
	});

	if (!data) throw error(404, 'Barang tidak ditemukan');

	return { consumable: data };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const baseUnit = formData.get('baseUnit') as any;
		const description = formData.get('description') as string;

		try {
			await db.update(item).set({ name, baseUnit, description }).where(eq(item.id, params.id));

			return { success: true, message: 'Data alat berhasil diperbarui' };
		} catch (error) {
			return fail(400, {
				success: false,
				message: 'Gagal update'
			});
		}
	}
};
