import { db } from '$lib/server/db';
import {
	practicumSchedule,
	practicumClassMember,
	practicumAssessment,
	practicumModuleCriteria,
	practicumAssessmentCriteriaScore,
	kelompokMahasiswa,
	kelompokMahasiswaMember
} from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq, and, inArray } from 'drizzle-orm';
import { saveAssessment } from '$lib/server/assessment';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
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
	const isKoordinator =
		locals.user.role === 'koordinator' &&
		(!locals.user.laboratorium || schedule.laboratoriumId === locals.user.laboratorium.id);
	const isAuthorized = isInstructor || locals.user.role === 'superadmin' || isKoordinator;
	if (!isAuthorized) {
		throw error(403, 'Forbidden: You are not authorized to view this schedule');
	}

	const classId = schedule.classId!;
	const myInstructorRows = schedule.instructors.filter((i) => i.instructorId === instructorId);
	const myGroupIds = [
		...new Set(myInstructorRows.map((i) => i.groupId).filter((g): g is string => !!g))
	];
	const isScopedUser = !['superadmin', 'koordinator'].includes(locals.user.role);

	const filterGroupId = url.searchParams.get('groupId') || undefined;
	// Untuk user scoped (instruktur biasa): pakai SEMUA kelompok yang jadi tanggung jawabnya.
	// Untuk superadmin/koordinator: tetap pakai filter dropdown groupId tunggal seperti sebelumnya.
	const resolvedGroupIds = isScopedUser ? myGroupIds : filterGroupId ? [filterGroupId] : [];

	let students: any[] = [];
	if (resolvedGroupIds.length > 0) {
		const groupMembers = await db.query.kelompokMahasiswaMember.findMany({
			where: inArray(kelompokMahasiswaMember.kelompokId, resolvedGroupIds),
			with: {
				user: true
			}
		});
		// Dedup jika (secara tidak sengaja) ada mahasiswa yang ganda lintas kelompok.
		const seen = new Set<string>();
		students = groupMembers
			.filter((gm) => {
				if (seen.has(gm.user.id)) return false;
				seen.add(gm.user.id);
				return true;
			})
			.map((gm) => ({ user: gm.user }));
	} else {
		students = await db.query.practicumClassMember.findMany({
			where: eq(practicumClassMember.classId, classId),
			with: {
				user: true
			}
		});
	}

	const assessments = await db.query.practicumAssessment.findMany({
		where: eq(practicumAssessment.scheduleId, scheduleId),
		with: {
			instructor: true
		}
	});

	const modulesWithCriteria = await Promise.all(
		schedule.modules.map(async (sm) => {
			const criteria = await db.query.practicumModuleCriteria.findMany({
				where: eq(practicumModuleCriteria.moduleId, sm.moduleId),
				orderBy: (c, { asc }) => [asc(c.sortOrder)],
				with: {
					bands: {
						orderBy: (b, { desc }) => [desc(b.minScore)]
					}
				}
			});
			return {
				...sm,
				module: {
					...sm.module,
					criteria
				}
			};
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

	const groups = await db.query.kelompokMahasiswa.findMany({
		where: eq(kelompokMahasiswa.classId, classId),
		orderBy: (km, { asc }) => [asc(km.name)]
	});

	const groupMembersInfo =
		groups.length > 0
			? await db.query.kelompokMahasiswaMember.findMany({
					where: inArray(
						kelompokMahasiswaMember.kelompokId,
						groups.map((g) => g.id)
					),
					with: {
						kelompok: true
					}
				})
			: [];

	const studentKelompokMap: Record<string, string> = {};
	for (const gm of groupMembersInfo) {
		studentKelompokMap[gm.userId] = gm.kelompok.name;
	}

	return {
		schedule: {
			...schedule,
			modules: modulesWithCriteria
		},
		students: students.map((s) => s.user).filter(Boolean),
		assessments,
		criteriaScores,
		groups,
		studentKelompokMap,
		selectedGroupId: filterGroupId || '',
		userRole: locals.user.role
	};
};

export const actions: Actions = {
	saveAssessment: async ({ request, locals, params }) => {
		if (!locals.user) throw error(401, 'Unauthorized');
		const scheduleId = params.id;
		const formData = await request.formData();
		const studentId = formData.get('studentId') as string;
		const moduleId = formData.get('moduleId') as string;

		if (!studentId || !moduleId) {
			return fail(400, { message: 'Data tidak lengkap.' });
		}

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
