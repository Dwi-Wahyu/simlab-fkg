import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { item, stock } from '$lib/server/db/schema';
import { sql, eq, count, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const offset = (page - 1) * limit;

	const items = await db.query.item.findMany({
		where: (fields, { eq, and, sql }) => {
			const baseWhere = eq(fields.type, 'CONSUMABLE');
			if (search) {
				return and(baseWhere, sql`${fields.name} LIKE ${'%' + search + '%'}`);
			}
			return baseWhere;
		},
		with: {
			stocks: true
		}
	});

	const processedItems = items.map((i) => {
		const totalQty = i.stocks.reduce((acc, s) => acc + s.qty, 0);
		let status = 'AMAN';
		if (totalQty === 0) {
			status = 'HABIS';
		} else if (totalQty <= (i.minStock || 0)) {
			status = 'RENDAH';
		}

		return {
			id: i.id,
			name: i.name,
			totalQty,
			minStock: i.minStock,
			status,
			baseUnit: i.baseUnit
		};
	});

	const totalItems = processedItems.length;
	const totalPages = Math.ceil(totalItems / limit);
	
	// Slice for pagination since we process status in memory
	// In production with huge data, this logic should move to SQL
	const paginatedItems = processedItems.slice(offset, offset + limit);

	const aman = processedItems.filter((i) => i.status === 'AMAN').length;
	const rendah = processedItems.filter((i) => i.status === 'RENDAH').length;
	const habis = processedItems.filter((i) => i.status === 'HABIS').length;

	return json({
		summary: [
			{ label: 'Total Bahan', value: totalItems, color: 'text-blue-600', icon: 'Database' },
			{ label: 'Stok Aman', value: aman, color: 'text-green-600', icon: 'ShieldCheck' },
			{ label: 'Stok Rendah', value: rendah, color: 'text-yellow-600', icon: 'AlertCircle' },
			{ label: 'Stok Habis', value: habis, color: 'text-red-600', icon: 'Trash2' }
		],
		items: paginatedItems,
		pagination: {
			totalItems,
			totalPages,
			currentPage: page,
			limit
		}
	});
};
