import ExcelJS from 'exceljs';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { equipment, stock } from '$lib/server/db/schema';

export async function generateInventoryExport(laboratoriumId: string): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();

	// ==========================================
	// 1. ALAT (ASSET) SHEET
	// ==========================================
	const sheetAlat = workbook.addWorksheet('Alat');
	sheetAlat.columns = [
		{ header: 'NO', key: 'no', width: 6 },
		{ header: 'URAIAN/NAMA BARANG', key: 'name', width: 35 },
		{ header: 'MEREK', key: 'brand', width: 20 },
		{ header: 'TIPE', key: 'variant', width: 20 },
		{ header: 'JUMLAH TERSEDIA', key: 'qty', width: 18 },
		{ header: 'KONDISI', key: 'condition', width: 15 }
	];

	// Style header row
	const headerAlat = sheetAlat.getRow(1);
	headerAlat.font = { bold: true, color: { argb: 'FFFFFFFF' } };
	headerAlat.eachCell((cell) => {
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FF2D5A47' } // Deep green matching FKG theme
		};
		cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
		cell.border = {
			top: { style: 'thin' },
			left: { style: 'thin' },
			bottom: { style: 'thin' },
			right: { style: 'thin' }
		};
	});
	headerAlat.height = 30;

	// Query equipment
	const equipmentList = await db.query.equipment.findMany({
		where: eq(equipment.laboratoriumId, laboratoriumId),
		with: {
			item: true
		}
	});

	const assets = equipmentList.filter((e) => e.item && e.item.type === 'ASSET');

	// Group assets by itemId, then by (brand, variant, condition)
	const groupedAssets: Record<string, {
		name: string;
		baseUnit: string;
		subRows: Array<{
			brand: string;
			variant: string;
			condition: string;
			count: number;
		}>;
	}> = {};

	for (const eqp of assets) {
		const itemId = eqp.itemId;
		if (!groupedAssets[itemId]) {
			groupedAssets[itemId] = {
				name: eqp.item.name,
				baseUnit: eqp.item.baseUnit,
				subRows: []
			};
		}

		const brandStr = eqp.brand || '-';
		const variantStr = eqp.variant || '-';
		const conditionStr = eqp.condition || 'BAIK';

		let subRow = groupedAssets[itemId].subRows.find(
			(r) => r.brand === brandStr && r.variant === variantStr && r.condition === conditionStr
		);

		if (!subRow) {
			subRow = {
				brand: brandStr,
				variant: variantStr,
				condition: conditionStr,
				count: 0
			};
			groupedAssets[itemId].subRows.push(subRow);
		}

		subRow.count += 1;
	}

	const sortedAssetIds = Object.keys(groupedAssets).sort((a, b) =>
		groupedAssets[a].name.localeCompare(groupedAssets[b].name)
	);

	let rowNum = 2;
	let index = 1;

	for (const itemId of sortedAssetIds) {
		const itemGroup = groupedAssets[itemId];
		const startRow = rowNum;
		const rowsToAdd = itemGroup.subRows.length > 0
			? itemGroup.subRows
			: [{ brand: '-', variant: '-', condition: 'BAIK', count: 0 }];

		for (const sub of rowsToAdd) {
			const addedRow = sheetAlat.addRow({
				no: index,
				name: itemGroup.name,
				brand: sub.brand,
				variant: sub.variant,
				qty: sub.count,
				condition: sub.condition
			});

			addedRow.eachCell((cell) => {
				cell.border = {
					top: { style: 'thin' },
					left: { style: 'thin' },
					bottom: { style: 'thin' },
					right: { style: 'thin' }
				};
				cell.alignment = { vertical: 'middle', horizontal: 'center' };
			});

			addedRow.getCell('name').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
			rowNum++;
		}

		const endRow = rowNum - 1;
		if (endRow > startRow) {
			sheetAlat.mergeCells(`A${startRow}:A${endRow}`);
			sheetAlat.mergeCells(`B${startRow}:B${endRow}`);

			sheetAlat.getCell(`A${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
			sheetAlat.getCell(`B${startRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
		}
		index++;
	}


	// ==========================================
	// 2. BAHAN (CONSUMABLE) SHEET
	// ==========================================
	const sheetBahan = workbook.addWorksheet('Bahan');
	sheetBahan.columns = [
		{ header: 'NO', key: 'no', width: 6 },
		{ header: 'URAIAN/NAMA BARANG', key: 'name', width: 35 },
		{ header: 'MEREK', key: 'brand', width: 20 },
		{ header: 'TIPE', key: 'variant', width: 20 },
		{ header: 'JUMLAH TERSEDIA', key: 'qty', width: 18 },
		{ header: 'SATUAN', key: 'unit', width: 12 },
		{ header: 'KONDISI', key: 'condition', width: 15 }
	];

	// Style header row
	const headerBahan = sheetBahan.getRow(1);
	headerBahan.font = { bold: true, color: { argb: 'FFFFFFFF' } };
	headerBahan.eachCell((cell) => {
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
	headerBahan.height = 30;

	// Query stocks
	const stockList = await db.query.stock.findMany({
		where: eq(stock.laboratoriumId, laboratoriumId),
		with: {
			item: true
		}
	});

	const groupedBhp: Record<string, {
		name: string;
		baseUnit: string;
		subRows: Array<{
			brand: string;
			variant: string;
			condition: string;
			qty: number;
		}>;
	}> = {};

	for (const stk of stockList) {
		if (!stk.item || stk.item.type !== 'CONSUMABLE') continue;
		const itemId = stk.itemId;
		if (!groupedBhp[itemId]) {
			groupedBhp[itemId] = {
				name: stk.item.name,
				baseUnit: stk.item.baseUnit,
				subRows: []
			};
		}

		groupedBhp[itemId].subRows.push({
			brand: stk.brand || '-',
			variant: stk.variant || '-',
			condition: stk.condition || 'baik',
			qty: stk.qty
		});
	}

	const sortedBhpIds = Object.keys(groupedBhp).sort((a, b) =>
		groupedBhp[a].name.localeCompare(groupedBhp[b].name)
	);

	rowNum = 2;
	index = 1;

	for (const itemId of sortedBhpIds) {
		const itemGroup = groupedBhp[itemId];
		const startRow = rowNum;
		const rowsToAdd = itemGroup.subRows.length > 0
			? itemGroup.subRows
			: [{ brand: '-', variant: '-', condition: 'baik', qty: 0 }];

		for (const sub of rowsToAdd) {
			const addedRow = sheetBahan.addRow({
				no: index,
				name: itemGroup.name,
				brand: sub.brand,
				variant: sub.variant,
				qty: sub.qty,
				unit: itemGroup.baseUnit,
				condition: sub.condition
			});

			addedRow.eachCell((cell) => {
				cell.border = {
					top: { style: 'thin' },
					left: { style: 'thin' },
					bottom: { style: 'thin' },
					right: { style: 'thin' }
				};
				cell.alignment = { vertical: 'middle', horizontal: 'center' };
			});

			addedRow.getCell('name').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
			rowNum++;
		}

		const endRow = rowNum - 1;
		if (endRow > startRow) {
			sheetBahan.mergeCells(`A${startRow}:A${endRow}`);
			sheetBahan.mergeCells(`B${startRow}:B${endRow}`);
			sheetBahan.mergeCells(`F${startRow}:F${endRow}`);

			sheetBahan.getCell(`A${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
			sheetBahan.getCell(`B${startRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
			sheetBahan.getCell(`F${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
		}
		index++;
	}

	const buffer = await workbook.xlsx.writeBuffer() as Buffer;
	return buffer;
}
