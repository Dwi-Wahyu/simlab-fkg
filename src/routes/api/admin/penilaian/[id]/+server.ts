import { db } from '$lib/server/db';
import {
	practicumSchedule,
	practicumClassMember,
	practicumAssessment,
	user
} from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { eq, and, or, ilike, sql, count, inArray } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const scheduleId = params.id;
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const status = url.searchParams.get('status') || 'all';
	const offset = (page - 1) * limit;

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
	const isInstructor = schedule.instructors.some((i) => i.instructorId === locals.user?.id);
	const isKoordinator =
		locals.user.role === 'koordinator' &&
		(!locals.user.laboratorium || schedule.laboratoriumId === locals.user.laboratorium.id);
	const isAuthorized = isInstructor || locals.user.role === 'superadmin' || isKoordinator;
	if (!isAuthorized) {
		throw error(403, 'Forbidden: You are not authorized to view this schedule');
	}

	const modules = schedule.modules.map((m) => m.module);

	// Subquery to count assessments per student for this schedule
	const assessmentCountSubquery = db
		.select({
			studentId: practicumAssessment.studentId,
			count: count().as('assessment_count')
		})
		.from(practicumAssessment)
		.where(eq(practicumAssessment.scheduleId, scheduleId))
		.groupBy(practicumAssessment.studentId)
		.as('ac');

	// Base query for students
	let whereClause: any = eq(practicumClassMember.classId, schedule.classId!);

	if (search) {
		whereClause = and(
			whereClause,
			or(ilike(user.name, `%${search}%`), ilike(user.username, `%${search}%`))
		);
	}

	// Build final where clause incorporating status filter before query construction
	let finalWhere: any = whereClause;
	if (status === 'completed') {
		finalWhere = and(
			whereClause,
			eq(sql`COALESCE(${assessmentCountSubquery.count}, 0)`, modules.length)
		);
	} else if (status === 'partial') {
		finalWhere = and(
			whereClause,
			and(
				sql`COALESCE(${assessmentCountSubquery.count}, 0) > 0`,
				sql`COALESCE(${assessmentCountSubquery.count}, 0) < ${modules.length}`
			)
		);
	} else if (status === 'none') {
		finalWhere = and(whereClause, eq(sql`COALESCE(${assessmentCountSubquery.count}, 0)`, 0));
	}

	const studentsQuery = db
		.select({
			member: practicumClassMember,
			user: user,
			assessmentCount: sql<number>`COALESCE(${assessmentCountSubquery.count}, 0)`.mapWith(Number)
		})
		.from(practicumClassMember)
		.innerJoin(user, eq(practicumClassMember.userId, user.id))
		.leftJoin(
			assessmentCountSubquery,
			eq(practicumClassMember.userId, assessmentCountSubquery.studentId)
		)
		.where(finalWhere);

	// Count total for pagination using same joins and where clause
	const totalItemsResult = await db
		.select({ count: count() })
		.from(practicumClassMember)
		.innerJoin(user, eq(practicumClassMember.userId, user.id))
		.leftJoin(
			assessmentCountSubquery,
			eq(practicumClassMember.userId, assessmentCountSubquery.studentId)
		)
		.where(finalWhere);

	const totalItems = totalItemsResult[0].count;
	const totalPages = Math.ceil(totalItems / limit);

	const paginatedStudents = await studentsQuery.limit(limit).offset(offset);

	// Fetch detailed assessments for the paginated students
	const studentIds = paginatedStudents.map((ps) => ps.user.id);
	let assessments: any[] = [];
	if (studentIds.length > 0) {
		assessments = await db.query.practicumAssessment.findMany({
			where: and(
				eq(practicumAssessment.scheduleId, scheduleId),
				inArray(practicumAssessment.studentId, studentIds)
			),
			with: {
				instructor: true
			}
		});
	}

	return json({
		schedule,
		items: paginatedStudents.map((ps) => ({
			...ps.member,
			user: ps.user,
			assessmentCount: ps.assessmentCount
		})),
		assessments,
		pagination: {
			totalItems,
			totalPages,
			currentPage: page,
			limit
		}
	});
};
