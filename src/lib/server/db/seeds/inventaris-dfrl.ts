/**
 * One-off seeder: import "Daftar Alat & Bahan Lab FDRL.xlsx" into the
 * Frontier Dental Lab Research (FDRL) lab.
 *
 * Sibling script to `inventaris-preparasi.ts`, but the source file has a
 * completely different layout, so this is its own script rather than a
 * shared multi-lab importer (same reasoning as the header comment on that
 * file). Key differences from the Preparasi source file:
 *  - No MEREK/TIPE (brand/variant) columns at all — every row is just
 *    No / Nama / Jumlah|Satuan / Keterangan.
 *  - Both sheets ("DAFTAR ALAT", "DAFTAR BAHAN") are broken into named
 *    sections (e.g. "1. Lab. Mekanik", "Media Utama dalam kulkas") via a
 *    single-row A:D merge acting as a section header — these are imported
 *    as `equipment_category` rows and attached to `item.categoryId`.
 *  - "Alat" has no BAIK/RUSAK KONDISI column — condition is inferred from
 *    the free-text "Keterangan" column only when it clearly says so (e.g.
 *    "Alat sudah berkarat"), defaulting to BAIK otherwise.
 *  - "Keterangan" on "Alat" is mostly provenance/notes (e.g. "Hibah dari
 *    drg. Hardiyanti dkk"), not a condition column — stored on
 *    `item.description` since `equipment` has no free-text notes field.
 *  - "Bahan"'s "Satuan" column mixes real container counts ("7 sachet",
 *    "1 box") with weight/volume measurements of a single container
 *    ("500 gram", "0,2 gram", "15 ml") — there's no gram/ml/liter option
 *    in `item.baseUnit` (PCS/BOX/METER/ROLL/UNIT/BOTOL), and treating "500
 *    gram" as "500 pieces" would silently 500x the real stock. Handled by
 *    detecting a weight/volume unit word and treating that row as ONE
 *    container (qty = 1), with the original text ("500 gram") kept
 *    verbatim in `stock.variant` so the size isn't lost.
 *  - "Bahan"'s expiry info lives inside free-text "Keterangan"
 *    ("Exp. Oktober 2026", "Exp.Oktober 2026", "Exp. 30 Oktober 2024", "No
 *    date") using Indonesian month names, not the MM/YY-style dates in the
 *    Preparasi file — parsed with its own Indonesian-month regex instead of
 *    reusing Preparasi's parseExpiryCell.
 *
 * WHAT THIS DOES
 * - "DAFTAR ALAT" -> ASSET items: upserts `item` by name (category from the
 *   section it sits under, description from "Keterangan" when present),
 *   creates one `equipment` row per physical unit ("Jumlah"), condition
 *   BAIK unless "Keterangan" clearly indicates damage (RUSAK).
 * - "DAFTAR BAHAN" -> CONSUMABLE items: upserts `item` by name (category
 *   from its section), upserts one `stock` row per (item, variant) where
 *   `variant` is the raw "Satuan" text (e.g. "500 gram", "1 botol"), and
 *   inserts one `stock_batch` row per source row with `expiryDate` parsed
 *   from "Keterangan" where unambiguous.
 * - Every item name is registered in the `item` catalog even when its qty
 *   can't be read (0 stock/0 equipment in that case) — getting every name
 *   into inventory is the priority, stock/batches can be corrected manually
 *   afterward. Same "log, don't guess" policy as inventaris-preparasi.ts:
 *   anything ambiguous is written to the review log printed at the end
 *   instead of silently guessed.
 *
 * SPECIAL CASES CALLED OUT IN THE IMPORT INSTRUCTIONS
 * - "paket" is not a value in `item.baseUnit`'s enum (confirmed against
 *   schema.ts: PCS/BOX/METER/ROLL/UNIT/BOTOL). It only ever shows up on the
 *   "Alat" sheet (e.g. "Digital Counting balance + kabel" — "1 paket").
 *   ASSET items always use the fixed baseUnit UNIT regardless of what the
 *   "Jumlah" column's unit word says (same convention as
 *   inventaris-preparasi.ts) — so "paket" only affects the qty count (1),
 *   never a unit enum value. Logged for visibility rather than silently
 *   ignored.
 * - "Plastik ukuran 12 x 25" has Satuan "<100 lembar". Generalized as: any
 *   "<N ..." cell is read as qty = N - 1 (so "<100" -> 99, per the import
 *   instructions), logged either way.
 *
 * USAGE
 *   bun run src/lib/server/db/seeds/inventaris-fdrl.ts [--dry-run] [--no-reset] [path/to/file.xlsx]
 *
 * `--dry-run` parses the workbook and prints exactly what would be written
 * (counts + the full review log) without touching the database. Recommended
 * before the real run, same as inventaris-preparasi.ts.
 *
 * By default (outside --dry-run) this script DELETES all existing
 * `equipment` and `stock` rows for the FDRL lab before reinserting — this is
 * a full resync from the spreadsheet, not an incremental append. Pass
 * `--no-reset` to insert on top of whatever's already there instead.
 *
 * If no path is given, defaults to
 * `src/lib/server/db/seeds/data/DAFTAR_ALAT_DAN_BAHAN_LAB_FDRL.xlsx`.
 *
 * Requires the FDRL lab to already exist — run `bun run db:seed-laboratorium`
 * first (it seeds all 3 labs, including
 * `frontier_dental_lab_research`).
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

const LAB_SLUG = 'frontier_dental_lab_research';
const DRY_RUN = process.argv.includes('--dry-run');
const NO_RESET = process.argv.includes('--no-reset');
const FILE_PATH = path.resolve(
	process.argv.find((a) => a.endsWith('.xlsx')) ??
		'src/lib/server/db/seeds/data/DAFTAR_ALAT_DAN_BAHAN_LAB_FDRL.xlsx'
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

// ─── Sheet reading (no merge-fill) ───────────────────────────────────────────
// Unlike inventaris-preparasi.ts, this file's merges aren't "same value as
// row above" continuations to fill in — they're single-row A:D section
// headers ("1. Lab. Mekanik", "Media Utama dalam kulkas") that we want to
// detect AS merges, not have their text bleed into columns B/C/D. So this
// reads raw cell values with no merge expansion at all.
function readGrid(ws: XLSX.WorkSheet): (string | number | null)[][] {
	const range = XLSX.utils.decode_range(ws['!ref']!);
	const grid: (string | number | null)[][] = [];
	for (let r = range.s.r; r <= range.e.r; r++) {
		const row: (string | number | null)[] = [];
		for (let c = range.s.c; c <= range.e.c; c++) {
			const cell = ws[XLSX.utils.encode_cell({ r, c })];
			row.push(cell ? cell.v : null);
		}
		grid.push(row);
	}
	return grid;
}

// A section header is a single-row merge spanning exactly columns A:D.
// The sheet title itself (row 0, 0-indexed) is also merged A:D, so it's
// excluded here — callers start their data loop at row index 1 anyway.
function getCategoryHeaderRows(ws: XLSX.WorkSheet): Set<number> {
	const rows = new Set<number>();
	for (const m of ws['!merges'] ?? []) {
		if (m.s.c === 0 && m.e.c === 3 && m.s.r === m.e.r && m.s.r > 0) {
			rows.add(m.s.r);
		}
	}
	return rows;
}

// Strips Unicode "format" characters (zero-width space, word joiner, BOM...)
// and collapses whitespace — same rationale as inventaris-preparasi.ts's
// stripInvisible: hand-typed cells can carry invisible characters that would
// otherwise fragment an item into a second, visually-identical `item` row.
function stripInvisible(s: string): string {
	return s
		.replace(/\p{Cf}/gu, '')
		.replace(/\u00a0/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function clean(v: string | number | null): string | null {
	if (v === null || v === undefined) return null;
	const s = stripInvisible(String(v));
	return s === '' ? null : s;
}

// ─── "Jumlah" parsing (Alat sheet) ───────────────────────────────────────────
// "1 buah", "5 buah beragam ukuran", "1 paket", "3 sachet", "1 dos" ...
// Extracts the leading count and keeps whatever text follows it verbatim so
// callers can flag anything that isn't a plain, single-word unit.
function parseJumlahAlat(raw: string | null): {
	qty: number | null;
	unitText: string | null;
} {
	if (raw === null) return { qty: null, unitText: null };
	const m = raw.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
	if (!m) return { qty: null, unitText: null };
	const qty = parseFloat(m[1].replace(',', '.'));
	const unitText = m[2].trim() || null;
	return { qty, unitText };
}

const RECOGNIZED_ALAT_UNITS = [
	'buah',
	'paket',
	'box',
	'pasang',
	'sachet',
	'dos',
	'gulung',
	'lembar',
	'set'
];

// The Alat sheet has no BAIK/RUSAK column — "Keterangan" is mostly
// provenance notes ("Hibah dari drg. ..."), but a few rows clearly describe
// damage in prose ("Alat sudah berkarat"). Only unambiguous damage words
// flip this to RUSAK; everything else (including "no Keterangan at all")
// defaults to BAIK, same "don't over-guess" spirit as
// inventaris-preparasi.ts's condition classifier.
function classifyAlatCondition(keterangan: string | null): 'BAIK' | 'RUSAK' {
	if (!keterangan) return 'BAIK';
	const t = keterangan.toLowerCase();
	if (/rusak|berkarat|tidak berfungsi|tidak bisa|patah|pecah|hilang/.test(t)) return 'RUSAK';
	return 'BAIK';
}

// ─── "Satuan" parsing (Bahan sheet) ──────────────────────────────────────────
// "500 gram", "1 botol", "500 gram (2 botol)", "0,2 gram", "<100 lembar" ...
// `<N ...` is treated as N - 1 per the import instructions (so "<100 lembar"
// -> 99), logged either way so it's easy to find and correct if a more
// precise real count turns up later.
function parseSatuanCell(raw: string | null): {
	qty: number | null;
	unitText: string | null;
	hadLessThan: boolean;
} {
	if (raw === null) return { qty: null, unitText: null, hadLessThan: false };

	const lt = raw.match(/^<\s*(\d+)\s*(.*)$/);
	if (lt) {
		const n = parseInt(lt[1], 10);
		return { qty: n - 1, unitText: lt[2].trim() || null, hadLessThan: true };
	}

	const m = raw.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
	if (!m) return { qty: null, unitText: null, hadLessThan: false };
	const qty = parseFloat(m[1].replace(',', '.'));
	const unitText = m[2].trim() || null;
	return { qty, unitText, hadLessThan: false };
}

// A "500 gram" / "15 ml" / "0,2 gram" cell describes the SIZE of one
// container, not a count of several — flagged separately from a plain
// unmapped-unit case (see mapBahanUnitFDRL) because treating the number as
// a literal piece count would silently inflate stock by 100-500x.
const WEIGHT_VOLUME_UNIT_RE = /\b(gram|gr|mg|kg|ml|mililiter|milliliter|liter|l)\b/i;

function mapBahanUnitFDRL(
	unitText: string | null,
	ctx: { item: string }
): (typeof schema.item.$inferInsert)['baseUnit'] {
	const s = (unitText ?? '').toLowerCase();
	if (/\bbotol\b/.test(s)) return 'BOTOL';
	if (/\bbox\b|\bkotak\b/.test(s)) return 'BOX';
	if (/\bgulung\b|\broll\b/.test(s)) return 'ROLL';
	if (/\bbuah\b|\bpcs\b/.test(s)) return 'PCS';

	// Covers "paket" (confirmed not in the baseUnit enum — see file header)
	// along with gram/ml/liter, sachet, lembar, dos, "plastik sampel", etc.
	logReview(
		'Bahan',
		ctx.item,
		null,
		null,
		`SATUAN "${unitText ?? '(kosong)'}" tidak ada di enum baseUnit (PCS/BOX/METER/ROLL/UNIT/BOTOL) — di-default PCS`
	);
	return 'PCS';
}

// ─── "Keterangan" expiry parsing (Bahan sheet) ───────────────────────────────
// Free text using Indonesian month names: "Exp. Oktober 2026",
// "Exp.Oktober 2026" (no space), "Exp. 30 Oktober 2024" (with day), "No
// date". Also occasionally prefixed with unrelated info ("Tanggal buka 12
// November 2025, Exp. September 2023") — only the "Exp. ..." portion is
// parsed into expiryDate; the full Keterangan text is kept verbatim in
// stock_batch.notes regardless, so nothing is lost.
const INDO_MONTHS: Record<string, number> = {
	januari: 1,
	februari: 2,
	maret: 3,
	april: 4,
	mei: 5,
	juni: 6,
	juli: 7,
	agustus: 8,
	september: 9,
	oktober: 10,
	november: 11,
	desember: 12
};

function parseIndoExpiry(keterangan: string | null): {
	expiryDate: string | null;
	issue: string | null;
} {
	if (!keterangan) return { expiryDate: null, issue: null };

	if (/no date/i.test(keterangan)) {
		return {
			expiryDate: null,
			issue: `Keterangan "${keterangan}" — tidak ada tanggal exp yang dicantumkan`
		};
	}

	const m = keterangan.match(/exp\.?\s*(?:(\d{1,2})\s+)?([a-zA-Z]+)\s+(\d{4})/i);
	if (!m) {
		return {
			expiryDate: null,
			issue: `Keterangan "${keterangan}" — tidak ditemukan pola "Exp. <bulan> <tahun>", tinjau manual`
		};
	}

	const day = m[1] ? parseInt(m[1], 10) : null;
	const month = INDO_MONTHS[m[2].toLowerCase()];
	const year = parseInt(m[3], 10);

	if (!month) {
		return {
			expiryDate: null,
			issue: `Keterangan "${keterangan}" — nama bulan "${m[2]}" tidak dikenali, tinjau manual`
		};
	}

	const lastDay = new Date(year, month, 0).getDate();
	const useDay = day && day >= 1 && day <= lastDay ? day : lastDay;
	const expiryDate = `${year}-${String(month).padStart(2, '0')}-${String(useDay).padStart(2, '0')}`;

	const issue = /tanggal buka/i.test(keterangan)
		? `Keterangan "${keterangan}" — berisi info "tanggal buka" tambahan selain Exp., disimpan penuh di stock_batch.notes`
		: null;

	return { expiryDate, issue };
}

// ─── equipment_category upsert ───────────────────────────────────────────────
// Both sheets are broken into named sections ("1. Lab. Mekanik", "Media
// Utama dalam kulkas", ...) via a single-row A:D merge. Leading "N. " list
// numbering is stripped since it's just the section's position in this one
// sheet, not part of the category's name.
const categoryCache = new Map<string, string>();

async function upsertCategory(rawName: string): Promise<string> {
	const name = rawName.replace(/^\d+\.\s*/, '').trim();
	if (categoryCache.has(name)) return categoryCache.get(name)!;

	const existing = await db.query.equipmentCategory.findFirst({
		where: eq(schema.equipmentCategory.name, name)
	});

	let id: string;
	if (existing) {
		id = existing.id;
	} else {
		id = crypto.randomUUID();
		if (!DRY_RUN) {
			await db.insert(schema.equipmentCategory).values({ id, name });
		}
	}
	categoryCache.set(name, id);
	return id;
}

