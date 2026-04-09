import { base } from '$app/paths';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { maintenance, equipment } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = locals.user;
	if (!currentUser) throw redirect(302, `${base}/`);

	const calId = params.id;
	const calibration = await db.query.maintenance.findFirst({
		where: eq(maintenance.id, calId),
		with: {
			equipment: {
				with: {
					item: true
				}
			}
		}
	});

	if (!calibration) throw redirect(302, `${base}/admin/pemeliharaan?tab=kalibrasi`);

	const labId = currentUser.laboratorium?.id;
	const assets = await db.query.equipment.findMany({
		where: (e, { eq }) => {
			if (labId && currentUser.role !== 'superadmin') {
				return eq(e.laboratoriumId, labId);
			}
			return undefined;
		},
		with: {
			item: true
		}
	});

	return {
		calibration,
		assets
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) return fail(401, { message: 'Unauthorized' });

		const calId = params.id;
		const formData = await request.formData();
		const equipmentId = formData.get('equipmentId')?.toString();
		const vendor = formData.get('vendor')?.toString();
		const cost = parseInt(formData.get('cost')?.toString() || '0');
		const completionDate = formData.get('completionDate')?.toString();
		const expiryDate = formData.get('expiryDate')?.toString();
		const description = formData.get('description')?.toString() || '';
		const certificateFile = formData.get('certificate') as File;

		if (!equipmentId || !completionDate || !expiryDate) {
			return fail(400, { message: 'Data tidak lengkap.' });
		}

		let certificatePath = formData.get('existingCertificatePath')?.toString() || null;
		let certificateName = formData.get('existingCertificateName')?.toString() || null;

		if (certificateFile && certificateFile.size > 0) {
			try {
				const ext = certificateFile.name.split('.').pop();
				certificateName = certificateFile.name;
				const fileName = `${uuidv4()}.${ext}`;
				const uploadDir = join(process.cwd(), 'static', 'uploads', 'certificates');
				await mkdir(uploadDir, { recursive: true });
				certificatePath = `/uploads/certificates/${fileName}`;
				const arrayBuffer = await certificateFile.arrayBuffer();
				await writeFile(join(uploadDir, fileName), Buffer.from(arrayBuffer));
			} catch (err) {
				console.error('File upload error:', err);
				return fail(500, { message: 'Gagal mengupload sertifikat' });
			}
		}

		try {
			await db.update(maintenance)
				.set({
					equipmentId,
					vendor,
					cost,
					completionDate: new Date(completionDate),
					scheduledDate: new Date(completionDate),
					expiryDate: new Date(expiryDate),
					description,
					certificatePath,
					certificateName,
					updatedAt: new Date()
				})
				.where(eq(maintenance.id, calId));
		} catch (err) {
			console.error('Database error:', err);
			return fail(500, { message: 'Gagal memperbarui data kalibrasi' });
		}

		return { success: true };
	}
};
