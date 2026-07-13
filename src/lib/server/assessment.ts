import { db } from '$lib/server/db';
import {
	practicumSchedule,
	practicumAssessment,
	practicumModuleCriteria,
	practicumAssessmentCriteriaScore,
	practicumModule
} from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function saveAssessment(params: {
	scheduleId: string;
	studentId: string;
	moduleId: string;
	formData: FormData;
	userId: string;
	userRole: string;
	userLaboratoriumId?: string | null;
}): Promise<any> {
	const {
		scheduleId,
		studentId,
		moduleId,
		formData,
		userId: instructorId,
		userRole,
		userLaboratoriumId
	} = params;

	if (!moduleId) {
		return fail(400, { message: 'Data tidak lengkap' });
	}

	// Verify schedule and authorization
	const schedule = await db.query.practicumSchedule.findFirst({
		where: and(eq(practicumSchedule.id, scheduleId), eq(practicumSchedule.isDeleted, false)),
		with: { instructors: true }
	});
	if (!schedule) {
		return fail(404, { message: 'Schedule tidak ditemukan' });
	}

	const isInstructor = schedule.instructors.some((i) => i.instructorId === instructorId);
	const isKoordinator =
		userRole === 'koordinator' &&
		(!userLaboratoriumId || schedule.laboratoriumId === userLaboratoriumId);
	const isAuthorized = isInstructor || userRole === 'superadmin' || isKoordinator;
	if (!isAuthorized) {
		return fail(403, { message: 'Anda tidak memiliki akses untuk menilai jadwal ini' });
	}

	const moduleObj = await db.query.practicumModule.findFirst({
		where: and(eq(practicumModule.id, moduleId), eq(practicumModule.isDeleted, false)),
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
	const notes = formData.get('notes') as string;
	const scoreRaw = formData.get('score');

	if (moduleObj.scoringMode === 'RUBRIK') {
		for (const crit of moduleObj.criteria) {
			const valRaw = formData.get(`criteriaScore_${crit.id}`);
			if (valRaw === null || valRaw === undefined || valRaw.toString().trim() === '') {
				return fail(400, { message: `Skor untuk kriteria "${crit.name}" wajib diisi` });
			}
			const val = parseInt(valRaw as string);
			if (isNaN(val) || val < 0 || val > crit.maxScore) {
				return fail(400, {
					message: `Skor untuk "${crit.name}" harus antara 0 dan ${crit.maxScore}`
				});
			}
			criteriaInputs.push({ criteriaId: crit.id, score: val });
			finalScore += val;
		}
		if (moduleObj.criteria.length > 0) {
			finalScore = Math.round(finalScore / moduleObj.criteria.length);
		}
	} else if (moduleObj.scoringMode === 'CHECKLIST') {
		let totalScore = 0;
		let totalMax = 0;
		for (const crit of moduleObj.criteria) {
			const valRaw = formData.get(`criteriaScore_${crit.id}`);
			if (valRaw === null || valRaw === undefined || valRaw.toString().trim() === '') {
				return fail(400, { message: `Skor untuk "${crit.name}" wajib diisi` });
			}
			const val = parseInt(valRaw as string);
			if (isNaN(val) || val < 0 || val > crit.maxScore) {
				return fail(400, {
					message: `Skor untuk "${crit.name}" harus antara 0 dan ${crit.maxScore}`
				});
			}
			criteriaInputs.push({ criteriaId: crit.id, score: val });
			totalScore += val;
			totalMax += crit.maxScore;
		}
		finalScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
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
				const isAuthorizedUpdater =
					isOriginalGradeInstructor || userRole === 'superadmin' || isKoordinator;
				if (!isAuthorizedUpdater) {
					throw new Error('UNAUTHORIZED_UPDATE');
				}

				await tx
					.update(practicumAssessment)
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

			if (moduleObj.scoringMode === 'RUBRIK' || moduleObj.scoringMode === 'CHECKLIST') {
				for (const input of criteriaInputs) {
					// Check if there is an existing criteria score
					const existingCriteriaScore = await tx.query.practicumAssessmentCriteriaScore.findFirst({
						where: and(
							eq(practicumAssessmentCriteriaScore.assessmentId, assessmentId!),
							eq(practicumAssessmentCriteriaScore.criteriaId, input.criteriaId)
						)
					});

					if (existingCriteriaScore) {
						await tx
							.update(practicumAssessmentCriteriaScore)
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
				message:
					'Anda tidak memiliki akses untuk mengubah nilai ini. Hanya DPJP yang memberikan nilai pertama kali yang dapat mengubahnya.'
			});
		}
		console.error('Error saving assessment:', err);
		return fail(500, { message: 'Gagal menyimpan penilaian' });
	}

	return { success: true };
}
