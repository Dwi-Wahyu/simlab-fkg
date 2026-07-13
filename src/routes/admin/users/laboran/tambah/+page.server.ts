import { db } from '$lib/server/db';
import { user, laboratorium, laboratoriumMember } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || (locals.user.role !== 'superadmin' && locals.user.role !== 'kepalaLab')) {
		throw error(403, 'Forbidden');
	}

	let laboratoriums: any[] = [];
	if (locals.user.role === 'superadmin') {
		laboratoriums = await db.query.laboratorium.findMany();
	}

	return {
		laboratoriums,
		role: 'laboran',
		roleLabel: 'Laboran',
		roleSlug: 'laboran'
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user || (locals.user.role !== 'superadmin' && locals.user.role !== 'kepalaLab')) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const username = formData.get('username') as string;
		const password = formData.get('password') as string;

		let targetLabId = '';
		if (locals.user.role === 'superadmin') {
			targetLabId = formData.get('laboratoriumId') as string;
			if (!targetLabId) {
				return fail(400, { message: 'Laboratorium penugasan wajib diisi' });
			}
		} else {
			// kepalaLab
			const labId = locals.user.laboratorium?.id;
			if (!labId) {
				return fail(400, { message: 'Anda tidak memiliki laboratorium penugasan' });
			}
			targetLabId = labId;
		}

		if (!name || !email || !password || !username) {
			return fail(400, { message: 'Data wajib diisi' });
		}

		try {
			// 1. Create User via Better Auth public signUp API (to bypass Admin role requirements)
			const signUpResponse = await auth.api.signUpEmail({
				body: {
					name,
					email,
					password,
					username
				}
			});

			if (!signUpResponse) throw new Error('Gagal membuat user');

			const newUserId = signUpResponse.user.id;

			// 2. Update role to 'laboran'
			await db
				.update(user)
				.set({ role: 'laboran', updatedAt: new Date() })
				.where(eq(user.id, newUserId));

			// 3. Add to Laboratorium
			await db.insert(laboratoriumMember).values({
				id: crypto.randomUUID(),
				userId: newUserId,
				laboratoriumId: targetLabId,
				role: 'laboran',
				createdAt: new Date()
			});

			return { success: true, message: 'Laboran berhasil ditambahkan' };
		} catch (e: any) {
			console.error(e);
			return fail(500, { message: e.message || 'Gagal membuat user' });
		}
	}
};
