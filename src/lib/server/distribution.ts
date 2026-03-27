import { db } from './db';
import { distribution, distributionItem, movement, approval, stock, equipment, auditLog } from './db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, sql } from 'drizzle-orm';
import { createNotification } from './notification';
import { createAuditLog } from './audit';

export interface CreateDistributionParams {
	fromOrganizationId: string;
	toOrganizationId: string;
	requestedBy: string;
	items: {
		equipmentId?: string;
		itemId?: string;
		quantity: number;
		unit?: string;
		note?: string;
	}[];
}

/**
 * 1. CREATE DISTRIBUTION (REQUEST)
 */
export async function createDistribution(params: CreateDistributionParams) {
	return await db.transaction(async (tx) => {
		const distributionId = uuidv4();

		// Insert into distribution
		await tx.insert(distribution).values({
			id: distributionId,
			fromOrganizationId: params.fromOrganizationId,
			toOrganizationId: params.toOrganizationId,
			requestedBy: params.requestedBy,
			status: 'DRAFT',
			createdAt: new Date()
		});

		// Insert into distribution_item
		for (const itemData of params.items) {
			if (itemData.equipmentId && itemData.itemId) {
				throw new Error('A distribution item cannot have both equipmentId and itemId');
			}
			if (itemData.equipmentId && itemData.quantity !== 1) {
				throw new Error('Equipment quantity must be 1');
			}
			if (!itemData.equipmentId && !itemData.itemId) {
				throw new Error('A distribution item must have either equipmentId or itemId');
			}

			await tx.insert(distributionItem).values({
				id: uuidv4(),
				distributionId,
				equipmentId: itemData.equipmentId || null,
				itemId: itemData.itemId || null,
				quantity: itemData.quantity,
				unit: itemData.unit || null,
				note: itemData.note || null,
				createdAt: new Date()
			});
		}

		// Audit Log
		await createAuditLog({
			userId: params.requestedBy,
			action: 'CREATE',
			tableName: 'distribution',
			recordId: distributionId,
			newValue: { status: 'DRAFT', itemsCount: params.items.length }
		});

		return distributionId;
	});
}

/**
 * 2. VALIDASI BINMAT (ADMIN CHECK)
 */
export async function validateDistribution(distributionId: string, userId: string) {
	return await db.transaction(async (tx) => {
		const dist = await tx.query.distribution.findFirst({
			where: eq(distribution.id, distributionId),
			with: {
				items: true
			}
		});

		if (!dist) throw new Error('Distribution not found');

		// Perform basic validations
		for (const itemData of dist.items) {
			if (itemData.equipmentId) {
				const eqp = await tx.query.equipment.findFirst({
					where: eq(equipment.id, itemData.equipmentId)
				});
				if (!eqp) throw new Error(`Equipment ${itemData.equipmentId} not found`);
				if (eqp.status !== 'READY') throw new Error(`Equipment ${eqp.serialNumber} is not READY`);
			} else if (itemData.itemId) {
				// Consumable check scoped to fromOrganization
				const warehousesInOrg = await tx.query.warehouse.findMany({
					where: eq(warehouse.organizationId, dist.fromOrganizationId as string),
					columns: { id: true }
				});
				const warehouseIds = warehousesInOrg.map(w => w.id);

				if (warehouseIds.length === 0) {
					throw new Error('Organisasi pengirim tidak memiliki gudang');
				}

				const totalStock = await tx
					.select({ total: sql<number>`sum(${stock.qty})` })
					.from(stock)
					.where(and(
						eq(stock.itemId, itemData.itemId),
						sql`${stock.warehouseId} IN ${warehouseIds}`
					));

				const qty = totalStock[0]?.total || 0;
				if (qty < itemData.quantity) {
					throw new Error(`Stok tidak mencukupi di kesatuan pengirim. Tersedia: ${qty}, Dibutuhkan: ${itemData.quantity}`);
				}
			}
 else {
				throw new Error('Distribution item must have either equipmentId or itemId');
			}
		}

		// Update distribution status to VALIDATED
		await tx.update(distribution)
			.set({ status: 'VALIDATED' })
			.where(eq(distribution.id, distributionId));

		// Audit Log
		await createAuditLog({
			userId,
			action: 'VALIDATE',
			tableName: 'distribution',
			recordId: distributionId,
			newValue: { status: 'VALIDATED' }
		});

		return { success: true };
	});
}

