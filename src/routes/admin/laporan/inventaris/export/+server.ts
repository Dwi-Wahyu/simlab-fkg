import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { laboratorium } from '$lib/server/db/schema';
import { generateInventoryExport } from '$lib/server/reports/inventoryExport';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const role = locals.user.role;
	if (!['kepalaLab', 'laboran', 'superadmin'].includes(role)) {
		throw error(403, 'Forbidden');
	}

	let labId: string | null = null;

	if (['kepalaLab', 'laboran'].includes(role)) {
		const userLab = locals.user.laboratorium;
		if (!userLab || !userLab.id) {
			throw error(400, 'User tidak terasosiasi dengan laboratorium mana pun.');
		}
		labId = userLab.id;
	} else if (role === 'superadmin') {
		labId = url.searchParams.get('labId');
		if (!labId) {
			// Fallback to first lab
			const firstLab = await db.query.laboratorium.findFirst();
			if (!firstLab) {
				throw error(404, 'Laboratorium tidak ditemukan.');
			}
			labId = firstLab.id;
		}
	}

	if (!labId) {
		throw error(400, 'Laboratorium ID wajib disediakan.');
	}

	const lab = await db.query.laboratorium.findFirst({
		where: eq(laboratorium.id, labId)
	});

	if (!lab) {
		throw error(404, 'Laboratorium tidak ditemukan.');
	}

	const labSlug = lab.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
	const dateStr = new Date().toISOString().split('T')[0];

	try {
		const buffer = await generateInventoryExport(labId);

		return new Response(new Uint8Array(buffer), {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="Daftar_Inventaris_${labSlug}_${dateStr}.xlsx"`,
				'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
			}
		});
	} catch (err) {
		console.error('Error generating inventory export:', err);
		throw error(500, 'Gagal menghasilkan laporan inventaris.');
	}
};
