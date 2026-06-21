import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { laboratorium } from '$lib/server/db/auth.schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const labs = await db.select({ id: laboratorium.id, name: laboratorium.name }).from(laboratorium);
	return json(labs);
};