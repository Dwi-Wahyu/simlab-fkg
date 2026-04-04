import { db } from '$lib/server/db';
import { practicumModule, block, department } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const blocks = await db
		.select({
			id: block.id,
			name: block.name,
			departmentName: department.name
		})
		.from(block)
		.innerJoin(department, eq(block.departmentId, department.id))
		.orderBy(department.name, block.name);

	return {
		blocks
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const blockId = formData.get('blockId') as string;

		if (!name || !blockId) {
			return fail(400, { message: 'Nama dan Blok wajib diisi' });
		}

		try {
			await db.insert(practicumModule).values({
				id: crypto.randomUUID(),
				name,
				description,
				blockId
			});

			return { success: true, message: 'Modul berhasil ditambahkan' };
		} catch (error) {
			console.error('Error creating module:', error);
			return fail(500, { message: 'Gagal menambahkan modul' });
		}
	}
};
