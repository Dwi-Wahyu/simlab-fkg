import { json } from '@sveltejs/kit';
import { eq, sql, and, count, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const search = url.searchParams.get('search') || '';
  const offset = (page - 1) * limit;

  // Build where clause for search on name, username, or role
  let whereClause = undefined;
  if (search) {
    const pattern = `%${search}%`;
    whereClause = sql`(${user.name} LIKE ${pattern} OR ${user.username} LIKE ${pattern} OR ${user.role} LIKE ${pattern})`;
  }

  // Total count for pagination
  // Build role condition
  const roleCond = inArray(user.role, ['peneliti', 'instruktur']);
  const baseWhere = whereClause ? and(roleCond, whereClause) : roleCond;

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(user)
    .where(baseWhere);

  const requesters = await db
    .select({ id: user.id, name: user.name, role: user.role, username: user.username })
    .from(user)
    .where(baseWhere)
    .limit(limit)
    .offset(offset);

  return json({
    requesters,
    total: Number(total),
    totalPages: Math.ceil(Number(total) / limit),
    currentPage: page,
    limit
  });
};
