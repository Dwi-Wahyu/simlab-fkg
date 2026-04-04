import { db } from '$lib/server/db';
import { lending, user, laboratorium } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
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
