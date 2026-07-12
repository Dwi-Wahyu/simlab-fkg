import { fail, redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { auditChecklist } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { join } from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = locals.user;
	if (!currentUser) throw redirect(302, `/`);

	const allowedRoles = ['spmi', 'kepalaLab', 'superadmin', 'koordinator'];
	if (!allowedRoles.includes(currentUser.role)) {
		throw redirect(302, `/admin/dashboard`);
	}

	const { id } = params;
	const [checklist] = await db.select().from(auditChecklist).where(eq(auditChecklist.id, id)).limit(1);

	if (!checklist) {
		throw error(404, 'Audit tidak ditemukan');
	}

	return {
		checklist,
		userRole: currentUser.role
	};
};

export const actions: Actions = {
	default: async ({ params, request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const allowedRoles = ['spmi', 'kepalaLab', 'superadmin', 'koordinator'];
		if (!allowedRoles.includes(locals.user.role)) {
			return fail(403, { message: 'Forbidden' });
		}

		const { id } = params;
		const [checklist] = await db.select().from(auditChecklist).where(eq(auditChecklist.id, id)).limit(1);
		if (!checklist) {
			return fail(404, { message: 'Audit tidak ditemukan' });
		}

		const formData = await request.formData();
		const nama = formData.get('nama')?.toString();
		const institusi = formData.get('institusi')?.toString();
		const tanggal = formData.get('tanggal')?.toString();
		const deskripsi = formData.get('deskripsi')?.toString();
		const file = formData.get('sertifikat') as File;
		const deleteCertificate = formData.get('deleteCertificate')?.toString() === 'true';

		if (!nama || !institusi || !tanggal) {
			return fail(400, { message: 'Nama, Institusi, dan Tanggal wajib diisi.' });
		}

		let sertifikatName = checklist.sertifikat;

		// Handle deleting certificate file
		if (deleteCertificate && checklist.sertifikat) {
			try {
				const oldFilePath = join(process.cwd(), 'static', 'uploads', 'certificates', checklist.sertifikat);
				await unlink(oldFilePath);
				sertifikatName = null;
			} catch (err) {
				console.error('Failed to delete old certificate file:', err);
			}
		}

		// Handle uploading new certificate file
		if (file && file.size > 0) {
			try {
				// Delete existing if any
				if (checklist.sertifikat) {
					try {
						const oldFilePath = join(process.cwd(), 'static', 'uploads', 'certificates', checklist.sertifikat);
						await unlink(oldFilePath);
					} catch (err) {
						console.error('Failed to delete old certificate file:', err);
					}
				}

				const ext = file.name.split('.').pop();
				const generatedName = `${crypto.randomUUID()}.${ext}`;
				const uploadDir = join(process.cwd(), 'static', 'uploads', 'certificates');

				await mkdir(uploadDir, { recursive: true });

				const arrayBuffer = await file.arrayBuffer();
				await writeFile(join(uploadDir, generatedName), Buffer.from(arrayBuffer));

				sertifikatName = generatedName;
			} catch (err) {
				console.error('Failed to upload certificate:', err);
				return fail(500, { message: 'Gagal mengunggah file sertifikat.' });
			}
		}

		try {
			await db
				.update(auditChecklist)
				.set({
					nama,
					institusi,
					tanggal: new Date(tanggal),
					deskripsi,
					sertifikat: sertifikatName
				})
				.where(eq(auditChecklist.id, id));

			return { success: true };
		} catch (err: any) {
			console.error('Failed to update audit checklist:', err);
			return fail(500, { message: 'Gagal memperbarui data audit checklist.' });
		}
	}
};
