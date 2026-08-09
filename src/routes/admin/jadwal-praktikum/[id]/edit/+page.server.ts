import { db } from '$lib/server/db';
import {
	practicumSchedule,
	practicumScheduleInstructor,
	practicumScheduleModule,
	practicumScheduleClass,
	laboratorium,
	user,
	practicumModule,
	practicumClass,
	block,
	practicumSeries,
	kelompokMahasiswa
} from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq, and, or, gte, lte, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.session) throw error(401, 'Unauthorized');

	const { id } = params;

	const schedule = await db.query.practicumSchedule.findFirst({
		where: and(eq(practicumSchedule.id, id), eq(practicumSchedule.isDeleted, false)),
		with: {
			instructors: true,
			modules: true,
			classes: true
		}
	});

	if (!schedule) throw error(404, 'Jadwal tidak ditemukan');

	const labs = await db.query.laboratorium.findMany({
		where: (laboratorium, { eq }) => eq(laboratorium.isDeleted, false)
	});
	const instructors = await db.query.user.findMany({
		where: (user, { eq, and }) => and(eq(user.role, 'dosen'), eq(user.isDeleted, false))
	});
	const blocks = await db.query.block.findMany({
		with: {
			department: true
		}
	});
	const modules = await db.query.practicumModule.findMany({
		where: (practicumModule, { eq }) => eq(practicumModule.isDeleted, false)
	});
	const series = await db.query.practicumSeries.findMany({
		orderBy: (ps, { asc }) => [asc(ps.name)]
	});
	const classes = await db.query.practicumClass.findMany({
		with: {
			members: true
		},
		orderBy: (pc, { desc }) => [desc(pc.batch), pc.name]
	});
	const groups = await db.query.kelompokMahasiswa.findMany({
		where: (km, { eq }) => eq(km.isDeleted, false),
		with: {
			class: true
		},
		orderBy: (km, { asc }) => [asc(km.name)]
	});

	return {
		schedule,
		labs,
		instructors,
		blocks,
		modules,
		series,
		classes,
		groups
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		if (!locals.session) throw error(401, 'Unauthorized');

		const { id } = params;
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const seriesId = formData.get('seriesId') as string;
		const type = (formData.get('type') as 'PELATIHAN' | 'OSCE' | 'PRAKTIKUM') || 'PRAKTIKUM';
		const classIds = formData.getAll('classIds') as string[];
		const singleClassId = formData.get('classId') as string;
		if (singleClassId && !classIds.includes(singleClassId)) {
			classIds.push(singleClassId);
		}

		const labId = formData.get('labId') as string;
		const blockId = formData.get('blockId') as string;
		const assignmentPairs = formData.getAll('assignments') as string[];
		const assignments = assignmentPairs.map((pair) => {
			const [instructorId, groupId] = pair.split(':');
			return { instructorId, groupId: groupId || null };
		});
		const instructorIds = [...new Set(assignments.map((a) => a.instructorId))];
		const moduleIds = formData.getAll('moduleIds') as string[];
		const dateStr = formData.get('date') as string;
		const startTimeStr = formData.get('startTime') as string;
		const endTimeStr = formData.get('endTime') as string;
		const participantCount = parseInt((formData.get('participantCount') as string) || '0');
		const notes = formData.get('notes') as string;

		const missingFields: string[] = [];
		if (!title?.trim()) missingFields.push('Judul Kegiatan');
		if (type === 'PRAKTIKUM' && !seriesId) missingFields.push('Seri Praktikum');
		if (classIds.length === 0) missingFields.push('Angkatan & Kelas');
		if (!labId) missingFields.push('Laboratorium');
		if (instructorIds.length === 0) missingFields.push('DPJP');
		if (!dateStr) missingFields.push('Tanggal');
		if (!startTimeStr) missingFields.push('Waktu Mulai');
		if (!endTimeStr) missingFields.push('Waktu Selesai');

		if (missingFields.length > 0) {
			return fail(400, {
				message: `Bidang berikut wajib diisi: ${missingFields.join(', ')}`
			});
		}

		const selectedClass = await db.query.practicumClass.findFirst({
			where: eq(practicumClass.id, classIds[0])
		});

		let classEnum: 'A' | 'B' | 'C' = 'A';
		if (selectedClass && ['A', 'B', 'C'].includes(selectedClass.name)) {
			classEnum = selectedClass.name as 'A' | 'B' | 'C';
		}

		const startTime = new Date(`${dateStr}T${startTimeStr}`);
		const endTime = new Date(`${dateStr}T${endTimeStr}`);

		const overlap = await db.query.practicumSchedule.findFirst({
			where: and(
				ne(practicumSchedule.id, id),
				eq(practicumSchedule.laboratoriumId, labId),
				or(
					and(
						gte(practicumSchedule.startTime, startTime),
						lte(practicumSchedule.startTime, endTime)
					),
					and(gte(practicumSchedule.endTime, startTime), lte(practicumSchedule.endTime, endTime)),
					and(lte(practicumSchedule.startTime, startTime), gte(practicumSchedule.endTime, endTime))
				)
			)
		});

		if (overlap) {
			return fail(400, {
				message: 'Jadwal bentrok dengan kegiatan lain di ruangan yang sama',
				errorType: 'CONFLICT'
			});
		}

		await db.transaction(async (tx) => {
			await tx
				.update(practicumSchedule)
				.set({
					seriesId: seriesId || null,
					title,
					type,
					class: classEnum,
					classId: classIds[0] || null,
					laboratoriumId: labId,
					blockId: blockId || null,
					startTime,
					endTime,
					participantCount,
					notes,
					updatedAt: new Date()
				})
				.where(eq(practicumSchedule.id, id));

			// Update classes
			await tx
				.delete(practicumScheduleClass)
				.where(eq(practicumScheduleClass.scheduleId, id));
			for (const cId of classIds) {
				await tx.insert(practicumScheduleClass).values({
					id: uuidv4(),
					scheduleId: id,
					classId: cId
				});
			}

			// Delete old instructors and insert new ones
			await tx
				.delete(practicumScheduleInstructor)
				.where(eq(practicumScheduleInstructor.scheduleId, id));
			for (const assignment of assignments) {
				await tx.insert(practicumScheduleInstructor).values({
					id: uuidv4(),
					scheduleId: id,
					instructorId: assignment.instructorId,
					groupId: assignment.groupId
				});
			}

			// Delete old modules and insert new ones
			await tx.delete(practicumScheduleModule).where(eq(practicumScheduleModule.scheduleId, id));
			for (const moduleId of moduleIds) {
				await tx.insert(practicumScheduleModule).values({
					id: uuidv4(),
					scheduleId: id,
					moduleId
				});
			}
		});

		return { success: true };
	}
};
