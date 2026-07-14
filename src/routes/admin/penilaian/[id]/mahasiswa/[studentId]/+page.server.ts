import { db } from '$lib/server/db';
import {
	practicumSchedule,
	practicumClassMember,
	practicumAssessment,
	practicumModuleCriteria,
	practicumAssessmentCriteriaScore,
	practicumModule,
	user
} from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq, and, inArray } from 'drizzle-orm';
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

	// Verify authorization: instructor, koordinator of matching lab, or superadmin
	const isInstructor = schedule.instructors.some((i) => i.instructorId === instructorId);
	const isKoordinator =
		locals.user.role === 'koordinator' &&
		(!locals.user.laboratorium || schedule.laboratoriumId === locals.user.laboratorium.id);
	const isAuthorized = isInstructor || locals.user.role === 'superadmin' || isKoordinator;
	if (!isAuthorized) {
		throw error(403, 'Forbidden: You are not authorized to view this schedule');
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

	const modulesWithCriteria = await Promise.all(
		schedule.modules.map(async (m) => {
			const criteria = await db.query.practicumModuleCriteria.findMany({
				where: eq(practicumModuleCriteria.moduleId, m.moduleId),
				orderBy: (c, { asc }) => [asc(c.sortOrder)],
				with: {
					bands: {
						orderBy: (b, { desc }) => [desc(b.minScore)]
					}
				}
			});
			return { ...m, criteria };
		})
	);

	const criteriaScores =
		assessments.length > 0
			? await db.query.practicumAssessmentCriteriaScore.findMany({
					where: inArray(
						practicumAssessmentCriteriaScore.assessmentId,
						assessments.map((a) => a.id)
					)
				})
			: [];

	return {
		schedule: {
			...schedule,
			modules: modulesWithCriteria
		},
		student: studentMember.user,
		assessments,
		criteriaScores
	};
};

import { saveAssessment } from '$lib/server/assessment';

export const actions: Actions = {
	saveAssessment: async ({ request, locals, params }) => {
		if (!locals.user) throw error(401, 'Unauthorized');
		const { id: scheduleId, studentId } = params;
		const formData = await request.formData();
		const moduleId = formData.get('moduleId') as string;

		return await saveAssessment({
			scheduleId,
			studentId,
			moduleId,
			formData,
			userId: locals.user.id,
			userRole: locals.user.role,
			userLaboratoriumId: locals.user.laboratorium?.id
		});
	}
};
