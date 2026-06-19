import { db } from '$lib/server/db';
import { lending } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If student (peneliti), do not load all lendings on server side (lazy loaded via client API)
	if (locals.user?.role === 'peneliti') {
		return {
			lendings: []
		};
	}

	const lendings = await db.query.lending.findMany({
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
