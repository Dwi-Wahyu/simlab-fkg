import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	equipment,
	stock,
	movement,
	warehouse,
	item,
	lending,
	lendingItem,
	organization
} from '$lib/server/db/schema';
import { eq, and, count, sum, gte, desc, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Ambil ID organisasi berdasarkan slug dari URL
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, params.org_slug)
	});

	if (!org) {
		throw error(404, 'Organization not found');
	}

	const orgId = org.id;

	// Periode Bulan Ini
	const now = new Date();
	const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	// Ringkasan Stats (Top Cards)
	const [activeInventoryCount] = await db
		.select({ count: count() })
		.from(equipment)
		.where(eq(equipment.organizationId, orgId));

	const [warehouseStockSum] = await db
		.select({ total: sum(stock.qty) })
		.from(stock)
		.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
		.where(eq(warehouse.organizationId, orgId));

	const [damagedItemsCount] = await db
		.select({ count: count() })
		.from(equipment)
		.where(and(eq(equipment.organizationId, orgId), sql`${equipment.condition} != 'BAIK'`));

	const [monthlyMovementsCount] = await db
		.select({ count: count() })
		.from(movement)
		.where(and(eq(movement.organizationId, orgId), gte(movement.createdAt, firstDayOfMonth)));

	// Transito Stats
	const [transitoIncoming] = await db
		.select({ count: count() })
		.from(movement)
		.where(
			and(
				eq(movement.organizationId, orgId),
				eq(movement.classification, 'TRANSITO'),
				eq(movement.eventType, 'RECEIVE'),
				gte(movement.createdAt, firstDayOfMonth)
			)
		);

	const [transitoOutgoing] = await db
		.select({ count: count() })
		.from(movement)
		.where(
			and(
				eq(movement.organizationId, orgId),
				eq(movement.classification, 'TRANSITO'),
				eq(movement.eventType, 'ISSUE'),
				gte(movement.createdAt, firstDayOfMonth)
			)
		);

	const [transitoPending] = await db
		.select({ count: count() })
		.from(equipment)
		.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'TRANSIT')));

	// Komoditi Stats
	const [komoditiActive] = await db
		.select({ count: count() })
		.from(equipment)
		.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'IN_USE')));

	const [komoditiOutgoing] = await db
		.select({ count: count() })
		.from(movement)
		.where(
			and(
				eq(movement.organizationId, orgId),
				eq(movement.classification, 'KOMUNITY'),
				eq(movement.eventType, 'ISSUE'),
				gte(movement.createdAt, firstDayOfMonth)
			)
		);

	// Balkir Stats (Ready Stock/Main Inventory)
	const [balkirTotal] = await db
		.select({ count: count() })
		.from(equipment)
		.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'READY')));

	const [balkirDamaged] = await db
		.select({ count: count() })
		.from(equipment)
		.where(
			and(
				eq(equipment.organizationId, orgId),
				eq(equipment.status, 'READY'),
				sql`${equipment.condition} != 'BAIK'`
			)
		);

	// Daftar Alat Terbaru
	const recentEquipments = await db.query.equipment.findMany({
		where: (equipment, { eq }) => eq(equipment.organizationId, orgId),
		with: {
			item: true
		},
		limit: 5,
		orderBy: [desc(equipment.createdAt)]
	});

	// Transformasi data agar sesuai dengan UI
	return {
		org_slug: params.org_slug,
		summary: {
			activeInventory: Number(activeInventoryCount?.count) || 0,
			warehouseStock: Number(warehouseStockSum?.total) || 0,
			damagedItems: Number(damagedItemsCount?.count) || 0,
			monthlyMovements: Number(monthlyMovementsCount?.count) || 0
		},
		transito: {
			incoming: Number(transitoIncoming?.count) || 0,
			outgoing: Number(transitoOutgoing?.count) || 0,
			pending: Number(transitoPending?.count) || 0
		},
		komoditi: {
			active: Number(komoditiActive?.count) || 0,
			outgoing: Number(komoditiOutgoing?.count) || 0,
			damaged: 0
		},
		balkir: {
			total: Number(balkirTotal?.count) || 0,
			used: Number(komoditiActive?.count) || 0,
			ready: Number(balkirTotal?.count) || 0,
			damaged: Number(balkirDamaged?.count) || 0
		},
		recentEquipments: recentEquipments.map((e) => ({
			id: e.id,
			name: e.item.name,
			brand: e.brand,
			serialNumber: e.serialNumber,
			type: e.item.equipmentType,
			condition: e.condition,
			status: e.status
		}))
	};
};
