import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { maintenance, equipment, maintenanceCost, approval } from '$lib/server/db/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;
	if (!currentUser) throw redirect(302, `/`);

	const labId = currentUser.laboratorium?.id;

	// Base query for filtering by lab
	const labFilter = (m: any, { sql }: any) => {
		if (labId && currentUser.role !== 'superadmin') {
			return sql`${m.equipmentId} IN (SELECT id FROM equipment WHERE laboratorium_id = ${labId})`;
		}
		return undefined;
	};

	// 1. Fetch maintenance records (excluding KALIBRASI for the first tab)
	const maintenanceList = await db.query.maintenance.findMany({
		where: (m, { and, ne, sql }) => {
			const base = labFilter(m, { sql });
			return base
				? and(ne(m.maintenanceType, 'KALIBRASI'), base)
				: ne(m.maintenanceType, 'KALIBRASI');
		},
		with: {
			equipment: {
				with: {
					item: true
				}
			}
		},
		orderBy: [desc(maintenance.scheduledDate)]
	});

	// 2. Fetch calibration records
	const calibrationList = await db.query.maintenance.findMany({
		where: (m, { and, eq, sql }) => {
			const base = labFilter(m, { sql });
			return base
				? and(eq(m.maintenanceType, 'KALIBRASI'), base)
				: eq(m.maintenanceType, 'KALIBRASI');
		},
		with: {
			equipment: {
				with: {
					item: true
				}
			}
		},
		orderBy: [desc(maintenance.completionDate), desc(maintenance.scheduledDate)]
	});

	// 3. Fetch Cost Analysis records
	const costs = await db.query.maintenanceCost.findMany({
		where: (mc, { sql }) => {
			if (labId && currentUser.role !== 'superadmin') {
				return sql`${mc.maintenanceId} IN (SELECT id FROM maintenance WHERE equipment_id IN (SELECT id FROM equipment WHERE laboratorium_id = ${labId})) OR ${mc.maintenanceId} IS NULL`;
			}
			return undefined;
		},
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
		orderBy: [desc(maintenanceCost.createdAt)]
	});

	// 4. Fetch summary stats
	const now = new Date();
	const thirtyDaysFromNow = new Date();
	thirtyDaysFromNow.setDate(now.getDate() + 30);

	const overdueCount = calibrationList.filter(
		(c) => c.status !== 'COMPLETED' && c.scheduledDate < now
	).length;
	const upcomingCount = calibrationList.filter(
		(c) =>
			c.status !== 'COMPLETED' && c.scheduledDate >= now && c.scheduledDate <= thirtyDaysFromNow
	).length;
	const maintenanceThisMonth = maintenanceList.filter(
		(m) =>
			m.scheduledDate.getMonth() === now.getMonth() &&
			m.scheduledDate.getFullYear() === now.getFullYear()
	).length;

	// Total cost from maintenance table (for backwards compatibility if any) + maintenanceCost table
	const totalCostThisMonth = costs
		.filter(
			(c) =>
				c.createdAt.getMonth() === now.getMonth() && c.createdAt.getFullYear() === now.getFullYear()
		)
		.reduce((acc, curr) => acc + (curr.amount || 0), 0);

	// Fetch all approvals related to the maintenance list to show their status
	const maintenanceIds = maintenanceList.map((m) => m.id);
	const approvalList = maintenanceIds.length > 0
		? await db.query.approval.findMany({
				where: and(
					eq(approval.referenceType, 'MAINTENANCE'),
					inArray(approval.referenceId, maintenanceIds)
				)
			})
		: [];

	let pendingApprovalsCount = 0;
	if (['superadmin', 'kepalaLab'].includes(currentUser.role)) {
		const allPending = await db.query.approval.findMany({
			where: and(
				eq(approval.referenceType, 'MAINTENANCE'),
				eq(approval.status, 'PENDING')
			),
			with: {
				maintenance: {
					with: {
						equipment: true
					}
				}
			}
		});

		let filteredPending = allPending;
		if (currentUser.role === 'kepalaLab') {
			const userLabId = currentUser.laboratorium?.id;
			filteredPending = allPending.filter(
				(app) => app.maintenance?.equipment?.laboratoriumId === userLabId
			);
		}
		pendingApprovalsCount = filteredPending.length;
	}

	return {
		maintenance: maintenanceList,
		calibrations: calibrationList,
		costs,
		approvals: approvalList,
		pendingApprovalsCount,
		userRole: currentUser.role,
		summary: {
			maintenanceThisMonth,
			upcomingCount,
			overdueCount,
			totalCostThisMonth
		}
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { message: 'ID tidak ditemukan' });
		}

		try {
			// Cek apakah data ada sebelum dihapus
			const existing = await db.query.maintenance.findFirst({
				where: eq(maintenance.id, id)
			});

			if (!existing) {
				return fail(404, { message: 'Data pemeliharaan tidak ditemukan' });
			}

			await db.delete(maintenance).where(eq(maintenance.id, id));
		} catch (err) {
			console.error('Error deleting maintenance:', err);
			return fail(500, { message: 'Kesalahan server internal saat menghapus data' });
		}

		return { success: true, message: 'Data berhasil dihapus' };
	},
	deleteCost: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { message: 'ID tidak ditemukan' });
		}

		try {
			// Cek apakah data ada sebelum dihapus
			const existing = await db.query.maintenanceCost.findFirst({
				where: eq(maintenanceCost.id, id)
			});

			if (!existing) {
				return fail(404, { message: 'Data biaya tidak ditemukan' });
			}

			await db.delete(maintenanceCost).where(eq(maintenanceCost.id, id));
		} catch (err) {
			console.error('Error deleting cost analysis:', err);
			return fail(500, { message: 'Kesalahan server internal saat menghapus data' });
		}

		return { success: true, message: 'Data berhasil dihapus' };
	}
};
