import { db } from '$lib/server/db';
import { practicumSchedule, practicumClassMember, practicumAssessment, user } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { eq, and, like, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const scheduleId = params.id;
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const offset = (page - 1) * limit;

	const schedule = await db.query.practicumSchedule.findFirst({
		where: eq(practicumSchedule.id, scheduleId),
		with: {
			laboratorium: true,
			block: true,
			practicumClass: true,
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

	// If the schedule belongs to a series, fetch all schedules in that series for this class
	let allSchedules = [schedule];
	if (schedule.seriesId && schedule.classId) {
		allSchedules = await db.query.practicumSchedule.findMany({
			where: and(
				eq(practicumSchedule.seriesId, schedule.seriesId),
				eq(practicumSchedule.classId, schedule.classId)
			),
			with: {
				laboratorium: true,
				block: true,
				practicumClass: true,
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
			},
			orderBy: [practicumSchedule.startTime]
		});
	}

	// Verify authorization: instructor, koordinator of matching lab, or superadmin
	const isInstructor = schedule.instructors.some((i) => i.instructorId === locals.user.id);
	const isKoordinator = locals.user.role === 'koordinator' && (!locals.user.laboratorium || schedule.laboratoriumId === locals.user.laboratorium.id);
	const isAuthorized = isInstructor || locals.user.role === 'superadmin' || isKoordinator;
	if (!isAuthorized) {
		throw error(403, 'Forbidden: You are not authorized to view this schedule');
	}

	const baseQuery = db
		.select({
			id: practicumClassMember.id,
			userId: practicumClassMember.userId,
			name: user.name,
			username: user.username
		})
		.from(practicumClassMember)
		.innerJoin(user, eq(practicumClassMember.userId, user.id))
		.where(
			and(
				eq(practicumClassMember.classId, schedule.classId!),
				search ? like(user.name, `%${search}%`) : undefined
			)
		);

	// Get total count for pagination
	const totalResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(practicumClassMember)
		.innerJoin(user, eq(practicumClassMember.userId, user.id))
		.where(
			and(
				eq(practicumClassMember.classId, schedule.classId!),
				search ? like(user.name, `%${search}%`) : undefined
			)
		);
	
	const totalStudents = totalResult[0]?.count || 0;

	const students = await baseQuery.limit(limit).offset(offset);

	// Fetch assessments for all schedules in the series
	const scheduleIds = allSchedules.map(s => s.id);
	const assessments = await db.query.practicumAssessment.findMany({
		where: sql`${practicumAssessment.scheduleId} IN (${sql.join(scheduleIds.map(id => sql`${id}`), sql`, `)})`,
		with: {
			instructor: true
		}
	});

	return {
		schedule,
		allSchedules,
		students,
		totalStudents,
		assessments,
		pagination: {
			page,
			limit,
			totalPages: Math.ceil(totalStudents / limit)
		},
		search
	};
};
