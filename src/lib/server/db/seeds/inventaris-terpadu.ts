/**
 * One-off seeder: import "DAFTAR_INVENTARIS_ALAT_DAN_BAHAN_LAB_TERPADU.xlsx"
 * into the Terpadu lab ("Terpadu (lt 4)").
 *
 * Sibling script to `inventaris-preparasi.ts` and `inventaris-dfrl.ts`.
 * Designed specifically for the layout and content of Lab Terpadu's inventory spreadsheet:
 *  - "Alat " sheet (ASSET): Creates `item` catalog rows (type='ASSET', baseUnit='UNIT')
 *    and individual `equipment` rows per physical unit. Handles smart storage location
 *    splitting (e.g., partial quantities stored in sub-boxes/toolboxes described in Keterangan,
 *    such as "20 buah dimasukkan di toolbox biru dan hijau" out of 42 total units).
 *  - "Bahan " sheet (CONSUMABLE): Creates `item` catalog rows (type='CONSUMABLE'),
 *    upserts `stock` rows per (itemId, brand, variant), and creates `stock_batch` rows.
 *    Handles section headers (e.g. "Blok Oromaksilofasial (Kelas Regular)") as equipmentCategory.
 *    Handles unit & package size disambiguation (e.g., "botol 250ml", "800ml", "1kg/bungkus")
 *    by mapping baseUnit to BOTOL/BOX/PCS and storing specific package volume in `variant` and `notes`.
 *  - Disambiguates duplicate Gypsum entries (Gypsum Putih, Gypsum Biru, Gypsum 1kg/bungkus).
 *  - Ensures all item names are registered in the catalog even if quantity is unreadable or 0.
 *
 * USAGE
 *   bun run src/lib/server/db/seeds/inventaris-terpadu.ts [--dry-run] [--no-reset] [path/to/file.xlsx]
 */

import { config } from 'dotenv';
config();

import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import path from 'path';
import XLSX from 'xlsx';
import * as authSchema from '../auth.schema';
import * as schema from '../schema';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, {
	schema: { ...schema, ...authSchema },
	mode: 'default'
});

const LAB_SLUG = 'terpadu';
const DRY_RUN = process.argv.includes('--dry-run');
const NO_RESET = process.argv.includes('--no-reset');

const FILE_PATH = path.resolve(
	process.argv.find((a) => a.endsWith('.xlsx')) ??
		'src/lib/server/db/seeds/data/DAFTAR_INVENTARIS_ALAT_DAN_BAHAN_LAB_TERPADU.xlsx'
);

// ─── Review log ────────────────────────────────────────────────────────────
type ReviewEntry = {
	sheet: string;
	item: string;
	brand: string | null;
	variant: string | null;
	issue: string;
};
const reviewLog: ReviewEntry[] = [];

function logReview(
	sheet: string,
	item: string,
	brand: string | null,
	variant: string | null,
	issue: string
) {
	reviewLog.push({ sheet, item, brand, variant, issue });
}

