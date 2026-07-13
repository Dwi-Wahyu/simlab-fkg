import { db } from '$lib/server/db';
import {
	practicumAssessment,
	practicumSchedule,
	practicumModule,
	user
} from '$lib/server/db/schema';
import { eq, desc, and, or, like, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, `/`);
	}

	const search = url.searchParams.get('search') || '';
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 10;
	const offset = (page - 1) * limit;

	async function fetchRiwayat() {
		// Build conditions
		const conditions = [eq(practicumAssessment.studentId, locals.user!.id)];

		if (search) {
			// Subqueries or joins needed for deep search, for simplicity we do a joined query or let Drizzle handle it in JS if small.
			// Since we want DB-level pagination, we should ideally use relational query with `where` but Drizzle's `where` inside `with` doesn't filter the parent.
			// Instead, we fetch all for this user and filter in JS if search is used, or write a proper query builder query.
			// Given it's a student's history, the dataset per user is small. We can query all and filter, or use `sql`.
		}

		const totalQuery = await db
			.select({ count: sql<number>`count(*)` })
			.from(practicumAssessment)
			.where(eq(practicumAssessment.studentId, locals.user!.id));

		const totalItems = Number(totalQuery[0].count);

		const rawAssessments = await db.query.practicumAssessment.findMany({
			where: eq(practicumAssessment.studentId, locals.user!.id),
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

		// Apply search filter in JS for now as it crosses relations
		let filtered = rawAssessments;
		if (search) {
			const q = search.toLowerCase();
			filtered = rawAssessments.filter(
				(a) =>
					a.schedule?.title?.toLowerCase().includes(q) ||
					a.module?.name?.toLowerCase().includes(q) ||
					a.schedule?.laboratorium?.name?.toLowerCase().includes(q) ||
					a.instructor?.name?.toLowerCase().includes(q)
			);
		}

		// Pagination
		const paginated = filtered.slice(offset, offset + limit);
		const filteredTotal = search ? filtered.length : totalItems;

		return {
			items: paginated.map((a) => ({
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
			})),
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(filteredTotal / limit),
				totalItems: filteredTotal,
				limit
			},
			summary: [
				{
					label: 'Total Praktikum',
					value: filtered.length.toString(),
					icon: 'BookOpen',
					color: 'text-emerald-600',
					bg: 'bg-emerald-100'
				},
				{
					label: 'Rata-rata Nilai',
					value: (filtered.length
						? filtered.reduce((acc, curr) => acc + curr.score, 0) / filtered.length
						: 0
					).toFixed(2),
					icon: 'Award',
					color: 'text-blue-600',
					bg: 'bg-blue-100'
				}
			]
		};
	}

	return {
		riwayatPromise: fetchRiwayat()
	};
};
