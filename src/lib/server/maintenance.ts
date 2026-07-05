import { db } from './db';
import { maintenance, approval } from './db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { createNotification } from './notification';
import { createAuditLog } from './audit';

export async function submitMaintenanceForApproval(maintenanceId: string, userId: string) {
	const maint = await db.query.maintenance.findFirst({
		where: eq(maintenance.id, maintenanceId)
	});

	if (!maint) return;
	if (maint.maintenanceType === 'KALIBRASI') return;
	if (maint.status !== 'COMPLETED') return;

	// Check if pending approval already exists
	const existingPending = await db.query.approval.findFirst({
		where: and(
			eq(approval.referenceType, 'MAINTENANCE'),
			eq(approval.referenceId, maintenanceId),
			eq(approval.status, 'PENDING')
		)
	});

	if (!existingPending) {
		await db.insert(approval).values({
			id: uuidv4(),
			referenceType: 'MAINTENANCE',
			referenceId: maintenanceId,
			status: 'PENDING',
			createdAt: new Date()
		});
	}
}

export async function reviewMaintenanceApproval(
	approvalId: string,
	userId: string,
	isApproved: boolean,
	note?: string
) {
	return await db.transaction(async (tx) => {
		const approvalRow = await tx.query.approval.findFirst({
			where: eq(approval.id, approvalId)
		});
		if (!approvalRow) throw new Error('Approval record not found');
		if (approvalRow.referenceType !== 'MAINTENANCE') {
			throw new Error('Approval record is not a maintenance approval');
		}
		if (approvalRow.status !== 'PENDING') {
			throw new Error('Approval already reviewed');
		}

		await tx
			.update(approval)
			.set({
				status: isApproved ? 'APPROVED' : 'REJECTED',
				approvedBy: userId,
				note
			})
			.where(eq(approval.id, approvalId));

		await createAuditLog({
			userId,
			action: isApproved ? 'APPROVE' : 'REJECT',
			tableName: 'maintenance',
			recordId: approvalRow.referenceId!,
			newValue: { approvalStatus: isApproved ? 'APPROVED' : 'REJECTED', note }
		});

		// Notify the technician/creator
		const maintenanceRow = await tx.query.maintenance.findFirst({
			where: eq(maintenance.id, approvalRow.referenceId!)
		});
		if (maintenanceRow?.technicianId) {
			await createNotification({
				userId: maintenanceRow.technicianId,
				title: isApproved ? 'Pemeliharaan Disetujui' : 'Pemeliharaan Ditolak',
				body: note || (isApproved ? 'Nota telah diverifikasi.' : 'Perlu tindak lanjut.'),
				priority: 'MEDIUM'
			});
		}

		return { success: true };
	});
}
