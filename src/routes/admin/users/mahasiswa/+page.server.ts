import { db } from '$lib/server/db';
import { user, practicumClass } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const students = await db.query.user.findMany({
		where: eq(user.role, 'peneliti'),
		with: {
			practicumClasses: {
				with: {
					class: true
				}
			}
		}
	});

	// Fetch filter options
	const allClasses = await db.select().from(practicumClass);
	const uniqueBatches = [...new Set(allClasses.map((c) => c.batch))].sort().reverse();
	const uniqueClassNames = [...new Set(allClasses.map((c) => c.name))].sort();

	return {
		students: students.map((s) => ({
			id: s.id,
			name: s.name,
			username: s.username,
			email: s.email,
			practicumClasses: s.practicumClasses.map((pc) => ({
				batch: pc.class?.batch || '',
				name: pc.class?.name || ''
			}))
		})),
		filterOptions: {
			batches: uniqueBatches,
			classNames: uniqueClassNames
		}
	};
};
