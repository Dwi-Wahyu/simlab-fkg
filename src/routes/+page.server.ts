import { fail, redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, `${base}/admin/dashboard`);
	}

	return { user: event.locals.user };
};

export const actions: Actions = {
	signIn: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		try {
			await auth.api.signInUsername({
				body: {
					username,
					password,
					callbackURL: `${base}/admin/dashboard`
				}
			});
		} catch (error) {
			console.error(error);

			if (error instanceof APIError) {
				const message =
					error.status === 401 ? 'Username atau password salah' : (error.message || 'Login gagal');
				return fail(error.status as number, { message });
			}

			return fail(500, { message: 'Terjadi kesalahan sistem' });
		}

		return redirect(302, `${base}/admin/dashboard`);
	}
};
