import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment, maintenance, user } from '$lib/server/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
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
		where: (table, { eq }) => {
			if (!isGlobalRole && labId) {
				return eq(table.laboratoriumId, labId);
			}
			return undefined;
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
		where: (table, { eq }) => eq(table.role, 'teknisi'),
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

		const rawScheduledDate = formData.get('scheduledDate')?.toString();
		const rawCompletionDate = formData.get('completionDate')?.toString();
		const rawTechnicianId = formData.get('technicianId')?.toString();
		const rawCost = formData.get('cost')?.toString();

		let finalTechnicianId = rawTechnicianId && rawTechnicianId !== '' ? rawTechnicianId : null;
		if (locals.user.role === 'teknisi') {
			finalTechnicianId = locals.user.id;
		}

		const data = {
			equipmentId: formData.get('equipmentId')?.toString(),
			maintenanceType: formData.get('maintenanceType')?.toString(),
			description: formData.get('description')?.toString(),
			scheduledDate:
				rawScheduledDate && rawScheduledDate !== ''
					? new Date(rawScheduledDate).toISOString()
					: null,
			completionDate:
				rawCompletionDate && rawCompletionDate !== ''
					? new Date(rawCompletionDate).toISOString()
					: null,
			status: formData.get('status')?.toString() || 'PENDING',
			technicianId: finalTechnicianId,
			cost: rawCost ? parseInt(rawCost) : 0
		};

		const notaFile = formData.get('nota') as File;
		let notaFileName: string | null = null;

		if (notaFile && notaFile.size > 0) {
			try {
				const ext = notaFile.name.split('.').pop();
				const generatedName = `${uuidv4()}.${ext}`;
				const uploadDir = join(process.cwd(), 'static', 'uploads', 'receipts');

				await mkdir(uploadDir, { recursive: true });

				const arrayBuffer = await notaFile.arrayBuffer();
				await writeFile(join(uploadDir, generatedName), Buffer.from(arrayBuffer));

				notaFileName = generatedName;
			} catch (uploadErr) {
				console.error('Failed to upload receipt:', uploadErr);
			}
		}

		try {
			const validated = maintenanceSchema.parse(data);
			const newId = uuidv4();

			await db.insert(maintenance).values({
				id: newId,
				equipmentId: validated.equipmentId,
				maintenanceType: validated.maintenanceType,
				description: validated.description,
				status: validated.status,
				technicianId: validated.technicianId,
				scheduledDate: new Date(validated.scheduledDate),
				completionDate: validated.completionDate ? new Date(validated.completionDate) : null,
				cost: validated.cost,
				notaFileName
			});

			if (validated.status === 'COMPLETED') {
				await submitMaintenanceForApproval(newId, locals.user.id);
			}

			return { success: true };
		} catch (err) {
			console.error(err);
			return fail(400, { message: 'Gagal membuat pemeliharaan' });
		}
	}
};
