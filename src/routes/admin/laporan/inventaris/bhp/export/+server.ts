import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { laboratorium } from '$lib/server/db/schema';
import { generateBhpPeriodicReport } from '$lib/server/reports/bhpPeriodicReport';
import type { RequestHandler } from './$types';

const monthsIndo = [
	'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
	'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const role = locals.user.role;
	if (!['kepalaLab', 'laboran', 'superadmin', 'koordinator'].includes(role)) {
		throw error(403, 'Forbidden');
	}

	let labId: string | null = null;
	if (['kepalaLab', 'laboran'].includes(role)) {
		const userLab = locals.user.laboratorium;
		if (!userLab || !userLab.id) {
			throw error(400, 'User tidak terasosiasi dengan laboratorium mana pun.');
		}
		labId = userLab.id;
	} else {
		labId = url.searchParams.get('labId');
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

	const mode = url.searchParams.get('mode') as 'monthly' | 'semester';
	if (mode !== 'monthly' && mode !== 'semester') {
		throw error(400, 'Mode laporan harus monthly atau semester.');
	}

	let periodStart: Date;
	let periodEnd: Date;
	let filenameTimeSegment = '';

	if (mode === 'monthly') {
		const dateStr = url.searchParams.get('date');
		if (!dateStr || isNaN(new Date(dateStr).getTime())) {
			throw error(400, 'Tanggal (date) wajib diisi dan valid untuk mode monthly.');
		}
		const dateObj = new Date(dateStr);
		const year = dateObj.getFullYear();
		const month = dateObj.getMonth();

		periodStart = new Date(year, month, 1, 0, 0, 0, 0);
		periodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

		const monthName = monthsIndo[month];
		filenameTimeSegment = `${monthName}_${year}`;
	} else {
		const startStr = url.searchParams.get('start');
		const endStr = url.searchParams.get('end');

		if (!startStr || !endStr || isNaN(new Date(startStr).getTime()) || isNaN(new Date(endStr).getTime())) {
			throw error(400, 'Tanggal awal (start) dan akhir (end) wajib diisi dan valid untuk mode semester.');
		}

		periodStart = new Date(`${startStr}T00:00:00`);
		periodEnd = new Date(`${endStr}T23:59:59.999`);

		if (periodStart > periodEnd) {
			throw error(400, 'Tanggal awal tidak boleh lebih besar dari tanggal akhir.');
		}

		filenameTimeSegment = `${startStr}_sd_${endStr}`;
	}

	const labSlug = lab.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
	const filename = `Laporan_BHP_${labSlug}_${filenameTimeSegment}.xlsx`;

	try {
		const buffer = await generateBhpPeriodicReport({
			laboratoriumId: lab.id,
			laboratoriumName: lab.name,
			mode,
			periodStart,
			periodEnd
		});

		return new Response(new Uint8Array(buffer), {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
			}
		});
	} catch (err) {
		console.error('Error generating bhp periodic report:', err);
		throw error(500, 'Gagal menghasilkan laporan BHP.');
	}
};
