import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, lendingItem, equipment, item, approval } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id } = params;
	const currentUser = locals.user;
	if (!currentUser) throw redirect(302, `/login`);

	const lendingData = await db.query.lending.findFirst({
		where: eq(lending.id, id),
		with: {
			requestedByUser: {
				columns: { name: true, username: true, role: true }
			},
			laboratorium: {
				columns: { name: true }
			},
			items: {
				with: {
					equipment: {
						with: {
							item: true
						}
					},
					requestedItem: true
				}
			}
		}
	});

	if (!lendingData) {
		throw error(404, 'Data peminjaman tidak ditemukan');
	}

	// Filter for kepalaLab
	if (
		currentUser.role === 'kepalaLab' &&
		lendingData.laboratoriumId &&
		lendingData.laboratoriumId !== currentUser.laboratorium?.id
	) {
		throw error(403, 'Anda tidak memiliki izin untuk melihat peminjaman ini');
	}

	// Calculate lateness
	const now = new Date();
	let latenessMinutes = 0;
	if (lendingData.endDate && now > lendingData.endDate && lendingData.status === 'DIPINJAM') {
		latenessMinutes = Math.floor((now.getTime() - lendingData.endDate.getTime()) / (1000 * 60));
	}

	let labs: any[] = [];
	if (currentUser.role === 'superadmin') {
		labs = await db.query.laboratorium.findMany();
	}

	return {
		lending: lendingData,
		latenessMinutes,
		labs
	};
};

