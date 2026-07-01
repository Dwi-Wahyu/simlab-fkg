import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { practicumSchedule, practicumClassMember, practicumAssessment, user } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
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
			instructors: true,
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
				instructors: true,
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

	const scheduleIds = allSchedules.map((s) => s.id);
	const assessments = await db.query.practicumAssessment.findMany({
		where: sql`${practicumAssessment.scheduleId} IN (${sql.join(scheduleIds.map((id) => sql`${id}`), sql`, `)})`
	});

	const getScore = (studentId: string, scheduleId: string, moduleId: string) =>
		assessments.find(
			(a) => a.studentId === studentId && a.scheduleId === scheduleId && a.moduleId === moduleId
		)?.score ?? null;

	const buffer = buildRekapWorkbookBuffer({
		groups,
		students,
		getScore
	});

	const fileName = `rekapitulasi-nilai-${(schedule.series?.name ?? schedule.title).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.xlsx`;
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${fileName}"`
		}
	});
};
