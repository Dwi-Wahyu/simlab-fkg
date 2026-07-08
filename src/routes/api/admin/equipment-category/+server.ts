import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipmentCategory } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const categories = await db
			.select()
			.from(equipmentCategory)
			.orderBy(asc(equipmentCategory.name));
		return json(categories);
	} catch (e: any) {
		return json({ error: e.message }, { status: 500 });
	}
};