// ─── item upsert (shared) ────────────────────────────────────────────────────
// `item` has no per-batch notes field, only one shared `description` per
// name — but the same item name can recur under different sections with
// different Keterangan (e.g. "Petridish kaca" appears both as plain lab
// stock AND, separately, in "Barang Hibah" with "Hibah dari drg. Verna
// dkk"). Rather than silently dropping the second Keterangan, each new
// description is appended (";"-joined) if it isn't already part of the
// stored text. categoryId is set once, on first creation, and not
// overwritten by a later section (logged if a conflict shows up).
const itemCache = new Map<string, string>(); // "TYPE::name" -> item.id
const itemDescriptionCache = new Map<string, string | null>(); // item.id -> current description

async function upsertItem(
	name: string,
	type: 'ASSET' | 'CONSUMABLE',
	baseUnit: (typeof schema.item.$inferInsert)['baseUnit'],
	categoryId: string | null,
	description: string | null,
	sheet: 'Alat' | 'Bahan'
): Promise<string> {
	const cacheKey = `${type}::${name}`;

	if (itemCache.has(cacheKey)) {
		const itemId = itemCache.get(cacheKey)!;
		await mergeDescription(itemId, name, description, sheet);
		return itemId;
	}

	const existing = await db.query.item.findFirst({
		where: and(eq(schema.item.name, name), eq(schema.item.type, type))
	});

	let itemId: string;
	if (existing) {
		itemId = existing.id;
		itemDescriptionCache.set(itemId, existing.description ?? null);
		if (!DRY_RUN) {
			await db.update(schema.item).set({ hideNewBadge: true }).where(eq(schema.item.id, itemId));
		}
		if (existing.categoryId && categoryId && existing.categoryId !== categoryId) {
			logReview(
				sheet,
				name,
				null,
				null,
				'Item sudah punya kategori berbeda dari kemunculan sebelumnya — kategori awal dipertahankan, tinjau manual jika perlu'
			);
		}
		await mergeDescription(itemId, name, description, sheet);
	} else {
		itemId = crypto.randomUUID();
		itemDescriptionCache.set(itemId, description ?? null);
		if (!DRY_RUN) {
			await db.insert(schema.item).values({
				id: itemId,
				name,
				type,
				baseUnit,
				minStock: 0,
				categoryId,
				description,
				hideNewBadge: true
			});
		}
	}
	itemCache.set(cacheKey, itemId);
	return itemId;
}