/**
 * 3. APPROVAL KOMANDO
 */
export async function approveDistribution(distributionId: string, userId: string, isApproved: boolean, note?: string) {
	return await db.transaction(async (tx) => {
		const dist = await tx.query.distribution.findFirst({
			where: eq(distribution.id, distributionId)
		});

		if (!dist) throw new Error('Distribution not found');
		if (isApproved && dist.status !== 'VALIDATED') {
			throw new Error('Distribution must be VALIDATED before approval');
		}

		const status = isApproved ? 'APPROVED' : 'DRAFT';
		const approvalStatus = isApproved ? 'APPROVED' : 'REJECTED';

		// Insert into approval
		const approvalId = uuidv4();
		await tx.insert(approval).values({
			id: approvalId,
			referenceType: 'DISTRIBUTION',
			referenceId: distributionId,
			approvedBy: userId,
			status: approvalStatus,
			note,
			createdAt: new Date()
		});

		// Update distribution status
		await tx.update(distribution)
			.set({ 
				status: status,
				approvedBy: isApproved ? userId : null
			})
			.where(eq(distribution.id, distributionId));

		// Audit Log
		await createAuditLog({
			userId,
			action: isApproved ? 'APPROVE' : 'REJECT',
			tableName: 'distribution',
			recordId: distributionId,
			newValue: { status }
		});

		// Notification
		if (isApproved) {
			const dist = await tx.query.distribution.findFirst({
				where: eq(distribution.id, distributionId)
			});

			if (dist) {
				await createNotification({
					organizationId: dist.fromOrganizationId || undefined,
					title: 'Distribusi Disetujui',
					body: `Permintaan distribusi ${distributionId} telah disetujui.`,
					priority: 'HIGH',
					action: {
						type: 'DISTRIBUTION_DETAIL',
						resourceId: distributionId,
						webPath: `/distribusi/${distributionId}`
					}
				});
			}
		}

		return { success: true, status };
	});
}

/**
 * 4. PREPARE & SHIPMENT (BEKHARRAH)
 */
export async function shipDistribution(distributionId: string, userId: string, fromWarehouseId: string) {
	return await db.transaction(async (tx) => {
		const dist = await tx.query.distribution.findFirst({
			where: eq(distribution.id, distributionId),
			with: {
				items: true
			}
		});

		if (!dist) throw new Error('Distribution not found');
		if (dist.status !== 'APPROVED') throw new Error('Distribution must be APPROVED before shipping');

		for (const itemData of dist.items) {
			if (itemData.equipmentId) {
				// Insert movement for equipment
				await tx.insert(movement).values({
					id: uuidv4(),
					equipmentId: itemData.equipmentId,
					eventType: 'DISTRIBUTE_OUT',
					qty: 1,
					fromWarehouseId,
					classification: 'TRANSITO',
					referenceType: 'DISTRIBUTION',
					referenceId: distributionId,
					organizationId: dist.fromOrganizationId,
					picId: userId,
					notes: itemData.note,
					createdAt: new Date()
				});

				// Update equipment status
				await tx.update(equipment)
					.set({ status: 'TRANSIT' })
					.where(eq(equipment.id, itemData.equipmentId));

			} else if (itemData.itemId) {
				// Reduce stock for consumable
				const currentStock = await tx.query.stock.findFirst({
					where: and(
						eq(stock.itemId, itemData.itemId),
						eq(stock.warehouseId, fromWarehouseId)
					)
				});

				if (!currentStock || currentStock.qty < itemData.quantity) {
					throw new Error(`Insufficient stock for item ${itemData.itemId} in warehouse ${fromWarehouseId}`);
				}

				await tx.update(stock)
					.set({ qty: currentStock.qty - itemData.quantity })
					.where(eq(stock.id, currentStock.id));

				// Insert movement for consumable
				await tx.insert(movement).values({
					id: uuidv4(),
					itemId: itemData.itemId,
					qty: itemData.quantity,
					unit: itemData.unit,
					eventType: 'DISTRIBUTE_OUT',
					fromWarehouseId,
					classification: 'TRANSITO',
					referenceType: 'DISTRIBUTION',
					referenceId: distributionId,
					organizationId: dist.fromOrganizationId,
					picId: userId,
					notes: itemData.note,
					createdAt: new Date()
				});
			}
		}

		// Update distribution status
		await tx.update(distribution)
			.set({ status: 'SHIPPED' })
			.where(eq(distribution.id, distributionId));

		// Audit Log
		await createAuditLog({
			userId,
			action: 'SHIP',
			tableName: 'distribution',
			recordId: distributionId,
			newValue: { status: 'SHIPPED' }
		});

		// Notification
		await createNotification({
			organizationId: dist.toOrganizationId || undefined,
			title: 'Materi Dalam Pengiriman',
			body: `Materi dari distribusi ${distributionId} sedang dikirim ke satuan Anda.`,
			priority: 'MEDIUM',
			action: {
				type: 'DISTRIBUTION_DETAIL',
				resourceId: distributionId,
				webPath: `/distribusi/${distributionId}`
			}
		});

		return { success: true };
	});
}

