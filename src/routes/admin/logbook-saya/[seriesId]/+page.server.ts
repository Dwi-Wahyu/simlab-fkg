import { db } from '$lib/server/db';
import {
	practicumSeries,
	practicumAssessment,
	practicumLogbookGeneration,
	practicumLogbookTemplate,
	practicumLogbookTemplateField,
	practicumModule
} from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

const COOLDOWN_MS = 10 * 60 * 1000; // 10 menit

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw redirect(302, '/');

	const studentId = locals.user.id;
	const { seriesId } = params;

	// Ambil data seri
	const series = await db.query.practicumSeries.findFirst({
		where: eq(practicumSeries.id, seriesId),
		with: {
			laboratorium: true,
			block: { with: { department: true } },
			schedules: {
				orderBy: (s, { asc }) => [asc(s.startTime)]
			}
		}
	});

	if (!series) throw error(404, 'Seri praktikum tidak ditemukan');

	// Ambil template & field manual
	let templateRecord = null;
	if (series.blockId) {
		templateRecord = await db.query.practicumLogbookTemplate.findFirst({
			where: (t, { exists, eq: eqFn, and: andFn }) =>
				exists(
					db
						.select()
						.from(practicumModule)
						.where(
							andFn(
								eqFn(practicumModule.id, t.moduleId),
								eqFn(practicumModule.blockId, series.blockId!)
							)
						)
				)
		});
	}
	const finalTemplate = templateRecord ?? (await db.query.practicumLogbookTemplate.findFirst());
	const manualFields = finalTemplate
		? await db.query.practicumLogbookTemplateField.findMany({
				where: and(
					eq(practicumLogbookTemplateField.templateId, finalTemplate.id),
					eq(practicumLogbookTemplateField.source, 'manual')
				),
				orderBy: (f, { asc }) => [asc(f.sortOrder)]
			})
		: [];

	const scheduleIds = series.schedules.map((s) => s.id);

	// Ambil semua penilaian mahasiswa di seri ini, sekaligus modul & DPJP
	const assessments =
		scheduleIds.length > 0
			? await db.query.practicumAssessment.findMany({
					where: and(
						eq(practicumAssessment.studentId, studentId),
						inArray(practicumAssessment.scheduleId, scheduleIds)
					),
					with: {
						module: true,
						instructor: true
					}
				})
			: [];

	// Kelompokkan penilaian per jadwal
	const assessmentsBySchedule = new Map<string, typeof assessments>();
	for (const a of assessments) {
		const list = assessmentsBySchedule.get(a.scheduleId) ?? [];
		list.push(a);
		assessmentsBySchedule.set(a.scheduleId, list);
	}

	// Susun data jadwal + penilaiannya
	const scheduleDetails = series.schedules.map((schedule) => {
		const items = assessmentsBySchedule.get(schedule.id) ?? [];
		return {
			id: schedule.id,
			title: schedule.title,
			startTime: schedule.startTime,
			endTime: schedule.endTime,
			assessments: items.map((a) => ({
				id: a.id,
				score: a.score,
				notes: a.notes,
				status: a.status,
				moduleName: a.module?.name ?? '-',
				instructorName: a.instructor?.name ?? '-'
			}))
		};
	});

	// Statistik ringkas
	const allScores = assessments.map((a) => a.score);
	const avgScore =
		allScores.length > 0
			? Math.round((allScores.reduce((s, v) => s + v, 0) / allScores.length) * 100) / 100
			: null;

	// Cek cooldown & file terakhir
	const lastGen = await db.query.practicumLogbookGeneration.findFirst({
		where: and(
			eq(practicumLogbookGeneration.userId, studentId),
			eq(practicumLogbookGeneration.seriesId, seriesId)
		)
	});

	const cooldownRemainingSeconds = lastGen && env.NODE_ENV !== 'development'
		? Math.max(
				0,
				Math.ceil((COOLDOWN_MS - (Date.now() - new Date(lastGen.generatedAt).getTime())) / 1000)
			)
		: 0;

	return {
		series: {
			id: series.id,
			name: series.name,
			laboratoriumName: series.laboratorium?.name ?? '-',
			blockName: series.block?.name ?? '-',
			departmentName: series.block?.department?.name ?? '-'
		},
		scheduleDetails,
		stats: {
			totalSchedules: series.schedules.length,
			totalAssessed: assessments.length,
			avgScore
		},
		lastGeneration: lastGen
			? {
					generatedAt: lastGen.generatedAt,
					fileName: lastGen.generatedFileName,
					pdfUrl: lastGen.pdfUrl,
					userId: lastGen.userId
				}
			: null,
		cooldownRemainingSeconds, // 0 = boleh generate
		manualFields: manualFields.map(f => ({
			placeholderKey: f.placeholderKey,
			label: f.label,
			valueType: f.valueType,
			required: f.required,
			defaultValue: f.defaultValue
		}))
	};
};
