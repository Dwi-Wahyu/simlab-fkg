import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { equipment, stock, movement, warehouse } from '$lib/server/db/schema';
import { eq, and, count, sum, gte, desc, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	return {};
};
