import { auth } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

export const load = async (event) => {
	await auth.api.signOut({
		headers: event.request.headers
	});

	throw redirect(302, `${base}/`);
};
