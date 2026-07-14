import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';

const SELF_SERVICE_REDIRECT = '/admin/peminjaman/ajukan';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		return redirect(302, SELF_SERVICE_REDIRECT);
	}
	return {};
};

export const actions: Actions = {
	daftarAtauMasuk: async (event) => {
		const formData = await event.request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';
		const username = formData.get('username')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		if (!name || !username || !password) {
			return fail(400, { message: 'Nama, NIM, dan password wajib diisi' });
		}
		if (password.length < 8) {
			return fail(400, { message: 'Password minimal 8 karakter' });
		}

		// 1. Cek apakah username (NIM) sudah terdaftar
		const existing = await db.query.user.findFirst({
			where: (u, { eq: eqFn, and: andFn }) =>
				andFn(eqFn(u.username, username), eqFn(u.isDeleted, false))
		});

		if (existing) {
			// 2a. Sudah terdaftar → JANGAN buat akun baru, coba masuk dengan password yang diinput
			try {
				await auth.api.signInUsername({
					body: { username, password, callbackURL: SELF_SERVICE_REDIRECT }
				});
			} catch (error) {
				if (error instanceof APIError) {
					return fail(401, {
						message:
							'NIM ini sudah terdaftar dan password yang Anda masukkan salah. Gunakan menu "Lupa password?" jika tidak ingat password Anda.'
					});
				}
				return fail(500, { message: 'Terjadi kesalahan sistem' });
			}
			return redirect(302, SELF_SERVICE_REDIRECT);
		}

		// 2b. Belum terdaftar → buat akun baru dengan role default 'peneliti' (Mahasiswa)
		try {
			const synthesizedEmail = `${username}@nim.simlab.local`;
			const signUpResponse = await auth.api.signUpEmail({
				body: {
					email: synthesizedEmail,
					username,
					password,
					name
				}
			});

			if (!signUpResponse) throw new Error('Gagal membuat akun');

			await db
				.update(userTable)
				.set({ role: 'peneliti' })
				.where(eq(userTable.id, signUpResponse.user.id));
		} catch (error) {
			console.error(error);
			if (error instanceof APIError) {
				return fail(error.status as number, { message: error.message || 'Gagal mendaftar' });
			}
			return fail(500, { message: 'Terjadi kesalahan sistem' });
		}

		return redirect(302, SELF_SERVICE_REDIRECT);
	}
};
