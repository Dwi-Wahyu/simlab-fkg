import { fail, redirect } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { base } from '$app/paths';
import { db } from '$lib/server/db';
import { item, equipmentCategory } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw redirect(302, `${base}/`);

	const { id } = params;
	const [existingItem] = await db
		.select()
		.from(item)
		.where(and(eq(item.id, id), eq(item.isDeleted, false)))
		.limit(1);

	if (!existingItem) {
		throw redirect(302, `${base}/admin/inventaris/bhp`);
	}

	const categories = await db.query.equipmentCategory.findMany();

	return {
		user: locals.user,
		item: existingItem,
		categories
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
		const baseUnit = formData.get('baseUnit') as any;
		const description = formData.get('description') as string;
		const minStock = parseInt((formData.get('minStock') as string) || '0');
		const qrCodeFile = formData.get('qrCode') as File;
		const removeCurrentQr = formData.get('removeCurrentQr') === 'true';

		if (!name || !baseUnit) {
			return fail(400, {
				message: 'Nama dan Satuan Dasar harus diisi.'
			});
		}

		const [existingItem] = await db
			.select()
			.from(item)
			.where(and(eq(item.id, id), eq(item.isDeleted, false)))
			.limit(1);
		if (!existingItem) {
			return fail(404, { message: 'Bahan tidak ditemukan.' });
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

		try {
			await db
				.update(item)
				.set({
					name,
					categoryId: categoryId || null,
					baseUnit,
					description,
					minStock,
					qrCodePath
				})
				.where(eq(item.id, id));

			return { success: true };
		} catch (error) {
			console.error('Error updating consumable item:', error);
			return fail(500, { message: 'Gagal memperbarui data.' });
		}
	}
};
