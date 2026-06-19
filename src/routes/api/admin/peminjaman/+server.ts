import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const lendings = await db.query.lending.findMany({
			where: eq(lending.requestedBy, locals.user.id),
			with: {
				laboratorium: true,
				requestedByUser: true,
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

		return json({ lendings });
	} catch (error) {
		console.error('Error fetching student lendings:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
