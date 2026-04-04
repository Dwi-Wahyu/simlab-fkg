import { db } from '$lib/server/db';
import { wasteLog, laboratorium } from '$lib/server/db/schema';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { v4 as uuidv4 } from 'uuid';

export const load: PageServerLoad = async () => {
	const laboratories = await db.query.laboratorium.findMany({
		orderBy: (lab, { asc }) => [asc(lab.name)]
	});

	return {
		laboratories
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const laboratoriumId = formData.get('laboratoriumId') as string;
		const wasteType = formData.get('wasteType') as any;
		const weightGram = parseInt(formData.get('weightGram') as string);
		const disposalStatus = formData.get('disposalStatus') as any;
		const notes = formData.get('notes') as string;

		if (!laboratoriumId || !wasteType || isNaN(weightGram)) {
			return fail(400, {
				message: 'Mohon isi semua data yang diperlukan.'
			});
		}

		try {
			await db.insert(wasteLog).values({
				id: uuidv4(),
				laboratoriumId,
				wasteType,
				weightGram,
				picId: locals.user.id,
				disposalStatus: disposalStatus || 'STORED',
				notes,
				createdAt: new Date()
			});

			return {
				success: true,
				message: 'Pencatatan limbah berhasil disimpan.'
			};
		} catch (error) {
			console.error('Error saving waste log:', error);
			return fail(500, {
				message: 'Terjadi kesalahan saat menyimpan data.'
			});
		}
	}
};
