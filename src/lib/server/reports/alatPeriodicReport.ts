import { eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { db } from '$lib/server/db';
import { equipment } from '$lib/server/db/schema';

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

export async function generateAlatPeriodicReport(params: ReportParams): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Laporan Alat');

	// Query all equipment records for the given laboratory (including soft-deleted ones)
	const equipmentRows = await db.query.equipment.findMany({
		where: eq(equipment.laboratoriumId, params.laboratoriumId),
		with: {
			item: true
		}
	});

	// Group equipment by item
	const itemMap = new Map<
		string,
		{
			item: any;
			equipments: typeof equipmentRows;
		}
	>();

	for (const eqp of equipmentRows) {
		if (!eqp.item || eqp.item.type !== 'ASSET') continue;
		const itemId = eqp.itemId;
		if (!itemMap.has(itemId)) {
			itemMap.set(itemId, { item: eqp.item, equipments: [] });
		}
		itemMap.get(itemId)!.equipments.push(eqp);
	}

	const reportData: Array<{
		name: string;
		brand: string;
		type: string;
		baseUnit: string;
		totalAwal: number;
		penambahan: number;
		pengurangan: number;
		totalAkhir: number;
		kondisiBaik: number;
		kondisiRusak: number;
		tersedia: number;
		sedangDipinjam: number;
	}> = [];

	const pStart = params.periodStart.getTime();
	const pEnd = params.periodEnd.getTime();

	for (const { item: itemInfo, equipments } of itemMap.values()) {
		let totalAwal = 0;
		let penambahan = 0;
		let pengurangan = 0;

		const activeAtEnd: typeof equipments = [];

		for (const eqp of equipments) {
			const createdAtTime = new Date(eqp.createdAt).getTime();
			const isDeleted = eqp.isDeleted;
			const deletedAtTime = eqp.deletedAt ? new Date(eqp.deletedAt).getTime() : null;

			// totalAwal = count( createdAt < periodStart AND (isDeleted = false OR deletedAt >= periodStart) )
			if (
				createdAtTime < pStart &&
				(!isDeleted || (deletedAtTime !== null && deletedAtTime >= pStart))
			) {
				totalAwal++;
			}

			// penambahan = count( createdAt BETWEEN periodStart AND periodEnd )
			if (createdAtTime >= pStart && createdAtTime <= pEnd) {
				penambahan++;
			}

			// pengurangan = count( isDeleted = true AND deletedAt BETWEEN periodStart AND periodEnd )
			if (isDeleted && deletedAtTime !== null && deletedAtTime >= pStart && deletedAtTime <= pEnd) {
				pengurangan++;
			}

			// active at periodEnd: createdAt <= periodEnd AND (isDeleted = false OR deletedAt > periodEnd)
			if (
				createdAtTime <= pEnd &&
				(!isDeleted || (deletedAtTime !== null && deletedAtTime > pEnd))
			) {
				activeAtEnd.push(eqp);
			}
		}

		const totalAkhir = totalAwal + penambahan - pengurangan;

		// Skip items with no count in any metric
		if (totalAwal === 0 && penambahan === 0 && pengurangan === 0 && totalAkhir === 0) {
			continue;
		}

		let kondisiBaik = 0;
		let kondisiRusak = 0;
		let tersedia = 0;
		let sedangDipinjam = 0;

		for (const eqp of activeAtEnd) {
			if (eqp.condition === 'BAIK') kondisiBaik++;
			if (eqp.condition === 'RUSAK') kondisiRusak++;
			if (eqp.status === 'READY') tersedia++;
			if (eqp.status === 'IN_USE' || eqp.status === 'MAINTENANCE') sedangDipinjam++;
		}

		// Extract unique brands and types/variants
		const brands = Array.from(
			new Set(equipments.map((e) => e.brand).filter((b): b is string => Boolean(b && b.trim())))
		).join(', ');

		const variants = Array.from(
			new Set(equipments.map((e) => e.variant).filter((v): v is string => Boolean(v && v.trim())))
		);
		if (itemInfo.equipmentType && !variants.includes(itemInfo.equipmentType)) {
			variants.push(itemInfo.equipmentType);
		}
		const typesStr = variants.join(', ');

		reportData.push({
			name: itemInfo.name,
			brand: brands || '-',
			type: typesStr || '-',
			baseUnit: itemInfo.baseUnit || 'UNIT',
			totalAwal,
			penambahan,
			pengurangan,
			totalAkhir,
			kondisiBaik,
			kondisiRusak,
			tersedia,
			sedangDipinjam
		});
	}

	// Sort alphabetically by name
	reportData.sort((a, b) => a.name.localeCompare(b.name));

	// Write Title & Context Header
	const periodStr = formatPeriodString(params.mode, params.periodStart, params.periodEnd);

	worksheet.mergeCells('A1:M1');
	const titleCell = worksheet.getCell('A1');
	titleCell.value = 'Laporan Inventaris Alat';
	titleCell.font = { name: 'Calibri', size: 14, bold: true };
	titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

	worksheet.mergeCells('A2:M2');
	const labCell = worksheet.getCell('A2');
	labCell.value = `Laboratorium: ${params.laboratoriumName}`;
	labCell.font = { name: 'Calibri', size: 11, bold: true };
	labCell.alignment = { vertical: 'middle', horizontal: 'left' };

	worksheet.mergeCells('A3:M3');
	const periodCell = worksheet.getCell('A3');
	periodCell.value = `Periode: ${periodStr}`;
	periodCell.font = { name: 'Calibri', size: 11 };
	periodCell.alignment = { vertical: 'middle', horizontal: 'left' };

	// Header Row (Row 5)
	const headers = [
		'No',
		'Nama Alat',
		'Merk',
		'Tipe',
		'Satuan',
		'Total Awal',
		'Penambahan',
		'Pengurangan',
		'Total Akhir (Aset)',
		'Kondisi Baik',
		'Kondisi Rusak',
		'Tersedia',
		'Sedang Dipinjam'
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
		cell.alignment = {
			vertical: 'middle',
			horizontal: 'center',
			wrapText: true
		};
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
		row.getCell(6).value = item.totalAwal;
		row.getCell(7).value = item.penambahan;
		row.getCell(8).value = item.pengurangan;
		row.getCell(9).value = item.totalAkhir;
		row.getCell(10).value = item.kondisiBaik;
		row.getCell(11).value = item.kondisiRusak;
		row.getCell(12).value = item.tersedia;
		row.getCell(13).value = item.sedangDipinjam;

		for (let i = 1; i <= 13; i++) {
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

	// Footnote
	currentRow++; // empty row
	const footnoteRowIndex = currentRow + 1;
	worksheet.mergeCells(`A${footnoteRowIndex}:M${footnoteRowIndex}`);
	const footnoteCell = worksheet.getCell(`A${footnoteRowIndex}`);
	footnoteCell.value =
		'*Kondisi & status alat merefleksikan data terkini, bukan snapshot historis per akhir periode.';
	footnoteCell.font = {
		name: 'Calibri',
		size: 9,
		italic: true,
		color: { argb: 'FF666666' }
	};

	// Column Widths
	worksheet.getColumn(1).width = 6;
	worksheet.getColumn(2).width = 30;
	worksheet.getColumn(3).width = 20;
	worksheet.getColumn(4).width = 20;
	worksheet.getColumn(5).width = 12;
	worksheet.getColumn(6).width = 14;
	worksheet.getColumn(7).width = 14;
	worksheet.getColumn(8).width = 14;
	worksheet.getColumn(9).width = 18;
	worksheet.getColumn(10).width = 14;
	worksheet.getColumn(11).width = 14;
	worksheet.getColumn(12).width = 16;
	worksheet.getColumn(13).width = 16;

	// Frozen pane
	worksheet.views = [{ state: 'frozen', ySplit: 5 }];

	const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
	return buffer;
}
