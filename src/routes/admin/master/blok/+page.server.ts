import { db } from '$lib/server/db';
import { block, department } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) throw error(401, 'Unauthorized');

	const blocks = await db.query.block.findMany({
		with: {
			department: true
		},
		orderBy: (block, { asc }) => [asc(block.name)]
	});

	const departments = await db.query.department.findMany({
		orderBy: (department, { asc }) => [asc(department.name)]
	});

	return {
		blocks,
		departments
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.session) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const departmentId = formData.get('departmentId') as string;

		if (!name || !departmentId) return fail(400, { message: 'Nama blok dan departemen harus diisi' });

		await db.insert(block).values({
			id: uuidv4(),
			name,
			departmentId
		});

		return { success: true };
	},

	update: async ({ request, locals }) => {
		if (!locals.session) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const departmentId = formData.get('departmentId') as string;

		if (!id || !name || !departmentId) return fail(400, { message: 'Semua field harus diisi' });

		await db.update(block)
			.set({ name, departmentId })
			.where(eq(block.id, id));

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (!locals.session) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID harus diisi' });

		await db.delete(block).where(eq(block.id, id));

		return { success: true };
	}
};
