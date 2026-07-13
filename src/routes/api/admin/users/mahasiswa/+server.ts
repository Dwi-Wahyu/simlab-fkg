import { json } from '@sveltejs/kit';
import { count, eq, sql, and, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const offset = (page - 1) * limit;

	// Summary data
	const [totalResult] = await db
		.select({ value: count() })
		.from(user)
		.where(and(eq(user.role, 'peneliti'), eq(user.isDeleted, false)));

	// Prepare where clause
	const conditions = [eq(user.role, 'peneliti'), eq(user.isDeleted, false)];

	if (search) {
		conditions.push(
			or(
				sql`${user.name} LIKE ${'%' + search + '%'}`,
				sql`${user.username} LIKE ${'%' + search + '%'}`
			)
		);
	}

	// Get total items for this search (for pagination)
	const [totalItemsResult] = await db
		.select({ value: count() })
		.from(user)
		.where(and(...conditions));

	const totalItems = Number(totalItemsResult.count || totalItemsResult.value);
	const totalPages = Math.ceil(totalItems / limit);

	const students = await db.query.user.findMany({
		where: and(...conditions),
		limit: limit,
		offset: offset,
		with: {
			practicumClasses: {
				with: {
					class: true
				}
			}
		}
	});

	const data = students.map((s) => {
		const batches = [...new Set(s.practicumClasses.map((pc) => pc.class?.batch).filter(Boolean))];
		const classNames = s.practicumClasses.map((pc) => pc.class?.name).filter(Boolean);

		return {
			id: s.id,
			name: s.name,
			username: s.username,
			email: s.email,
			batchDisplay: batches.join(', ') || '-',
			classDisplay: classNames.join(', ') || '-'
		};
	});

	return json({
		summary: [
			{
				label: 'Total Mahasiswa',
				value: totalResult.value,
				color: 'text-blue-600',
				icon: 'Users'
			}
		],
		items: data,
		pagination: {
			totalItems,
			totalPages,
			currentPage: page,
			limit
		}
	});
};
