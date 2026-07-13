import { fail, redirect } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { base } from '$app/paths';
import { db } from '$lib/server/db';
import { equipment, item, movement, equipmentCategory, laboratorium } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, `${base}/`);

	const categories = await db.query.equipmentCategory.findMany();
	const labs = await db.query.laboratorium.findMany({
		where: (laboratorium, { eq }) => eq(laboratorium.isDeleted, false)
	});

	// Fetch unique ASSET items for templates / auto-complete
	const existingAssets = await db.query.item.findMany({
		where: and(eq(item.type, 'ASSET'), eq(item.isDeleted, false))
	});

	return {
		user: locals.user,
		categories,
		labs,
		existingAssets
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = await locals.user;
		if (!session) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const categoryId = formData.get('categoryId') as string;
		const equipmentType = formData.get('equipmentType') as any;
		const baseUnit = formData.get('baseUnit') as any;
		const storageLocation = formData.get('storageLocation') as string;
		const description = formData.get('description') as string;
		const qrCodeFile = formData.get('qrCode') as File;
		const createdAt = formData.get('createdAt') as string;

		// ASSET specific fields
		const serialNumber = formData.get('serialNumber') as string;
		const brand = formData.get('brand') as string;
		const variant = formData.get('variant') as string;
		const labId = formData.get('laboratoriumId') as string;
		const condition = formData.get('condition') as any;
		const status = formData.get('status') as any;

		if (!name || !baseUnit || !labId) {
			return fail(400, {
				message: 'Nama, Satuan Dasar, dan Laboratorium harus diisi.'
			});
		}

		let qrCodePath = null;
		if (qrCodeFile && qrCodeFile.size > 0) {
			if (qrCodeFile.size > 5 * 1024 * 1024) {
				return fail(400, { message: 'Ukuran file QR Code maksimal 5MB.' });
			}
			const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
			if (!allowedTypes.includes(qrCodeFile.type)) {
				return fail(400, {
					message: 'Hanya file PNG, JPEG, atau JPG yang diperbolehkan.'
				});
			}

			const ext = qrCodeFile.name.split('.').pop();
			const fileName = `${uuidv4()}.${ext}`;
			const uploadDir = join(process.cwd(), 'static', 'uploads', 'qrcode');
			qrCodePath = `/uploads/qrcode/${fileName}`;

			const arrayBuffer = await qrCodeFile.arrayBuffer();
			await writeFile(join(uploadDir, fileName), Buffer.from(arrayBuffer));
		}

		// Look if item already exists by name
		let itemId = uuidv4();
		let isNewItem = true;
		const existingItem = await db.query.item.findFirst({
			where: and(eq(item.name, name), eq(item.isDeleted, false))
		});

		if (existingItem) {
			itemId = existingItem.id;
			isNewItem = false;
		}

		const parsedCreatedAt = createdAt ? new Date(createdAt) : new Date();

		try {
			await db.transaction(async (tx) => {
				if (isNewItem) {
					await tx.insert(item).values({
						id: itemId,
						name,
						type: 'ASSET',
						categoryId: categoryId || null,
						equipmentType: equipmentType || null,
						baseUnit,
						description,
						minStock: 0,
						qrCodePath
					});
				} else {
					// update categoryId if not set
					if (categoryId && !existingItem.categoryId) {
						await tx.update(item).set({ categoryId }).where(eq(item.id, itemId));
					}
				}

				// Create Equipment Entry
				await tx.insert(equipment).values({
					id: uuidv4(),
					itemId: itemId,
					serialNumber: serialNumber || null,
					brand: brand || null,
					variant: variant || null,
					laboratoriumId: labId,
					condition: condition || 'BAIK',
					status: status || 'READY',
					storageLocation: storageLocation || null,
					createdAt: parsedCreatedAt
				});

				// Create Movement Entry for Asset
				await tx.insert(movement).values({
					id: uuidv4(),
					itemId: itemId,
					eventType: 'RECEIVE',
					qty: 1,
					unit: baseUnit,
					laboratoriumId: labId,
					notes: 'Pendaftaran alat baru',
					picId: session.id,
					createdAt: parsedCreatedAt
				});
			});

			return { success: true };
		} catch (error) {
			console.error('Error creating asset item:', error);
			return fail(500, { message: 'Gagal menyimpan data.' });
		}
	}
};
