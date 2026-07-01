import { db } from '$lib/server/db';
import { practicumModule, block, department, practicumModuleCriteria } from '$lib/server/db/schema';
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
		const component = (componentRaw === 'PREPARASI' || componentRaw === 'RESTORASI') ? componentRaw : null;
		const scoringMode = (formData.get('scoringMode') as 'TOTAL' | 'RUBRIK') || 'TOTAL';

		const criteriaNames = formData.getAll('criteriaName[]') as string[];
		const criteriaMaxScores = formData.getAll('criteriaMaxScore[]').map(Number);

		if (!name || !blockId) {
			return fail(400, { message: 'Nama dan Blok wajib diisi' });
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
					for (let i = 0; i < criteriaNames.length; i++) {
						const cName = criteriaNames[i];
						const cMaxScore = isNaN(criteriaMaxScores[i]) ? 100 : criteriaMaxScores[i];
						if (cName.trim()) {
							await tx.insert(practicumModuleCriteria).values({
								id: crypto.randomUUID(),
								moduleId,
								name: cName.trim(),
								maxScore: cMaxScore,
								sortOrder: i
							});
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
