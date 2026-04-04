import { db } from '$lib/server/db';
import { practicumSchedule, practicumClassMember, practicumAssessment, user } from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { id: scheduleId, studentId } = params;
	const instructorId = locals.user.id;

	const schedule = await db.query.practicumSchedule.findFirst({
		where: eq(practicumSchedule.id, scheduleId),
		with: {
			laboratorium: true,
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

	// Verify instructor is part of this schedule
	const isInstructor = schedule.instructors.some((i) => i.instructorId === instructorId);
	if (!isInstructor && locals.user.role !== 'superadmin') {
		throw error(403, 'Forbidden: You are not an instructor for this schedule');
	}

	const studentMember = await db.query.practicumClassMember.findFirst({
		where: and(
			eq(practicumClassMember.classId, schedule.classId!),
			eq(practicumClassMember.userId, studentId)
		),
		with: {
			user: true
		}
	});

	if (!studentMember) throw error(404, 'Student not found in this class');

	const assessments = await db.query.practicumAssessment.findMany({
		where: and(
			eq(practicumAssessment.scheduleId, scheduleId),
			eq(practicumAssessment.studentId, studentId)
		),
		with: {
			instructor: true
		}
	});

	return {
		schedule,
		student: studentMember.user,
		assessments
	};
};

export const actions: Actions = {
	saveAssessment: async ({ request, locals, params }) => {
		if (!locals.user) throw error(401, 'Unauthorized');
		const instructorId = locals.user.id;
		const { id: scheduleId, studentId } = params;

		const formData = await request.formData();
		const moduleId = formData.get('moduleId') as string;
		const score = parseInt(formData.get('score') as string);
		const notes = formData.get('notes') as string;

		if (!moduleId || isNaN(score)) {
			return fail(400, { message: 'Data tidak lengkap' });
		}

		// Check for existing assessment
		const existing = await db.query.practicumAssessment.findFirst({
			where: and(
				eq(practicumAssessment.scheduleId, scheduleId),
				eq(practicumAssessment.studentId, studentId),
				eq(practicumAssessment.moduleId, moduleId)
			)
		});

		if (existing) {
			await db.update(practicumAssessment)
				.set({
					score,
					notes,
					instructorId,
					updatedAt: new Date()
				})
				.where(eq(practicumAssessment.id, existing.id));
		} else {
			await db.insert(practicumAssessment).values({
				id: uuidv4(),
				scheduleId,
				studentId,
				moduleId,
				instructorId,
				score,
				notes,
				status: 'FINAL'
			});
		}

		return { success: true };
	}
};