async function mergeDescription(
	itemId: string,
	name: string,
	description: string | null,
	sheet: 'Alat' | 'Bahan'
) {
	if (!description) return;
	const current = itemDescriptionCache.get(itemId) ?? null;
	if (!current) {
		if (!DRY_RUN) {
			await db.update(schema.item).set({ description }).where(eq(schema.item.id, itemId));
		}
		itemDescriptionCache.set(itemId, description);
		return;
	}
	if (current.includes(description)) return; // already recorded, nothing to merge

	const merged = `${current}; ${description}`;
	if (!DRY_RUN) {
		await db.update(schema.item).set({ description: merged }).where(eq(schema.item.id, itemId));
	}
	itemDescriptionCache.set(itemId, merged);
	logReview(
		sheet,
		name,
		null,
		null,
		`Keterangan tambahan dari baris lain digabung ke item.description: "${description}"`
	);
}

// ─── Alat (ASSET) import ─────────────────────────────────────────────────────
// Columns (0-indexed): A=No(0) B=Nama(1) C=Jumlah(2) D=Keterangan(3).
// One header row (row index 2), one item per row after that — no vertical
// merges to collapse here (unlike inventaris-preparasi.ts's Alat sheet),
// every row is its own physical entry.
async function seedAlat(labId: string) {
	const wb = XLSX.readFile(FILE_PATH);
	const ws = wb.Sheets['DAFTAR ALAT'];
	if (!ws) throw new Error('Sheet "DAFTAR ALAT" tidak ditemukan di file');
	const grid = readGrid(ws);
	const categoryRows = getCategoryHeaderRows(ws);

	let equipmentBatch: (typeof schema.equipment.$inferInsert)[] = [];
	let itemCount = 0;
	let equipmentCount = 0;
	let currentCategoryId: string | null = null;

	const flush = async () => {
		if (equipmentBatch.length === 0) return;
		if (!DRY_RUN) await db.insert(schema.equipment).values(equipmentBatch);
		equipmentBatch = [];
	};

	for (let r = 1; r < grid.length; r++) {
		const row = grid[r];

		if (categoryRows.has(r)) {
			const rawName = clean(row[0] as string | number | null);
			if (rawName) {
				currentCategoryId = await upsertCategory(rawName);
				console.log(`  [Kategori Alat] ${rawName}`);
			}
			continue;
		}

		const no = row[0];
		const name = clean(row[1] as string | number | null);
		if (no === 'No' || !name) continue; // header row or spacer

		const keterangan = clean(row[3] as string | number | null);
		const { qty: qtyRaw, unitText } = parseJumlahAlat(clean(row[2] as string | number | null));

		if (qtyRaw === null) {
			await upsertItem(name, 'ASSET', 'UNIT', currentCategoryId, keterangan, 'Alat');
			itemCount++;
			logReview(
				'Alat',
				name,
				null,
				null,
				'JUMLAH kosong/tidak terbaca — item didaftarkan ke katalog dengan 0 unit, baris dilewati (isi manual)'
			);
			continue;
		}

		let qty = qtyRaw;
		if (!Number.isInteger(qty)) {
			logReview(
				'Alat',
				name,
				null,
				null,
				`JUMLAH pecahan (${qty}) — dibulatkan ke ${Math.round(qty)}`
			);
			qty = Math.round(qty);
		}

		const itemId = await upsertItem(name, 'ASSET', 'UNIT', currentCategoryId, keterangan, 'Alat');
		itemCount++;

		if (unitText) {
			const firstWord = unitText.toLowerCase().split(/\s+/)[0];
			if (!RECOGNIZED_ALAT_UNITS.includes(firstWord)) {
				logReview(
					'Alat',
					name,
					null,
					null,
					`Satuan JUMLAH "${unitText}" tidak dikenali — qty=${qty} tetap dipakai apa adanya, tinjau apakah ini benar jumlah unit fisik`
				);
			} else if (unitText.split(/\s+/).length > 2) {
				logReview(
					'Alat',
					name,
					null,
					null,
					`JUMLAH "${qtyRaw} ${unitText}" mengandung teks tambahan selain satuan dasar — tinjau manual`
				);
			}
			if (firstWord === 'paket') {
				logReview(
					'Alat',
					name,
					null,
					null,
					`Satuan "paket" tidak ada di enum baseUnit (PCS/BOX/METER/ROLL/UNIT/BOTOL) — item ASSET tetap memakai baseUnit UNIT baku; "paket" murni deskriptif dan tidak memengaruhi jumlah unit equipment yang dibuat (${qty})`
				);
			}
		}

		if (qty <= 0) {
			logReview(
				'Alat',
				name,
				null,
				null,
				`JUMLAH bernilai ${qty} setelah dibulatkan — 0 unit equipment dibuat`
			);
			continue;
		}

		const condition = classifyAlatCondition(keterangan);
		if (condition === 'RUSAK') {
			logReview(
				'Alat',
				name,
				null,
				null,
				`Keterangan "${keterangan}" — kondisi diklasifikasikan RUSAK untuk seluruh ${qty} unit`
			);
		}

		for (let i = 0; i < qty; i++) {
			equipmentBatch.push({
				id: crypto.randomUUID(),
				itemId,
				laboratoriumId: labId,
				condition,
				status: 'READY'
			});
		}
		equipmentCount += qty;

		if (equipmentBatch.length >= 500) await flush();
	}
	await flush();

	console.log(`[Alat] ${itemCount} baris item diproses -> ${equipmentCount} unit equipment`);
}

