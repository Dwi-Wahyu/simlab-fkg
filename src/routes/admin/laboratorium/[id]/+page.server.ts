import { base } from '$app/paths';
import { db } from '$lib/server/db';
import { laboratorium } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userSession = locals.user;
	if (!userSession || userSession.role !== 'superadmin') {
		throw redirect(302, `${base}/admin/dashboard`);
	}

	const lab = await db.query.laboratorium.findFirst({
		where: eq(laboratorium.id, params.id),
		with: {
			members: {
				with: {
					user: true
				}
			}
		}
	});

	if (!lab) {
		throw error(404, 'Laboratorium tidak ditemukan');
	}

	// Fetch some stats (e.g., number of equipments)
	// This depends on the equipment table having laboratoriumId
	const equipmentCount = await db.query.equipment.findMany({
		where: (equipment, { eq }) => eq(equipment.laboratoriumId, params.id)
	}).then(res => res.length);

	return {
		lab,
		stats: {
			equipmentCount
		}
	};
};
