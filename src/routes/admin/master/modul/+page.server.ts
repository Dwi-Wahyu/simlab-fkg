import { db } from '$lib/server/db';
import { practicumModule, block, department } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { fail, type Actions } from '@sveltejs/kit';
import { notDeleted } from '$lib/server/db/soft-delete';
import { createAuditLog } from '$lib/server/audit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const departmentId = url.searchParams.get('departmentId');
	const blockId = url.searchParams.get('blockId');
	const page = parseInt(url.searchParams.get('page') || '1');
	const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
	const offset = (page - 1) * pageSize;

	const filters = [eq(practicumModule.isDeleted, false)];
	if (departmentId) {
		filters.push(eq(block.departmentId, departmentId));
	}
	if (blockId) {
		filters.push(eq(practicumModule.blockId, blockId));
	}

	const whereClause = and(...filters);

	// Get total count for pagination
	const [totalCountResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(practicumModule)
		.innerJoin(block, eq(practicumModule.blockId, block.id))
		.innerJoin(department, eq(block.departmentId, department.id))
		.where(whereClause);

	const totalModules = Number(totalCountResult.count);
	const totalPages = Math.ceil(totalModules / pageSize);

	const modules = await db
		.select({
			id: practicumModule.id,
			name: practicumModule.name,
			description: practicumModule.description,
			blockName: block.name,
			departmentName: department.name,
			createdAt: practicumModule.createdAt,
			component: practicumModule.component
		})
		.from(practicumModule)
		.innerJoin(block, eq(practicumModule.blockId, block.id))
		.innerJoin(department, eq(block.departmentId, department.id))
		.where(whereClause)
		.orderBy(practicumModule.createdAt)
		.limit(pageSize)
		.offset(offset);

	const departments = await db.query.department.findMany();

	// If department is selected, only show blocks for that department
	const blocks = await db.query.block.findMany({
		where: departmentId ? eq(block.departmentId, departmentId) : undefined
	});

	return {
		modules,
		departments,
		blocks,
		pagination: {
			totalModules,
			totalPages,
			currentPage: page,
			pageSize
		},
		filters: {
			departmentId,
			blockId
		}
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID diperlukan' });

		try {
			const [mod] = await db
				.select()
				.from(practicumModule)
				.where(and(eq(practicumModule.id, id), notDeleted(practicumModule)))
				.limit(1);
			if (!mod) return fail(404, { message: 'Modul tidak ditemukan' });

			await db
				.update(practicumModule)
				.set({
					isDeleted: true,
					deletedAt: new Date(),
					deletedBy: locals.user.id
				})
				.where(eq(practicumModule.id, id));

			await createAuditLog({
				userId: locals.user.id,
				action: 'SOFT_DELETE_PRACTICUM_MODULE',
				tableName: 'practicum_module',
				recordId: id,
				oldValue: mod
			});

			return { success: true, message: 'Modul berhasil dihapus' };
		} catch (error) {
			console.error('Error deleting module:', error);
			return fail(500, { message: 'Gagal menghapus modul' });
		}
	}
};
