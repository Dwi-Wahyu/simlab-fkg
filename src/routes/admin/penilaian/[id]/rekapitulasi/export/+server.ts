import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	practicumSchedule,
	practicumClassMember,
	practicumAssessment,
	user,
	kelompokMahasiswa,
	kelompokMahasiswaMember
} from '$lib/server/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { buildRekapColumns } from '$lib/rekap/buildRekapMatrix';
import type { RequestHandler } from './$types';
import { buildRekapWorkbookBuffer } from '$lib/server/rekap/buildRekapWorkbook';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const scheduleId = params.id;
	const schedule = await db.query.practicumSchedule.findFirst({
		where: eq(practicumSchedule.id, scheduleId),
		with: {
			series: true,
			block: true,
			practicumClass: true,
			instructors: { with: { user: true } },
			modules: { with: { module: true } }
		}
	});
	if (!schedule) throw error(404, 'Schedule not found');

	const isInstructor = schedule.instructors.some((i) => i.instructorId === locals.user.id);
	if (!isInstructor && !['superadmin', 'koordinator'].includes(locals.user.role)) {
		throw error(403, 'Forbidden');
	}

	let allSchedules = [schedule];
	if (schedule.seriesId && schedule.classId) {
		allSchedules = await db.query.practicumSchedule.findMany({
			where: and(
				eq(practicumSchedule.seriesId, schedule.seriesId),
				eq(practicumSchedule.classId, schedule.classId)
			),
			with: {
				series: true,
				block: true,
				practicumClass: true,
				instructors: { with: { user: true } },
				modules: { with: { module: true } }
			},
			orderBy: [practicumSchedule.startTime]
		});
	} else {
		allSchedules = [schedule];
	}

	const groups = buildRekapColumns(
		allSchedules.map((s) => ({ id: s.id, title: s.title, modules: s.modules.map((m) => m.module) }))
	);

	const students = await db
		.select({ userId: practicumClassMember.userId, name: user.name, username: user.username })
		.from(practicumClassMember)
		.innerJoin(user, eq(practicumClassMember.userId, user.id))
		.where(eq(practicumClassMember.classId, schedule.classId!));

	const groupsList = await db.query.kelompokMahasiswa.findMany({
		where: eq(kelompokMahasiswa.classId, schedule.classId!),
		orderBy: (km, { asc }) => [asc(km.name)]
	});

	const memberRows =
		groupsList.length > 0
			? await db.query.kelompokMahasiswaMember.findMany({
					where: inArray(
						kelompokMahasiswaMember.kelompokId,
						groupsList.map((g) => g.id)
					)
				})
			: [];

	const membersByGroup = new Map<string, Set<string>>();
	for (const row of memberRows) {
		if (!membersByGroup.has(row.kelompokId)) {
			membersByGroup.set(row.kelompokId, new Set<string>());
		}
		membersByGroup.get(row.kelompokId)!.add(row.userId);
	}

	const groupInstructorsMap = new Map<string, Map<string, string>>();
	for (const s of allSchedules) {
		for (const inst of s.instructors) {
			if (inst.groupId && inst.user) {
				if (!groupInstructorsMap.has(inst.groupId)) {
					groupInstructorsMap.set(inst.groupId, new Map<string, string>());
				}
				groupInstructorsMap.get(inst.groupId)!.set(inst.instructorId, inst.user.name);
			}
		}
	}

	const penilaiByGroup = new Map<string, string>();
	for (const [groupId, userMap] of groupInstructorsMap.entries()) {
		const names = Array.from(userMap.values());
		penilaiByGroup.set(groupId, names.join(', '));
	}

	let sheets: any[] = [];
	if (groupsList.length > 0) {
		sheets = groupsList
			.map((g) => ({
				sheetName: g.name,
				penilai: penilaiByGroup.get(g.id) ?? '-',
				students: students.filter((s) => (membersByGroup.get(g.id) ?? new Set()).has(s.userId))
			}))
			.filter((s) => s.students.length > 0);

		const assignedStudentIds = new Set(sheets.flatMap((s) => s.students.map((st) => st.userId)));
		const unassignedStudents = students.filter((s) => !assignedStudentIds.has(s.userId));
		if (unassignedStudents.length > 0) {
			sheets.push({ sheetName: 'Tanpa Kelompok', penilai: '-', students: unassignedStudents });
		}
	} else {
		sheets = [
			{
				sheetName: 'Rekapitulasi Nilai',
				penilai: '-',
				students
			}
		];
	}

	const scheduleIds = allSchedules.map((s) => s.id);
	const assessments = await db.query.practicumAssessment.findMany({
		where: sql`${practicumAssessment.scheduleId} IN (${sql.join(
			scheduleIds.map((id) => sql`${id}`),
			sql`, `
		)})`
	});

	const getScore = (studentId: string, scheduleId: string, moduleId: string) =>
		assessments.find(
			(a) => a.studentId === studentId && a.scheduleId === scheduleId && a.moduleId === moduleId
		)?.score ?? null;

	const buffer = buildRekapWorkbookBuffer({
		groups,
		sheets,
		getScore
	});

	const fileName = `rekapitulasi-nilai-${(schedule.series?.name ?? schedule.title).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.xlsx`;
	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${fileName}"`
		}
	});
};
