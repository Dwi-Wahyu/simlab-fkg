import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	return {
		org_slug: params.org_slug,
		user: locals.user
	};
};
