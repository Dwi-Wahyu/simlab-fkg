import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { laboratorium } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const labs = await db
		.select({ id: laboratorium.id, name: laboratorium.name })
		.from(laboratorium)
		.where(eq(laboratorium.isDeleted, false));
	return json(labs);
};
