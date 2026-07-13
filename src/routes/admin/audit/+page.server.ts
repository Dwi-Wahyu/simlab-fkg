import { db } from '$lib/server/db';
import { auditChecklist } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { unlink } from 'fs/promises';
import { join } from 'path';

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const allowedRoles = ['spmi', 'kepalaLab', 'superadmin', 'koordinator'];
		if (!allowedRoles.includes(locals.user.role)) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		try {
			// Find checklist
			const [checklist] = await db
				.select()
				.from(auditChecklist)
				.where(eq(auditChecklist.id, id))
				.limit(1);
			if (!checklist) return fail(404, { message: 'Audit tidak ditemukan' });

			// Delete certificate file if it exists
			if (checklist.sertifikat) {
				try {
					const filePath = join(
						process.cwd(),
						'static',
						'uploads',
						'certificates',
						checklist.sertifikat
					);
					await unlink(filePath);
				} catch (err) {
					console.error('Failed to delete certificate file:', err);
				}
			}

			await db.delete(auditChecklist).where(eq(auditChecklist.id, id));
			return { success: true, message: 'Audit berhasil dihapus' };
		} catch (err: any) {
			console.error('Error deleting audit checklist:', err);
			return fail(500, { message: 'Gagal menghapus audit checklist.' });
		}
	}
};
