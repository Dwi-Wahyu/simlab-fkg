import { db } from '$lib/server/db';
import { user, laboratorium, laboratoriumMember } from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

const slugToRole: Record<string, string> = {
	'koordinator': 'koordinator',
	'kepala-lab': 'kepalaLab',
	'instruktur': 'instruktur',
	'teknisi': 'teknisi',
	'spmi': 'spmi'
};

const roleToLabel: Record<string, string> = {
	'koordinator': 'Koordinator',
	'kepalaLab': 'Kepala Lab',
	'instruktur': 'Dosen',
	'teknisi': 'Teknisi',
	'spmi': 'SPMI'
};

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'superadmin') {
		throw error(403, 'Forbidden');
	}

	const role = slugToRole[params.role_slug];
	if (!role) {
		throw error(404, 'Role tidak ditemukan');
	}

	const laboratoriums = await db.query.laboratorium.findMany();

	return {
		laboratoriums,
		role,
		roleLabel: roleToLabel[role],
		roleSlug: params.role_slug
	};
};

export const actions: Actions = {
	create: async ({ request, locals, params, headers }) => {
		if (!locals.user || locals.user.role !== 'superadmin') {
			return fail(403, { message: 'Forbidden' });
		}

		const role = slugToRole[params.role_slug];
		if (!role) return fail(400, { message: 'Role tidak valid' });

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const username = formData.get('username') as string;
		const password = formData.get('password') as string;
		const laboratoriumId = formData.get('laboratoriumId') as string;

		if (!name || !email || !password || !username) {
			return fail(400, { message: 'Data wajib diisi' });
		}

		try {
			// 1. Create User via Better Auth Admin API
			// This prevents automatic login as the newly created user
			const createUserResponse = await auth.api.admin.createUser({
				headers,
				body: {
					name,
					email,
					password,
					username,
					role // Directly set role via Admin API
				}
			});

			if (!createUserResponse) throw new Error('Gagal membuat user');

			const newUserId = createUserResponse.user.id;

			// 2. Add to Laboratorium
			if (laboratoriumId) {
				await db.insert(laboratoriumMember).values({
					id: crypto.randomUUID(),
					userId: newUserId,
					laboratoriumId: laboratoriumId,
					role: role,
					createdAt: new Date()
				});
			}

			return { success: true, message: `Berhasil menambahkan ${roleToLabel[role]}` };
		} catch (e: any) {
			console.error(e);
			return fail(500, { message: e.message || 'Gagal membuat user' });
		}
	}
};
