import { db } from '$lib/server/db';
import { item, equipment, movement, stock, warehouse } from '$lib/server/db/schema';
import { eq, and, sql, desc, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.user.laboratorium) {
		return {
			reportData: []
		};
	}

	const labId = locals.user.laboratorium.id;

	// Query data BTK-16 (Buku Tabel Keadaan - 16)
	// Rekapitulasi kondisi alat per laboratorium
	const reportData = await db
		.select({
			itemId: item.id,
			itemName: item.name,
			equipmentType: item.equipmentType,
			baseUnit: item.baseUnit,
			total: sql<number>`count(${equipment.id})`.mapWith(Number),
			baik: sql<number>`count(case when ${equipment.condition} = 'BAIK' then 1 end)`.mapWith(
				Number
			),
			rusak: sql<number>`count(case when ${equipment.condition} = 'RUSAK' then 1 end)`.mapWith(
				Number
			)
		})
		.from(item)
		.innerJoin(
			equipment,
			and(
				eq(item.id, equipment.itemId),
				eq(equipment.laboratoriumId, labId),
				eq(equipment.isDeleted, false)
			)
		)
		.where(eq(item.isDeleted, false))
		.groupBy(item.id, item.name, item.equipmentType, item.baseUnit)
		.orderBy(item.name);

	return {
		reportData,
		filters: {
			tahun: new Date().getFullYear().toString(),
			triwulan: 'Triwulan I'
		}
	};
};
