import { db } from './db';
import { auditLog } from './db/schema';
import { v4 as uuidv4 } from 'uuid';

export interface AuditParams {
	userId: string;
	action: string;
	tableName: string;
	recordId: string;
	oldValue?: any;
	newValue?: any;
}

/**
 * Log an action to the audit_log table.
 */
export async function createAuditLog(params: AuditParams) {
	const { userId, action, tableName, recordId, oldValue, newValue } = params;

	return await db.insert(auditLog).values({
		id: uuidv4(),
		userId,
		action,
		tableName,
		recordId,
		oldValue: oldValue ? JSON.stringify(oldValue) : null,
		newValue: newValue ? JSON.stringify(newValue) : null,
		createdAt: new Date()
	});
}
