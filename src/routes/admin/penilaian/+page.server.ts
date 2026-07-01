import { db } from '$lib/server/db';
import {
	practicumSchedule,
	practicumScheduleInstructor,
	practicumAssessment,
	practicumClassMember,
	block,
	department
} from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { eq, exists, and, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { buildRekapColumns } from '$lib/rekap/buildRekapMatrix';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const role = locals.user.role;
	const isCoordinatorView = role === 'koordinator' || role === 'superadmin';

	const baseWith = {
		laboratorium: true,
		series: true,
		block: { with: { department: true } },
		modules: { with: { module: true } },
		instructors: { with: { user: true } }
	} as const;

	const schedules = isCoordinatorView
		? await db.query.practicumSchedule.findMany({
				where:
					role === 'koordinator' && locals.user.laboratorium
						? eq(practicumSchedule.laboratoriumId, locals.user.laboratorium.id)
						: undefined, // superadmin: no filter, sees everything
				with: baseWith,
				orderBy: (s, { desc }) => [desc(s.startTime)]
			})
		: await db.query.practicumSchedule.findMany({
				where: (table) =>
					exists(
						db
							.select()
							.from(practicumScheduleInstructor)
							.where(
								and(
									eq(practicumScheduleInstructor.scheduleId, table.id),
									eq(practicumScheduleInstructor.instructorId, locals.user.id)
								)
							)
					),
				with: baseWith,
				orderBy: (s, { desc }) => [desc(s.startTime)]
			});

	// Get class member counts grouped by classId
	const classMemberCounts = await db
		.select({
			classId: practicumClassMember.classId,
			count: sql<number>`count(*)`
		})
		.from(practicumClassMember)
		.groupBy(practicumClassMember.classId);

	const classMemberMap = new Map(
		classMemberCounts.map((c) => [c.classId, Number(c.count)])
	);

	// Get assessment counts grouped by scheduleId
	const assessmentCounts = await db
		.select({
			scheduleId: practicumAssessment.scheduleId,
			count: sql<number>`count(*)`
		})
		.from(practicumAssessment)
		.groupBy(practicumAssessment.scheduleId);

	const assessmentMap = new Map(
		assessmentCounts.map((a) => [a.scheduleId, Number(a.count)])
	);

	// Group by series (fallback to block, then to an "Ungrouped" bucket) so
	// instructors/koordinator see workload per Blok/Seri, not one long flat list.
	type Group = {
		key: string;
		label: string;
		subLabel: string;
		schedules: typeof schedules;
		assessedCount: number;
		totalCount: number;
	};
	const groups = new Map<string, Group>();
	for (const s of schedules) {
		const key = s.seriesId ?? s.blockId ?? 'ungrouped';
		const label = s.series?.name ?? s.block?.name ?? 'Tanpa Blok/Seri';
		const subLabel = s.block?.department?.name ?? '';
		
		if (!groups.has(key)) {
			groups.set(key, { key, label, subLabel, schedules: [], assessedCount: 0, totalCount: 0 });
		}
		
		const group = groups.get(key)!;
		group.schedules.push(s);

		// Calculate assessed/total for this schedule
		const assessed = assessmentMap.get(s.id) || 0;
		const studentCount = s.classId ? (classMemberMap.get(s.classId) || 0) : 0;
		const columns = buildRekapColumns([{
			id: s.id,
			title: s.title,
			modules: s.modules.map((m) => m.module)
		}])[0].columns;
		const total = studentCount * columns.length;

		group.assessedCount += assessed;
		group.totalCount += total;
	}

	return {
		isCoordinatorView,
		groups: [...groups.values()]
	};
};
