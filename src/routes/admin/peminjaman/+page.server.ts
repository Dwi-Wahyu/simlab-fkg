import { db } from '$lib/server/db';
import { lending } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If student (mahasiswa), do not load all lendings on server side (lazy loaded via client API)
	if (locals.user?.role === 'peneliti') {
		return {
			lendings: []
		};
	}

	const currentUser = locals.user;
	const isKepalaLab = currentUser?.role === 'kepalaLab';
	const userLabId = currentUser?.laboratorium?.id;

	const filter = isKepalaLab && userLabId ? eq(lending.laboratoriumId, userLabId) : undefined;

	const lendings = await db.query.lending.findMany({
		where: filter,
		with: {
			requestedByUser: true,
			laboratorium: true,
			items: {
				with: {
					equipment: {
						with: {
							item: true
						}
					}
				}
			}
		},
		orderBy: [desc(lending.createdAt)]
	});

	return {
		lendings
	};
};
