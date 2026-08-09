import { db } from '$lib/server/db';
import { user, practicumAssessment, lending } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const studentId = params.id;
	const student = await db.query.user.findFirst({
		where: eq(user.id, studentId),
		with: {
			practicumClasses: {
				with: {
					class: true
				}
			}
		}
	});

	if (!student) {
		throw error(404, 'Mahasiswa tidak ditemukan');
	}

	// Fetch all assessments for this student
	const rawAssessments = await db.query.practicumAssessment.findMany({
		where: eq(practicumAssessment.studentId, studentId),
		with: {
			schedule: {
				with: {
					series: true,
					laboratorium: true
				}
			},
			module: true,
			instructor: true
		},
		orderBy: (pa, { desc }) => [desc(pa.createdAt)]
	});

	// Group assessments by practicum series
	const seriesMap = new Map<
		string,
		{
			seriesId: string;
			seriesName: string;
			assessments: typeof rawAssessments;
		}
	>();

	for (const a of rawAssessments) {
		const sId = a.schedule?.seriesId || 'tanpa-seri';
		const sName = a.schedule?.series?.name || 'Praktikum Umum / Tanpa Seri';

		if (!seriesMap.has(sId)) {
			seriesMap.set(sId, {
				seriesId: sId,
				seriesName: sName,
				assessments: []
			});
		}
		seriesMap.get(sId)!.assessments.push(a);
	}

	const groupedAssessments = Array.from(seriesMap.values());

	// Fetch lendings requested by this student
	const lendings = await db.query.lending.findMany({
		where: eq(lending.requestedBy, studentId),
		with: {
			laboratorium: true,
			items: {
				with: {
					equipment: {
						with: {
							item: true
						}
					},
					requestedItem: true
				}
			}
		},
		orderBy: (l, { desc }) => [desc(l.createdAt)]
	});

	return {
		student,
		groupedAssessments,
		lendings
	};
};
