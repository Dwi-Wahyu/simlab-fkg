import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { maintenance, equipment } from '$lib/server/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;
	if (!currentUser) throw redirect(302, '/');

	const labId = currentUser.laboratorium?.id;

	// Fetch assets (equipment) available for calibration
	const assets = await db.query.equipment.findMany({
		where: (e, { eq, sql }) => {
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
		assets
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const equipmentId = formData.get('equipmentId')?.toString();
		const vendor = formData.get('vendor')?.toString();
		const cost = parseInt(formData.get('cost')?.toString() || '0');
		const completionDate = formData.get('completionDate')?.toString();
		const expiryDate = formData.get('expiryDate')?.toString();
		const description = formData.get('description')?.toString() || 'Kalibrasi rutin';
		const certificateFile = formData.get('certificate') as File;

		if (!equipmentId || !completionDate || !expiryDate) {
			return fail(400, { message: 'Data tidak lengkap. Pastikan Alat dan Tanggal diisi.' });
		}

		let certificatePath = null;
		let certificateName = null;

		if (certificateFile && certificateFile.size > 0) {
			try {
				const ext = certificateFile.name.split('.').pop();
				certificateName = certificateFile.name;
				const fileName = `${uuidv4()}.${ext}`;
				const uploadDir = join(process.cwd(), 'static', 'uploads', 'certificates');
				
				// Ensure directory exists
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
			await db.insert(maintenance).values({
				id: uuidv4(),
				equipmentId,
				maintenanceType: 'KALIBRASI',
				description,
				scheduledDate: new Date(completionDate), // For sorting/tracking
				completionDate: new Date(completionDate),
				expiryDate: new Date(expiryDate),
				status: 'COMPLETED',
				vendor,
				cost,
				certificatePath,
				certificateName,
				createdAt: new Date()
			});
		} catch (err) {
			console.error('Database error:', err);
			return fail(500, { message: 'Gagal menyimpan data kalibrasi' });
		}

		return { success: true };
	}
};
