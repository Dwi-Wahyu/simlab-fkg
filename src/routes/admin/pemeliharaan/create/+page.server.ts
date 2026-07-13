import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment, maintenance, user } from '$lib/server/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

const maintenanceSchema = z.object({
	equipmentId: z.string().uuid(),
	maintenanceType: z.enum(['PREVENTIF', 'KOREKTIF', 'KALIBRASI']),
	description: z.string().min(1),
	scheduledDate: z.string().datetime(),
	completionDate: z.string().datetime().optional().nullable(),
	status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING'),
	technicianId: z.string().max(36).optional().nullable(),
	cost: z.number().int().min(0).default(0)
});

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;
	if (!currentUser) throw redirect(302, `/`);

	const labId = currentUser.laboratorium?.id;
	const isGlobalRole = ['superadmin', 'teknisi'].includes(currentUser.role);

	const equipmentList = await db.query.equipment.findMany({
		where: (table, { eq, and }) => {
			const conds = [eq(table.isDeleted, false)];
			if (!isGlobalRole && labId) {
				conds.push(eq(table.laboratoriumId, labId));
			}
			return and(...conds);
		},
		columns: {
			id: true,
			serialNumber: true,
			condition: true,
			laboratoriumId: true
		},
		with: {
			item: {
				columns: {
					name: true
				}
			}
		}
	});

	// Urutkan berdasarkan nama item
	const sortedEquipment = [...equipmentList].sort((a, b) =>
		(a.item?.name || '').localeCompare(b.item?.name || '')
	);

	const technicianList = await db.query.user.findMany({
		where: (table, { eq, and }) => and(eq(table.role, 'teknisi'), eq(table.isDeleted, false)),
		columns: { id: true, name: true, email: true },
		orderBy: (user, { asc }) => [asc(user.name)]
	});

	return {
		equipment: sortedEquipment,
		technicians: technicianList,
		userRole: currentUser.role
	};
};

import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { submitMaintenanceForApproval } from '$lib/server/maintenance';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) throw fail(401, { message: 'Unauthorized' });
		const formData = await request.formData();

		try {
			const rawScheduledDate = formData.get('scheduledDate')?.toString();
			const rawCompletionDate = formData.get('completionDate')?.toString();
			const rawTechnicianId = formData.get('technicianId')?.toString();
			const rawCost = formData.get('cost')?.toString();
			const rawStatus = formData.get('status')?.toString();

			console.log(
				'[pemeliharaan/create] incoming status:',
				rawStatus,
				'| completionDate:',
				rawCompletionDate
			);

			let finalTechnicianId = rawTechnicianId && rawTechnicianId !== '' ? rawTechnicianId : null;
			if (locals.user.role === 'teknisi') {
				finalTechnicianId = locals.user.id;
			}

			let scheduledDateIso: string | null = null;
			if (rawScheduledDate && rawScheduledDate !== '') {
				const dateObj = new Date(rawScheduledDate);
				if (isNaN(dateObj.getTime())) {
					return fail(400, { message: 'Tanggal jadwal tidak valid' });
				}
				scheduledDateIso = dateObj.toISOString();
			}

			let completionDateIso: string | null = null;
			if (rawCompletionDate && rawCompletionDate !== '') {
				const dateObj = new Date(rawCompletionDate);
				if (isNaN(dateObj.getTime())) {
					return fail(400, { message: 'Tanggal selesai tidak valid' });
				}
				completionDateIso = dateObj.toISOString();
			}

			const costInt = rawCost ? parseInt(rawCost) : 0;
			const statusVal = rawStatus as any;

			const validated = maintenanceSchema.parse({
				equipmentId: formData.get('equipmentId')?.toString(),
				maintenanceType: formData.get('maintenanceType')?.toString(),
				description: formData.get('description')?.toString(),
				scheduledDate: scheduledDateIso,
				completionDate: completionDateIso,
				status: statusVal || 'PENDING',
				technicianId: finalTechnicianId,
				cost: isNaN(costInt) ? 0 : costInt
			});

			const id = uuidv4();
			const files = formData.getAll('receipts') as File[];
			let notaFileName: string | null = null;

			// Handle Receipt Uploads if any
			if (files.length > 0 && files[0].size > 0) {
				const uploadDir = join(process.cwd(), 'static', 'uploads', 'receipts');
				await mkdir(uploadDir, { recursive: true });

				// Standardize filename
				const file = files[0];
				const ext = file.name.split('.').pop();
				const fileName = `${uuidv4()}.${ext}`;
				notaFileName = fileName;

				const arrayBuffer = await file.arrayBuffer();
				await writeFile(join(uploadDir, fileName), Buffer.from(arrayBuffer));
			}

			await db.transaction(async (tx) => {
				await tx.insert(maintenance).values({
					id,
					equipmentId: validated.equipmentId,
					maintenanceType: validated.maintenanceType,
					description: validated.description,
					scheduledDate: new Date(validated.scheduledDate),
					completionDate: validated.completionDate ? new Date(validated.completionDate) : null,
					status: validated.status,
					technicianId: validated.technicianId,
					cost: validated.cost,
					notaFileName,
					createdAt: new Date()
				});

				// Auto-submit approval if cost is > 0 and status is COMPLETED
				if (validated.cost > 0 && validated.status === 'COMPLETED') {
					await submitMaintenanceForApproval(tx, id, locals.user.id);
				}
			});

			return { success: true };
		} catch (e: any) {
			console.error(e);
			return fail(400, { message: e.message || 'Gagal menyimpan data pemeliharaan' });
		}
	}
};