// ─── Bahan (CONSUMABLE) import ───────────────────────────────────────────────
// Columns (0-indexed): A=No(0) B=Nama(1) C=Satuan(2) D=Keterangan(3).
// stock's unique index is (itemId, laboratoriumId, brand, variant) — brand
// is always null here (no MEREK column on this sheet), and `variant` holds
// the raw Satuan text (e.g. "500 gram", "1 botol") so two rows for the same
// item name but different container sizes don't collide into one stock row.
async function seedBahan(labId: string) {
	const wb = XLSX.readFile(FILE_PATH);
	const ws = wb.Sheets['DAFTAR BAHAN'];
	if (!ws) throw new Error('Sheet "DAFTAR BAHAN" tidak ditemukan di file');
	const grid = readGrid(ws);
	const categoryRows = getCategoryHeaderRows(ws);

	let currentCategoryId: string | null = null;
	let itemCount = 0;
	let stockCount = 0;
	let batchCount = 0;

	for (let r = 1; r < grid.length; r++) {
		const row = grid[r];

		if (categoryRows.has(r)) {
			const rawName = clean(row[0] as string | number | null);
			if (rawName) {
				currentCategoryId = await upsertCategory(rawName);
				console.log(`  [Kategori Bahan] ${rawName}`);
			}
			continue;
		}

		const no = row[0];
		const name = clean(row[1] as string | number | null);
		if (no === 'No' || !name) continue;

		const keterangan = clean(row[3] as string | number | null);
		const satuanRaw = clean(row[2] as string | number | null);
		const { qty: qtyRaw, unitText, hadLessThan } = parseSatuanCell(satuanRaw);

		if (hadLessThan) {
			logReview(
				'Bahan',
				name,
				null,
				satuanRaw,
				`SATUAN "${satuanRaw}" berupa "kurang dari N" — dibaca sebagai N - 1 (mis. "<100 lembar" -> 99)`
			);
		}

		if (qtyRaw === null) {
			const baseUnit = mapBahanUnitFDRL(unitText, { item: name });
			await upsertItem(name, 'CONSUMABLE', baseUnit, currentCategoryId, null, 'Bahan');
			itemCount++;
			logReview(
				'Bahan',
				name,
				null,
				satuanRaw,
				'SATUAN kosong/tidak terbaca — item didaftarkan ke katalog dengan 0 stok, baris dilewati (isi manual)'
			);
			continue;
		}

		let qty = qtyRaw;
		const isWeightVolume = unitText ? WEIGHT_VOLUME_UNIT_RE.test(unitText) : false;

		if (isWeightVolume) {
			logReview(
				'Bahan',
				name,
				null,
				satuanRaw,
				`SATUAN "${satuanRaw}" adalah ukuran berat/volume dari SATU wadah, bukan jumlah kemasan — qty dicatat sebagai 1 (satu wadah/botol), ukuran aslinya disimpan apa adanya di stock.variant`
			);
			qty = 1;
		} else if (!Number.isInteger(qty)) {
			logReview(
				'Bahan',
				name,
				null,
				satuanRaw,
				`SATUAN "${satuanRaw}" pecahan (${qty}) — dibulatkan ke ${Math.round(qty)}`
			);
			qty = Math.round(qty);
		}

		if (qty <= 0) {
			const baseUnit = mapBahanUnitFDRL(unitText, { item: name });
			await upsertItem(name, 'CONSUMABLE', baseUnit, currentCategoryId, null, 'Bahan');
			itemCount++;
			logReview(
				'Bahan',
				name,
				null,
				satuanRaw,
				`SATUAN "${satuanRaw}" bernilai 0 setelah diproses — item didaftarkan dengan 0 stok`
			);
			continue;
		}

		const baseUnit = mapBahanUnitFDRL(unitText, { item: name });
		const variant = satuanRaw;

		const itemId = await upsertItem(name, 'CONSUMABLE', baseUnit, currentCategoryId, null, 'Bahan');
		itemCount++;

		const { expiryDate, issue: expiryIssue } = parseIndoExpiry(keterangan);
		if (expiryIssue) logReview('Bahan', name, null, variant, expiryIssue);

		if (!DRY_RUN) {
			// Explicit find-then-insert/update instead of onDuplicateKeyUpdate —
			// same reasoning as inventaris-preparasi.ts: MySQL treats NULL as
			// distinct from NULL in a unique index, so two null-brand rows would
			// not collide via onDuplicateKeyUpdate. This also gives us the real
			// stock.id to attach the stock_batch row to.
			const existingStock = await db.query.stock.findFirst({
				where: (s, { eq: eqOp, and: andOp, isNull }) =>
					andOp(
						eqOp(s.itemId, itemId),
						eqOp(s.laboratoriumId, labId),
						isNull(s.brand),
						variant ? eqOp(s.variant, variant) : isNull(s.variant)
					)
			});

			let stockId: string;
			if (existingStock) {
				stockId = existingStock.id;
				await db
					.update(schema.stock)
					.set({ qty: sql`${schema.stock.qty} + ${qty}`, updatedAt: new Date() })
					.where(eq(schema.stock.id, stockId));
			} else {
				stockId = crypto.randomUUID();
				await db.insert(schema.stock).values({
					id: stockId,
					itemId,
					laboratoriumId: labId,
					qty,
					brand: null,
					variant,
					condition: 'baik'
				});
			}

			await db.insert(schema.stockBatch).values({
				stockId,
				qty,
				initialQty: qty,
				expiryDate,
				notes: keterangan
					? `Keterangan asal (impor seed FDRL): ${keterangan}`
					: 'Diimpor dari Daftar Alat & Bahan Lab FDRL (seed)'
			});
			batchCount++;
		} else {
			batchCount++;
		}
		stockCount++;
	}

	console.log(
		`[Bahan] ${itemCount} baris item diproses -> ${stockCount} baris stock, ${batchCount} baris stock_batch`
	);
}

