import { db } from '$lib/server/db';
import {
	practicumSchedule,
	practicumScheduleInstructor,
	practicumSeries,
	practicumClassMember,
	practicumAssessment,
	user
} from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { buildRekapColumns } from '$lib/rekap/buildRekapMatrix';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const role = locals.user.role;
	if (!['koordinator', 'superadmin', 'kepalaLab'].includes(role)) throw error(403, 'Forbidden');

	const labId = ['koordinator', 'kepalaLab'].includes(role) ? locals.user.laboratorium?.id : undefined;

	// 1. Instructor + series pickers, scoped to this koordinator/kepalaLab's lab.
	const seriesOptions = await db.query.practicumSeries.findMany({
		where: labId ? eq(practicumSeries.laboratoriumId, labId) : undefined,
		orderBy: (s, { asc }) => [asc(s.name)]
	});

	const scheduleFilter = labId ? eq(practicumSchedule.laboratoriumId, labId) : undefined;
	const scopedSchedules = await db.query.practicumSchedule.findMany({
		where: scheduleFilter,
		with: { instructors: { with: { user: true } } }
	});
	const instructorMap = new Map<string, typeof user.$inferSelect>();
	for (const s of scopedSchedules) {
		for (const i of s.instructors) {
			if (i.user) {
				instructorMap.set(i.instructorId, i.user);
			}
		}
	}
	const instructorOptions = [...instructorMap.values()];

	// 2. Selected instructor/series (query params), default to first available.
	const instructorId = url.searchParams.get('instructorId') ?? instructorOptions[0]?.id ?? null;
	const seriesId = url.searchParams.get('seriesId') ?? seriesOptions[0]?.id ?? null;

	if (!instructorId || !seriesId) {
		return {
			instructorOptions,
			seriesOptions,
			instructorId,
			seriesId,
			schedules: [],
			students: [],
			assessments: [],
			groupedColumns: []
		};
	}

	// 3. Schedules in this series that this instructor is actually assigned to.
	const schedules = await db.query.practicumSchedule.findMany({
		where: and(eq(practicumSchedule.seriesId, seriesId), scheduleFilter as any),
		with: {
			modules: { with: { module: true } },
			instructors: true,
			practicumClass: true,
			block: true
		},
		orderBy: (s, { asc }) => [asc(s.startTime)]
	});
	const teachingSchedules = schedules.filter((s) =>
		s.instructors.some((i) => i.instructorId === instructorId)
	);
	if (teachingSchedules.length === 0) {
		return {
			instructorOptions,
			seriesOptions,
			instructorId,
			seriesId,
			schedules: [],
			students: [],
			assessments: [],
			groupedColumns: []
		};
	}

	// 4. Students = union of class members across those schedules (usually one class).
	const classIds = [
		...new Set(teachingSchedules.map((s) => s.classId).filter(Boolean))
	] as string[];

	if (classIds.length === 0) {
		return {
			instructorOptions,
			seriesOptions,
			instructorId,
			seriesId,
			schedules: teachingSchedules,
			students: [],
			assessments: [],
			groupedColumns: []
		};
	}

	const students = await db.query.practicumClassMember.findMany({
		where: inArray(practicumClassMember.classId, classIds),
		with: { user: true }
	});

	// 5. IMPORTANT: only this instructor's own graded entries, not the whole schedule's.
	const scheduleIds = teachingSchedules.map((s) => s.id);
	const assessments = await db.query.practicumAssessment.findMany({
		where: and(
			inArray(practicumAssessment.scheduleId, scheduleIds),
			eq(practicumAssessment.instructorId, instructorId)
		)
	});

	return {
		instructorOptions,
		seriesOptions,
		instructorId,
		seriesId,
		selectedInstructor: instructorMap.get(instructorId) ?? null,
		selectedSeries: seriesOptions.find((s) => s.id === seriesId) ?? null,
		schedules: teachingSchedules,
		students,
		assessments,
		groupedColumns: buildRekapColumns(
			teachingSchedules.map((s) => ({
				id: s.id,
				title: s.title,
				modules: s.modules.map((m) => m.module)
			}))
		)
	};
};
