import { fail, redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { maintenance, maintenanceCost, maintenanceCostItem } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = locals.user;
	if (!currentUser) throw redirect(302, `/`);

	const costId = params.id;
	const cost = await db.query.maintenanceCost.findFirst({
		where: eq(maintenanceCost.id, costId),
		with: {
			items: true
		}
	});

	if (!cost) throw error(404, 'Data tidak ditemukan');

	const labId = currentUser.laboratorium?.id;

	// Fetch maintenance tasks to link costs
	const maintenanceTasks = await db.query.maintenance.findMany({
		where: (m, { eq, sql }) => {
			if (labId && currentUser.role !== 'superadmin') {
				return sql`${m.equipmentId} IN (SELECT id FROM equipment WHERE laboratorium_id = ${labId})`;
			}
			return undefined;
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

	return {
		cost,
		maintenanceTasks
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) return fail(401, { message: 'Unauthorized' });

		const costId = params.id;
		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const maintenanceId = formData.get('maintenanceId')?.toString() || null;
		const status = formData.get('status')?.toString() as any;
		const dueDate = formData.get('dueDate')?.toString();
		const notes = formData.get('notes')?.toString();
		const attachmentFile = formData.get('attachment') as File;
		const itemsDataRaw = formData.get('items')?.toString();

		if (!name || !status || !itemsDataRaw) {
			return fail(400, { message: 'Nama biaya, status, dan rincian biaya wajib diisi.' });
		}

		let itemsData = [];
		try {
			itemsData = JSON.parse(itemsDataRaw) as { name: string; amount: number; notes: string }[];
		} catch (e) {
			return fail(400, { message: 'Format rincian biaya tidak valid.' });
		}

		const totalAmount = itemsData.reduce((acc, item) => acc + (item.amount || 0), 0);

		let attachmentPath = formData.get('existingAttachmentPath')?.toString() || null;
		let attachmentName = formData.get('existingAttachmentName')?.toString() || null;

		if (attachmentFile && attachmentFile.size > 0) {
			try {
				const ext = attachmentFile.name.split('.').pop();
				attachmentName = attachmentFile.name;
				const fileName = `${uuidv4()}.${ext}`;
				const uploadDir = join(process.cwd(), 'static', 'uploads', 'costs');
				await mkdir(uploadDir, { recursive: true });
				attachmentPath = `/uploads/costs/${fileName}`;
				const arrayBuffer = await attachmentFile.arrayBuffer();
				await writeFile(join(uploadDir, fileName), Buffer.from(arrayBuffer));
			} catch (err) {
				console.error('File upload error:', err);
				return fail(500, { message: 'Gagal mengupload lampiran' });
			}
		}

		try {
			await db.transaction(async (tx) => {
				// 1. Update Header
				await tx
					.update(maintenanceCost)
					.set({
						maintenanceId: maintenanceId === 'none' ? null : maintenanceId,
						name,
						amount: totalAmount,
						status,
						dueDate: dueDate ? new Date(dueDate) : null,
						attachmentPath,
						attachmentName,
						notes,
						updatedAt: new Date()
					})
					.where(eq(maintenanceCost.id, costId));

				// 2. Refresh Items (Delete then Insert)
				await tx.delete(maintenanceCostItem).where(eq(maintenanceCostItem.costId, costId));

				for (const item of itemsData) {
					await tx.insert(maintenanceCostItem).values({
						id: uuidv4(),
						costId: costId,
						name: item.name,
						amount: item.amount,
						notes: item.notes,
						createdAt: new Date()
					});
				}
			});
		} catch (err) {
			console.error('Database error:', err);
			return fail(500, { message: 'Gagal memperbarui data analisis biaya' });
		}

		return { success: true };
	}
};