// ─── Reset (scoped to this lab only) ────────────────────────────────────────
async function resetLabData(labId: string) {
	if (DRY_RUN) {
		console.log('>> DRY RUN — reset dilewati (tidak ada perubahan)\n');
		return;
	}
	if (NO_RESET) {
		console.log(
			'>> --no-reset — data equipment/stock lama TIDAK dihapus, insert akan menumpuk di atasnya\n'
		);
		return;
	}
	console.log('Menghapus data equipment & stock lama untuk lab ini sebelum impor ulang...');
	await db.delete(schema.equipment).where(eq(schema.equipment.laboratoriumId, labId));
	await db.delete(schema.stock).where(eq(schema.stock.laboratoriumId, labId));
	console.log('  - selesai.\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
	console.log(`Import inventaris Frontier Dental Lab Research dari: ${FILE_PATH}`);
	console.log(DRY_RUN ? '>> DRY RUN — tidak ada perubahan yang disimpan ke database\n' : '');

	const lab = await db.query.laboratorium.findFirst({
		where: eq(authSchema.laboratorium.slug, LAB_SLUG)
	});
	if (!lab) {
		throw new Error(
			`Laboratorium dengan slug "${LAB_SLUG}" tidak ditemukan. Jalankan "bun run db:seed-laboratorium" terlebih dahulu.`
		);
	}

	await resetLabData(lab.id);

	await seedAlat(lab.id);
	await seedBahan(lab.id);

	if (reviewLog.length > 0) {
		console.log(`\n=== PERLU DITINJAU MANUAL (${reviewLog.length} catatan) ===`);
		for (const entry of reviewLog) {
			console.log(
				`[${entry.sheet}] ${entry.item}${entry.brand ? ' / ' + entry.brand : ''}${entry.variant ? ' / ' + entry.variant : ''} — ${entry.issue}`
			);
		}
	} else {
		console.log('\nTidak ada catatan yang perlu ditinjau.');
	}

	console.log(
		DRY_RUN
			? '\nDry run selesai. Jalankan tanpa --dry-run untuk menyimpan ke database.'
			: '\nImport selesai.'
	);
	process.exit(0);
}

main().catch((err) => {
	console.error('Import inventaris FDRL gagal:', err);
	process.exit(1);
});
