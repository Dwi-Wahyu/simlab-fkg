import { db } from '$lib/server/db';
import { session, auditLog, user } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { error, redirect, fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';
import fs from 'fs';
import path from 'path';

export const load: PageServerLoad = async ({ locals, params }) => {
	const currentUser = locals.user;

	if (!currentUser) throw redirect(302, `/login`);

	const userId = currentUser.id;

	// Ambil sesi aktif untuk user ini
	const activeSessions = await db.query.session.findMany({
		where: eq(session.userId, userId),
		orderBy: [desc(session.createdAt)]
	});

	// Ambil riwayat login dari audit_log
	const loginHistory = await db.query.auditLog.findMany({
		where: and(eq(auditLog.userId, userId), eq(auditLog.action, 'LOGIN')),
		orderBy: [desc(auditLog.createdAt)],
		limit: 20
	});

	return {
		sessions: activeSessions,
		loginHistory: loginHistory.map((log) => ({
			...log,
			data: log.newValue ? JSON.parse(log.newValue) : {}
		}))
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const usernameVal = formData.get('username')?.toString();
		const imageFile = formData.get('image') as File | null;

		if (!name || name.trim().length < 2) {
			return fail(400, { message: 'Nama harus minimal 2 karakter' });
		}

		if (!usernameVal || usernameVal.trim().length < 3) {
			return fail(400, { message: 'Username harus minimal 3 karakter' });
		}

		let filenameToSave = currentUser.image;

		if (imageFile && imageFile.size > 0) {
			const allowedExtensions = ['jpg', 'jpeg', 'png'];
			const fileExt = imageFile.name.split('.').pop()?.toLowerCase();
			if (!fileExt || !allowedExtensions.includes(fileExt)) {
				return fail(400, { message: 'Ekstensi file tidak valid. Hanya JPG, PNG, atau JPEG yang diperbolehkan.' });
			}
			if (imageFile.size > 5 * 1024 * 1024) {
				return fail(400, { message: 'Ukuran file terlalu besar. Maksimal 5MB.' });
			}

			try {
				const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'profiles');
				if (!fs.existsSync(uploadDir)) {
					fs.mkdirSync(uploadDir, { recursive: true });
				}

				const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
				const filename = `${uniqueSuffix}.${fileExt}`;
				const filePath = path.join(uploadDir, filename);

				const buffer = Buffer.from(await imageFile.arrayBuffer());
				fs.writeFileSync(filePath, buffer);

				// Hapus foto profil lama jika ada dan bukan URL eksternal
				if (currentUser.image && !currentUser.image.startsWith('http://') && !currentUser.image.startsWith('https://') && !currentUser.image.startsWith('/')) {
					const oldFilePath = path.join(uploadDir, currentUser.image);
					if (fs.existsSync(oldFilePath)) {
						fs.unlinkSync(oldFilePath);
					}
				}

				filenameToSave = filename;
			} catch (err: any) {
				console.error('Error saving uploaded file:', err);
				return fail(500, { message: 'Gagal menyimpan file foto profil' });
			}
		}

		try {
			// Update basic info via BetterAuth
			await auth.api.updateUser({
				body: {
					name,
					image: filenameToSave
				},
				headers: request.headers
			});

			// Update username manually in DB (BetterAuth username plugin field)
			if (usernameVal !== currentUser.username) {
				const usernameOccupied = await db.query.user.findFirst({
					where: eq(user.username, usernameVal)
				});

				if (usernameOccupied && usernameOccupied.id !== currentUser.id) {
					return fail(400, { message: 'Username sudah digunakan oleh akun lain' });
				}

				await db.update(user)
					.set({ username: usernameVal })
					.where(eq(user.id, currentUser.id));
			}

			return { success: true, message: 'Profil berhasil diperbarui' };
		} catch (err: any) {
			console.error('Error updating profile:', err);
			return fail(400, { message: err.message || 'Gagal memperbarui profil' });
		}
	},

	revokeSession: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const token = formData.get('token')?.toString();

		if (!token) return fail(400, { message: 'Token tidak ditemukan' });

		try {
			// Pastikan sesi yang dihapus adalah milik user tersebut
			const sess = await db.query.session.findFirst({
				where: and(eq(session.token, token), eq(session.userId, currentUser.id))
			});

			if (!sess) return fail(403, { message: 'Forbidden' });

			await db.delete(session).where(eq(session.token, token));

			// Jika user menghapus sesinya sendiri, arahkan ke login
			if (token === locals.session?.token) {
				throw redirect(302, `/login`);
			}

			return { success: true, message: 'Sesi berhasil dihapus' };
		} catch (err) {
			if (err instanceof Error && 'status' in err && (err.status === 302 || err.status === 303))
				throw err;
			console.error('Error revoking session:', err);
			return fail(500, { message: 'Gagal menghapus sesi' });
		}
	},

	changePassword: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword')?.toString();
		const newPassword = formData.get('newPassword')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		if (!currentPassword || currentPassword.length < 3) {
			return fail(400, { message: 'Password minimal 3 karakter' });
		}

		if (!newPassword || newPassword.length < 3) {
			return fail(400, { message: 'Password minimal 3 karakter' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { message: 'Konfirmasi password tidak cocok' });
		}

		try {
			await auth.api.changePassword({
				body: {
					currentPassword,
					newPassword,
					revokeOtherSessions: true
				},
				headers: request.headers
			});

			return { success: true, message: 'Password berhasil diubah. Sesi lain telah dihapus.' };
		} catch (err: any) {
			console.error(err);
			return fail(400, { message: err.message || 'Gagal mengubah password' });
		}
	}
};
