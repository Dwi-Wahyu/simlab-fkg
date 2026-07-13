import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { desc, eq, and } from 'drizzle-orm';
import { notDeleted } from '$lib/server/db/soft-delete';
import { createAuditLog } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

const slugToRole: Record<string, string> = {
	koordinator: 'koordinator',
	'kepala-lab': 'kepalaLab',
	instruktur: 'instruktur',
	teknisi: 'teknisi',
	spmi: 'spmi',
	laboran: 'laboran'
};

const roleToLabel: Record<string, string> = {
	koordinator: 'PJ Mata Kuliah',
	kepalaLab: 'Kepala Lab',
	instruktur: 'Dosen',
	teknisi: 'Teknisi',
	spmi: 'SPMI',
	laboran: 'Laboran'
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
		where: and(eq(user.role, role), notDeleted(user)),
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

			return { success: true, message: 'User berhasil dihapus' };
		} catch (e: any) {
			console.error(e);
			return fail(500, { message: e.message || 'Gagal menghapus user' });
		}
	}
};
