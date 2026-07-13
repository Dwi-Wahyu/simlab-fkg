import { db } from '$lib/server/db';
import { practicumSchedule } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { notDeleted } from '$lib/server/db/soft-delete';
import { createAuditLog } from '$lib/server/audit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) throw error(401, 'Unauthorized');

	const labs = await db.query.laboratorium.findMany({
		where: (laboratorium, { eq }) => eq(laboratorium.isDeleted, false)
	});
	const instructors = await db.query.user.findMany({
		where: (user, { eq, and }) => and(eq(user.role, 'instruktur'), eq(user.isDeleted, false))
	});

	const schedules = await db.query.practicumSchedule.findMany({
		where: (practicumSchedule, { eq }) => eq(practicumSchedule.isDeleted, false),
		with: {
			laboratorium: true,
			block: {
				with: {
					department: true
				}
			},
			instructors: {
				with: {
					user: true
				}
			}
		},
		orderBy: (practicumSchedule, { desc }) => [desc(practicumSchedule.startTime)]
	});

	const currentUser = locals.user;
	let filteredSchedules = schedules;
	if (currentUser && currentUser.role === 'instruktur') {
		filteredSchedules = schedules.filter((s) =>
			s.instructors.some((i) => i.instructorId === currentUser.id)
		);
	}

	return {
		labs,
		instructors,
		schedules: filteredSchedules,
		userRole: currentUser?.role
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID is required' });

		try {
			const [sched] = await db
				.select()
				.from(practicumSchedule)
				.where(and(eq(practicumSchedule.id, id), notDeleted(practicumSchedule)))
				.limit(1);
			if (!sched) return fail(404, { message: 'Jadwal tidak ditemukan' });

			await db
				.update(practicumSchedule)
				.set({
					isDeleted: true,
					deletedAt: new Date(),
					deletedBy: locals.user.id
				})
				.where(eq(practicumSchedule.id, id));

			await createAuditLog({
				userId: locals.user.id,
				action: 'SOFT_DELETE_PRACTICUM_SCHEDULE',
				tableName: 'practicum_schedule',
				recordId: id,
				oldValue: sched
			});

			return { success: true };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal menghapus jadwal praktikum' });
		}
	}
};
