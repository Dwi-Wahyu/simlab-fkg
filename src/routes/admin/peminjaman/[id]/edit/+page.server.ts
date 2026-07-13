import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, lendingItem, equipment } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id } = params;
	if (!locals.user) throw redirect(302, `/login`);

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
					}
				}
			}
		}
	});

	if (!lendingData) {
		throw error(404, 'Data peminjaman tidak ditemukan');
	}

	// Fetch all ready equipment in this specific lab to populate the "Tambah Alat" dialog
	const availableEquipments = await db.query.equipment.findMany({
		where: and(
			eq(equipment.laboratoriumId, lendingData.laboratoriumId),
			eq(equipment.status, 'READY')
		),
		with: {
			item: true
		}
	});

	return {
		lending: lendingData,
		availableEquipments
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const { id } = params;
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const startDate = formData.get('startDate') as string;
		const endDate = formData.get('endDate') as string;
		const purpose = formData.get('purpose') as any;
		const nomorSurat = formData.get('nomorSurat') as string;
		const surat = formData.get('surat') as File;
		const equipmentIdsRaw = formData.get('equipmentIds') as string; // JSON array of equipment IDs currently in the loan

		if (!startDate || !purpose || !equipmentIdsRaw) {
			return fail(400, { message: 'Data tidak lengkap' });
		}

		const newEquipmentIds = JSON.parse(equipmentIdsRaw) as string[];

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id),
				with: {
					items: true
				}
			});

			if (!lendingData) {
				return fail(404, { message: 'Peminjaman tidak ditemukan' });
			}

			let suratPath = lendingData.surat;
			if (surat && surat.size > 0) {
				if (surat.size > 10 * 1024 * 1024) {
					return fail(400, { message: 'Ukuran file surat maksimal 10MB' });
				}
				const ext =
					path.extname(surat.name) || (surat.type === 'application/pdf' ? '.pdf' : '.docx');
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

			await db.transaction(async (tx) => {
				// 1. Update lending record
				await tx
					.update(lending)
					.set({
						startDate: new Date(startDate),
						endDate: endDate ? new Date(endDate) : null,
						purpose,
						nomorSurat: nomorSurat || null,
						surat: suratPath
					})
					.where(eq(lending.id, id));

				const originalItems = lendingData.items; // lendingItem array
				const originalEquipIds = originalItems
					.map((item) => item.equipmentId)
					.filter(Boolean) as string[];

				// 2. Identify equipment to remove
				const equipIdsToRemove = originalEquipIds.filter((eqId) => !newEquipmentIds.includes(eqId));
				for (const eqId of equipIdsToRemove) {
					// Delete from lending_item
					await tx
						.delete(lendingItem)
						.where(and(eq(lendingItem.lendingId, id), eq(lendingItem.equipmentId, eqId)));
					// Mark equipment status back to READY
					await tx.update(equipment).set({ status: 'READY' }).where(eq(equipment.id, eqId));
				}

				// 3. Identify new equipment to add
				const equipIdsToAdd = newEquipmentIds.filter((eqId) => !originalEquipIds.includes(eqId));
				for (const eqId of equipIdsToAdd) {
					await tx.insert(lendingItem).values({
						id: uuidv4(),
						lendingId: id,
						equipmentId: eqId,
						qty: 1
					});
					// Mark equipment status to IN_USE
					await tx.update(equipment).set({ status: 'IN_USE' }).where(eq(equipment.id, eqId));
				}
			});

			return { success: true };
		} catch (err: any) {
			console.error('Error updating lending:', err);
			return fail(500, { message: err.message || 'Gagal menyimpan perubahan' });
		}
	}
};
