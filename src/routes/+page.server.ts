import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { db } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/dashboard');
	}

	return { user: event.locals.user };
};

export const actions: Actions = {
	signInEmail: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		try {
			await auth.api.signInEmail({
				body: {
					email,
					password,
					callbackURL: '/dashboard'
				},
				asResponse: true
			});
		} catch (error) {
			console.log(error);

			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Signin failed' });
			}

			return fail(500, { message: 'Unexpected error' });
		}

		const userResult = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.email, email),
			with: {
				members: {
					with: {
						organization: true
					}
				}
			}
		});

		if (!userResult) return fail(400, { message: 'User tidak ditemukan' });

		return redirect(302, `${userResult.members[0].organization?.slug}/dashboard`);
	}
};
