import { fail, redirect, error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { base } from '$app/paths';
import { db } from '$lib/server/db';
import {
	kelompokMahasiswa,
	kelompokMahasiswaMember,
	user,
	practicumClassMember,
	practicumClass
} from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) throw redirect(302, `${base}/`);

	const role = locals.user.role;
	if (!['superadmin', 'koordinator'].includes(role)) {
		throw redirect(302, `${base}/admin/dashboard`);
	}

	const id = params.id;
	const kelompok = await db.query.kelompokMahasiswa.findFirst({
		where: and(eq(kelompokMahasiswa.id, id), eq(kelompokMahasiswa.isDeleted, false)),
		with: {
			class: true
		}
	});

	if (!kelompok) {
		throw error(404, 'Kelompok tidak ditemukan.');
	}

	// 1. Members of this kelompok
	const members = await db.query.kelompokMahasiswaMember.findMany({
		where: eq(kelompokMahasiswaMember.kelompokId, id),
		with: {
			user: {
				where: (u, { eq }) => eq(u.isDeleted, false)
			}
		},
		orderBy: (kmm, { desc }) => [desc(kmm.createdAt)]
	});

	// 2. Class members (students registered in the same practicum class)
	const classMembers = await db.query.practicumClassMember.findMany({
		where: eq(practicumClassMember.classId, kelompok.classId),
		with: {
			user: {
				where: (u, { eq }) => eq(u.isDeleted, false)
			}
		}
	});

	// 3. Distinct batches for filter
	const batchesResult = await db
		.selectDistinct({ batch: practicumClass.batch })
		.from(practicumClass);
	const batches = batchesResult.map((b) => b.batch).sort();

	// 4. Optionally load all student users (role = 'peneliti') for system-wide assignment
	const fetchAllStudents = async () => {
		return await db.query.user.findMany({
			where: and(eq(user.role, 'peneliti'), eq(user.isDeleted, false)),
			orderBy: (u, { asc }) => [asc(u.name)]
		});
	};

	return {
		user: locals.user,
		kelompok,
		members,
		classMembers,
		allStudentsPromise: fetchAllStudents(),
		batches
	};
};

export const actions: Actions = {
	addMember: async ({ params, request, locals }) => {
		const session = await locals.user;
		if (!session) return fail(401, { message: 'Unauthorized' });

		const role = session.role;
		if (!['superadmin', 'koordinator'].includes(role)) {
			return fail(403, { message: 'Forbidden' });
		}

		const kelompokId = params.id;
		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { message: 'User ID wajib diisi.' });
		}

		// Check if already member
		const existing = await db.query.kelompokMahasiswaMember.findFirst({
			where: and(
				eq(kelompokMahasiswaMember.kelompokId, kelompokId),
				eq(kelompokMahasiswaMember.userId, userId)
			)
		});

		if (existing) {
			return fail(400, { message: 'Mahasiswa sudah tergabung dalam kelompok ini.' });
		}

		try {
			await db.insert(kelompokMahasiswaMember).values({
				id: uuidv4(),
				kelompokId,
				userId
			});
			return { success: true, message: 'Mahasiswa berhasil ditambahkan ke kelompok.' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal menambahkan anggota kelompok.' });
		}
	},

	removeMember: async ({ params, request, locals }) => {
		const session = await locals.user;
		if (!session) return fail(401, { message: 'Unauthorized' });

		const role = session.role;
		if (!['superadmin', 'koordinator'].includes(role)) {
			return fail(403, { message: 'Forbidden' });
		}

		const kelompokId = params.id;
		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { message: 'User ID wajib diisi.' });
		}

		try {
			await db
				.delete(kelompokMahasiswaMember)
				.where(
					and(
						eq(kelompokMahasiswaMember.kelompokId, kelompokId),
						eq(kelompokMahasiswaMember.userId, userId)
					)
				);
			return { success: true, message: 'Mahasiswa berhasil dihapus dari kelompok.' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal menghapus anggota kelompok.' });
		}
	}
};
