import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { auditChecklist } from '$lib/server/db/schema';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;
	if (!currentUser) throw redirect(302, `/`);

	const allowedRoles = ['spmi', 'kepalaLab', 'superadmin', 'koordinator'];
	if (!allowedRoles.includes(currentUser.role)) {
		throw redirect(302, `/admin/dashboard`);
	}

	return {
		userRole: currentUser.role
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const allowedRoles = ['spmi', 'kepalaLab', 'superadmin', 'koordinator'];
		if (!allowedRoles.includes(locals.user.role)) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const nama = formData.get('nama')?.toString();
		const institusi = formData.get('institusi')?.toString();
		const tanggal = formData.get('tanggal')?.toString();
		const deskripsi = formData.get('deskripsi')?.toString();
		const file = formData.get('sertifikat') as File;

		if (!nama || !institusi || !tanggal) {
			return fail(400, { message: 'Nama, Institusi, dan Tanggal wajib diisi.' });
		}

		let sertifikatName: string | null = null;

		if (file && file.size > 0) {
			try {
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
			await db.insert(auditChecklist).values({
				id: crypto.randomUUID(),
				nama,
				institusi,
				tanggal: new Date(tanggal),
				deskripsi,
				sertifikat: sertifikatName
			});
			return { success: true };
		} catch (err: any) {
			console.error('Failed to save audit checklist:', err);
			return fail(500, { message: 'Gagal menyimpan data audit checklist.' });
		}
	}
};
