import { db } from '$lib/server/db';
import { user, item, equipment, lending, lendingItem } from '$lib/server/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { v4 as uuidv4 } from 'uuid';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !['kepalaLab', 'superadmin'].includes(locals.user.role)) {
		throw redirect(302, `/admin/peminjaman`);
	}

	// 1. Fetch potential requesters (Mahasiswa & DPJP)
	const requesters = await db.query.user.findMany({
		where: inArray(user.role, ['peneliti', 'instruktur']),
		columns: {
			id: true,
			name: true,
			role: true,
			username: true
		}
	});

	// 2. Fetch all items and their ready equipment count
	const availableItems = await db.query.item.findMany({
		where: eq(item.type, 'ASSET'),
		with: {
			equipments: {
				where: eq(equipment.status, 'READY'),
				columns: {
					id: true,
					serialNumber: true
				}
			}
		}
	});

	console.log(`Fetched ${availableItems.length} items total`);

	// 3. Fetch laboratories
	const labs = await db.query.laboratorium.findMany();

	return {
		requesters,
		items: availableItems,
		labs
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user || !['kepalaLab', 'superadmin'].includes(locals.user.role)) {
			return fail(403, { message: 'Tidak diizinkan' });
		}
		const formData = await request.formData();
		const requesterIds = formData.getAll('requesterIds') as string[];
		const itemDataRaw = formData.get('items') as string; // JSON string of { itemId: string, qty: number }[]
		const labId = formData.get('laboratoriumId') as string;
		const startDate = formData.get('startDate') as string;
		const endDate = formData.get('endDate') as string;
		const purpose = formData.get('purpose') as any;

		if (!requesterIds.length || !itemDataRaw || !labId || !startDate) {
			return fail(400, { message: 'Data tidak lengkap' });
		}

		const selectedItems = JSON.parse(itemDataRaw) as { itemId: string; qty: number }[];

		// Process each requester (Bulk)
		try {
			for (const requesterId of requesterIds) {
				const lendingId = uuidv4();

				await db.transaction(async (tx) => {
					// Create lending record
					await tx.insert(lending).values({
						id: lendingId,
						requestedBy: requesterId,
						laboratoriumId: labId,
						startDate: new Date(startDate),
						endDate: endDate ? new Date(endDate) : null,
						purpose: purpose || 'PRAKTIKUM',
						status: 'APPROVED', // Usually approved immediately if created by staff/coordinator
						unit: 'FKG UNHAS' // Default unit
					});

					// Assign equipment
					for (const selected of selectedItems) {
						// Find available equipment for this item
						const availableEquip = await tx.query.equipment.findMany({
							where: and(eq(equipment.itemId, selected.itemId), eq(equipment.status, 'READY')),
							limit: selected.qty
						});

						if (availableEquip.length < selected.qty) {
							throw new Error(`Stok tidak cukup untuk item ID: ${selected.itemId}`);
						}

						for (const equip of availableEquip) {
							// Create lending item
							await tx.insert(lendingItem).values({
								id: uuidv4(),
								lendingId: lendingId,
								equipmentId: equip.id,
								qty: 1
							});

							// Update equipment status
							await tx
								.update(equipment)
								.set({ status: 'IN_USE' })
								.where(eq(equipment.id, equip.id));
						}
					}
				});
			}
			return { success: true };
		} catch (error: any) {
			console.error('Error creating lending:', error);
			return fail(500, { message: error.message || 'Gagal membuat peminjaman' });
		}
	}
};
