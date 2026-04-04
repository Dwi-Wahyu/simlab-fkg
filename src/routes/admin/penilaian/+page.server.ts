import { db } from '$lib/server/db';
import { practicumSchedule, practicumScheduleInstructor } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { eq, exists, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const instructorId = locals.user.id;

	const schedules = await db.query.practicumSchedule.findMany({
		where: (table, { exists }) => exists(
			db.select()
				.from(practicumScheduleInstructor)
				.where(and(
					eq(practicumScheduleInstructor.scheduleId, table.id),
					eq(practicumScheduleInstructor.instructorId, instructorId)
				))
		),
		with: {
			laboratorium: true,
			block: {
				with: {
					department: true
				}
			},
			modules: {
				with: {
					module: true
				}
			},
			instructors: {
				with: {
					user: true
				}
			}
		},
		orderBy: (practicumSchedule, { desc }) => [desc(practicumSchedule.startTime)]
	});

	return {
		schedules
	};
};
