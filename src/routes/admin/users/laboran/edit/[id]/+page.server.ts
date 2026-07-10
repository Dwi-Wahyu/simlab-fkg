import { db } from '$lib/server/db';
import { user, laboratorium, laboratoriumMember } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || (locals.user.role !== 'superadmin' && locals.user.role !== 'kepalaLab')) {
		throw error(403, 'Forbidden');
	}

	const targetUser = await db.query.user.findFirst({
		where: eq(user.id, params.id),
		with: {
			members: true
		}
	});

	if (!targetUser) throw error(404, 'User tidak ditemukan');

	// Security check for kepalaLab
	if (locals.user.role === 'kepalaLab') {
		const labId = locals.user.laboratorium?.id;
		if (!labId) {
			throw error(403, 'Forbidden: Anda tidak memiliki laboratorium penugasan');
		}
		const isMember = targetUser.members.some(
			(m) => m.laboratoriumId === labId && m.role === 'laboran'
		);
		if (!isMember) {
			throw error(403, 'Forbidden: Anda tidak memiliki akses ke user ini');
		}
	}

	let laboratoriums: any[] = [];
	if (locals.user.role === 'superadmin') {
		laboratoriums = await db.query.laboratorium.findMany();
	}

	return {
		targetUser,
		laboratoriums,
		role: 'laboran',
		roleLabel: 'Laboran',
		roleSlug: 'laboran'
	};
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		if (!locals.user || (locals.user.role !== 'superadmin' && locals.user.role !== 'kepalaLab')) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const username = formData.get('username') as string;

		if (!name || !email || !username) {
			return fail(400, { message: 'Data wajib diisi' });
		}

		let targetLabId = '';
		if (locals.user.role === 'superadmin') {
			targetLabId = formData.get('laboratoriumId') as string;
			if (!targetLabId) {
				return fail(400, { message: 'Laboratorium penugasan wajib diisi untuk Laboran' });
			}
		} else {
			// kepalaLab
			const labId = locals.user.laboratorium?.id;
			if (!labId) {
				return fail(403, { message: 'Forbidden' });
			}
			targetLabId = labId;
		}

		// Security Check: kepalaLab can only edit laboran in their own laboratory
		if (locals.user.role === 'kepalaLab') {
			const hasAccess = await db.query.laboratoriumMember.findFirst({
				where: and(
					eq(laboratoriumMember.userId, params.id),
					eq(laboratoriumMember.laboratoriumId, targetLabId),
					eq(laboratoriumMember.role, 'laboran')
				)
			});
			if (!hasAccess) {
				return fail(403, { message: 'Anda tidak memiliki hak untuk mengedit user ini' });
			}
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
			if (targetLabId) {
				const existingMember = await db.query.laboratoriumMember.findFirst({
					where: and(
						eq(laboratoriumMember.userId, params.id),
						eq(laboratoriumMember.role, 'laboran')
					)
				});

				if (existingMember) {
					if (existingMember.laboratoriumId !== targetLabId) {
						await db.update(laboratoriumMember)
							.set({ laboratoriumId: targetLabId })
							.where(eq(laboratoriumMember.id, existingMember.id));
					}
				} else {
					await db.insert(laboratoriumMember).values({
						id: crypto.randomUUID(),
						userId: params.id,
						laboratoriumId: targetLabId,
						role: 'laboran',
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
