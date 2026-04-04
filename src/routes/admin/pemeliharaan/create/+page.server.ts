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
	technicianId: z.string().uuid().optional().nullable(),
	cost: z.number().int().min(0).default(0)
});

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;
	if (!currentUser) throw redirect(302, '/');

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
		technicians: technicianList
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const rawScheduledDate = formData.get('scheduledDate')?.toString();
		const rawCompletionDate = formData.get('completionDate')?.toString();
		const rawTechnicianId = formData.get('technicianId')?.toString();
		const rawCost = formData.get('cost')?.toString();

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
			technicianId: rawTechnicianId && rawTechnicianId !== '' ? rawTechnicianId : null,
			cost: rawCost ? parseInt(rawCost) : 0
		};

		try {
			const validated = maintenanceSchema.parse(data);

			await db.insert(maintenance).values({
				id: uuidv4(),
				equipmentId: validated.equipmentId,
				maintenanceType: validated.maintenanceType,
				description: validated.description,
				status: validated.status,
				technicianId: validated.technicianId,
				scheduledDate: new Date(validated.scheduledDate),
				completionDate: validated.completionDate ? new Date(validated.completionDate) : null,
				cost: validated.cost
			});

			return { success: true };
		} catch (err) {}
	}
};
