import { base } from '$app/paths';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { maintenance, equipment, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
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

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id } = params;
	const currentUser = locals.user;
	if (!currentUser) throw redirect(302, `${base}/`);

	const labId = currentUser.laboratorium?.id;
	const isGlobalRole = ['superadmin', 'teknisi'].includes(currentUser.role);

	const maintenanceData = await db.query.maintenance.findFirst({
		where: (table, { eq }) => eq(table.id, id),
		with: {
			equipment: {
				with: {
					item: {
						columns: {
							name: true
						}
					}
				}
			}
		}
	});

	if (!maintenanceData) {
		throw error(404, { message: 'Jadwal maintenance tidak ditemukan' });
	}

	const equipmentList = await db.query.equipment.findMany({
		where: (table, { eq }) => {
			if (!isGlobalRole && labId) {
				return eq(table.laboratoriumId, labId);
			}
			return undefined;
		},
		columns: { id: true, serialNumber: true, condition: true },
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

	// Format tanggal untuk input datetime-local
	const formatDateForInput = (date: Date | null): string => {
		if (!date) return '';
		return new Date(date).toISOString().slice(0, 16);
	};

	return {
		maintenance: {
			...maintenanceData,
			scheduledDate: formatDateForInput(maintenanceData.scheduledDate),
			completionDate: formatDateForInput(maintenanceData.completionDate)
		},
		equipment: sortedEquipment,
		technicians: technicianList
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { id } = params;
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

			await db
				.update(maintenance)
				.set({
					equipmentId: validated.equipmentId,
					maintenanceType: validated.maintenanceType,
					description: validated.description,
					status: validated.status,
					technicianId: validated.technicianId,
					scheduledDate: new Date(validated.scheduledDate),
					completionDate: validated.completionDate ? new Date(validated.completionDate) : null,
					cost: validated.cost
				})
				.where(eq(maintenance.id, id));

			return { success: true };
		} catch (err) {
			console.error(err);
			if (err instanceof z.ZodError) {
				return fail(400, { errors: err.errors });
			}
			return fail(500, { message: 'Kesalahan server internal' });
		}
	}
};
