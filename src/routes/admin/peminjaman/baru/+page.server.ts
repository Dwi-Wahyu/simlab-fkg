import { db } from '$lib/server/db';
import { user, item, equipment, lending, lendingItem } from '$lib/server/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

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

	const isKepalaLab = locals.user?.role === 'kepalaLab';
	const userLabId = locals.user?.laboratorium?.id;

	// 2. Fetch all items and their ready equipment count
	let availableItems = await db.query.item.findMany({
		where: eq(item.type, 'ASSET'),
		with: {
			equipments: {
				where: and(
					eq(equipment.status, 'READY'),
					isKepalaLab && userLabId ? eq(equipment.laboratoriumId, userLabId) : sql`1=1`
				),
				columns: {
					id: true,
					serialNumber: true
				}
			}
		}
	});

	if (isKepalaLab && userLabId) {
		availableItems = availableItems.filter((i) => i.equipments.length > 0);
	}

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
		let labId = formData.get('laboratoriumId') as string;
		if (locals.user?.role === 'kepalaLab' && locals.user?.laboratorium?.id) {
			labId = locals.user.laboratorium.id;
		}
		const startDate = formData.get('startDate') as string;
		const endDate = formData.get('endDate') as string;
		const purpose = formData.get('purpose') as any;
		const nomorSurat = formData.get('nomorSurat') as string;
		const surat = formData.get('surat') as File;

		if (!requesterIds.length || !itemDataRaw || !labId || !startDate) {
			return fail(400, { message: 'Data tidak lengkap' });
		}

		let suratPath = null;
		if (surat && surat.size > 0) {
			if (surat.size > 10 * 1024 * 1024) {
				return fail(400, { message: 'Ukuran file surat maksimal 10MB' });
			}
			const ext = path.extname(surat.name) || (surat.type === 'application/pdf' ? '.pdf' : '.docx');
			const fileName = `${uuidv4()}${ext}`;
			const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'letter');

			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}

			const filePath = path.join(uploadDir, fileName);
			const buffer = Buffer.from(await surat.arrayBuffer());
			fs.writeFileSync(filePath, buffer);
			suratPath = fileName;
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
						nomorSurat: nomorSurat || null,
						surat: suratPath,
						status: 'APPROVED', // Usually approved immediately if created by staff/coordinator
						unit: 'FKG UNHAS' // Default unit
					});

					// Assign equipment
					for (const selected of selectedItems) {
						// Find available equipment for this item in the selected lab
						const availableEquip = await tx.query.equipment.findMany({
							where: and(
								eq(equipment.itemId, selected.itemId),
								eq(equipment.status, 'READY'),
								eq(equipment.laboratoriumId, labId)
							),
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
