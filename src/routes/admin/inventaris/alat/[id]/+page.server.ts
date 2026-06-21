import { db } from '$lib/server/db';
import { item } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const itemData = await db.select().from(item).where(eq(item.id, id));

	if (itemData.length === 0) {
		throw Error('Alat tidak ditemukan');
	}

	return {
		item: itemData[0]
	};
};
