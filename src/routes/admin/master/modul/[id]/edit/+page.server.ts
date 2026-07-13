import { db } from '$lib/server/db';
import { practicumModule, block, department, practicumModuleCriteria } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const module = await db.query.practicumModule.findFirst({
		where: eq(practicumModule.id, params.id),
		with: {
			criteria: {
				orderBy: (c, { asc }) => [asc(c.sortOrder)]
			}
		}
	});

	if (!module) {
		throw error(404, 'Modul tidak ditemukan');
	}

	const blocks = await db
		.select({
			id: block.id,
			name: block.name,
			departmentName: department.name
		})
		.from(block)
		.innerJoin(department, eq(block.departmentId, department.id))
		.orderBy(department.name, block.name);

	return {
		module,
		blocks
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const blockId = formData.get('blockId') as string;
		const componentRaw = formData.get('component') as string;
		const component =
			componentRaw === 'PREPARASI' || componentRaw === 'RESTORASI' ? componentRaw : null;
		const scoringMode = (formData.get('scoringMode') as 'TOTAL' | 'RUBRIK') || 'TOTAL';

		const criteriaIds = formData.getAll('criteriaId[]') as string[];
		const criteriaNames = formData.getAll('criteriaName[]') as string[];
		const criteriaMaxScores = formData.getAll('criteriaMaxScore[]').map(Number);

		if (!name || !blockId) {
			return fail(400, { message: 'Nama dan Blok wajib diisi' });
		}

		try {
			await db.transaction(async (tx) => {
				await tx
					.update(practicumModule)
					.set({
						name,
						description,
						blockId,
						component,
						scoringMode
					})
					.where(eq(practicumModule.id, params.id));

				// Fetch existing criteria
				const existingCriteria = await tx.query.practicumModuleCriteria.findMany({
					where: eq(practicumModuleCriteria.moduleId, params.id)
				});
				const existingIds = existingCriteria.map((c) => c.id);

				if (scoringMode === 'RUBRIK') {
					const submittedIds = criteriaIds.filter((id) => id && id.trim() !== '');

					// 1. Delete removed criteria
					const toDelete = existingIds.filter((id) => !submittedIds.includes(id));
					if (toDelete.length > 0) {
						await tx
							.delete(practicumModuleCriteria)
							.where(
								and(
									eq(practicumModuleCriteria.moduleId, params.id),
									inArray(practicumModuleCriteria.id, toDelete)
								)
							);
					}

					// 2. Upsert submitted criteria
					for (let i = 0; i < criteriaNames.length; i++) {
						const cId = criteriaIds[i];
						const cName = criteriaNames[i];
						const cMaxScore = isNaN(criteriaMaxScores[i]) ? 100 : criteriaMaxScores[i];

						if (cName && cName.trim()) {
							if (cId && existingIds.includes(cId)) {
								// Update
								await tx
									.update(practicumModuleCriteria)
									.set({
										name: cName.trim(),
										maxScore: cMaxScore,
										sortOrder: i
									})
									.where(eq(practicumModuleCriteria.id, cId));
							} else {
								// Insert
								await tx.insert(practicumModuleCriteria).values({
									id: crypto.randomUUID(),
									moduleId: params.id,
									name: cName.trim(),
									maxScore: cMaxScore,
									sortOrder: i
								});
							}
						}
					}
				} else {
					// If scoring mode was switched to TOTAL, delete all criteria
					if (existingIds.length > 0) {
						await tx
							.delete(practicumModuleCriteria)
							.where(eq(practicumModuleCriteria.moduleId, params.id));
					}
				}
			});

			return { success: true, message: 'Modul berhasil diperbarui' };
		} catch (error) {
			console.error('Error updating module:', error);
			return fail(500, { message: 'Gagal memperbarui modul' });
		}
	}
};
