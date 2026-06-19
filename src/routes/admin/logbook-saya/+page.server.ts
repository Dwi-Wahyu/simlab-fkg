import { db } from '$lib/server/db';
import { practicumSeries, practicumLogbook, practicumAssessment } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/');

	const studentId = locals.user.id;

	// Ambil semua seri yang memiliki jadwal dan penilaian untuk mahasiswa ini
	const seriesList = await db.query.practicumSeries.findMany({
		with: {
			laboratorium: true,
			block: true,
			schedules: true
		},
		orderBy: (s, { desc }) => [desc(s.createdAt)]
	});

	// Untuk setiap seri, hitung jumlah jadwal dan nilai rata-rata mahasiswa
	const seriesWithStats = await Promise.all(
		seriesList.map(async (series) => {
			const scheduleIds = series.schedules.map((s) => s.id);
			if (scheduleIds.length === 0) {
				return null; // skip seri tanpa jadwal
			}

			const assessments = await db.query.practicumAssessment.findMany({
				where: and(
					eq(practicumAssessment.studentId, studentId),
					inArray(practicumAssessment.scheduleId, scheduleIds)
				),
				with: { schedule: true }
			});

			const myAssessments = assessments.filter((a) => scheduleIds.includes(a.scheduleId));

			if (myAssessments.length === 0) return null; // mahasiswa tidak ada nilai di seri ini

			const avgScore = myAssessments.reduce((sum, a) => sum + a.score, 0) / myAssessments.length;

			return {
				id: series.id,
				name: series.name,
				laboratoriumName: series.laboratorium?.name ?? '-',
				blockName: series.block?.name ?? '-',
				totalSchedules: series.schedules.length,
				totalAssessed: myAssessments.length,
				avgScore: Math.round(avgScore * 100) / 100
			};
		})
	);

	// Filter null (seri tanpa data mahasiswa)
	const filtered = seriesWithStats.filter(Boolean) as NonNullable<
		(typeof seriesWithStats)[0]
	>[];

	// Ambil logbook user untuk lastGeneratedAt
	const logbook = await db.query.practicumLogbook.findFirst({
		where: eq(practicumLogbook.userId, studentId)
	});

	return {
		series: filtered,
		lastGeneratedAt: logbook?.lastGeneratedAt ?? null
	};
};
