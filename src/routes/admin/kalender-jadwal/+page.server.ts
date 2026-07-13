import { db } from '$lib/server/db';
import { practicumScheduleInstructor, user, practicumSchedule } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) throw error(401, 'Unauthorized');

	const currentUser = locals.user;
	const role = currentUser.role;
	const userId = currentUser.id;

	const series = await db.query.practicumSeries.findMany({
		with: { laboratorium: true }
	});

	const instructors =
		role !== 'instruktur'
			? await db.query.user.findMany({
					where: and(eq(user.role, 'instruktur'), eq(user.isDeleted, false))
				})
			: [];

	let schedules;

	if (role === 'instruktur') {
		schedules = await db.query.practicumSchedule.findMany({
			where: (table, { exists, and, eq }) =>
				and(
					eq(table.isDeleted, false),
					exists(
						db
							.select()
							.from(practicumScheduleInstructor)
							.where(
								and(
									eq(practicumScheduleInstructor.scheduleId, table.id),
									eq(practicumScheduleInstructor.instructorId, userId)
								)
							)
					)
				),
			with: {
				series: true,
				laboratorium: true,
				instructors: { with: { user: true } },
				modules: { with: { module: true } }
			}
		});
	} else {
		schedules = await db.query.practicumSchedule.findMany({
			where: (table, { eq }) => eq(table.isDeleted, false),
			with: {
				series: true,
				laboratorium: true,
				instructors: { with: { user: true } },
				modules: { with: { module: true } }
			}
		});
	}

	return { schedules, series, instructors, role, currentUserId: userId };
};
