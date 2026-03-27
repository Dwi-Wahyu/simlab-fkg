import { db } from '$lib/server/db';
import { organization, equipment, item, stock, warehouse } from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { createDistribution } from '$lib/server/distribution';

export const load: PageServerLoad = async ({ params, locals }) => {
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, params.org_slug)
	});

	if (!org) throw error(404, 'Kesatuan tidak ditemukan');

	const organizations = await db.query.organization.findMany({
		where: ne(organization.id, org.id)
	});

	// Only fetch equipment that is READY and belongs to this org
	const availableEquipment = await db.query.equipment.findMany({
		where: and(eq(equipment.organizationId, org.id), eq(equipment.status, 'READY')),
		with: {
			item: true
		}
	});

	// Fetch warehouses for this organization to scope stock check
	const warehouses = await db.query.warehouse.findMany({
		where: eq(warehouse.organizationId, org.id),
		columns: { id: true }
	});
	const warehouseIds = warehouses.map((w) => w.id);

	// Fetch items that are CONSUMABLE and their total stock in this organization
	const consumableItems = await db.query.item.findMany({
		where: eq(item.type, 'CONSUMABLE'),
		with: {
			stocks: {
				where: (s, { inArray }) =>
					warehouseIds.length > 0 ? inArray(s.warehouseId, warehouseIds) : eq(s.warehouseId, 'none')
			}
		}
	});

	const consumableItemsWithStock = consumableItems.map((it) => ({
		...it,
		totalStock: it.stocks.reduce((acc, s) => acc + s.qty, 0)
	}));

	return {
		organizations,
		availableEquipment,
		consumableItems: consumableItemsWithStock,
		currentOrgId: org.id
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const toOrganizationId = formData.get('toOrganizationId') as string;
		const fromOrganizationId = formData.get('fromOrganizationId') as string;
		const itemsJson = formData.get('items') as string;

		if (!locals.user) throw error(401, 'Unauthorized');
		if (!toOrganizationId || !itemsJson) throw error(400, 'Data tidak lengkap');

		const items = JSON.parse(itemsJson);
		let distributionId = '';

		try {
			// Scope stock check to source organization
			const warehouses = await db.query.warehouse.findMany({
				where: eq(warehouse.organizationId, fromOrganizationId),
				columns: { id: true }
			});
			const warehouseIds = warehouses.map((w) => w.id);

			// Basic server-side stock check
			for (const it of items) {
				if (it.itemId) {
					const stocks =
						warehouseIds.length > 0
							? await db.query.stock.findMany({
									where: (s, { and, eq, inArray }) =>
										and(eq(s.itemId, it.itemId), inArray(s.warehouseId, warehouseIds))
								})
							: [];
					const total = stocks.reduce((acc, s) => acc + s.qty, 0);
					if (total < it.quantity) {
						return {
							success: false,
							message: `Stok tidak mencukupi di kesatuan pengirim. Tersedia: ${total}`
						};
					}
				}
			}

			distributionId = await createDistribution({
				fromOrganizationId,
				toOrganizationId,
				requestedBy: locals.user.id,
				items: items.map((it: any) => ({
					equipmentId: it.equipmentId || undefined,
					itemId: it.itemId || undefined,
					quantity: Number(it.quantity),
					unit: it.unit || undefined,
					note: it.note || undefined
				}))
			});
		} catch (e) {
			console.error(e);
			return {
				success: false,
				message: e instanceof Error ? e.message : 'Gagal membuat distribusi'
			};
		}

		if (distributionId) {
			throw redirect(303, `/${locals.user.organization.slug}/distribusi/${distributionId}`);
		}
	}
};
