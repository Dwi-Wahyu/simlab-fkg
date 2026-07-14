import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	practicumSchedule,
	practicumSeries,
	practicumClassMember,
	practicumAssessment,
	user
} from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { buildRekapColumns } from '$lib/rekap/buildRekapMatrix';
import { buildRekapWorkbookBuffer } from '$lib/server/rekap/buildRekapWorkbook';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const role = locals.user.role;
	if (!['koordinator', 'superadmin', 'kepalaLab'].includes(role)) throw error(403, 'Forbidden');

	const labId = ['koordinator', 'kepalaLab'].includes(role)
		? locals.user.laboratorium?.id
		: undefined;

	const instructorId = url.searchParams.get('instructorId');
	const seriesId = url.searchParams.get('seriesId');

	if (!instructorId || !seriesId) {
		throw error(400, 'Parameter tidak lengkap');
	}

	// 1. Load instructor and series options to verify authorization and get names
	const instructor = await db.query.user.findFirst({
		where: eq(user.id, instructorId)
	});
	const series = await db.query.practicumSeries.findFirst({
		where: eq(practicumSeries.id, seriesId)
	});

	if (!instructor || !series) {
		throw error(404, 'Data tidak ditemukan');
	}



	const scheduleFilter = labId ? eq(practicumSchedule.laboratoriumId, labId) : undefined;

	// 2. Fetch teaching schedules
	const schedules = await db.query.practicumSchedule.findMany({
		where: and(eq(practicumSchedule.seriesId, seriesId), scheduleFilter as any),
		with: {
			modules: { with: { module: true } },
			instructors: true,
			practicumClass: true
		},
		orderBy: (s, { asc }) => [asc(s.startTime)]
	});

	const teachingSchedules = schedules.filter((s) =>
		s.instructors.some((i) => i.instructorId === instructorId)
	);

	if (teachingSchedules.length === 0) {
		throw error(404, 'Tidak ada jadwal mengajar ditemukan untuk DPJP ini');
	}

	// 3. Union class members
	const classIds = [
		...new Set(teachingSchedules.map((s) => s.classId).filter(Boolean))
	] as string[];

	if (classIds.length === 0) {
		throw error(404, 'Tidak ada mahasiswa terdaftar');
	}

	const studentsRaw = await db.query.practicumClassMember.findMany({
		where: inArray(practicumClassMember.classId, classIds),
		with: { user: true }
	});

	const students = studentsRaw.map((s) => ({
		userId: s.userId,
		username: s.user?.username ?? '',
		name: s.user?.name ?? ''
	}));

	// 4. Fetch assessments entered by this instructor
	const scheduleIds = teachingSchedules.map((s) => s.id);
	const assessments = await db.query.practicumAssessment.findMany({
		where: and(
			inArray(practicumAssessment.scheduleId, scheduleIds),
			eq(practicumAssessment.instructorId, instructorId)
		)
	});

	const getScore = (studentId: string, scheduleId: string, moduleId: string) => {
		const a = assessments.find(
			(val) =>
				val.studentId === studentId && val.scheduleId === scheduleId && val.moduleId === moduleId
		);
		return a ? a.score : null;
	};

	const groups = buildRekapColumns(
		teachingSchedules.map((s) => ({
			id: s.id,
			title: s.title,
			modules: s.modules.map((m) => m.module)
		}))
	);

	const buffer = buildRekapWorkbookBuffer({
		groups,
		sheets: [
			{
				sheetName: 'Rekapitulasi Nilai',
				penilai: instructor.name,
				students
			}
		],
		getScore
	});

	const fileName = `rekapitulasi-nilai-${instructor.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${series.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.xlsx`;

	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${fileName}"`
		}
	});
};
