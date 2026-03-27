import { db } from '$lib/server/db';
import { distribution, organization, warehouse, approval } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import { validateDistribution, approveDistribution, shipDistribution, receiveDistribution } from '$lib/server/distribution';

export const load: PageServerLoad = async ({ params, locals }) => {
	const dist = await db.query.distribution.findFirst({
		where: eq(distribution.id, params.id),
		with: {
			fromOrganization: true,
			toOrganization: true,
			requestedByUser: true,
			approvedByUser: true,
			items: {
				with: {
					equipment: {
						with: {
							item: true
						}
					},
					item: true
				}
			}
		}
	});

	if (!dist) throw error(404, 'Distribusi tidak ditemukan');

	// Get latest approval
	const latestApproval = await db.query.approval.findFirst({
		where: and(
			eq(approval.referenceType, 'DISTRIBUTION'),
			eq(approval.referenceId, dist.id)
		),
		with: {
			approvedByUser: true
		},
		orderBy: (approval, { desc }) => [desc(approval.createdAt)]
	});

	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, params.org_slug)
	});

	if (!org) throw error(404, 'Kesatuan tidak ditemukan');

	// Get warehouses for shipping/receiving
	const warehouses = await db.query.warehouse.findMany({
		where: eq(warehouse.organizationId, org.id)
	});

	return {
		distribution: dist,
		approval: latestApproval,
		warehouses,
		currentOrgId: org.id
	};
};

export const actions: Actions = {
	validate: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');
		if (user.role !== 'operatorBinmatDanBekharrah' && user.role !== 'superadmin') {
			return { success: false, message: 'Hanya role Binmat yang dapat memvalidasi' };
		}
		try {
			await validateDistribution(params.id, user.id);
			return { success: true, message: 'Distribusi divalidasi' };
		} catch (e) {
			return { success: false, message: e instanceof Error ? e.message : 'Gagal memvalidasi' };
		}
	},
	approve: async ({ params, locals, request }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');
		if (user.role !== 'pimpinan' && user.role !== 'superadmin') {
			return { success: false, message: 'Hanya role Pimpinan yang dapat memberikan approval' };
		}
		const formData = await request.formData();
		const isApproved = formData.get('isApproved') === 'true';
		const note = formData.get('note') as string;

		try {
			await approveDistribution(params.id, user.id, isApproved, note);
			return { success: true, message: isApproved ? 'Distribusi disetujui' : 'Distribusi ditolak (DRAFT)' };
		} catch (e) {
			return { success: false, message: e instanceof Error ? e.message : 'Gagal memproses approval' };
		}
	},
	ship: async ({ params, locals, request }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');
		if (user.role !== 'operatorBinmatDanBekharrah' && user.role !== 'superadmin') {
			return { success: false, message: 'Hanya role Bekharrah yang dapat memproses pengiriman' };
		}
		const formData = await request.formData();
		const fromWarehouseId = formData.get('fromWarehouseId') as string;

		if (!fromWarehouseId) return { success: false, message: 'Pilih gudang asal' };

		try {
			await shipDistribution(params.id, user.id, fromWarehouseId);
			return { success: true, message: 'Materi telah dikirim' };
		} catch (e) {
			return { success: false, message: e instanceof Error ? e.message : 'Gagal mengirim materi' };
		}
	},
	receive: async ({ params, locals, request }) => {
		const user = locals.user;
		if (!user) throw error(401, 'Unauthorized');
		const formData = await request.formData();
		const toWarehouseId = formData.get('toWarehouseId') as string;

		if (!toWarehouseId) return { success: false, message: 'Pilih gudang tujuan' };

		try {
			await receiveDistribution(params.id, user.id, toWarehouseId);
			return { success: true, message: 'Materi telah diterima' };
		} catch (e) {
			return { success: false, message: e instanceof Error ? e.message : 'Gagal menerima materi' };
		}
	}
};
