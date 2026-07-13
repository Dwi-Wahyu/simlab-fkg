import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { approval, maintenance, equipment, item } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { reviewMaintenanceApproval } from '$lib/server/maintenance';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;
	if (!currentUser) throw redirect(302, `/`);

	if (!['superadmin', 'kepalaLab'].includes(currentUser.role)) {
		throw error(403, 'Forbidden: Anda tidak memiliki hak akses untuk menyetujui pemeliharaan.');
	}

	const allPendingApprovals = await db.query.approval.findMany({
		where: and(eq(approval.referenceType, 'MAINTENANCE'), eq(approval.status, 'PENDING')),
		with: {
			maintenance: {
				with: {
					equipment: {
						with: {
							item: true
						}
					}
				}
			}
		},
		orderBy: (a, { desc }) => [desc(a.createdAt)]
	});

	let filtered = allPendingApprovals;
	if (currentUser.role === 'kepalaLab') {
		const userLabId = currentUser.laboratorium?.id;
		filtered = allPendingApprovals.filter(
			(app) => app.maintenance?.equipment?.laboratoriumId === userLabId
		);
	}

	return {
		approvals: filtered
	};
};

export const actions: Actions = {
	review: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) throw error(401, 'Unauthorized');

		if (!['superadmin', 'kepalaLab'].includes(currentUser.role)) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const approvalId = formData.get('approvalId') as string;
		const action = formData.get('action') as string; // 'approve' or 'reject'
		const note = formData.get('note') as string;

		if (!approvalId || !action) {
			return fail(400, { message: 'Data tidak lengkap.' });
		}

		const isApproved = action === 'approve';
		if (!isApproved && !note) {
			return fail(400, { message: 'Catatan penolakan wajib diisi.' });
		}

		try {
			await reviewMaintenanceApproval(approvalId, currentUser.id, isApproved, note);
			return { success: true };
		} catch (err: any) {
			console.error(err);
			return fail(500, { message: err.message || 'Gagal memproses persetujuan.' });
		}
	}
};
