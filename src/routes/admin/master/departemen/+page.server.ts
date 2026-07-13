import { db } from '$lib/server/db';
import { department } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) throw error(401, 'Unauthorized');

	const departments = await db.query.department.findMany({
		orderBy: (department, { asc }) => [asc(department.name)]
	});

	return {
		departments
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.session) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const name = formData.get('name') as string;

		if (!name) return fail(400, { message: 'Nama departemen harus diisi' });

		await db.insert(department).values({
			id: uuidv4(),
			name
		});

		return { success: true };
	},

	update: async ({ request, locals }) => {
		if (!locals.session) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;

		if (!id || !name) return fail(400, { message: 'ID dan Nama harus diisi' });

		await db.update(department).set({ name }).where(eq(department.id, id));

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (!locals.session) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID harus diisi' });

		await db.delete(department).where(eq(department.id, id));

		return { success: true };
	}
};
