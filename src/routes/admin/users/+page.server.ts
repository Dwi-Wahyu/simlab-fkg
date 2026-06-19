import { db } from '$lib/server/db';
import { user, laboratorium, laboratoriumMember } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	// Otorisasi: Hanya superadmin
	if (!locals.user || locals.user.role !== 'superadmin') {
		throw error(403, 'Forbidden: Akses khusus Superadmin');
	}

	const laboratoriums = await db.query.laboratorium.findMany();

	return {
		laboratoriums
	};
};

export const actions: Actions = {
	create: async ({ request, locals, headers }) => {
		if (!locals.user || locals.user.role !== 'superadmin') {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const laboratoriumId = formData.get('laboratoriumId') as string;
		const labRole = formData.get('labRole') as string;

		if (!name || !email || !password) {
			return fail(400, { message: 'Data wajib diisi' });
		}

		try {
			// 1. Create User via Better Auth Admin API
			// This prevents automatic login as the newly created user
			const newUserResponse = await auth.api.admin.createUser({
				headers,
				body: {
					name,
					email,
					password,
					// Use email as username if not provided, or it will be handled by the plugin
					username: email.split('@')[0], 
					role: 'user' // Default global role
				}
			});

			if (!newUserResponse) throw new Error('Gagal membuat user');

			const newUser = newUserResponse.user;

			// 2. Add to Laboratorium if provided
			if (laboratoriumId && labRole) {
				await auth.api.addMember({
					headers,
					body: {
						organizationId: laboratoriumId, 
						userId: newUser.id,
						role: labRole
					}
				});
			}
		} catch (e: any) {
			return fail(500, { message: e.message || 'Gagal membuat user' });
		}

		return { success: true };
	},

	updateRole: async ({ request, locals, headers }) => {
		if (!locals.user || locals.user.role !== 'superadmin') {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const laboratoriumId = formData.get('laboratoriumId') as string;
		const role = formData.get('role') as string;

		if (!userId || !laboratoriumId || !role) {
			return fail(400, { message: 'Data wajib diisi' });
		}

		try {
			// Better Auth updateMemberRole might need memberId. 
			// If we don't have memberId easily, we can manually update DB.
			await db.update(laboratoriumMember)
				.set({ role })
				.where(eq(laboratoriumMember.userId, userId));
		} catch (e: any) {
			return fail(500, { message: e.message || 'Gagal memperbarui role' });
		}

		return { success: true };
	},

	delete: async ({ request, locals, headers }) => {
		if (!locals.user || locals.user.role !== 'superadmin') {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { message: 'User ID wajib diisi' });
		}

		try {
			// Hapus user via Better Auth API
			await auth.api.deleteUser({
				headers,
				body: {
					userId
				}
			});
		} catch (e: any) {
			// Fallback: Delete directly if API fails
			try {
				await db.delete(user).where(eq(user.id, userId));
			} catch (dbErr) {
				return fail(500, { message: e.message || 'Gagal menghapus user' });
			}
		}

		return { success: true };
	}
};