export const actions: Actions = {
	approveLending: async ({ params, locals, request }) => {
		const { id } = params;
		const currentUser = locals.user;
		if (!currentUser || !['kepalaLab', 'superadmin'].includes(currentUser.role)) {
			return fail(403, { message: 'Tidak diizinkan' });
		}

		const formData = await request.formData();
		const laboratoriumId =
			(formData.get('laboratoriumId') as string) || currentUser.laboratorium?.id || '';

		if (!laboratoriumId) {
			return fail(400, { message: 'Laboratorium wajib ditentukan saat menyetujui' });
		}

		try {
			await db.transaction(async (tx) => {
				const pendingItems = await tx.query.lendingItem.findMany({
					where: and(eq(lendingItem.lendingId, id), isNull(lendingItem.equipmentId))
				});

				for (const pending of pendingItems) {
					if (!pending.requestedItemId) continue;

					const availableEquip = await tx.query.equipment.findMany({
						where: and(
							eq(equipment.itemId, pending.requestedItemId),
							eq(equipment.status, 'READY'),
							eq(equipment.laboratoriumId, laboratoriumId)
						),
						limit: pending.qty ?? 1
					});

					if (availableEquip.length < (pending.qty ?? 1)) {
						throw new Error(
							`Stok tidak cukup untuk salah satu alat yang diajukan di laboratorium ini`
						);
					}

					// Bind unit pertama ke baris ini, sisanya (kalau qty > 1) buat baris lendingItem baru
					await tx
						.update(lendingItem)
						.set({ equipmentId: availableEquip[0].id, qty: 1 })
						.where(eq(lendingItem.id, pending.id));

					for (const extra of availableEquip.slice(1)) {
						await tx.insert(lendingItem).values({
							id: uuidv4(),
							lendingId: id,
							equipmentId: extra.id,
							requestedItemId: pending.requestedItemId,
							qty: 1
						});
					}

					for (const equip of availableEquip) {
						await tx.update(equipment).set({ status: 'IN_USE' }).where(eq(equipment.id, equip.id));
					}
				}

				await tx
					.update(lending)
					.set({ status: 'APPROVED', approvedBy: currentUser.id, laboratoriumId })
					.where(eq(lending.id, id));
			});

			return { success: true };
		} catch (err: any) {
			console.error('Error approving lending:', err);
			return fail(500, { message: err.message || 'Gagal menyetujui peminjaman' });
		}
	},

	rejectLending: async ({ params, locals, request }) => {
		const { id } = params;
		const currentUser = locals.user;
		if (!currentUser || !['kepalaLab', 'superadmin'].includes(currentUser.role)) {
			return fail(403, { message: 'Tidak diizinkan' });
		}

		const formData = await request.formData();
		const reason = (formData.get('reason') as string)?.trim();
		if (!reason) return fail(400, { message: 'Alasan penolakan wajib diisi' });

		try {
			await db
				.update(lending)
				.set({ status: 'REJECTED', rejectedReason: reason, approvedBy: currentUser.id })
				.where(eq(lending.id, id));
			return { success: true };
		} catch (err: any) {
			console.error('Error rejecting lending:', err);
			return fail(500, { message: err.message || 'Gagal menolak peminjaman' });
		}
	},

	returnItems: async ({ request, params }) => {
		const { id } = params;
		const formData = await request.formData();

		const itemReturnDataRaw = formData.get('itemReturnData') as string;
		if (!itemReturnDataRaw) return fail(400, { message: 'Data pengembalian tidak valid' });

		const itemReturnData = JSON.parse(itemReturnDataRaw) as Array<{
			lendingItemId: string;
			equipmentId: string;
			status: 'BAIK' | 'RUSAK';
			notes: string;
			hasEvidence: boolean;
		}>;

		try {
			await db.transaction(async (tx) => {
				for (const itemData of itemReturnData) {
					let evidencePath = null;

					// Handle file upload if any
					const file = formData.get(`evidence_${itemData.lendingItemId}`) as File;
					if (file && file.size > 0) {
						const ext = path.extname(file.name);
						const fileName = `${uuidv4()}${ext}`;
						const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'lending', 'evidence');

						if (!fs.existsSync(uploadDir)) {
							fs.mkdirSync(uploadDir, { recursive: true });
						}

						const filePath = path.join(uploadDir, fileName);
						const buffer = Buffer.from(await file.arrayBuffer());
						fs.writeFileSync(filePath, buffer);
						evidencePath = `/uploads/lending/evidence/${fileName}`;
					}

					// Update lending item
					await tx
						.update(lendingItem)
						.set({
							returnStatus: itemData.status,
							returnNotes: itemData.notes,
							returnEvidencePath: evidencePath,
							returnedAt: new Date()
						})
						.where(eq(lendingItem.id, itemData.lendingItemId));

					// Update equipment status and condition
					await tx
						.update(equipment)
						.set({
							status: 'READY',
							condition: itemData.status
						})
						.where(eq(equipment.id, itemData.equipmentId));
				}

				// Update overall lending status
				await tx.update(lending).set({ status: 'RETURNED' }).where(eq(lending.id, id));
			});

			return { success: true };
		} catch (err: any) {
			console.error('Error during return process:', err);
			return fail(500, { message: err.message || 'Gagal memproses pengembalian' });
		}
	},

	deleteLending: async ({ params, locals }) => {
		const { id } = params;
		const currentUser = locals.user;
		if (!currentUser) throw redirect(302, `/login`);

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id)
			});

			if (!lendingData) {
				return fail(404, { message: 'Data peminjaman tidak ditemukan' });
			}

			// Filter for kepalaLab
			if (
				currentUser.role === 'kepalaLab' &&
				lendingData.laboratoriumId !== currentUser.laboratorium?.id
			) {
				return fail(403, { message: 'Anda tidak memiliki izin untuk menghapus peminjaman ini' });
			}

			// Constraint: only if status is RETURNED
			if (lendingData.status !== 'RETURNED') {
				return fail(400, {
					message: 'Peminjaman hanya dapat dihapus jika status sudah dikembalikan'
				});
			}

			await db.transaction(async (tx) => {
				// Delete related approval
				await tx
					.delete(approval)
					.where(and(eq(approval.referenceType, 'LENDING'), eq(approval.referenceId, id)));

				// Delete the lending (lendingItem will cascade delete automatically)
				await tx.delete(lending).where(eq(lending.id, id));
			});
		} catch (err: any) {
			console.error('Error deleting lending:', err);
			return fail(500, { message: err.message || 'Kesalahan server internal saat menghapus data' });
		}

		throw redirect(303, '/admin/peminjaman');
	}
};
