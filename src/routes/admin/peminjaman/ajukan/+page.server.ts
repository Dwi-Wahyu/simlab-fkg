import { db } from '$lib/server/db';
import { item, equipment, lending, lendingItem, user, laboratoriumMember } from '$lib/server/db/schema';
import { createNotification } from '$lib/server/notification';
import { eq, and, inArray } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || !['mahasiswa', 'dosen'].includes(locals.user.role)) {
		throw redirect(302, '/admin/peminjaman');
	}

	const selectedLabId = url.searchParams.get('labId') || '';

	const equipmentsFilter = selectedLabId
		? and(eq(equipment.status, 'READY'), eq(equipment.laboratoriumId, selectedLabId))
		: eq(equipment.status, 'READY');

	// Tampilkan semua item ASSET yang punya minimal 1 unit READY di lab terkait/mana pun
	const availableItems = await db.query.item.findMany({
		where: eq(item.type, 'ASSET'),
		with: {
			equipments: {
				where: equipmentsFilter,
				columns: { id: true, laboratoriumId: true },
				with: { laboratorium: { columns: { id: true, name: true } } }
			}
		}
	});

	const labs = await db.query.laboratorium.findMany();

	return {
		items: availableItems.filter((i) => i.equipments.length > 0),
		labs,
		selectedLabId
	};
};

export const actions: Actions = {
	ajukan: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser || !['mahasiswa', 'dosen'].includes(currentUser.role)) {
			return fail(403, { message: 'Tidak diizinkan' });
		}

		const formData = await request.formData();
		const unit = (formData.get('unit') as string)?.trim();
		const purpose = formData.get('purpose') as string;
		const startDate = formData.get('startDate') as string;
		const endDate = formData.get('endDate') as string;
		const nomorSurat = formData.get('nomorSurat') as string;
		const surat = formData.get('surat') as File;
		const itemDataRaw = formData.get('items') as string; // [{itemId, qty}]

		if (!unit || !purpose || !startDate || !itemDataRaw) {
			return fail(400, { message: 'Data pengajuan belum lengkap' });
		}

		if (!surat || surat.size === 0) {
			return fail(400, {
				message:
					'Surat permohonan wajib diunggah. Pastikan surat sudah ditandatangani sebelum diunggah.'
			});
		}
		if (surat.size > 10 * 1024 * 1024) {
			return fail(400, { message: 'Ukuran file surat maksimal 10MB' });
		}

		const selectedItems = JSON.parse(itemDataRaw) as { itemId: string; qty: number }[];
		if (selectedItems.length === 0) {
			return fail(400, { message: 'Pilih minimal 1 alat yang ingin dipinjam' });
		}

		const ext = path.extname(surat.name) || '.pdf';
		const fileName = `${uuidv4()}${ext}`;
		const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'letter');
		if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
		fs.writeFileSync(path.join(uploadDir, fileName), Buffer.from(await surat.arrayBuffer()));

		const lendingId = uuidv4();

		try {
			await db.transaction(async (tx) => {
				await tx.insert(lending).values({
					id: lendingId,
					requestedBy: currentUser.id,
					laboratoriumId: null, // ditentukan saat approval
					unit,
					purpose: purpose as any,
					nomorSurat: nomorSurat || null,
					surat: fileName,
					startDate: new Date(startDate),
					endDate: endDate ? new Date(endDate) : null,
					status: 'DRAFT' // menunggu verifikasi Kepala Lab
				});

				// Simpan intent alat (belum bind ke unit fisik/equipmentId tertentu)
				for (const sel of selectedItems) {
					await tx.insert(lendingItem).values({
						id: uuidv4(),
						lendingId,
						equipmentId: null,
						requestedItemId: sel.itemId,
						qty: sel.qty
					});
				}
			});

			// Kirim notifikasi ke Laboran & Kepala Lab
			try {
				const requestedItemIds = selectedItems.map((s) => s.itemId);
				const eqRecords = await db.query.equipment.findMany({
					where: inArray(equipment.itemId, requestedItemIds),
					columns: { laboratoriumId: true }
				});
				const targetLabIds = [
					...new Set(eqRecords.map((e) => e.laboratoriumId).filter(Boolean))
				] as string[];

				let targetStaffUsers: { id: string }[] = [];

				if (targetLabIds.length > 0) {
					const labMembers = await db.query.laboratoriumMember.findMany({
						where: inArray(laboratoriumMember.laboratoriumId, targetLabIds),
						with: {
							user: {
								columns: { id: true, role: true }
							}
						}
					});
					targetStaffUsers = labMembers
						.map((m) => m.user)
						.filter((u) => u && ['kepalaLab', 'laboran'].includes(u.role));
				}

				// Fallback jika tidak ditemukan staf spesifik lab: kirim ke semua kepalaLab & laboran aktif
				if (targetStaffUsers.length === 0) {
					targetStaffUsers = await db.query.user.findMany({
						where: and(inArray(user.role, ['kepalaLab', 'laboran']), eq(user.isDeleted, false)),
						columns: { id: true }
					});
				}

				const uniqueStaffIds = [...new Set(targetStaffUsers.map((u) => u.id))];
				const roleLabel =
					currentUser.role === 'mahasiswa'
						? 'Mahasiswa'
						: currentUser.role === 'dosen'
							? 'Dosen'
							: currentUser.role;

				for (const staffId of uniqueStaffIds) {
					await createNotification({
						userId: staffId,
						title: 'Pengajuan Peminjaman Baru',
						body: `${currentUser.name} (${roleLabel}) telah mengajukan peminjaman alat baru.`,
						priority: 'HIGH',
						action: {
							type: 'LENDING_REQUESTED',
							resourceId: lendingId,
							webPath: `/admin/peminjaman/${lendingId}`
						}
					});
				}
			} catch (notifErr) {
				console.error('Gagal mengirim notifikasi pengajuan peminjaman:', notifErr);
			}

			return { success: true, lendingId };
		} catch (err: any) {
			console.error('Error creating self-service lending:', err);
			return fail(500, { message: err.message || 'Gagal mengirim pengajuan' });
		}
	}
};
