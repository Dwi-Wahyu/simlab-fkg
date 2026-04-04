import { db } from '$lib/server/db';
import { safetyIncident, laboratorium } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
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
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const incidentDateStr = formData.get('incidentDate') as string;
		const severity = formData.get('severity') as any;
		const reporterName = formData.get('reporterName') as string;
		const capa = formData.get('capa') as string;
		const status = formData.get('status') as any;

		if (!laboratoriumId || !title || !incidentDateStr || !severity || !status) {
			return fail(400, {
				message: 'Mohon isi semua data wajib yang ditandai.'
			});
		}

		try {
			await db.insert(safetyIncident).values({
				id: uuidv4(),
				laboratoriumId,
				title,
				description,
				incidentDate: new Date(incidentDateStr),
				severity,
				reporterName,
				capa,
				status,
				createdAt: new Date()
			});

			return {
				success: true,
				message: 'Laporan insiden berhasil disimpan.'
			};
		} catch (error) {
			console.error('Error saving safety incident:', error);
			return fail(500, {
				message: 'Terjadi kesalahan saat menyimpan laporan insiden.'
			});
		}
	}
};
