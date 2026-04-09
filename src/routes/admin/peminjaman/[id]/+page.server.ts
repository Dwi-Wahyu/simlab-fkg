import { base } from '$app/paths';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, lendingItem, equipment, item } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id } = params;
	if (!locals.user) throw redirect(302, `${base}/login`);

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

	// Calculate lateness
	const now = new Date();
	let latenessMinutes = 0;
	if (lendingData.endDate && now > lendingData.endDate && lendingData.status === 'DIPINJAM') {
		latenessMinutes = Math.floor((now.getTime() - lendingData.endDate.getTime()) / (1000 * 60));
	}

	return {
		lending: lendingData,
		latenessMinutes
	};
};

export const actions: Actions = {
	returnItems: async ({ request, params }) => {
		const { id } = params;
		const formData = await request.formData();
		
		const itemReturnDataRaw = formData.get('itemReturnData') as string;
		if (!itemReturnDataRaw) return fail(400, { message: 'Data pengembalian tidak valid' });

		const itemReturnData = JSON.parse(itemReturnDataRaw) as Array<{
			lendingItemId: string;
			equipmentId: string;
			status: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
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
					await tx.update(lendingItem)
						.set({
							returnStatus: itemData.status,
							returnNotes: itemData.notes,
							returnEvidencePath: evidencePath,
							returnedAt: new Date()
						})
						.where(eq(lendingItem.id, itemData.lendingItemId));

					// Update equipment status and condition
					await tx.update(equipment)
						.set({
							status: 'READY',
							condition: itemData.status
						})
						.where(eq(equipment.id, itemData.equipmentId));
				}

				// Update overall lending status
				await tx.update(lending)
					.set({ status: 'RETURNED' })
					.where(eq(lending.id, id));
			});

			return { success: true };
		} catch (err: any) {
			console.error('Error during return process:', err);
			return fail(500, { message: err.message || 'Gagal memproses pengembalian' });
		}
	}
};
