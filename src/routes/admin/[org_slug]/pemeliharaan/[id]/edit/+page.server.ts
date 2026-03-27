import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { maintenance } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';

const maintenanceSchema = z.object({
	equipmentId: z.string().uuid(),
	maintenanceType: z.enum(['PERAWATAN', 'PERBAIKAN']),
	description: z.string().min(1),
	scheduledDate: z.string().datetime(),
	completionDate: z.string().datetime().optional().nullable(),
	status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING'),
	technicianId: z.string().uuid().optional().nullable()
});

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;

	// Ambil ID organisasi berdasarkan slug dari URL
	const org = await db.query.organization.findFirst({
		where: (org, { eq }) => eq(org.slug, org_slug)
	});

	if (!org) {
		throw error(404, 'Organization not found');
	}

	const maintenanceData = await db.query.maintenance.findFirst({
		where: eq(maintenance.id, id)
	});

	if (!maintenanceData) {
		throw error(404, { message: 'Jadwal maintenance tidak ditemukan' });
	}

	const equipmentList = await db.query.equipment.findMany({
		where: (eqp, { eq }) => eq(eqp.organizationId, org.id),
		columns: { id: true, serialNumber: true },
		with: {
			item: {
				columns: {
					name: true
				}
			}
		}
	});

	// Urutkan berdasarkan nama item di memori jika perlu,
	// atau biarkan karena dropdown biasanya tidak terlalu banyak
	const sortedEquipment = [...equipmentList].sort((a, b) =>
		(a.item?.name || '').localeCompare(b.item?.name || '')
	);

	const technicianList = await db.query.user.findMany({
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
		technicians: technicianList,
		org_slug
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { id, org_slug } = params;
		const formData = await request.formData();

		const rawScheduledDate = formData.get('scheduledDate')?.toString();
		const rawCompletionDate = formData.get('completionDate')?.toString();
		const rawTechnicianId = formData.get('technicianId')?.toString();

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
			technicianId: rawTechnicianId && rawTechnicianId !== '' ? rawTechnicianId : null
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
					completionDate: validated.completionDate ? new Date(validated.completionDate) : null
				})
				.where(eq(maintenance.id, id));
		} catch (err) {
			console.error(err);
			if (err instanceof z.ZodError) {
				return fail(400, { errors: err.errors });
			}
			return fail(500, { message: 'Kesalahan server internal' });
		}

		throw redirect(303, `/${org_slug}/pemeliharaan`);
	}
};
