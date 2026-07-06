import { fail, redirect } from '@sveltejs/kit';
import { eq, and, ne, like, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { base } from '$app/paths';
import { db } from '$lib/server/db';
import { kelompokMahasiswa, practicumClass } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, `${base}/`);

	const role = locals.user.role;
	if (!['superadmin', 'koordinator'].includes(role)) {
		throw redirect(302, `${base}/admin/dashboard`);
	}

	const classIdParam = url.searchParams.get('classId') || undefined;
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';

	const classes = await db.query.practicumClass.findMany({
		orderBy: (pc, { desc }) => [desc(pc.createdAt)]
	});

	const fetchGroups = async () => {
		const offset = (page - 1) * limit;

		let conditions = [];
		if (classIdParam) {
			conditions.push(eq(kelompokMahasiswa.classId, classIdParam));
		}
		if (search) {
			conditions.push(like(kelompokMahasiswa.name, `%${search}%`));
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const [totalCountResult] = await db
			.select({ value: count() })
			.from(kelompokMahasiswa)
			.where(whereClause);
		const totalItems = Number(totalCountResult?.value || 0);

		const items = await db.query.kelompokMahasiswa.findMany({
			where: whereClause,
			with: {
				class: true,
				members: {
					with: {
						user: true
					}
				}
			},
			orderBy: (km, { desc }) => [desc(km.createdAt)],
			limit,
			offset
		});

		const totalPages = Math.ceil(totalItems / limit) || 1;

		return {
			items,
			pagination: {
				currentPage: page,
				limit,
				totalItems,
				totalPages
			}
		};
	};

	return {
		user: locals.user,
		classes,
		selectedClassId: classIdParam || '',
		groupsPromise: fetchGroups()
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = await locals.user;
		if (!session) return fail(401, { message: 'Unauthorized' });

		const role = session.role;
		if (!['superadmin', 'koordinator'].includes(role)) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const action = formData.get('action') as string;

		if (action === 'create') {
			const name = formData.get('name') as string;
			const classId = formData.get('classId') as string;

			if (!name || !classId) {
				return fail(400, { message: 'Nama kelompok dan Kelas wajib diisi.' });
			}

			const existing = await db.query.kelompokMahasiswa.findFirst({
				where: and(
					eq(kelompokMahasiswa.classId, classId),
					eq(kelompokMahasiswa.name, name)
				)
			});

			if (existing) {
				return fail(400, { message: 'Kelompok dengan nama ini sudah ada di kelas tersebut.' });
			}

			try {
				await db.insert(kelompokMahasiswa).values({
					id: uuidv4(),
					name,
					classId
				});
				return { success: true, message: 'Kelompok berhasil ditambahkan.' };
			} catch (err) {
				console.error(err);
				return fail(500, { message: 'Gagal menambahkan kelompok.' });
			}
		}

		if (action === 'update') {
			const id = formData.get('id') as string;
			const name = formData.get('name') as string;
			const classId = formData.get('classId') as string;

			if (!id || !name || !classId) {
				return fail(400, { message: 'ID, Nama kelompok, dan Kelas wajib diisi.' });
			}

			const existing = await db.query.kelompokMahasiswa.findFirst({
				where: and(
					eq(kelompokMahasiswa.classId, classId),
					eq(kelompokMahasiswa.name, name),
					ne(kelompokMahasiswa.id, id)
				)
			});

			if (existing) {
				return fail(400, { message: 'Kelompok dengan nama ini sudah ada di kelas tersebut.' });
			}

			try {
				await db.update(kelompokMahasiswa)
					.set({ name, classId })
					.where(eq(kelompokMahasiswa.id, id));
				return { success: true, message: 'Kelompok berhasil diperbarui.' };
			} catch (err) {
				console.error(err);
				return fail(500, { message: 'Gagal memperbarui kelompok.' });
			}
		}

		if (action === 'delete') {
			const id = formData.get('id') as string;

			if (!id) {
				return fail(400, { message: 'ID kelompok wajib diisi.' });
			}

			try {
				await db.delete(kelompokMahasiswa).where(eq(kelompokMahasiswa.id, id));
				return { success: true, message: 'Kelompok berhasil dihapus.' };
			} catch (err) {
				console.error(err);
				return fail(500, { message: 'Gagal menghapus kelompok.' });
			}
		}

		return fail(400, { message: 'Aksi tidak valid.' });
	}
};