// ─── Helper Functions ──────────────────────────────────────────────────────
function stripInvisible(s: string): string {
	return s
		.replace(/\p{Cf}/gu, '')
		.replace(/\u00a0/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function clean(v: string | number | null | undefined): string | null {
	if (v === null || v === undefined) return null;
	const s = stripInvisible(String(v));
	return s === '' ? null : s;
}

function sheetToGrid(ws: XLSX.WorkSheet): (string | number | Date | null)[][] {
	const range = XLSX.utils.decode_range(ws['!ref']!);
	const grid: (string | number | Date | null)[][] = [];
	for (let r = range.s.r; r <= range.e.r; r++) {
		const row: (string | number | Date | null)[] = [];
		for (let c = range.s.c; c <= range.e.c; c++) {
			const cell = ws[XLSX.utils.encode_cell({ r, c })];
			row.push(cell ? cell.v : null);
		}
		grid.push(row);
	}
	for (const merge of ws['!merges'] ?? []) {
		const topLeft = grid[merge.s.r][merge.s.c];
		for (let r = merge.s.r; r <= merge.e.r; r++) {
			for (let c = merge.s.c; c <= merge.e.c; c++) {
				grid[r][c] = topLeft;
			}
		}
	}
	return grid;
}

// ─── Category Helper ───────────────────────────────────────────────────────
const categoryCache = new Map<string, string>(); // normalizedName -> categoryId

async function getOrCreateCategory(db: any, categoryName: string): Promise<string> {
	const normalizedName = stripInvisible(categoryName);
	const cacheKey = normalizedName.toLowerCase();

	if (categoryCache.has(cacheKey)) {
		return categoryCache.get(cacheKey)!;
	}

	const existing = await db.query.equipmentCategory.findFirst({
		where: (table: any, { sql }: any) =>
			sql`LOWER(TRIM(${table.name})) = LOWER(${normalizedName})`
	});

	if (existing) {
		categoryCache.set(cacheKey, existing.id);
		return existing.id;
	}

	if (DRY_RUN) {
		const dummyId = `dry-run-cat-${crypto.randomUUID()}`;
		categoryCache.set(cacheKey, dummyId);
		return dummyId;
	}

	const newId = crypto.randomUUID();
	await db.insert(schema.equipmentCategory).values({
		id: newId,
		name: normalizedName,
		createdAt: new Date()
	});

	categoryCache.set(cacheKey, newId);
	return newId;
}

// Map Bahan Unit & Package Size
function mapBahanUnit(satuanRaw: string | null): {
	baseUnit: 'PCS' | 'BOX' | 'METER' | 'ROLL' | 'UNIT' | 'BOTOL';
	variantExtra: string | null;
} {
	if (!satuanRaw) return { baseUnit: 'PCS', variantExtra: null };
	const raw = satuanRaw.trim();
	const lower = raw.toLowerCase();

	if (lower.includes('botol')) {
		const sizeMatch = raw.match(/(\d+\s*(?:ml|gr|gram|l|liter))/i);
		return { baseUnit: 'BOTOL', variantExtra: sizeMatch ? sizeMatch[1] : null };
	}
	if (
		lower.includes('liter') ||
		lower.includes('800ml') ||
		lower.includes('400ml') ||
		lower.includes('250ml') ||
		lower.includes('500ml')
	) {
		return { baseUnit: 'BOTOL', variantExtra: raw };
	}
	if (lower.includes('box')) return { baseUnit: 'BOX', variantExtra: null };
	if (lower.includes('roll')) return { baseUnit: 'ROLL', variantExtra: null };
	if (lower.includes('meter')) return { baseUnit: 'METER', variantExtra: null };
	if (lower.includes('bungkus') || lower.includes('kantong')) {
		const sizeMatch =
			raw.match(/(\d+\s*(?:kg|g|gram|gr)\/bungkus)/i) || raw.match(/(\d+\s*(?:kg|g|gram|gr))/i);
		return { baseUnit: 'BOX', variantExtra: sizeMatch ? sizeMatch[1] : null };
	}
	if (
		lower.includes('pack') ||
		lower.includes('pcs') ||
		lower.includes('buah') ||
		lower.includes('syringe') ||
		lower.includes('set')
	) {
		return { baseUnit: 'PCS', variantExtra: null };
	}
	return { baseUnit: 'PCS', variantExtra: raw };
}

// ─── Item Catalog Upsert ───────────────────────────────────────────────────
const itemCache = new Map<string, string>(); // key: `${type}:${normalizedName}` -> itemId

async function upsertItem(
	db: any,
	params: {
		name: string;
		type: 'ASSET' | 'CONSUMABLE';
		baseUnit: 'PCS' | 'BOX' | 'METER' | 'ROLL' | 'UNIT' | 'BOTOL';
		categoryId?: string | null;
		equipmentType?: 'DENTAL_UNIT' | 'LAB_INSTRUMENT' | 'IMAGING' | 'FURNITURE' | 'INSTRUMENT' | 'EQUIPMENT';
		description?: string | null;
	}
): Promise<string> {
	const normalizedName = stripInvisible(params.name);
	const cacheKey = `${params.type}:${normalizedName.toLowerCase()}`;

	if (itemCache.has(cacheKey)) {
		return itemCache.get(cacheKey)!;
	}

	// Find existing item in DB by name and type
	const existing = await db.query.item.findFirst({
		where: (table: any, { and, eq, sql }: any) =>
			and(
				eq(table.type, params.type),
				eq(table.isDeleted, 0),
				sql`LOWER(TRIM(${table.name})) = LOWER(${normalizedName})`
			)
	});

	if (existing) {
		// Update categoryId if provided and currently null
		if (params.categoryId && !existing.categoryId && !DRY_RUN) {
			await db
				.update(schema.item)
				.set({ categoryId: params.categoryId })
				.where(eq(schema.item.id, existing.id));
		}
		itemCache.set(cacheKey, existing.id);
		return existing.id;
	}

	if (DRY_RUN) {
		const dummyId = `dry-run-item-${crypto.randomUUID()}`;
		itemCache.set(cacheKey, dummyId);
		return dummyId;
	}

	const newId = crypto.randomUUID();
	await db.insert(schema.item).values({
		id: newId,
		name: normalizedName,
		type: params.type,
		categoryId: params.categoryId ?? null,
		equipmentType: params.equipmentType ?? (params.type === 'ASSET' ? 'INSTRUMENT' : null),
		baseUnit: params.baseUnit,
		description: params.description ?? null,
		minStock: 0,
		createdAt: new Date()
	});

	itemCache.set(cacheKey, newId);
	return newId;
}

// ─── Stock & Batch Helper for Consumables ──────────────────────────────────
async function upsertStockAndBatch(
	db: any,
	params: {
		itemId: string;
		laboratoriumId: string;
		brand: string | null;
		variant: string | null;
		qty: number;
		condition: string;
		notes: string | null;
	}
): Promise<string> {
	if (DRY_RUN) return `dry-run-stock-${crypto.randomUUID()}`;

	const normalizedBrand = clean(params.brand);
	const normalizedVariant = clean(params.variant);

	// Find existing stock row by (itemId, labId, brand, variant)
	const existingStock = await db.query.stock.findFirst({
		where: (table: any, { and, eq, isNull }: any) =>
			and(
				eq(table.itemId, params.itemId),
				eq(table.laboratoriumId, params.laboratoriumId),
				normalizedBrand ? eq(table.brand, normalizedBrand) : isNull(table.brand),
				normalizedVariant ? eq(table.variant, normalizedVariant) : isNull(table.variant)
			)
	});

	let stockId: string;

	if (existingStock) {
		stockId = existingStock.id;
		await db
			.update(schema.stock)
			.set({
				qty: existingStock.qty + params.qty,
				updatedAt: new Date()
			})
			.where(eq(schema.stock.id, stockId));
	} else {
		stockId = crypto.randomUUID();
		await db.insert(schema.stock).values({
			id: stockId,
			itemId: params.itemId,
			laboratoriumId: params.laboratoriumId,
			qty: params.qty,
			brand: normalizedBrand,
			variant: normalizedVariant,
			condition: params.condition || 'baik',
			updatedAt: new Date()
		});
	}

	// Insert stock_batch row for audit & batch tracking
	await db.insert(schema.stockBatch).values({
		id: crypto.randomUUID(),
		stockId: stockId,
		qty: params.qty,
		initialQty: params.qty,
		notes: params.notes ?? null,
		receivedAt: new Date(),
		createdAt: new Date()
	});

	return stockId;
}

// ─── Main Seeding Logic ────────────────────────────────────────────────────
async function main() {
	console.log(`Import inventaris Lab Terpadu dari: ${FILE_PATH}`);
	if (DRY_RUN) console.log('--- DRY RUN MODE (No DB changes will be made) ---');

	// 1. Fetch Laboratorium row by slug
	const lab = await db.query.laboratorium.findFirst({
		where: eq(authSchema.laboratorium.slug, LAB_SLUG)
	});

	if (!lab) {
		console.error(`Laboratorium dengan slug '${LAB_SLUG}' tidak ditemukan di DB! Run 'bun run db:seed-laboratorium' first.`);
		process.exit(1);
	}

	const labId = lab.id;

	// 2. Read Workbook
	let wb: XLSX.WorkBook;
	try {
		wb = XLSX.readFile(FILE_PATH, { cellDates: true });
	} catch (err: any) {
		console.error(`Gagal membaca file excel: ${err?.message}`);
		process.exit(1);
	}

	// 3. Reset existing data if needed
	if (!DRY_RUN && !NO_RESET) {
		console.log(`Menghapus data equipment & stock lama untuk laboratorium '${lab.name}'...`);
		await db.delete(schema.equipment).where(eq(schema.equipment.laboratoriumId, labId));

		// Find stock ids to delete batches
		const oldStocks = await db.query.stock.findMany({
			where: eq(schema.stock.laboratoriumId, labId)
		});
		for (const s of oldStocks) {
			await db.delete(schema.stockBatch).where(eq(schema.stockBatch.stockId, s.id));
		}
		await db.delete(schema.stock).where(eq(schema.stock.laboratoriumId, labId));
		console.log('- Selesai reset data lama.\n');
	}

	let equipmentInsertedCount = 0;
	let stockRowsCount = 0;
	let batchRowsCount = 0;

	// ─── 4. Process Sheet "Alat " (ASSET) ──────────────────────────────────
	const alatSheetName = wb.SheetNames.find((s) => s.trim().toLowerCase() === 'alat');
	if (alatSheetName) {
		const ws = wb.Sheets[alatSheetName];
		const grid = sheetToGrid(ws);

		// Header is at row index 1 (Row 2 in Excel: No., Jenis Barang, Merk, Tipe, Satuan, Jumlah, Kondisi, Keterangan, Lokasi)
		const dataRows = grid.slice(2);

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			if (!row || row.every((c) => c === null || c === undefined || c === '')) continue;

			const rawName = clean(row[1] as string);
			if (!rawName || rawName.toLowerCase() === 'jenis barang') continue;

			const brand = clean(row[2] as string);
			const variantFromTipe = clean(row[3] as string);
			const satuanText = clean(row[4] as string);
			const rawQty = row[5];
			const rawCondition = clean(row[6] as string);
			const rawKet = clean(row[7] as string);
			const rawLoc = clean(row[8] as string);

			// Exclude non-item header/footer rows if any
			if (rawName.toLowerCase().startsWith('catatan') || rawName.toLowerCase().startsWith('kondisi :')) continue;

			// Parse Qty
			let qty = 0;
			if (typeof rawQty === 'number') {
				qty = Math.floor(rawQty);
			} else if (rawQty) {
				const n = parseInt(String(rawQty).replace(/\D/g, ''), 10);
				qty = isNaN(n) ? 0 : n;
			}

			if (qty <= 0) {
				logReview('Alat', rawName, brand, variantFromTipe, 'Jumlah alat tidak terbaca atau 0 — item didaftarkan ke katalog dengan 0 unit equipment.');
			}

			// Register/Get item catalog ID
			const itemId = await upsertItem(db, {
				name: rawName,
				type: 'ASSET',
				baseUnit: 'UNIT',
				equipmentType: 'INSTRUMENT',
				description: rawKet ? `Catatan Import: ${rawKet}` : null
			});

			if (qty <= 0) continue;

			// Parse Condition & Damage breakdown
			let damagedCount = 0;
			if (rawCondition && (rawCondition.toLowerCase().includes('rusak') || rawCondition.toLowerCase().includes('buruk'))) {
				damagedCount = qty;
			} else if (rawKet) {
				const damageMatch = rawKet.match(/(\d+)\s*(?:set|buah|pcs)?\s*(?:pecah|rusak|ndaada|tidak ada|kurang)/i);
				if (damageMatch) {
					damagedCount = parseInt(damageMatch[1], 10);
				}
			}

			if (damagedCount > 0) {
				logReview('Alat', rawName, brand, variantFromTipe, `Kondisi memuat catatan kerusakan: ${damagedCount} unit di-set RUSAK, ${Math.max(0, qty - damagedCount)} unit di-set BAIK.`);
			}

			// Parse Storage Location Distribution
			const baseLocation = rawLoc ?? 'Lab Terpadu';
			let partialLocCount = 0;
			let partialLocText: string | null = null;

			if (rawKet) {
				const locMatch = rawKet.match(/(\d+)\s*(?:buah|pcs|set)?\s*(dimasukkan.*|di.*)/i);
				if (locMatch) {
					const q = parseInt(locMatch[1], 10);
					if (q > 0 && q <= qty) {
						partialLocCount = q;
						partialLocText = locMatch[2].trim();
					}
				} else if (rawKet.match(/^(di dalam|di box|di dos|di loker|di lemari)/i)) {
					partialLocCount = qty;
					partialLocText = rawKet.trim();
				}
			}

			if (partialLocCount > 0) {
				logReview(
					'Alat',
					rawName,
					brand,
					variantFromTipe,
					`Lokasi spesifik dipisah: ${partialLocCount} unit di "${baseLocation}, ${partialLocText}" dan ${qty - partialLocCount} unit di "${baseLocation}".`
				);
			}

			// Generate equipment entries
			for (let unitIdx = 0; unitIdx < qty; unitIdx++) {
				const condition = unitIdx < damagedCount ? 'RUSAK' : 'BAIK';
				let storageLoc = baseLocation;

				if (unitIdx < partialLocCount && partialLocText) {
					storageLoc = `${baseLocation}, ${partialLocText}`;
				}

				if (!DRY_RUN) {
					await db.insert(schema.equipment).values({
						id: crypto.randomUUID(),
						itemId,
						laboratoriumId: labId,
						brand,
						variant: variantFromTipe,
						condition,
						status: 'READY',
						storageLocation: storageLoc,
						createdAt: new Date()
					});
				}
				equipmentInsertedCount++;
			}
		}
	}

	// ─── 5. Process Sheet "Bahan " (CONSUMABLE) ────────────────────────────
	const bahanSheetName = wb.SheetNames.find((s) => s.trim().toLowerCase() === 'bahan');
	if (bahanSheetName) {
		const ws = wb.Sheets[bahanSheetName];
		const grid = sheetToGrid(ws);

		// Header is at row index 2 (Row 3 in Excel: No., Jenis Barang, Merk, Tipe, Satuan, Jumlah, Kondisi, Keterangan, Lokasi)
		const dataRows = grid.slice(3);

		let currentCategoryId: string | null = null;
		let currentCategoryName: string | null = null;

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			if (!row || row.every((c) => c === null || c === undefined || c === '')) continue;

			const rawName = clean(row[1] as string);
			if (!rawName || rawName.toLowerCase() === 'jenis barang') continue;

			// Skip legend/notes
			if (
				rawName.toLowerCase().startsWith('catatan') ||
				rawName.toLowerCase().startsWith('kondisi :') ||
				rawName.toLowerCase().startsWith('keterangan :') ||
				rawName.toLowerCase() === 'no.'
			) {
				continue;
			}

			// Check if this row is a section header (e.g. "Blok Oromaksilofasial (Kelas Regular)")
			if (
				rawName.toLowerCase().startsWith('blok ') ||
				(!row[0] && !row[2] && !row[3] && !row[4] && !row[5] && !row[6] && !row[8])
			) {
				currentCategoryName = rawName;
				currentCategoryId = await getOrCreateCategory(db, rawName);
				logReview('Bahan', `[Kategori Header: ${rawName}]`, null, null, `Ditemukan kategori section baru "${rawName}". Item setelahnya dimasukkan ke kategori ini.`);
				continue;
			}

			const brand = clean(row[2] as string);
			const tipe = clean(row[3] as string);
			const rawSatuan = clean(row[4] as string);
			const rawQty = row[5];
			const rawCondition = clean(row[6] as string);
			const rawKet = clean(row[7] as string);
			const rawLoc = clean(row[8] as string);

			// Disambiguate Unit & Variant Size
			const { baseUnit, variantExtra } = mapBahanUnit(rawSatuan);

			// Construct stock variant: combining Tipe, package size (e.g. 250ml), or specific unit description
			const variantParts = [tipe, variantExtra].filter(Boolean);
			const variantStr = variantParts.length > 0 ? variantParts.join(' - ') : null;

			// Handle Deduplication & Clean Item Catalog Name (e.g., Gypsum Putih, Gypsum Biru, Gypsum)
			let normalizedItemName = rawName;
			if (rawName.toLowerCase() === 'gypsum putih') normalizedItemName = 'Gypsum Putih';
			if (rawName.toLowerCase() === 'gypsum biru') normalizedItemName = 'Gypsum Biru';

			const itemId = await upsertItem(db, {
				name: normalizedItemName,
				type: 'CONSUMABLE',
				baseUnit: baseUnit,
				categoryId: currentCategoryId,
				description: rawKet ? `Catatan Import: ${rawKet}` : null
			});

			// Parse Qty
			let qty = 0;
			if (typeof rawQty === 'number') {
				qty = Math.floor(rawQty);
			} else if (rawQty) {
				const n = parseInt(String(rawQty).replace(/\D/g, ''), 10);
				qty = isNaN(n) ? 0 : n;
			} else if (rawSatuan && (rawSatuan.toLowerCase().includes('250ml') || rawSatuan.toLowerCase().includes('500gr'))) {
				qty = 1;
				logReview('Bahan', normalizedItemName, brand, variantStr, `Satuan "${rawSatuan}" menentukan ukuran wadah — qty di-default 1 botol/kemasan.`);
			}

			if (qty <= 0) {
				logReview('Bahan', normalizedItemName, brand, variantStr, 'Jumlah bahan tidak terbaca atau 0 — item didaftarkan ke katalog dengan 0 stok.');
				continue;
			}

			const notesArr: string[] = [];
			if (rawLoc) notesArr.push(`Lokasi: ${rawLoc}`);
			if (rawKet) notesArr.push(`Keterangan: ${rawKet}`);
			if (rawSatuan) notesArr.push(`Satuan Asli: ${rawSatuan}`);
			if (currentCategoryName) notesArr.push(`Kategori: ${currentCategoryName}`);
			const batchNotes = notesArr.length > 0 ? notesArr.join('; ') : null;

			await upsertStockAndBatch(db, {
				itemId,
				laboratoriumId: labId,
				brand,
				variant: variantStr,
				qty,
				condition: rawCondition || 'baik',
				notes: batchNotes
			});

			stockRowsCount++;
			batchRowsCount++;
		}
	}

	// ─── 6. Output Summary Report ──────────────────────────────────────────
	console.log('\n================ SEEDING COMPLETE ================');
	console.log(`[Alat]  Total unit equipment dimasukkan : ${equipmentInsertedCount}`);
	console.log(`[Bahan] Total baris stock diproses      : ${stockRowsCount}`);
	console.log(`[Bahan] Total batch diproses            : ${batchRowsCount}`);
	console.log(`Total item unik terdaftar di katalog   : ${itemCache.size}`);
	console.log('==================================================\n');

	if (reviewLog.length > 0) {
		console.log(`=== PERLU DITINJAU MANUAL (${reviewLog.length} catatan) ===`);
		reviewLog.forEach((r, idx) => {
			const bv = [r.brand, r.variant].filter(Boolean).join(' / ');
			const label = bv ? `${r.item} (${bv})` : r.item;
			console.log(`${idx + 1}. [${r.sheet}] ${label} — ${r.issue}`);
		});
		console.log('==================================================\n');
	}

	if (!DRY_RUN) {
		await client.end();
	}
	process.exit(0);
}

main().catch((err) => {
	console.error('Fatal Error during seeding:', err);
	process.exit(1);
});
