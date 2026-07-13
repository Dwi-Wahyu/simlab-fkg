import { db } from './db';
import { auditLog } from './db/schema';
import { v4 as uuidv4 } from 'uuid';

export interface AuditParams {
	userId?: string; // Optional for login failures where user might not be logged in
	action: string;
	tableName: string;
	recordId?: string;
	oldValue?: any;
	newValue?: any;
	status?: 'SUCCESS' | 'FAILED';
	ipAddress?: string;
	userAgent?: string;
}

/**
 * Log an action to the audit_log table.
 */
export async function createAuditLog(params: AuditParams) {
	const { userId, action, tableName, recordId, oldValue, newValue, status, ipAddress, userAgent } =
		params;

	return await db.insert(auditLog).values({
		id: uuidv4(),
		userId: userId || null,
		action,
		tableName,
		recordId: recordId || null,
		oldValue: oldValue ? JSON.stringify(oldValue) : null,
		newValue: newValue ? JSON.stringify(newValue) : null,
		status: status || 'SUCCESS',
		ipAddress: ipAddress || null,
		userAgent: userAgent || null,
		createdAt: new Date()
	});
}
