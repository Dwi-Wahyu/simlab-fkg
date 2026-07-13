import { error, json } from '@sveltejs/kit';
import { count, eq, and, gte, lte, like, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLog, user } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || !['superadmin', 'kakomlek'].includes(locals.user.role)) {
		throw error(403, 'Forbidden: Akses khusus Superadmin');
	}

	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const startDateStr = url.searchParams.get('startDate') || '';
	const endDateStr = url.searchParams.get('endDate') || '';
	const roleFilter = url.searchParams.get('role') || '';
	const menuFilter = url.searchParams.get('menu') || '';
	const actionFilter = url.searchParams.get('action') || '';
	const offset = (page - 1) * limit;

	let conditions = [];

	if (startDateStr) {
		conditions.push(gte(auditLog.createdAt, new Date(startDateStr)));
	}
	if (endDateStr) {
		const end = new Date(endDateStr);
		end.setHours(23, 59, 59, 999);
		conditions.push(lte(auditLog.createdAt, end));
	}
	if (menuFilter && menuFilter !== 'ALL') {
		conditions.push(eq(auditLog.tableName, menuFilter));
	}
	if (actionFilter && actionFilter !== 'ALL') {
		conditions.push(like(auditLog.action, `%${actionFilter}%`));
	}
	if (roleFilter && roleFilter !== 'ALL') {
		conditions.push(eq(user.role, roleFilter));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	// Summary Cards Calculations
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const [summaryData] = await db
		.select({
			todayActivities: count(sql`CASE WHEN ${auditLog.createdAt} >= ${today} THEN 1 END`),
			failedLogins: count(
				sql`CASE WHEN ${auditLog.action} = 'LOGIN' AND ${auditLog.status} = 'FAILED' THEN 1 END`
			),
			dataUpdates: count(sql`CASE WHEN ${auditLog.action} LIKE '%UPDATE%' THEN 1 END`),
			highRiskActions: count(sql`CASE WHEN ${auditLog.action} LIKE '%DELETE%' THEN 1 END`)
		})
		.from(auditLog);

	// Get total items for pagination
	const [totalItemsResult] = await db
		.select({ value: count() })
		.from(auditLog)
		.leftJoin(user, eq(auditLog.userId, user.id))
		.where(whereClause);

	const totalItems = Number(totalItemsResult.value || 0);
	const totalPages = Math.ceil(totalItems / limit);

	// Main Logs Query with Pagination
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
		.limit(limit)
		.offset(offset);

	// Get unique menus (tables) for filter
	const menus = await db.selectDistinct({ tableName: auditLog.tableName }).from(auditLog);

	return json({
		logs,
		summary: {
			todayActivities: Number(summaryData?.todayActivities || 0),
			failedLogins: Number(summaryData?.failedLogins || 0),
			dataUpdates: Number(summaryData?.dataUpdates || 0),
			highRiskActions: Number(summaryData?.highRiskActions || 0)
		},
		filters: {
			menus: menus.map((m) => m.tableName).filter(Boolean) as string[]
		},
		pagination: {
			totalItems,
			totalPages,
			currentPage: page,
			limit
		}
	});
};
