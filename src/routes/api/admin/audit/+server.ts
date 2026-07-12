import { error, json } from '@sveltejs/kit';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditChecklist } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const allowedRoles = ['spmi', 'kepalaLab', 'superadmin', 'koordinator'];
	if (!allowedRoles.includes(locals.user.role)) {
		throw error(403, 'Forbidden');
	}

	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const offset = (page - 1) * limit;

	const conditions = [];
	if (search) {
		conditions.push(
			sql`(${auditChecklist.nama} LIKE ${'%' + search + '%'} OR ${auditChecklist.institusi} LIKE ${'%' + search + '%'} OR ${auditChecklist.deskripsi} LIKE ${'%' + search + '%'})`
		);
	}
	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const items = await db
		.select()
		.from(auditChecklist)
		.where(whereClause)
		.orderBy(desc(auditChecklist.createdAt))
		.limit(limit)
		.offset(offset);

	const [totalItemsResult] = await db
		.select({ value: count() })
		.from(auditChecklist)
		.where(whereClause);

	const totalItems = Number(totalItemsResult.value);
	const totalPages = Math.ceil(totalItems / limit);

	return json({
		items,
		pagination: { totalItems, totalPages, currentPage: page, limit }
	});
};
