import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { item, stock } from '$lib/server/db/schema';
import { sql, eq, count, and, desc, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const search = url.searchParams.get('search') || '';
	const sort = url.searchParams.get('sort') || '';
	const offset = (page - 1) * limit;

	const queryCategoryId = url.searchParams.get('categoryId');

	const items = await db.query.item.findMany({
		where: (fields, { eq, and, sql }) => {
			const conditions = [eq(fields.type, 'CONSUMABLE'), eq(fields.isDeleted, false)];
			if (queryCategoryId) {
				conditions.push(eq(fields.categoryId, queryCategoryId));
			}
			if (search) {
				conditions.push(sql`${fields.name} LIKE ${'%' + search + '%'}`);
			}
			return and(...conditions);
		},
		orderBy: (fields, { desc, asc }) => {
			if (sort === 'asc') return [asc(fields.name)];
			if (sort === 'desc') return [desc(fields.name)];
			return [desc(fields.createdAt)];
		},
		with: {
			stocks: true
		}
	});

	const queryLabId = url.searchParams.get('laboratoriumId');
	const isRestrictedRole = ['kepalaLab', 'laboran'].includes(user.role);
	const targetLabId = isRestrictedRole
		? user.laboratorium?.id ?? 'none'
		: queryLabId && queryLabId !== '' && queryLabId !== 'all'
			? queryLabId
			: null;

	const processedItems = items
		.map((i) => {
			const filteredStocks = targetLabId
				? i.stocks.filter((s) => s.laboratoriumId === targetLabId)
				: i.stocks;

			const totalQty = filteredStocks.reduce((acc, s) => acc + s.qty, 0);
			let status = 'AMAN';
			if (totalQty === 0) {
				status = 'HABIS';
			} else if (totalQty <= (i.minStock || 0)) {
				status = 'RENDAH';
			}

			let latestActivity = i.createdAt ? new Date(i.createdAt).getTime() : 0;
			for (const s of i.stocks) {
				if (s.updatedAt) {
					const t = new Date(s.updatedAt).getTime();
					if (t > latestActivity) latestActivity = t;
				}
			}

			return {
				id: i.id,
				name: i.name,
				categoryId: i.categoryId,
				createdAt: i.createdAt,
				latestActivity,
				hideNewBadge: i.hideNewBadge,
				totalQty,
				minStock: i.minStock,
				status,
				baseUnit: i.baseUnit,
				stocks: filteredStocks.map((s) => ({
					id: s.id,
					brand: s.brand,
					variant: s.variant,
					qty: s.qty,
					laboratoriumId: s.laboratoriumId
				}))
			};
		})
		.filter((i) => !targetLabId || i.stocks.length > 0);

	if (!sort) {
		processedItems.sort((a, b) => b.latestActivity - a.latestActivity);
	} else if (sort === 'asc') {
		processedItems.sort((a, b) => a.name.localeCompare(b.name));
	} else if (sort === 'desc') {
		processedItems.sort((a, b) => b.name.localeCompare(a.name));
	}

	const totalItems = processedItems.length;
	const groupByParam = url.searchParams.get('groupBy') || url.searchParams.get('view');
	const isGroupedView = groupByParam === 'category' || groupByParam === 'grouped';
	const effectiveLimit = isGroupedView ? 1000 : limit;
	const effectiveOffset = isGroupedView ? 0 : offset;
	const totalPages = Math.ceil(totalItems / effectiveLimit);

	// Slice for pagination since we process status in memory
	const paginatedItems = processedItems.slice(effectiveOffset, effectiveOffset + effectiveLimit);

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
