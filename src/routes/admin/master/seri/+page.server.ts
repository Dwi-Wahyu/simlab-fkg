import { db } from '$lib/server/db';
import { practicumSeries, block, laboratorium } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const series = await db.query.practicumSeries.findMany({
		with: {
			block: true,
			laboratorium: true
		},
		orderBy: (ps, { desc }) => [desc(ps.createdAt)]
	});

	const blocks = await db.query.block.findMany({
		with: {
			department: true
		}
	});

	const labs = await db.query.laboratorium.findMany();

	return {
		series,
		blocks,
		labs
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const blockId = formData.get('blockId') as string;
		const labId = formData.get('labId') as string;

		if (!name) {
			return fail(400, { message: 'Nama seri harus diisi' });
		}

		try {
			await db.insert(practicumSeries).values({
				id: uuidv4(),
				name,
				description,
				blockId: blockId || null,
				laboratoriumId: labId || null
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Gagal menambahkan seri praktikum' });
		}
	},

	update: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const blockId = formData.get('blockId') as string;
		const labId = formData.get('labId') as string;

		if (!id || !name) {
			return fail(400, { message: 'Data tidak lengkap' });
		}

		try {
			await db
				.update(practicumSeries)
				.set({
					name,
					description,
					blockId: blockId || null,
					laboratoriumId: labId || null
				})
				.where(eq(practicumSeries.id, id));

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Gagal memperbarui seri praktikum' });
		}
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		try {
			await db.delete(practicumSeries).where(eq(practicumSeries.id, id));
			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Gagal menghapus seri praktikum' });
		}
	}
};
