import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending } from '$lib/server/db/schema';
import { desc, eq, or } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const currentUser = locals.user;
	const isKepalaLab = currentUser.role === 'kepalaLab';
	const userLabId = currentUser.laboratorium?.id;
	const isStudentOrDosen = ['mahasiswa', 'dosen'].includes(currentUser.role);

	let whereClause;
	if (isStudentOrDosen) {
		whereClause = eq(lending.requestedBy, currentUser.id);
	} else if (isKepalaLab && userLabId) {
		whereClause = or(eq(lending.laboratoriumId, userLabId), eq(lending.status, 'DRAFT'));
	}

	try {
		const lendings = await db.query.lending.findMany({
			where: whereClause,
			with: {
				laboratorium: true,
				requestedByUser: true,
				items: {
					with: {
						equipment: {
							with: {
								item: true
							}
						},
						requestedItem: true
					}
				}
			},
			orderBy: [desc(lending.createdAt)]
		});

		return json({ lendings });
	} catch (error) {
		console.error('Error fetching lendings:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
