import { error, json } from '@sveltejs/kit';
import { count, eq, or, like, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	// Authorization: Only superadmin
	if (!locals.user || locals.user.role !== 'superadmin') {
		throw error(403, 'Forbidden: Akses khusus Superadmin');
	}

	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const offset = (page - 1) * limit;

	let whereClause = undefined;
	if (search) {
		whereClause = or(like(user.name, `%${search}%`), like(user.email, `%${search}%`));
	}

	// Get total items for pagination
	const [totalItemsResult] = await db
		.select({ value: count() })
		.from(user)
		.where(whereClause);

	const totalItems = Number(totalItemsResult.value || 0);
	const totalPages = Math.ceil(totalItems / limit);

	// Query users with pagination
	const users = await db.query.user.findMany({
		where: whereClause,
		limit,
		offset,
		orderBy: [desc(user.createdAt)],
		with: {
			members: {
				with: {
					laboratorium: true
				}
			}
		}
	});

	return json({
		users,
		pagination: {
			totalItems,
			totalPages,
			currentPage: page,
			limit
		}
	});
};
