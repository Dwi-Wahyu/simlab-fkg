import { db } from '$lib/server/db';
import { practicumModule, block, department, practicumModuleCriteria, practicumCriteriaBand } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const module = await db.query.practicumModule.findFirst({
		where: eq(practicumModule.id, params.id as string),
		with: {
			criteria: {
				orderBy: (c, { asc }) => [asc(c.sortOrder)],
				with: {
					bands: {
						orderBy: (b, { desc }) => [desc(b.minScore)]
					}
				}
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

		const criteriaJson = formData.get('criteriaJson') as string;
		const moduleId = params.id as string;

		if (!name || !blockId) {
			return fail(400, { message: 'Nama dan Blok wajib diisi' });
		}

		let parsedCriteria: {
			id?: string;
			name: string;
			maxScore: number;
			bands: {
				id?: string;
				minScore: number;
				maxScore: number;
				label?: string;
				description: string;
			}[];
		}[] = [];

		if (scoringMode === 'RUBRIK' && criteriaJson) {
			try {
				parsedCriteria = JSON.parse(criteriaJson);
			} catch (e) {
				console.error('Failed to parse criteriaJson', e);
				return fail(400, { message: 'Format data kriteria tidak valid' });
			}
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
					.where(eq(practicumModule.id, moduleId));

				// Fetch existing criteria
				const existingCriteria = await tx.query.practicumModuleCriteria.findMany({
					where: eq(practicumModuleCriteria.moduleId, moduleId)
				});
				const existingIds = existingCriteria.map((c) => c.id);

				if (scoringMode === 'RUBRIK') {
					// Extract IDs submitted by the client
					const submittedIds = parsedCriteria
						.map((c) => c.id)
						.filter((id): id is string => !!id && !id.startsWith('0.'));

					// 1. Delete removed criteria
					const toDelete = existingIds.filter((id) => !submittedIds.includes(id));
					if (toDelete.length > 0) {
						await tx
							.delete(practicumModuleCriteria)
							.where(
								and(
									eq(practicumModuleCriteria.moduleId, moduleId),
									inArray(practicumModuleCriteria.id, toDelete)
								)
							);
					}

					// 2. Upsert submitted criteria
					for (let i = 0; i < parsedCriteria.length; i++) {
						const crit = parsedCriteria[i];
						const isNewCriterion = !crit.id || crit.id.startsWith('0.') || !existingIds.includes(crit.id);
						const criteriaId = isNewCriterion ? crypto.randomUUID() : (crit.id as string);

						if (crit.name && crit.name.trim()) {
							if (isNewCriterion) {
								// Insert
								await tx.insert(practicumModuleCriteria).values({
									id: criteriaId,
									moduleId: moduleId,
									name: crit.name.trim(),
									maxScore: isNaN(Number(crit.maxScore)) ? 100 : Number(crit.maxScore),
									sortOrder: i
								});
							} else {
								// Update
								await tx
									.update(practicumModuleCriteria)
									.set({
										name: crit.name.trim(),
										maxScore: isNaN(Number(crit.maxScore)) ? 100 : Number(crit.maxScore),
										sortOrder: i
									})
									.where(eq(practicumModuleCriteria.id, criteriaId));
							}

							// For bands: delete old bands of this criteriaId and insert new ones
							await tx
								.delete(practicumCriteriaBand)
								.where(eq(practicumCriteriaBand.criteriaId, criteriaId));

							if (crit.bands && crit.bands.length > 0) {
								for (let j = 0; j < crit.bands.length; j++) {
									const band = crit.bands[j];
									if (band.description && band.description.trim()) {
										await tx.insert(practicumCriteriaBand).values({
											id: crypto.randomUUID(),
											criteriaId,
											minScore: Number(band.minScore),
											maxScore: Number(band.maxScore),
											label: band.label?.trim() || null,
											description: band.description.trim(),
											sortOrder: j
										});
									}
								}
							}
						}
					}
				} else {
					// If scoring mode was switched to TOTAL, delete all criteria
					if (existingIds.length > 0) {
						await tx
							.delete(practicumModuleCriteria)
							.where(eq(practicumModuleCriteria.moduleId, moduleId));
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
