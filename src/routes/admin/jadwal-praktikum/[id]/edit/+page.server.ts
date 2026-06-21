import { db } from '$lib/server/db';
import {
	practicumSchedule,
	practicumScheduleInstructor,
	practicumScheduleModule,
	laboratorium,
	user,
	practicumModule,
	practicumClass,
	block,
	practicumSeries
} from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq, and, or, gte, lte, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.session) throw error(401, 'Unauthorized');

	const { id } = params;

	const schedule = await db.query.practicumSchedule.findFirst({
		where: eq(practicumSchedule.id, id),
		with: {
			instructors: true,
			modules: true
		}
	});

	if (!schedule) throw error(404, 'Jadwal tidak ditemukan');

	const labs = await db.query.laboratorium.findMany();
	const instructors = await db.query.user.findMany({
		where: eq(user.role, 'instruktur')
	});
	const blocks = await db.query.block.findMany({
		with: {
			department: true
		}
	});
	const modules = await db.query.practicumModule.findMany();
	const series = await db.query.practicumSeries.findMany({
		orderBy: (ps, { asc }) => [asc(ps.name)]
	});
	const classes = await db.query.practicumClass.findMany({
		with: {
			members: true
		},
		orderBy: (pc, { desc }) => [desc(pc.batch), pc.name]
	});

	return {
		schedule,
		labs,
		instructors,
		blocks,
		modules,
		series,
		classes
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		if (!locals.session) throw error(401, 'Unauthorized');

		const { id } = params;
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const seriesId = formData.get('seriesId') as string;
		const semester = parseInt(formData.get('semester') as string) || null;
		const type = formData.get('type') as 'PELATIHAN' | 'OSCE' | 'PRAKTIKUM';
		const classId = formData.get('classId') as string;
		const labId = formData.get('labId') as string;
		const blockId = formData.get('blockId') as string;
		const instructorIds = formData.getAll('instructorIds') as string[];
		const moduleIds = formData.getAll('moduleIds') as string[];
		const dateStr = formData.get('date') as string;
		const startTimeStr = formData.get('startTime') as string;
		const endTimeStr = formData.get('endTime') as string;
		const participantCount = parseInt(formData.get('participantCount') as string);
		const notes = formData.get('notes') as string;

		if (
			!title ||
			!type ||
			!classId ||
			!labId ||
			instructorIds.length === 0 ||
			!dateStr ||
			!startTimeStr ||
			!endTimeStr
		) {
			return fail(400, { message: 'Missing required fields' });
		}

		// Get class details to satisfy the 'class' enum (A, B, C)
		const selectedClass = await db.query.practicumClass.findFirst({
			where: eq(practicumClass.id, classId)
		});

		if (!selectedClass) return fail(400, { message: 'Invalid class' });

		// Map class name to enum if possible, else default to 'A'
		let classEnum: 'A' | 'B' | 'C' = 'A';
		if (['A', 'B', 'C'].includes(selectedClass.name)) {
			classEnum = selectedClass.name as 'A' | 'B' | 'C';
		}

		const startTime = new Date(`${dateStr}T${startTimeStr}`);
		const endTime = new Date(`${dateStr}T${endTimeStr}`);

		// Check for overlapping schedules in the same lab (excluding current schedule)
		const overlap = await db.query.practicumSchedule.findFirst({
			where: and(
				ne(practicumSchedule.id, id),
				eq(practicumSchedule.laboratoriumId, labId),
				or(
					and(gte(practicumSchedule.startTime, startTime), lte(practicumSchedule.startTime, endTime)),
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
			await tx.update(practicumSchedule).set({
				seriesId: seriesId || null,
				semester,
				title,
				type,
				class: classEnum,
				classId: classId,
				laboratoriumId: labId,
				blockId: blockId || null,
				startTime,
				endTime,
				participantCount,
				notes,
				updatedAt: new Date()
			}).where(eq(practicumSchedule.id, id));

			// Delete old instructors and insert new ones
			await tx.delete(practicumScheduleInstructor).where(eq(practicumScheduleInstructor.scheduleId, id));
			for (const instructorId of instructorIds) {
				await tx.insert(practicumScheduleInstructor).values({
					id: uuidv4(),
					scheduleId: id,
					instructorId
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
