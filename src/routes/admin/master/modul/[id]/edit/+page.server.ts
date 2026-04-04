import { db } from '$lib/server/db';
import { practicumModule, block, department } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const module = await db.query.practicumModule.findFirst({
		where: eq(practicumModule.id, params.id)
	});

	if (!module) {
		throw error(404, 'Modul tidak ditemukan');
	}

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
		module,
		blocks
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const blockId = formData.get('blockId') as string;

		if (!name || !blockId) {
			return fail(400, { message: 'Nama dan Blok wajib diisi' });
		}

		try {
			await db
				.update(practicumModule)
				.set({
					name,
					description,
					blockId
				})
				.where(eq(practicumModule.id, params.id));

			return { success: true, message: 'Modul berhasil diperbarui' };
		} catch (error) {
			console.error('Error updating module:', error);
			return fail(500, { message: 'Gagal memperbarui modul' });
		}
	}
};
