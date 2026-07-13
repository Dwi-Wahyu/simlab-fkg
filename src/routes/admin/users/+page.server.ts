import { db } from '$lib/server/db';
import { user, laboratorium, laboratoriumMember } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { desc, eq, and } from 'drizzle-orm';
import { notDeleted } from '$lib/server/db/soft-delete';
import { createAuditLog } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	// Otorisasi: Hanya superadmin
	if (!locals.user || locals.user.role !== 'superadmin') {
		throw error(403, 'Forbidden: Akses khusus Superadmin');
	}

	const laboratoriums = await db.query.laboratorium.findMany({
		where: eq(laboratorium.isDeleted, false)
	});

	return {
		laboratoriums
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
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
			const newUserResponse = await auth.api.createUser({
				headers: request.headers,
				body: {
					name,
					email,
					password,
					// Use email as username if not provided, or it will be handled by the plugin
					username: email.split('@')[0],
					role: 'user' // Default global role
				} as any
			});

			if (!newUserResponse) throw new Error('Gagal membuat user');

			const newUser = newUserResponse.user;

			// 2. Add to Laboratorium if provided
			if (laboratoriumId && labRole) {
				await auth.api.addMember({
					headers: request.headers,
					body: {
						organizationId: laboratoriumId,
						userId: newUser.id,
						role: labRole as any
					}
				});
			}
		} catch (e: any) {
			return fail(500, { message: e.message || 'Gagal membuat user' });
		}

		return { success: true };
	},

	updateRole: async ({ request, locals }) => {
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
			await db
				.update(laboratoriumMember)
				.set({ role })
				.where(eq(laboratoriumMember.userId, userId));
		} catch (e: any) {
			return fail(500, { message: e.message || 'Gagal memperbarui role' });
		}

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'superadmin') {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { message: 'User ID wajib diisi' });
		}

		try {
			const [usr] = await db
				.select()
				.from(user)
				.where(and(eq(user.id, userId), notDeleted(user)))
				.limit(1);
			if (!usr) return fail(404, { message: 'User tidak ditemukan' });

			await db
				.update(user)
				.set({
					isDeleted: true,
					deletedAt: new Date(),
					deletedBy: locals.user.id,
					banned: true
				})
				.where(eq(user.id, userId));

			await createAuditLog({
				userId: locals.user.id,
				action: 'SOFT_DELETE_USER',
				tableName: 'user',
				recordId: userId,
				oldValue: usr
			});
		} catch (e: any) {
			console.error(e);
			return fail(500, { message: e.message || 'Gagal menghapus user' });
		}

		return { success: true };
	}
};
