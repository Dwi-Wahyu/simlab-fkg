import { db } from '$lib/server/db';
import { maintenanceCost } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = await locals.user;
	if (!session) throw redirect(302, '/');

	const cost = await db.query.maintenanceCost.findFirst({
		where: eq(maintenanceCost.id, params.id),
		with: {
			maintenance: {
				with: {
					equipment: {
						with: {
							item: true
						}
					}
				}
			},
			items: true
		}
	});

	if (!cost) {
		throw error(404, 'Data analisis biaya tidak ditemukan');
	}

	return {
		cost
	};
};
