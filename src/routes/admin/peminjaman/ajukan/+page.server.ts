import { db } from '$lib/server/db';
import { item, equipment, lending, lendingItem, user, laboratoriumMember } from '$lib/server/db/schema';
import { createNotification, sendLendingSubmittedNotification } from '$lib/server/notification';
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

	const selectedLabIds = url.searchParams.getAll('labId').filter(Boolean);

	const equipmentsFilter =
		selectedLabIds.length > 0
			? and(eq(equipment.status, 'READY'), inArray(equipment.laboratoriumId, selectedLabIds))
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
		selectedLabIds
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
		const laboratoriumId = (formData.get('laboratoriumId') as string)?.trim() || null;

		if (!unit || !purpose || !startDate || !itemDataRaw || !laboratoriumId) {
			return fail(400, { message: 'Data pengajuan belum lengkap. Pastikan laboratorium telah dipilih.' });
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
					laboratoriumId: laboratoriumId,
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

			// Kirim notifikasi ke user (kepalaLab & laboran) yang terhubung ke laboratoriumId tersebut
			try {
				await sendLendingSubmittedNotification(lendingId, laboratoriumId, {
					name: currentUser.name,
					role: currentUser.role
				});
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
