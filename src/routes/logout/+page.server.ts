import { auth } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const load = async (event) => {
	await auth.api.signOut({
		headers: event.request.headers
	});

	throw redirect(302, '/');
};
