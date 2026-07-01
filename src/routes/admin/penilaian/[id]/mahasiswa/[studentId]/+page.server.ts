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
	const isKoordinator = locals.user.role === 'koordinator' && (!locals.user.laboratorium || schedule.laboratoriumId === locals.user.laboratorium.id);
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
				orderBy: (c, { asc }) => [asc(c.sortOrder)]
			});
			return { ...m, criteria };
		})
	);

	const criteriaScores = assessments.length > 0
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

export const actions: Actions = {
	saveAssessment: async ({ request, locals, params }) => {
		if (!locals.user) throw error(401, 'Unauthorized');
		const instructorId = locals.user.id;
		const { id: scheduleId, studentId } = params;

		const formData = await request.formData();
		const moduleId = formData.get('moduleId') as string;
		const scoreRaw = formData.get('score');
		const notes = formData.get('notes') as string;

		if (!moduleId) {
			return fail(400, { message: 'Data tidak lengkap' });
		}

		// Verify schedule and authorization
		const schedule = await db.query.practicumSchedule.findFirst({
			where: eq(practicumSchedule.id, scheduleId),
			with: { instructors: true }
		});
		if (!schedule) throw error(404, 'Schedule not found');

		const isInstructor = schedule.instructors.some((i) => i.instructorId === instructorId);
		const isKoordinator = locals.user.role === 'koordinator' && (!locals.user.laboratorium || schedule.laboratoriumId === locals.user.laboratorium.id);
		const isAuthorized = isInstructor || locals.user.role === 'superadmin' || isKoordinator;
		if (!isAuthorized) {
			return fail(403, { message: 'Anda tidak memiliki akses untuk menilai jadwal ini' });
		}

		const moduleObj = await db.query.practicumModule.findFirst({
			where: eq(practicumModule.id, moduleId),
			with: {
				criteria: {
					orderBy: (c, { asc }) => [asc(c.sortOrder)]
				}
			}
		});
		if (!moduleObj) {
			return fail(400, { message: 'Modul tidak ditemukan' });
		}

		let finalScore = 0;
		const criteriaInputs: { criteriaId: string; score: number }[] = [];

		if (moduleObj.scoringMode === 'RUBRIK') {
			for (const crit of moduleObj.criteria) {
				const valRaw = formData.get(`criteriaScore_${crit.id}`);
				if (valRaw === null || valRaw === undefined || valRaw.toString().trim() === '') {
					return fail(400, { message: `Skor untuk kriteria "${crit.name}" wajib diisi` });
				}
				const val = parseInt(valRaw as string);
				if (isNaN(val) || val < 0 || val > crit.maxScore) {
					return fail(400, { message: `Skor untuk "${crit.name}" harus antara 0 dan ${crit.maxScore}` });
				}
				criteriaInputs.push({ criteriaId: crit.id, score: val });
				finalScore += val;
			}
			if (moduleObj.criteria.length > 0) {
				finalScore = Math.round(finalScore / moduleObj.criteria.length);
			}
		} else {
			if (scoreRaw === null || scoreRaw === undefined || scoreRaw.toString().trim() === '') {
				return fail(400, { message: 'Skor wajib diisi' });
			}
			const score = parseInt(scoreRaw as string);
			if (isNaN(score) || score < 0 || score > 100) {
				return fail(400, { message: 'Skor harus antara 0 dan 100' });
			}
			finalScore = score;
		}

		// Check for existing assessment
		const existing = await db.query.practicumAssessment.findFirst({
			where: and(
				eq(practicumAssessment.scheduleId, scheduleId),
				eq(practicumAssessment.studentId, studentId),
				eq(practicumAssessment.moduleId, moduleId)
			)
		});

		try {
			await db.transaction(async (tx) => {
				let assessmentId = existing?.id;
				if (existing) {
					// Rule: Only the first instructor who graded or coordinator/superadmin can update the grade
					const isOriginalGradeInstructor = existing.instructorId === instructorId;
					const isAuthorizedUpdater = isOriginalGradeInstructor || locals.user.role === 'superadmin' || isKoordinator;
					if (!isAuthorizedUpdater) {
						throw new Error('UNAUTHORIZED_UPDATE');
					}

					await tx.update(practicumAssessment)
						.set({
							score: finalScore,
							notes,
							updatedAt: new Date()
						})
						.where(eq(practicumAssessment.id, existing.id));
				} else {
					assessmentId = uuidv4();
					await tx.insert(practicumAssessment).values({
						id: assessmentId,
						scheduleId,
						studentId,
						moduleId,
						instructorId,
						score: finalScore,
						notes,
						status: 'FINAL'
					});
				}

				if (moduleObj.scoringMode === 'RUBRIK') {
					for (const input of criteriaInputs) {
						// Check if there is an existing criteria score
						const existingCriteriaScore = await tx.query.practicumAssessmentCriteriaScore.findFirst({
							where: and(
								eq(practicumAssessmentCriteriaScore.assessmentId, assessmentId!),
								eq(practicumAssessmentCriteriaScore.criteriaId, input.criteriaId)
							)
						});

						if (existingCriteriaScore) {
							await tx.update(practicumAssessmentCriteriaScore)
								.set({
									score: input.score,
									updatedAt: new Date()
								})
								.where(eq(practicumAssessmentCriteriaScore.id, existingCriteriaScore.id));
						} else {
							await tx.insert(practicumAssessmentCriteriaScore).values({
								id: uuidv4(),
								assessmentId: assessmentId!,
								criteriaId: input.criteriaId,
								score: input.score
							});
						}
					}
				}
			});
		} catch (err: any) {
			if (err.message === 'UNAUTHORIZED_UPDATE') {
				return fail(403, { 
					message: 'Anda tidak memiliki akses untuk mengubah nilai ini. Hanya instruktur yang memberikan nilai pertama kali yang dapat mengubahnya.' 
				});
			}
			console.error('Error saving assessment:', err);
			return fail(500, { message: 'Gagal menyimpan penilaian' });
		}

		return { success: true };
	}
};
