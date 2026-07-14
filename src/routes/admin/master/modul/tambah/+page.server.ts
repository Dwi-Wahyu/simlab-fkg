import { db } from '$lib/server/db';
import { practicumModule, block, department, practicumModuleCriteria, practicumCriteriaBand } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
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
		blocks
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const blockId = formData.get('blockId') as string;
		const componentRaw = formData.get('component') as string;
		const component =
			componentRaw === 'PREPARASI' || componentRaw === 'RESTORASI' ? componentRaw : null;
		const scoringMode = (formData.get('scoringMode') as 'TOTAL' | 'RUBRIK') || 'TOTAL';

		const criteriaJson = formData.get('criteriaJson') as string;

		if (!name || !blockId) {
			return fail(400, { message: 'Nama dan Blok wajib diisi' });
		}

		let parsedCriteria: {
			name: string;
			maxScore: number;
			bands: {
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
				const moduleId = crypto.randomUUID();
				await tx.insert(practicumModule).values({
					id: moduleId,
					name,
					description,
					blockId,
					component,
					scoringMode
				});

				if (scoringMode === 'RUBRIK') {
					for (let i = 0; i < parsedCriteria.length; i++) {
						const crit = parsedCriteria[i];
						if (crit.name.trim()) {
							const criteriaId = crypto.randomUUID();
							await tx.insert(practicumModuleCriteria).values({
								id: criteriaId,
								moduleId,
								name: crit.name.trim(),
								maxScore: isNaN(Number(crit.maxScore)) ? 100 : Number(crit.maxScore),
								sortOrder: i
							});

							if (crit.bands && crit.bands.length > 0) {
								for (let j = 0; j < crit.bands.length; j++) {
									const band = crit.bands[j];
									if (band.description.trim()) {
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
				}
			});

			return { success: true, message: 'Modul berhasil ditambahkan' };
		} catch (error) {
			console.error('Error creating module:', error);
			return fail(500, { message: 'Gagal menambahkan modul' });
		}
	}
};
