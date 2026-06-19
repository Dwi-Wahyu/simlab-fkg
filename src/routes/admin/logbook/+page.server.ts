import { db } from '$lib/server/db';
import { practicumLogbookTemplate, practicumModule, block, department } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';

const TEMPLATE_DIR = path.resolve('static/templates/logbook');
const ALLOWED_ROLES = ['superadmin', 'koordinator'];

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !ALLOWED_ROLES.includes(locals.user.role)) {
		throw redirect(302, '/admin/dashboard');
	}

	const templates = await db
		.select({
			id: practicumLogbookTemplate.id,
			name: practicumLogbookTemplate.name,
			templateFilePath: practicumLogbookTemplate.templateFilePath,
			createdAt: practicumLogbookTemplate.createdAt,
			updatedAt: practicumLogbookTemplate.updatedAt,
			moduleId: practicumLogbookTemplate.moduleId,
			moduleName: practicumModule.name,
			blockName: block.name,
			departmentName: department.name
		})
		.from(practicumLogbookTemplate)
		.leftJoin(practicumModule, eq(practicumLogbookTemplate.moduleId, practicumModule.id))
		.leftJoin(block, eq(practicumModule.blockId, block.id))
		.leftJoin(department, eq(block.departmentId, department.id))
		.orderBy(practicumLogbookTemplate.createdAt);

	const modules = await db
		.select({
			id: practicumModule.id,
			name: practicumModule.name,
			blockName: block.name
		})
		.from(practicumModule)
		.leftJoin(block, eq(practicumModule.blockId, block.id))
		.orderBy(practicumModule.name);

	return { templates, modules };
};

export const actions: Actions = {
	// Tambah template baru
	create: async ({ request, locals }) => {
		if (!locals.user || !ALLOWED_ROLES.includes(locals.user.role)) {
			return fail(403, { message: 'Tidak diizinkan' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const moduleId = formData.get('moduleId') as string;
		const file = formData.get('file') as File | null;

		if (!name || !moduleId || !file || file.size === 0) {
			return fail(400, { message: 'Nama, Modul, dan file template wajib diisi' });
		}

		if (!file.name.endsWith('.docx')) {
			return fail(400, { message: 'File harus berformat .docx' });
		}

		try {
			await mkdir(TEMPLATE_DIR, { recursive: true });
			const fileName = `${crypto.randomUUID()}_${file.name.replace(/\s+/g, '_')}`;
			const buffer = Buffer.from(await file.arrayBuffer());
			await writeFile(path.join(TEMPLATE_DIR, fileName), buffer);

			await db.insert(practicumLogbookTemplate).values({
				moduleId,
				name,
				templateFilePath: fileName // hanya nama file
			});

			return { success: true, message: 'Template berhasil ditambahkan' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal menyimpan template' });
		}
	},

	// Edit nama atau ganti file template
	update: async ({ request, locals }) => {
		if (!locals.user || !ALLOWED_ROLES.includes(locals.user.role)) {
			return fail(403, { message: 'Tidak diizinkan' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const moduleId = formData.get('moduleId') as string;
		const file = formData.get('file') as File | null;

		if (!id || !name || !moduleId) {
			return fail(400, { message: 'ID, Nama, dan Modul wajib diisi' });
		}

		try {
			const existing = await db.query.practicumLogbookTemplate.findFirst({
				where: eq(practicumLogbookTemplate.id, id)
			});
			if (!existing) return fail(404, { message: 'Template tidak ditemukan' });

			let newFileName = existing.templateFilePath;

			// Jika ada file baru, hapus lama dan simpan baru
			if (file && file.size > 0) {
				if (!file.name.endsWith('.docx')) {
					return fail(400, { message: 'File harus berformat .docx' });
				}
				// Hapus file lama
				try {
					await unlink(path.join(TEMPLATE_DIR, existing.templateFilePath));
				} catch {
					// ignore jika file lama tidak ada
				}
				newFileName = `${crypto.randomUUID()}_${file.name.replace(/\s+/g, '_')}`;
				const buffer = Buffer.from(await file.arrayBuffer());
				await writeFile(path.join(TEMPLATE_DIR, newFileName), buffer);
			}

			await db
				.update(practicumLogbookTemplate)
				.set({ name, moduleId, templateFilePath: newFileName })
				.where(eq(practicumLogbookTemplate.id, id));

			return { success: true, message: 'Template berhasil diperbarui' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal memperbarui template' });
		}
	},

	// Hapus template
	delete: async ({ request, locals }) => {
		if (!locals.user || !ALLOWED_ROLES.includes(locals.user.role)) {
			return fail(403, { message: 'Tidak diizinkan' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { message: 'ID diperlukan' });

		try {
			const existing = await db.query.practicumLogbookTemplate.findFirst({
				where: eq(practicumLogbookTemplate.id, id)
			});
			if (existing) {
				try {
					await unlink(path.join(TEMPLATE_DIR, existing.templateFilePath));
				} catch {
					// ignore jika file tidak ada di disk
				}
				await db.delete(practicumLogbookTemplate).where(eq(practicumLogbookTemplate.id, id));
			}
			return { success: true, message: 'Template berhasil dihapus' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal menghapus template' });
		}
	}
};
