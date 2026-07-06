import { db } from '$lib/server/db';
import { practicumSchedule, laboratorium, user } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq, and, or, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) throw error(401, 'Unauthorized');

	const labs = await db.query.laboratorium.findMany();
	const instructors = await db.query.user.findMany({
		where: eq(user.role, 'instruktur')
	});

	const schedules = await db.query.practicumSchedule.findMany({
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
		if (!locals.session) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID is required' });

		await db.delete(practicumSchedule).where(eq(practicumSchedule.id, id));

		return { success: true };
	}
};
