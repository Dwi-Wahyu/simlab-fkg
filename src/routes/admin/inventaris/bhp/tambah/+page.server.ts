import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { base } from '$app/paths';
import { db } from '$lib/server/db';
import {
	stock,
	item,
	movement,
	equipmentCategory,
	laboratorium
} from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, `${base}/`);

	const categories = await db.query.equipmentCategory.findMany();
	const labs = await db.query.laboratorium.findMany();

	// Fetch unique CONSUMABLE items for autocomplete
	const existingBhp = await db.query.item.findMany({
		where: eq(item.type, 'CONSUMABLE')
	});

	return {
		user: locals.user,
		categories,
		labs,
		existingBhp
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = await locals.user;
		if (!session) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const categoryId = formData.get('categoryId') as string;
		const baseUnit = formData.get('baseUnit') as any;
		const description = formData.get('description') as string;
		const qrCodeFile = formData.get('qrCode') as File;
		const minStock = parseInt((formData.get('minStock') as string) || '0');

		// Stock specific fields
		const brand = formData.get('brand') as string;
		const variant = formData.get('variant') as string;
		const labId = formData.get('laboratoriumId') as string;
		const initialStock = parseInt((formData.get('initialStock') as string) || '0');
		const condition = (formData.get('condition') as string) || 'baik';

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
			where: eq(item.name, name)
		});

		if (existingItem) {
			itemId = existingItem.id;
			isNewItem = false;
		}

		try {
			await db.transaction(async (tx) => {
				if (isNewItem) {
					await tx.insert(item).values({
						id: itemId,
						name,
						type: 'CONSUMABLE',
						categoryId: categoryId || null,
						baseUnit,
						description,
						minStock,
						qrCodePath
					});
				} else {
					// update categoryId or minStock if not set
					const updates: any = {};
					if (categoryId && !existingItem.categoryId) {
						updates.categoryId = categoryId;
					}
					if (minStock > 0 && !existingItem.minStock) {
						updates.minStock = minStock;
					}
					if (Object.keys(updates).length > 0) {
						await tx.update(item).set(updates).where(eq(item.id, itemId));
					}
				}

				// Look if stock entry with same item, brand, and variant already exists in this lab
				const existingStockRow = await tx.query.stock.findFirst({
					where: (s, { eq, and, isNull, or }) =>
						and(
							eq(s.itemId, itemId),
							eq(s.laboratoriumId, labId),
							brand ? eq(s.brand, brand) : or(isNull(s.brand), eq(s.brand, '')),
							variant ? eq(s.variant, variant) : or(isNull(s.variant), eq(s.variant, ''))
						)
				});

				if (existingStockRow) {
					await tx.update(stock)
						.set({
							qty: existingStockRow.qty + initialStock,
							condition: condition || existingStockRow.condition
						})
						.where(eq(stock.id, existingStockRow.id));
				} else {
					await tx.insert(stock).values({
						id: uuidv4(),
						itemId: itemId,
						laboratoriumId: labId,
						qty: initialStock,
						brand: brand || '',
						variant: variant || '',
						condition: condition || 'baik'
					});
				}

				if (initialStock > 0) {
					// Create Movement Entry
					await tx.insert(movement).values({
						id: uuidv4(),
						itemId: itemId,
						eventType: 'RECEIVE',
						qty: initialStock,
						unit: baseUnit,
						laboratoriumId: labId,
						notes: 'Stok awal saat pendaftaran item',
						picId: session.id,
						createdAt: new Date()
					});
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Error creating consumable item:', error);
			return fail(500, { message: 'Gagal menyimpan data.' });
		}
	}
};
