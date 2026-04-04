import { db } from '$lib/server/db';
import { maintenance, equipment, item } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.user;
	if (!session) return { calibrations: [] };

	const calibrations = await db.query.maintenance.findMany({
		where: eq(maintenance.maintenanceType, 'KALIBRASI'),
		with: {
			equipment: {
				with: {
					item: true
				}
			}
		},
		orderBy: [desc(maintenance.completionDate)]
	});

	return {
		calibrations
	};
};
