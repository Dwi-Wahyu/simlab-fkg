import { db } from '$lib/server/db';
import { practicumSeries, practicumSchedule, practicumLogbookGeneration } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const series = await db.query.practicumSeries.findMany({
		orderBy: (ps, { desc }) => [desc(ps.createdAt)]
	});

	return {
		series
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;

		if (!name) {
			return fail(400, { message: 'Nama seri harus diisi' });
		}

		try {
			await db.insert(practicumSeries).values({
				id: uuidv4(),
				name,
				description
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

		if (!id || !name) {
			return fail(400, { message: 'Data tidak lengkap' });
		}

		try {
			await db
				.update(practicumSeries)
				.set({
					name,
					description
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

		const [{ scheduleCount }] = await db
			.select({ scheduleCount: count() })
			.from(practicumSchedule)
			.where(eq(practicumSchedule.seriesId, id));

		const [{ logbookCount }] = await db
			.select({ logbookCount: count() })
			.from(practicumLogbookGeneration)
			.where(eq(practicumLogbookGeneration.seriesId, id));

		if (scheduleCount > 0 || logbookCount > 0) {
			return fail(400, {
				message: `Seri ini tidak bisa dihapus karena masih dipakai oleh ${scheduleCount} jadwal dan ${logbookCount} riwayat logbook. Hapus atau pindahkan jadwal terkait terlebih dahulu.`
			});
		}

		try {
			await db.delete(practicumSeries).where(eq(practicumSeries.id, id));
			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Gagal menghapus seri praktikum' });
		}
	}
};
