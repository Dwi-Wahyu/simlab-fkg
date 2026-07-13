import { db } from '$lib/server/db';
import { user, laboratoriumMember } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { desc, eq, and } from 'drizzle-orm';
import { notDeleted } from '$lib/server/db/soft-delete';
import { createAuditLog } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || (locals.user.role !== 'superadmin' && locals.user.role !== 'kepalaLab')) {
		throw error(403, 'Forbidden');
	}

	let users = [];

	if (locals.user.role === 'superadmin') {
		users = await db.query.user.findMany({
			where: and(eq(user.role, 'laboran'), notDeleted(user)),
			orderBy: [desc(user.createdAt)],
			with: {
				members: {
					with: {
						laboratorium: true
					}
				}
			}
		});
	} else {
		const labId = locals.user.laboratorium?.id;
		if (!labId) {
			return {
				users: [],
				role: 'laboran',
				roleLabel: 'Laboran',
				roleSlug: 'laboran',
				error: 'Anda belum terdaftar di laboratorium mana pun. Silakan hubungi Superadmin.'
			};
		}

		const members = await db.query.laboratoriumMember.findMany({
			where: and(
				eq(laboratoriumMember.laboratoriumId, labId),
				eq(laboratoriumMember.role, 'laboran')
			),
			with: {
				user: {
					where: (user, { eq }) => eq(user.isDeleted, false),
					with: {
						members: {
							with: {
								laboratorium: true
							}
						}
					}
				}
			}
		});

		users = members
			.map((m) => m.user)
			.filter((u): u is NonNullable<typeof u> => u !== null && !u.isDeleted)
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	}

	return {
		users,
		role: 'laboran',
		roleLabel: 'Laboran',
		roleSlug: 'laboran'
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		if (!locals.user || (locals.user.role !== 'superadmin' && locals.user.role !== 'kepalaLab')) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { message: 'User ID wajib diisi' });
		}

		// Security Check: kepalaLab can only delete laboran in their own laboratory
		if (locals.user.role === 'kepalaLab') {
			const labId = locals.user.laboratorium?.id;
			if (!labId) {
				return fail(403, { message: 'Forbidden' });
			}
			const isMember = await db.query.laboratoriumMember.findFirst({
				where: and(
					eq(laboratoriumMember.userId, userId),
					eq(laboratoriumMember.laboratoriumId, labId),
					eq(laboratoriumMember.role, 'laboran')
				)
			});
			if (!isMember) {
				return fail(403, { message: 'Anda tidak memiliki hak untuk menghapus user ini.' });
			}
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

			return { success: true, message: 'Laboran berhasil dihapus' };
		} catch (dbErr: any) {
			console.error(dbErr);
			return fail(500, { message: dbErr.message || 'Gagal menghapus user' });
		}
	}
};
