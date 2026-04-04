import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { item } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

export const load = async ({ locals, params }) => {
	if (!locals.user) throw redirect(302, '/');

	const { id } = params;
	const [existingItem] = await db.select().from(item).where(eq(item.id, id)).limit(1);

	if (!existingItem) {
		throw redirect(302, '/admin/inventori');
	}

	return {
		user: locals.user,
		item: existingItem
	};
};

export const actions = {
	default: async ({ request, locals, params }) => {
		const session = await locals.user;
		if (!session) return fail(401, { message: 'Unauthorized' });

		const { id } = params;
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const type = formData.get('type') as 'ASSET' | 'CONSUMABLE';
		const equipmentType = formData.get('equipmentType') as any;
		const baseUnit = formData.get('baseUnit') as any;
		const description = formData.get('description') as string;
		const minStock = parseInt((formData.get('minStock') as string) || '0');
		const qrCodeFile = formData.get('qrCode') as File;
		const removeCurrentQr = formData.get('removeCurrentQr') === 'true';

		if (!name || !type || !baseUnit) {
			return fail(400, { message: 'Nama, Kategori, dan Satuan Dasar harus diisi.' });
		}

		const [existingItem] = await db.select().from(item).where(eq(item.id, id)).limit(1);
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
				return fail(400, { message: 'Hanya file PNG, JPEG, atau JPG yang diperbolehkan.' });
			}

			// Remove old QR code if uploading a new one
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

		try {
			await db.update(item)
				.set({
					name,
					type,
					equipmentType: type === 'ASSET' ? equipmentType : null,
					baseUnit,
					description,
					minStock: type === 'CONSUMABLE' ? minStock : 0,
					qrCodePath
				})
				.where(eq(item.id, id));

			return { success: true };
		} catch (error) {
			console.error('Error updating item:', error);
			return fail(500, { message: 'Gagal memperbarui data.' });
		}
	}
};
