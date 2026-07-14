import { db } from '$lib/server/db';
import { item, equipment, lending, lendingItem } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { id } = params;
	const currentUser = locals.user;
	if (!currentUser || !['peneliti', 'instruktur'].includes(currentUser.role)) {
		throw redirect(302, '/admin/peminjaman');
	}

	const lendingData = await db.query.lending.findFirst({
		where: eq(lending.id, id),
		with: {
			items: {
				with: {
					requestedItem: true
				}
			}
		}
	});

	if (!lendingData) {
		throw error(404, 'Data peminjaman tidak ditemukan');
	}

	if (lendingData.requestedBy !== currentUser.id) {
		throw error(403, 'Anda tidak memiliki izin untuk mengubah pengajuan ini');
	}

	if (lendingData.status !== 'DRAFT') {
		throw redirect(302, `/admin/peminjaman`);
	}

	const selectedLabId = url.searchParams.get('labId') || '';

	const equipmentsFilter = selectedLabId
		? and(eq(equipment.status, 'READY'), eq(equipment.laboratoriumId, selectedLabId))
		: eq(equipment.status, 'READY');

	// Tampilkan semua item ASSET yang punya minimal 1 unit READY
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

	// Map existing lending items for pre-selection in Svelte
	const currentSelectedItems = lendingData.items.map((i) => ({
		itemId: i.requestedItemId,
		name: i.requestedItem?.name || 'Alat',
		qty: i.qty ?? 1
	}));

	return {
		lending: lendingData,
		items: availableItems.filter((i) => i.equipments.length > 0),
		labs,
		selectedLabId,
		currentSelectedItems
	};
};

export const actions: Actions = {
	editMandiri: async ({ params, request, locals }) => {
		const { id } = params;
		const currentUser = locals.user;
		if (!currentUser || !['peneliti', 'instruktur'].includes(currentUser.role)) {
			return fail(403, { message: 'Tidak diizinkan' });
		}

		const lendingData = await db.query.lending.findFirst({
			where: eq(lending.id, id)
		});

		if (!lendingData) {
			return fail(404, { message: 'Peminjaman tidak ditemukan' });
		}

		if (lendingData.requestedBy !== currentUser.id) {
			return fail(403, { message: 'Tidak diizinkan' });
		}

		if (lendingData.status !== 'DRAFT') {
			return fail(400, { message: 'Pengajuan hanya dapat diubah jika berstatus Menunggu' });
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

		const selectedItems = JSON.parse(itemDataRaw) as { itemId: string; qty: number }[];
		if (selectedItems.length === 0) {
			return fail(400, { message: 'Pilih minimal 1 alat yang ingin dipinjam' });
		}

		let fileName = lendingData.surat;

		// If a new letter file is uploaded, write it and replace the old one
		if (surat && surat.size > 0) {
			if (surat.size > 10 * 1024 * 1024) {
				return fail(400, { message: 'Ukuran file surat maksimal 10MB' });
			}
			const ext = path.extname(surat.name) || '.pdf';
			const newFileName = `${uuidv4()}${ext}`;
			const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'letter');
			if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
			fs.writeFileSync(path.join(uploadDir, newFileName), Buffer.from(await surat.arrayBuffer()));

			// Delete old file if it exists
			if (lendingData.surat) {
				const oldPath = path.join(uploadDir, lendingData.surat);
				if (fs.existsSync(oldPath)) {
					try {
						fs.unlinkSync(oldPath);
					} catch (e) {
						console.error('Failed to delete old letter:', e);
					}
				}
			}

			fileName = newFileName;
		}

		try {
			await db.transaction(async (tx) => {
				await tx
					.update(lending)
					.set({
						unit,
						purpose: purpose as any,
						nomorSurat: nomorSurat || null,
						surat: fileName,
						startDate: new Date(startDate),
						endDate: endDate ? new Date(endDate) : null
					})
					.where(eq(lending.id, id));

				// Clear existing items and insert new ones
				await tx.delete(lendingItem).where(eq(lendingItem.lendingId, id));

				for (const sel of selectedItems) {
					await tx.insert(lendingItem).values({
						id: uuidv4(),
						lendingId: id,
						equipmentId: null,
						requestedItemId: sel.itemId,
						qty: sel.qty
					});
				}
			});

			return { success: true };
		} catch (err: any) {
			console.error('Error editing direct lending:', err);
			return fail(500, { message: err.message || 'Gagal menyimpan perubahan' });
		}
	}
};
