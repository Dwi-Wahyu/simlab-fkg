import { db } from '$lib/server/db';
import { user, laboratorium, laboratoriumMember } from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

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
	if (!role) throw error(404, 'Role tidak ditemukan');

	const targetUser = await db.query.user.findFirst({
		where: eq(user.id, params.id),
		with: {
			members: true
		}
	});

	if (!targetUser) throw error(404, 'User tidak ditemukan');

	const laboratoriums = await db.query.laboratorium.findMany();

	return {
		targetUser,
		laboratoriums,
		role,
		roleLabel: roleToLabel[role],
		roleSlug: params.role_slug
	};
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		if (!locals.user || locals.user.role !== 'superadmin') {
			return fail(403, { message: 'Forbidden' });
		}

		const role = slugToRole[params.role_slug];
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const username = formData.get('username') as string;
		const laboratoriumId = formData.get('laboratoriumId') as string;

		if (!name || !email || !username) {
			return fail(400, { message: 'Data wajib diisi' });
		}

		try {
			// 1. Update User info
			await db.update(user).set({
				name,
				email,
				username,
				updatedAt: new Date()
			}).where(eq(user.id, params.id));

			// 2. Update Laboratorium assignment
			// For simplicity, we assume one assignment for these roles in this UI
			// Delete existing and insert new if changed
			if (laboratoriumId) {
				const existingMember = await db.query.laboratoriumMember.findFirst({
					where: and(
						eq(laboratoriumMember.userId, params.id)
						// We might want to filter by role here if they have multiple roles
					)
				});

				if (existingMember) {
					if (existingMember.laboratoriumId !== laboratoriumId) {
						await db.update(laboratoriumMember)
							.set({ laboratoriumId, updatedAt: new Date() } as any) // updatedAt might not exist in schema.ts for this table
							.where(eq(laboratoriumMember.id, existingMember.id));
					}
				} else {
					await db.insert(laboratoriumMember).values({
						id: crypto.randomUUID(),
						userId: params.id,
						laboratoriumId: laboratoriumId,
						role: role,
						createdAt: new Date()
					});
				}
			}

			return { success: true, message: 'Data user berhasil diperbarui' };
		} catch (e: any) {
			console.error(e);
			return fail(500, { message: e.message || 'Gagal memperbarui user' });
		}
	}
};
