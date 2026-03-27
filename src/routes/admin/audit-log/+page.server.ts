import { db } from '$lib/server/db';
import { auditLog, user } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// 1. Otorisasi: Hanya superadmin yang bisa melihat audit log
	// Berdasarkan src/hooks.server.ts, role disimpan di locals.user.role
	if (!locals.user || !['superadmin', 'kakomlek'].includes(locals.user.role)) {
		throw error(403, 'Forbidden: Akses khusus Superadmin');
	}

	// 2. Ambil data audit log dengan join ke user untuk mendapatkan nama pelaku
	const logs = await db
		.select({
			id: auditLog.id,
			action: auditLog.action,
			tableName: auditLog.tableName,
			recordId: auditLog.recordId,
			oldValue: auditLog.oldValue,
			newValue: auditLog.newValue,
			createdAt: auditLog.createdAt,
			userName: user.name,
			userEmail: user.email
		})
		.from(auditLog)
		.leftJoin(user, eq(auditLog.userId, user.id))
		.orderBy(desc(auditLog.createdAt))
		.limit(100);

	return {
		logs
	};
};
