import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, lendingItem, equipment, item, approval } from '$lib/server/db/schema';
import { createNotification } from '$lib/server/notification';
import { eq, and, isNull, or, sql } from 'drizzle-orm';
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
	if (['superadmin', 'kepalaLab'].includes(currentUser.role)) {
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
		const lendingData = await db.query.lending.findFirst({
			where: eq(lending.id, id)
		});

		if (!lendingData) {
			return fail(404, { message: 'Data peminjaman tidak ditemukan' });
		}

		let laboratoriumId =
			(formData.get('laboratoriumId') as string)?.trim() ||
			currentUser.laboratorium?.id ||
			lendingData.laboratoriumId ||
			'';

		try {
			await db.transaction(async (tx) => {
				const pendingItems = await tx.query.lendingItem.findMany({
					where: and(eq(lendingItem.lendingId, id), isNull(lendingItem.equipmentId)),
					with: {
						requestedItem: true
					}
				});

				for (const pending of pendingItems) {
					if (!pending.requestedItemId) continue;

					// 1. Cari equipment dengan status READY pada lab yang ditentukan (atau unassigned/NULL lab)
					let availableEquip = await tx.query.equipment.findMany({
						where: and(
							eq(equipment.itemId, pending.requestedItemId),
							eq(equipment.status, 'READY'),
							eq(equipment.isDeleted, false),
							laboratoriumId
								? or(eq(equipment.laboratoriumId, laboratoriumId), isNull(equipment.laboratoriumId))
								: sql`1=1`
						),
						limit: pending.qty ?? 1
					});

					// 2. Fallback: Jika tidak mencukupi di lab tertentu, cari seluruh equipment READY untuk item ini di lab manapun
					if (availableEquip.length < (pending.qty ?? 1)) {
						availableEquip = await tx.query.equipment.findMany({
							where: and(
								eq(equipment.itemId, pending.requestedItemId),
								eq(equipment.status, 'READY'),
								eq(equipment.isDeleted, false)
							),
							limit: pending.qty ?? 1
						});
					}

					const itemName = pending.requestedItem?.name || 'Alat';
					const requiredQty = pending.qty ?? 1;

					if (availableEquip.length < requiredQty) {
						throw new Error(
							`Stok alat "${itemName}" tidak mencukupi (dibutuhkan: ${requiredQty}, tersedia: ${availableEquip.length})`
						);
					}

					// Jika laboratoriumId belum diisi, gunakan laboratoriumId dari alat pertama yang ditemukan
					if (!laboratoriumId && availableEquip[0]?.laboratoriumId) {
						laboratoriumId = availableEquip[0].laboratoriumId;
					}

					// Bind unit pertama ke baris ini, sisanya (kalau qty > 1) buat baris lendingItem baru
					await tx
						.update(lendingItem)
						.set({
							equipmentId: availableEquip[0].id,
							qty: 1,
							initialCondition: availableEquip[0].condition || 'BAIK'
						})
						.where(eq(lendingItem.id, pending.id));

					for (const extra of availableEquip.slice(1)) {
						await tx.insert(lendingItem).values({
							id: uuidv4(),
							lendingId: id,
							equipmentId: extra.id,
							requestedItemId: pending.requestedItemId,
							qty: 1,
							initialCondition: extra.condition || 'BAIK'
						});
					}

					for (const equip of availableEquip) {
						await tx.update(equipment).set({ status: 'IN_USE' }).where(eq(equipment.id, equip.id));
					}
				}

				await tx
					.update(lending)
					.set({
						status: 'APPROVED',
						approvedBy: currentUser.id,
						laboratoriumId: laboratoriumId || null
					})
					.where(eq(lending.id, id));
			});

			// Kirim notifikasi balasan ke peminjam
			if (lendingData.requestedBy) {
				try {
					await createNotification({
						userId: lendingData.requestedBy,
						title: 'Peminjaman Disetujui',
						body: `Pengajuan peminjaman Anda untuk unit ${lendingData.unit} telah disetujui.`,
						priority: 'HIGH',
						action: {
							type: 'LENDING_APPROVED',
							resourceId: id,
							webPath: `/admin/peminjaman/${id}`
						}
					});
				} catch (nErr) {
					console.error('Gagal mengirim notifikasi persetujuan ke peminjam:', nErr);
				}
			}

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
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id)
			});

			await db
				.update(lending)
				.set({ status: 'REJECTED', rejectedReason: reason, approvedBy: currentUser.id })
				.where(eq(lending.id, id));

			// Kirim notifikasi penolakan ke peminjam
			if (lendingData?.requestedBy) {
				try {
					await createNotification({
						userId: lendingData.requestedBy,
						title: 'Peminjaman Ditolak',
						body: `Pengajuan peminjaman Anda ditolak. Alasan: ${reason}`,
						priority: 'HIGH',
						action: {
							type: 'LENDING_REJECTED',
							resourceId: id,
							webPath: `/admin/peminjaman/${id}`
						}
					});
				} catch (nErr) {
					console.error('Gagal mengirim notifikasi penolakan ke peminjam:', nErr);
				}
			}

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
