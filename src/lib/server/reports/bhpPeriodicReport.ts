import ExcelJS from 'exceljs';
import { eq, inArray, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { movement, stock } from '$lib/server/db/schema';

export interface ReportParams {
	laboratoriumId: string;
	laboratoriumName: string;
	mode: 'monthly' | 'semester';
	periodStart: Date;
	periodEnd: Date;
}

function formatPeriodString(mode: 'monthly' | 'semester', start: Date, end: Date): string {
	const monthsIndo = [
		'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
		'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
	];
	if (mode === 'monthly') {
		const monthName = monthsIndo[start.getMonth()];
		return `${monthName} ${start.getFullYear()}`;
	} else {
		const monthsShort = [
			'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
			'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
		];
		const startStr = `${start.getDate()} ${monthsShort[start.getMonth()]} ${start.getFullYear()}`;
		const endStr = `${end.getDate()} ${monthsShort[end.getMonth()]} ${end.getFullYear()}`;
		return `${startStr} s/d ${endStr}`;
	}
}

function signedQty(m: { eventType: string; qty: number; direction: 'IN' | 'OUT' | null }): number {
	if (m.eventType === 'RECEIVE') return m.qty;
	if (m.eventType === 'ISSUE') return -m.qty;
	if (m.direction === 'IN') return m.qty;
	if (m.direction === 'OUT') return -m.qty;
	return 0;
}

export async function generateBhpPeriodicReport(params: ReportParams): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Laporan BHP');

	// Query movements & stock entries for the specified laboratory
	const [movementRows, stockRows] = await Promise.all([
		db.query.movement.findMany({
			where: and(
				eq(movement.laboratoriumId, params.laboratoriumId),
				inArray(movement.eventType, ['RECEIVE', 'ISSUE', 'ADJUSTMENT'])
			),
			with: {
				item: true
			}
		}),
		db.query.stock.findMany({
			where: eq(stock.laboratoriumId, params.laboratoriumId)
		})
	]);

	// Map stocks by itemId
	const stockMap = new Map<string, typeof stockRows>();
	for (const s of stockRows) {
		if (!s.itemId) continue;
		if (!stockMap.has(s.itemId)) {
			stockMap.set(s.itemId, []);
		}
		stockMap.get(s.itemId)!.push(s);
	}

	// Group movements by itemId
	const itemMap = new Map<
		string,
		{
			item: any;
			movements: typeof movementRows;
		}
	>();

	for (const m of movementRows) {
		if (!m.item || m.item.type !== 'CONSUMABLE' || !m.itemId) continue;
		const itemId = m.itemId;
		if (!itemMap.has(itemId)) {
			itemMap.set(itemId, { item: m.item, movements: [] });
		}
		itemMap.get(itemId)!.movements.push(m);
	}

	const reportData: Array<{
		name: string;
		brand: string;
		type: string;
		baseUnit: string;
		stokAwal: number;
		barangMasuk: number;
		terpakaiKeluar: number;
		stokAkhir: number;
	}> = [];

	const pStart = params.periodStart.getTime();
	const pEnd = params.periodEnd.getTime();

	for (const { item: itemInfo, movements } of itemMap.values()) {
		let stokAwal = 0;
		let barangMasuk = 0;
		let terpakaiKeluar = 0;

		for (const m of movements) {
			const mTime = new Date(m.createdAt).getTime();

			if (mTime < pStart) {
				stokAwal += signedQty(m);
			} else if (mTime >= pStart && mTime <= pEnd) {
				if (m.eventType === 'RECEIVE' || (m.eventType === 'ADJUSTMENT' && m.direction === 'IN')) {
					barangMasuk += m.qty;
				} else if (m.eventType === 'ISSUE' || (m.eventType === 'ADJUSTMENT' && m.direction === 'OUT')) {
					terpakaiKeluar += m.qty;
				}
			}
		}

		const stokAkhir = stokAwal + barangMasuk - terpakaiKeluar;

		// Skip items with no count in any metric
		if (stokAwal === 0 && barangMasuk === 0 && terpakaiKeluar === 0 && stokAkhir === 0) {
			continue;
		}

		// Get brand and variant from stock entries of this item
		const itemStocks = stockMap.get(itemInfo.id) || [];
		const brands = Array.from(
			new Set(itemStocks.map((s) => s.brand).filter((b): b is string => Boolean(b && b.trim())))
		).join(', ');
		const variants = Array.from(
			new Set(itemStocks.map((s) => s.variant).filter((v): v is string => Boolean(v && v.trim())))
		).join(', ');

		reportData.push({
			name: itemInfo.name,
			brand: brands || '-',
			type: variants || '-',
			baseUnit: itemInfo.baseUnit || 'PCS',
			stokAwal,
			barangMasuk,
			terpakaiKeluar,
			stokAkhir
		});
	}

	// Sort alphabetically by name
	reportData.sort((a, b) => a.name.localeCompare(b.name));

	// Write Title & Context Header
	const periodStr = formatPeriodString(params.mode, params.periodStart, params.periodEnd);

	worksheet.mergeCells('A1:I1');
	const titleCell = worksheet.getCell('A1');
	titleCell.value = 'Laporan Stok Bahan Habis Pakai';
	titleCell.font = { name: 'Calibri', size: 14, bold: true };
	titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

	worksheet.mergeCells('A2:I2');
	const labCell = worksheet.getCell('A2');
	labCell.value = `Laboratorium: ${params.laboratoriumName}`;
	labCell.font = { name: 'Calibri', size: 11, bold: true };
	labCell.alignment = { vertical: 'middle', horizontal: 'left' };

	worksheet.mergeCells('A3:I3');
	const periodCell = worksheet.getCell('A3');
	periodCell.value = `Periode: ${periodStr}`;
	periodCell.font = { name: 'Calibri', size: 11 };
	periodCell.alignment = { vertical: 'middle', horizontal: 'left' };

	// Header Row (Row 5)
	const headers = [
		'No',
		'Nama Bahan (BHP)',
		'Merk',
		'Tipe',
		'Satuan',
		'Stok Awal',
		'Barang Masuk',
		'Terpakai / Keluar',
		'Stok Akhir'
	];

	const headerRow = worksheet.getRow(5);
	headerRow.height = 30;
	headers.forEach((headerText, index) => {
		const cell = headerRow.getCell(index + 1);
		cell.value = headerText;
		cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FF2D5A47' }
		};
		cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
		cell.border = {
			top: { style: 'thin' },
			left: { style: 'thin' },
			bottom: { style: 'thin' },
			right: { style: 'thin' }
		};
	});

	// Data Rows
	let currentRow = 6;
	reportData.forEach((item, index) => {
		const row = worksheet.getRow(currentRow);
		row.getCell(1).value = index + 1;
		row.getCell(2).value = item.name;
		row.getCell(3).value = item.brand;
		row.getCell(4).value = item.type;
		row.getCell(5).value = item.baseUnit;
		row.getCell(6).value = item.stokAwal;
		row.getCell(7).value = item.barangMasuk;
		row.getCell(8).value = item.terpakaiKeluar;
		row.getCell(9).value = item.stokAkhir;

		for (let i = 1; i <= 9; i++) {
			const cell = row.getCell(i);
			cell.font = { name: 'Calibri', size: 11 };
			cell.border = {
				top: { style: 'thin' },
				left: { style: 'thin' },
				bottom: { style: 'thin' },
				right: { style: 'thin' }
			};
			if (i === 1 || i === 5) {
				cell.alignment = { vertical: 'middle', horizontal: 'center' };
			} else if (i === 2 || i === 3 || i === 4) {
				cell.alignment = { vertical: 'middle', horizontal: 'left' };
			} else {
				cell.alignment = { vertical: 'middle', horizontal: 'center' };
			}
		}
		currentRow++;
	});

	// Column Widths
	worksheet.getColumn(1).width = 6;
	worksheet.getColumn(2).width = 30;
	worksheet.getColumn(3).width = 20;
	worksheet.getColumn(4).width = 20;
	worksheet.getColumn(5).width = 12;
	worksheet.getColumn(6).width = 14;
	worksheet.getColumn(7).width = 16;
	worksheet.getColumn(8).width = 18;
	worksheet.getColumn(9).width = 14;

	// Frozen pane
	worksheet.views = [{ state: 'frozen', ySplit: 5 }];

	const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
	return buffer;
}
