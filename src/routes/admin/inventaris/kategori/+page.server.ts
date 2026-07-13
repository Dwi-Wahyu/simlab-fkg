import { fail, redirect } from '@sveltejs/kit';
import { eq, and, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { base } from '$app/paths';
import { db } from '$lib/server/db';
import { equipmentCategory, item } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, `${base}/`);

	const categories = await db.query.equipmentCategory.findMany({
		with: {
			items: {
				where: (item, { eq }) => eq(item.isDeleted, false)
			}
		},
		orderBy: (ec, { desc }) => [desc(ec.createdAt)]
	});

	return {
		user: locals.user,
		categories
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = await locals.user;
		if (!session) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const action = formData.get('action') as string;

		if (action === 'create') {
			const name = formData.get('name') as string;
			const description = formData.get('description') as string;

			if (!name) {
				return fail(400, { message: 'Nama kategori wajib diisi.' });
			}

			const existing = await db.query.equipmentCategory.findFirst({
				where: eq(equipmentCategory.name, name)
			});

			if (existing) {
				return fail(400, { message: 'Nama kategori sudah terdaftar.' });
			}

			try {
				await db.insert(equipmentCategory).values({
					id: uuidv4(),
					name,
					description: description || null
				});
				return { success: true, message: 'Kategori berhasil ditambahkan.' };
			} catch (err) {
				console.error(err);
				return fail(500, { message: 'Gagal menambahkan kategori.' });
			}
		}

		if (action === 'update') {
			const id = formData.get('id') as string;
			const name = formData.get('name') as string;
			const description = formData.get('description') as string;

			if (!id || !name) {
				return fail(400, { message: 'ID dan Nama kategori wajib diisi.' });
			}

			const existing = await db.query.equipmentCategory.findFirst({
				where: and(eq(equipmentCategory.name, name), ne(equipmentCategory.id, id))
			});

			if (existing) {
				return fail(400, { message: 'Nama kategori sudah digunakan oleh kategori lain.' });
			}

			try {
				await db
					.update(equipmentCategory)
					.set({
						name,
						description: description || null
					})
					.where(eq(equipmentCategory.id, id));
				return { success: true, message: 'Kategori berhasil diperbarui.' };
			} catch (err) {
				console.error(err);
				return fail(500, { message: 'Gagal memperbarui kategori.' });
			}
		}

		if (action === 'delete') {
			const id = formData.get('id') as string;

			if (!id) {
				return fail(400, { message: 'ID kategori wajib diisi.' });
			}

			// Check linked items
			const linkedItems = await db
				.select()
				.from(item)
				.where(and(eq(item.categoryId, id), eq(item.isDeleted, false)));
			if (linkedItems.length > 0) {
				return fail(400, {
					message: `Kategori tidak dapat dihapus karena masih digunakan oleh ${linkedItems.length} item.`
				});
			}

			try {
				await db.delete(equipmentCategory).where(eq(equipmentCategory.id, id));
				return { success: true, message: 'Kategori berhasil dihapus.' };
			} catch (err) {
				console.error(err);
				return fail(500, { message: 'Gagal menghapus kategori.' });
			}
		}

		return fail(400, { message: 'Aksi tidak valid.' });
	}
};
