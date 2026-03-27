import { fail, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { maintenance, organization } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// Ambil ID organisasi berdasarkan slug dari URL
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, params.org_slug)
	});

	if (!org) {
		throw error(404, 'Organization not found');
	}

	const maintenanceList = await db.query.maintenance.findMany({
		with: {
			equipment: {
				with: {
					item: true
				}
			}
		},
		orderBy: [desc(maintenance.scheduledDate)]
	});

	// Filter maintenanceList berdasarkan organizationId (jika equipment ada)
	const filteredMaintenance = maintenanceList.filter(
		(m) => m.equipment?.organizationId === org.id
	);

	return { 
		maintenance: filteredMaintenance,
		org_slug: params.org_slug
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { message: 'ID tidak ditemukan' });
		}

		try {
			// Cek apakah data ada sebelum dihapus
			const existing = await db.query.maintenance.findFirst({
				where: eq(maintenance.id, id)
			});

			if (!existing) {
				return fail(404, { message: 'Data pemeliharaan tidak ditemukan' });
			}

			await db.delete(maintenance).where(eq(maintenance.id, id));
		} catch (err) {
			console.error('Error deleting maintenance:', err);
			return fail(500, { message: 'Kesalahan server internal saat menghapus data' });
		}

		return { success: true, message: 'Data berhasil dihapus' };
	}
};
