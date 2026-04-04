import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { item, stock, movement, warehouse, equipment } from '$lib/server/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { eq } from 'drizzle-orm';

export const load = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/');

	const labs = await db.query.laboratorium.findMany();

	// Fetch unique ASSET items for templates
	const existingAssets = await db.query.item.findMany({
		where: eq(item.type, 'ASSET'),
		with: {
			equipments: {
				limit: 1
			}
		}
	});

	return {
		user: locals.user,
		labs,
		existingAssets
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		const session = await locals.user;
		if (!session) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const type = formData.get('type') as 'ASSET' | 'CONSUMABLE';
		const equipmentType = formData.get('equipmentType') as any;
		const baseUnit = formData.get('baseUnit') as any;
		const location = formData.get('location') as string;
		const description = formData.get('description') as string;
		const minStock = parseInt((formData.get('minStock') as string) || '0');
		const initialStock = parseInt((formData.get('initialStock') as string) || '0');
		const qrCodeFile = formData.get('qrCode') as File;

		// ASSET specific fields
		const serialNumber = formData.get('serialNumber') as string;
		const brand = formData.get('brand') as string;
		const labId = formData.get('laboratoriumId') as string;
		const condition = formData.get('condition') as any;
		const status = formData.get('status') as any;

		if (!name || !type || !baseUnit) {
			return fail(400, { message: 'Nama, Kategori, dan Satuan Dasar harus diisi.' });
		}

		let qrCodePath = null;
		if (qrCodeFile && qrCodeFile.size > 0) {
			if (qrCodeFile.size > 5 * 1024 * 1024) {
				return fail(400, { message: 'Ukuran file QR Code maksimal 5MB.' });
			}
			const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
			if (!allowedTypes.includes(qrCodeFile.type)) {
				return fail(400, { message: 'Hanya file PNG, JPEG, atau JPG yang diperbolehkan.' });
			}

			const ext = qrCodeFile.name.split('.').pop();
			const fileName = `${uuidv4()}.${ext}`;
			const uploadDir = join(process.cwd(), 'static', 'uploads', 'qrcode');
			qrCodePath = `/uploads/qrcode/${fileName}`;

			const arrayBuffer = await qrCodeFile.arrayBuffer();
			await writeFile(join(uploadDir, fileName), Buffer.from(arrayBuffer));
		}

		const itemId = uuidv4();

		try {
			await db.transaction(async (tx) => {
				await tx.insert(item).values({
					id: itemId,
					name,
					type,
					equipmentType: type === 'ASSET' ? equipmentType : null,
					baseUnit,
					description,
					minStock: type === 'CONSUMABLE' ? minStock : 0,
					qrCodePath
				});

				// Get or Create Default Warehouse
				let defaultWarehouse = await tx.query.warehouse.findFirst();
				if (!defaultWarehouse) {
					const warehouseId = uuidv4();
					await tx.insert(warehouse).values({
						id: warehouseId,
						name: 'Gudang Utama',
						location: 'Laboratorium Pusat'
					});
					defaultWarehouse = {
						id: warehouseId,
						name: 'Gudang Utama',
						location: 'Laboratorium Pusat',
						createdAt: new Date()
					};
				}

				if (type === 'ASSET') {
					// Create Equipment Entry
					await tx.insert(equipment).values({
						id: uuidv4(),
						itemId: itemId,
						serialNumber: serialNumber || null,
						brand: brand || null,
						warehouseId: defaultWarehouse.id,
						laboratoriumId: labId || null,
						condition: condition || 'BAIK',
						status: status || 'READY'
					});

					// Create Movement Entry for Asset
					await tx.insert(movement).values({
						id: uuidv4(),
						itemId: itemId,
						eventType: 'RECEIVE',
						qty: 1,
						unit: baseUnit,
						toWarehouseId: defaultWarehouse.id,
						laboratoriumId: labId || null,
						notes: 'Pendaftaran aset baru',
						picId: session.id,
						createdAt: new Date()
					});
				} else if (type === 'CONSUMABLE' && initialStock > 0) {
					// Create Stock Entry
					await tx.insert(stock).values({
						id: uuidv4(),
						itemId: itemId,
						warehouseId: defaultWarehouse.id,
						qty: initialStock
					});

					// Create Movement Entry
					await tx.insert(movement).values({
						id: uuidv4(),
						itemId: itemId,
						eventType: 'RECEIVE',
						qty: initialStock,
						unit: baseUnit,
						toWarehouseId: defaultWarehouse.id,
						notes: 'Stok awal saat pendaftaran item',
						picId: session.id,
						createdAt: new Date()
					});
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Error creating item:', error);
			return fail(500, { message: 'Gagal menyimpan data.' });
		}
	}
};
