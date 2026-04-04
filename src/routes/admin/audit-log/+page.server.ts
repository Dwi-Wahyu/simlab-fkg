import { db } from '$lib/server/db';
import { auditLog, user } from '$lib/server/db/schema';
import { desc, eq, and, gte, lte, like, or, sql, count } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || !['superadmin', 'kakomlek'].includes(locals.user.role)) {
		throw error(403, 'Forbidden: Akses khusus Superadmin');
	}

	// Filters from URL
	const startDateStr = url.searchParams.get('startDate');
	const endDateStr = url.searchParams.get('endDate');
	const roleFilter = url.searchParams.get('role');
	const menuFilter = url.searchParams.get('menu');
	const actionFilter = url.searchParams.get('action');

	let conditions = [];

	if (startDateStr) {
		conditions.push(gte(auditLog.createdAt, new Date(startDateStr)));
	}
	if (endDateStr) {
		const end = new Date(endDateStr);
		end.setHours(23, 59, 59, 999);
		conditions.push(lte(auditLog.createdAt, end));
	}
	if (menuFilter) {
		conditions.push(eq(auditLog.tableName, menuFilter));
	}
	if (actionFilter) {
		conditions.push(like(auditLog.action, `%${actionFilter}%`));
	}
	if (roleFilter) {
		conditions.push(eq(user.role, roleFilter));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	// Summary Cards Calculations
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const [summaryData] = await db
		.select({
			todayActivities: count(sql`CASE WHEN ${auditLog.createdAt} >= ${today} THEN 1 END`),
			failedLogins: count(sql`CASE WHEN ${auditLog.action} = 'LOGIN' AND ${auditLog.status} = 'FAILED' THEN 1 END`),
			dataUpdates: count(sql`CASE WHEN ${auditLog.action} LIKE '%UPDATE%' THEN 1 END`),
			highRiskActions: count(sql`CASE WHEN ${auditLog.action} LIKE '%DELETE%' THEN 1 END`)
		})
		.from(auditLog);

	// Main Logs Query
	const logs = await db
		.select({
			id: auditLog.id,
			action: auditLog.action,
			tableName: auditLog.tableName,
			recordId: auditLog.recordId,
			oldValue: auditLog.oldValue,
			newValue: auditLog.newValue,
			status: auditLog.status,
			ipAddress: auditLog.ipAddress,
			createdAt: auditLog.createdAt,
			userName: user.name,
			userEmail: user.email,
			userRole: user.role
		})
		.from(auditLog)
		.leftJoin(user, eq(auditLog.userId, user.id))
		.where(whereClause)
		.orderBy(desc(auditLog.createdAt))
		.limit(100);

	// Get unique menus (tables) for filter
	const menus = await db
		.selectDistinct({ tableName: auditLog.tableName })
		.from(auditLog);

	return {
		logs,
		summary: {
			todayActivities: Number(summaryData?.todayActivities || 0),
			failedLogins: Number(summaryData?.failedLogins || 0),
			dataUpdates: Number(summaryData?.dataUpdates || 0),
			highRiskActions: Number(summaryData?.highRiskActions || 0)
		},
		filters: {
			menus: menus.map(m => m.tableName).filter(Boolean) as string[]
		}
	};
};
