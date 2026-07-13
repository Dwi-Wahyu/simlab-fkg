import { fail, redirect } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { base } from '$app/paths';
import { db } from '$lib/server/db';
import { item, equipment, equipmentCategory, laboratorium } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) throw redirect(302, `${base}/`);

	const { id } = params;
	const [existingItem] = await db
		.select()
		.from(item)
		.where(and(eq(item.id, id), eq(item.isDeleted, false)))
		.limit(1);

	if (!existingItem) {
		throw redirect(302, `${base}/admin/inventaris/alat`);
	}

	const equipmentId = url.searchParams.get('equipmentId');
	let selectedEquipment = null;
	if (equipmentId) {
		const [foundEqp] = await db
			.select()
			.from(equipment)
			.where(and(eq(equipment.id, equipmentId), eq(equipment.isDeleted, false)))
			.limit(1);
		selectedEquipment = foundEqp;
	} else {
		const [firstEqp] = await db
			.select()
			.from(equipment)
			.where(and(eq(equipment.itemId, id), eq(equipment.isDeleted, false)))
			.limit(1);
		selectedEquipment = firstEqp;
	}

	const categories = await db.query.equipmentCategory.findMany();
	const labs = await db.query.laboratorium.findMany({
		where: (laboratorium, { eq }) => eq(laboratorium.isDeleted, false)
	});

	return {
		user: locals.user,
		item: existingItem,
		equipment: selectedEquipment || null,
		categories,
		labs
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const session = await locals.user;
		if (!session) return fail(401, { message: 'Unauthorized' });

		const { id } = params;
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const categoryId = formData.get('categoryId') as string;
		const equipmentType = formData.get('equipmentType') as any;
		const baseUnit = formData.get('baseUnit') as any;
		const description = formData.get('description') as string;
		const qrCodeFile = formData.get('qrCode') as File;
		const removeCurrentQr = formData.get('removeCurrentQr') === 'true';

		// Equipment instance fields
		const equipmentId = formData.get('equipmentId') as string;
		const serialNumber = formData.get('serialNumber') as string;
		const brand = formData.get('brand') as string;
		const variant = formData.get('variant') as string;
		const storageLocation = formData.get('storageLocation') as string;
		const labId = formData.get('laboratoriumId') as string;
		const condition = formData.get('condition') as any;
		const status = formData.get('status') as any;
		const createdAt = formData.get('createdAt') as string;

		if (!name || !baseUnit || !labId) {
			return fail(400, {
				message: 'Nama, Satuan Dasar, dan Laboratorium harus diisi.'
			});
		}

		const [existingItem] = await db
			.select()
			.from(item)
			.where(and(eq(item.id, id), eq(item.isDeleted, false)))
			.limit(1);
		if (!existingItem) {
			return fail(404, { message: 'Item tidak ditemukan.' });
		}

		let qrCodePath = existingItem.qrCodePath;

		if (removeCurrentQr && qrCodePath) {
			try {
				const fullPath = join(process.cwd(), 'static', qrCodePath);
				await unlink(fullPath);
				qrCodePath = null;
			} catch (err) {
				console.error('Error removing old QR code:', err);
			}
		}

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

			if (qrCodePath) {
				try {
					const fullPath = join(process.cwd(), 'static', qrCodePath);
					await unlink(fullPath);
				} catch (err) {
					console.error('Error removing old QR code before upload:', err);
				}
			}

			const ext = qrCodeFile.name.split('.').pop();
			const fileName = `${uuidv4()}.${ext}`;
			const uploadDir = join(process.cwd(), 'static', 'uploads', 'qrcode');
			qrCodePath = `/uploads/qrcode/${fileName}`;

			const arrayBuffer = await qrCodeFile.arrayBuffer();
			await writeFile(join(uploadDir, fileName), Buffer.from(arrayBuffer));
		}

		const parsedCreatedAt = createdAt ? new Date(createdAt) : new Date();

		try {
			await db.transaction(async (tx) => {
				await tx
					.update(item)
					.set({
						name,
						categoryId: categoryId || null,
						equipmentType: equipmentType || null,
						baseUnit,
						description,
						qrCodePath
					})
					.where(eq(item.id, id));

				const [existingEquipment] = equipmentId
					? await tx
							.select()
							.from(equipment)
							.where(and(eq(equipment.id, equipmentId), eq(equipment.isDeleted, false)))
							.limit(1)
					: await tx
							.select()
							.from(equipment)
							.where(and(eq(equipment.itemId, id), eq(equipment.isDeleted, false)))
							.limit(1);

				if (existingEquipment) {
					await tx
						.update(equipment)
						.set({
							serialNumber: serialNumber || null,
							brand: brand || null,
							variant: variant || null,
							storageLocation: storageLocation || null,
							laboratoriumId: labId,
							condition: condition || 'BAIK',
							status: status || 'READY',
							createdAt: parsedCreatedAt
						})
						.where(eq(equipment.id, existingEquipment.id));
				} else {
					await tx.insert(equipment).values({
						id: uuidv4(),
						itemId: id,
						serialNumber: serialNumber || null,
						brand: brand || null,
						variant: variant || null,
						storageLocation: storageLocation || null,
						laboratoriumId: labId,
						condition: condition || 'BAIK',
						status: status || 'READY',
						createdAt: parsedCreatedAt
					});
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Error updating asset item:', error);
			return fail(500, { message: 'Gagal memperbarui data.' });
		}
	}
};