/**
 * 5. RECEIVING (SATUAN TUJUAN)
 */
export async function receiveDistribution(distributionId: string, userId: string, toWarehouseId: string) {
	return await db.transaction(async (tx) => {
		const dist = await tx.query.distribution.findFirst({
			where: eq(distribution.id, distributionId),
			with: {
				items: true
			}
		});

		if (!dist) throw new Error('Distribution not found');
		if (dist.status !== 'SHIPPED') throw new Error('Distribution must be SHIPPED before receiving');

		for (const itemData of dist.items) {
			if (itemData.equipmentId) {
				// Update equipment: warehouseId = tujuan, status = "READY"
				await tx.update(equipment)
					.set({ 
						warehouseId: toWarehouseId,
						organizationId: dist.toOrganizationId,
						status: 'READY' 
					})
					.where(eq(equipment.id, itemData.equipmentId));

				// Insert movement for equipment
				await tx.insert(movement).values({
					id: uuidv4(),
					equipmentId: itemData.equipmentId,
					eventType: 'DISTRIBUTE_IN',
					qty: 1,
					toWarehouseId,
					classification: 'KOMUNITY',
					referenceType: 'DISTRIBUTION',
					referenceId: distributionId,
					organizationId: dist.toOrganizationId,
					picId: userId,
					notes: itemData.note,
					createdAt: new Date()
				});

			} else if (itemData.itemId) {
				// Increase stock for consumable
				const existingStock = await tx.query.stock.findFirst({
					where: and(
						eq(stock.itemId, itemData.itemId),
						eq(stock.warehouseId, toWarehouseId)
					)
				});

				if (existingStock) {
					await tx.update(stock)
						.set({ qty: existingStock.qty + itemData.quantity })
						.where(eq(stock.id, existingStock.id));
				} else {
					await tx.insert(stock).values({
						id: uuidv4(),
						itemId: itemData.itemId,
						warehouseId: toWarehouseId,
						qty: itemData.quantity,
						updatedAt: new Date()
					});
				}

				// Insert movement for consumable
				await tx.insert(movement).values({
					id: uuidv4(),
					itemId: itemData.itemId,
					qty: itemData.quantity,
					unit: itemData.unit,
					eventType: 'DISTRIBUTE_IN',
					toWarehouseId,
					classification: 'KOMUNITY',
					referenceType: 'DISTRIBUTION',
					referenceId: distributionId,
					organizationId: dist.toOrganizationId,
					picId: userId,
					notes: itemData.note,
					createdAt: new Date()
				});
			}
		}

		// Update distribution status
		await tx.update(distribution)
			.set({ status: 'RECEIVED' })
			.where(eq(distribution.id, distributionId));

		// Audit Log
		await createAuditLog({
			userId,
			action: 'RECEIVE',
			tableName: 'distribution',
			recordId: distributionId,
			newValue: { status: 'RECEIVED' }
		});

		// Notification
		await createNotification({
			organizationId: dist.fromOrganizationId || undefined,
			title: 'Distribusi Diterima',
			body: `Materi dari distribusi ${distributionId} telah diterima oleh satuan tujuan.`,
			priority: 'MEDIUM',
			action: {
				type: 'DISTRIBUTION_DETAIL',
				resourceId: distributionId,
				webPath: `/distribusi/${distributionId}`
			}
		});

		return { success: true };
	});
}
