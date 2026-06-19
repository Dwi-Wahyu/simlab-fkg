import { db } from '$lib/server/db';
import { user, practicumClass } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Fetch filter options - optimize by only selecting needed columns
	const allClasses = await db.select({
		batch: practicumClass.batch,
		name: practicumClass.name
	}).from(practicumClass);
	
	const uniqueBatches = [...new Set(allClasses.map((c) => c.batch))].filter(Boolean).sort().reverse();
	const uniqueClassNames = [...new Set(allClasses.map((c) => c.name))].filter(Boolean).sort();

	return {
		filterOptions: {
			batches: uniqueBatches as string[],
			classNames: uniqueClassNames as string[]
		}
	};
};
