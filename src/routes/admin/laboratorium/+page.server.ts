import { db } from '$lib/server/db';
import { laboratorium, laboratoriumMember, user } from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userSession = locals.user;
	if (!userSession || userSession.role !== 'superadmin') {
		throw redirect(302, '/admin/dashboard');
	}

	const labs = await db.query.laboratorium.findMany({
		with: {
			members: {
				where: eq(laboratoriumMember.role, 'koordinator'),
				with: {
					user: true
				}
			}
		}
	});

	const coordinators = await db.query.user.findMany({
		where: (user, { eq }) => eq(user.role, 'user')
	});

	return {
		labs,
		coordinators
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const coordinatorId = formData.get('coordinatorId') as string;

		if (!name) {
			return fail(400, { message: 'Nama wajib diisi' });
		}

		const slug = name
			.toLowerCase()
			.replace(/ /g, '-')
			.replace(/[^\w-]+/g, '');
		const labId = crypto.randomUUID();

		try {
			await db.insert(laboratorium).values({
				id: labId,
				name,
				slug,
				createdAt: new Date()
			});

			if (coordinatorId) {
				await db.insert(laboratoriumMember).values({
					id: crypto.randomUUID(),
					laboratoriumId: labId,
					userId: coordinatorId,
					role: 'koordinator',
					createdAt: new Date()
				});
			}

			return { success: true, message: 'Laboratorium berhasil dibuat' };
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Gagal membuat laboratorium' });
		}
	},

	update: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const coordinatorId = formData.get('coordinatorId') as string;

		if (!id || !name) {
			return fail(400, { message: 'ID dan Nama wajib diisi' });
		}

		const slug = name
			.toLowerCase()
			.replace(/ /g, '-')
			.replace(/[^\w-]+/g, '');

		try {
			await db.update(laboratorium).set({ name, slug }).where(eq(laboratorium.id, id));

			if (coordinatorId) {
				// Hapus koordinator lama di lab ini
				await db
					.delete(laboratoriumMember)
					.where(
						and(
							eq(laboratoriumMember.laboratoriumId, id),
							eq(laboratoriumMember.role, 'koordinator')
						)
					);

				// Tambah koordinator baru
				await db.insert(laboratoriumMember).values({
					id: crypto.randomUUID(),
					laboratoriumId: id,
					userId: coordinatorId,
					role: 'koordinator',
					createdAt: new Date()
				});
			}

			return { success: true, message: 'Laboratorium berhasil diperbarui' };
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Gagal memperbarui laboratorium' });
		}
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID wajib diisi' });

		try {
			await db.delete(laboratorium).where(eq(laboratorium.id, id));
			return { success: true, message: 'Laboratorium berhasil dihapus' };
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Gagal menghapus laboratorium' });
		}
	}
};
