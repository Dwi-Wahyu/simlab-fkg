import { db } from '$lib/server/db';
import { user, laboratoriumMember } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { desc, eq, and } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || (locals.user.role !== 'superadmin' && locals.user.role !== 'kepalaLab')) {
		throw error(403, 'Forbidden');
	}

	let users = [];

	if (locals.user.role === 'superadmin') {
		users = await db.query.user.findMany({
			where: eq(user.role, 'laboran'),
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
			.filter((u): u is NonNullable<typeof u> => u !== null)
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
			if (locals.user.role === 'superadmin') {
				try {
					await auth.api.removeUser({
						headers: request.headers,
						body: {
							userId
						}
					});
					return { success: true, message: 'Laboran berhasil dihapus' };
				} catch (e) {
					// Fallback direct DB delete
					await db.delete(user).where(eq(user.id, userId));
					return { success: true, message: 'Laboran berhasil dihapus' };
				}
			} else {
				// kepalaLab - direct DB delete to bypass Better Auth Admin API authorization check
				await db.delete(user).where(eq(user.id, userId));
				return { success: true, message: 'Laboran berhasil dihapus' };
			}
		} catch (dbErr: any) {
			console.error(dbErr);
			return fail(500, { message: dbErr.message || 'Gagal menghapus user' });
		}
	}
};
