import { db } from '$lib/server/db';
import { practicumAssessment } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, `${base}/`);
	}

	const assessments = await db.query.practicumAssessment.findMany({
		where: eq(practicumAssessment.studentId, locals.user.id),
		with: {
			schedule: {
				with: {
					laboratorium: true,
					block: true
				}
			},
			module: true,
			instructor: true
		},
		orderBy: [desc(practicumAssessment.createdAt)]
	});

	return {
		assessments: assessments.map((a) => ({
			id: a.id,
			score: a.score,
			notes: a.notes,
			status: a.status,
			createdAt: a.createdAt,
			moduleName: a.module?.name || 'Unknown Module',
			scheduleTitle: a.schedule?.title || 'Unknown Schedule',
			startTime: a.schedule?.startTime,
			endTime: a.schedule?.endTime,
			laboratoriumName: a.schedule?.laboratorium?.name || 'Unknown Lab',
			blockName: a.schedule?.block?.name || 'Unknown Block',
			instructorName: a.instructor?.name || 'Unknown Instructor'
		}))
	};
};
