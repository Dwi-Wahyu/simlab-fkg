import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

const slugToRole: Record<string, string> = {
	'koordinator': 'koordinator',
	'kepala-lab': 'kepalaLab',
	'instruktur': 'instruktur',
	'teknisi': 'teknisi',
	'spmi': 'spmi',
	'laboran': 'laboran'
};

const roleToLabel: Record<string, string> = {
	'koordinator': 'PJ Mata Kuliah',
	'kepalaLab': 'Kepala Lab',
	'instruktur': 'Dosen',
	'teknisi': 'Teknisi',
	'spmi': 'SPMI',
	'laboran': 'Laboran'
};

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'superadmin') {
		throw error(403, 'Forbidden');
	}

	const role = slugToRole[params.role_slug];
	if (!role) {
		throw error(404, 'Role tidak ditemukan');
	}

	const users = await db.query.user.findMany({
		where: eq(user.role, role),
		orderBy: [desc(user.createdAt)],
		with: {
			members: {
				with: {
					laboratorium: true
				}
			}
		}
	});

	return {
		users,
		role,
		roleLabel: roleToLabel[role],
		roleSlug: params.role_slug
	};
};

export const actions: Actions = {
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
			await auth.api.removeUser({
				headers: request.headers,
				body: {
					userId
				}
			});
			return { success: true, message: 'User berhasil dihapus' };
		} catch (e: any) {
			try {
				await db.delete(user).where(eq(user.id, userId));
				return { success: true, message: 'User berhasil dihapus' };
			} catch (dbErr) {
				return fail(500, { message: e.message || 'Gagal menghapus user' });
			}
		}
	}
};
