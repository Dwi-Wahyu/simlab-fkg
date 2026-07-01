import { db } from '$lib/server/db';
import { practicumSchedule, practicumClassMember, practicumAssessment } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const scheduleId = params.id;
	const instructorId = locals.user.id;

	const schedule = await db.query.practicumSchedule.findFirst({
		where: eq(practicumSchedule.id, scheduleId),
		with: {
			laboratorium: true,
			series: true,
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
		}
	});

	if (!schedule) throw error(404, 'Schedule not found');

	// Verify authorization: instructor, koordinator of matching lab, or superadmin
	const isInstructor = schedule.instructors.some((i) => i.instructorId === instructorId);
	const isKoordinator = locals.user.role === 'koordinator' && (!locals.user.laboratorium || schedule.laboratoriumId === locals.user.laboratorium.id);
	const isAuthorized = isInstructor || locals.user.role === 'superadmin' || isKoordinator;
	if (!isAuthorized) {
		throw error(403, 'Forbidden: You are not authorized to view this schedule');
	}

	const students = await db.query.practicumClassMember.findMany({
		where: eq(practicumClassMember.classId, schedule.classId!),
		with: {
			user: true
		}
	});

	const assessments = await db.query.practicumAssessment.findMany({
		where: eq(practicumAssessment.scheduleId, scheduleId),
		with: {
			instructor: true
		}
	});

	return {
		schedule,
		students,
		assessments
	};
};
