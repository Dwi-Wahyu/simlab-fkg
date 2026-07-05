/**
 * One-off seeder: import "DAFTAR_INVENTARIS_ALAT_DAN_BAHAN_LAB_PREPARASI.xlsx"
 * into the Preparasi lab.
 *
 * Not a generic multi-lab importer — this file's layout (double header row
 * on "Alat", single header row on "Bahan", free-text "KONDISI" notes) is
 * specific to how this one report was produced. Other labs will need their
 * own version of this script if/when their report format differs, per the
 * plan discussed for Module 2's per-lab export/import feature.
 *
 * WHAT THIS DOES
 * - "Alat" sheet -> ASSET items: upserts `item` by name, creates one
 *   `equipment` row per physical unit (qty in "JUMLAH TERSEDIA"), condition
 *   bucketed into BAIK/RUSAK from the free-text "KONDISI" column.
 * - "Bahan" sheet -> CONSUMABLE items: upserts `item` by name, upserts one
 *   `stock` row per (item, brand, variant) — "KONDISI" is stored verbatim
 *   in `stock.condition` (free text column, no enum to fight with).
 * - "Rencana Pengadaan baru" sheet is intentionally NOT read (out of scope
 *   per instruction — that's procurement planning, not current inventory).
 * - "PENGGUNAAN BLOK ... SEMESTER ..." / "EXP. DATE" columns on both sheets
 *   are NOT imported — there's no schedule-usage or expiry column on
 *   `stock`/`equipment` yet to put them in. Revisit if/when that's added.
 *
 * USAGE
 *   bun run src/lib/server/db/seeds/inventaris-preparasi.ts [--dry-run] [--no-reset] [path/to/file.xlsx]
 *
 * `--dry-run` parses the workbook and prints exactly what would be written
 * (counts + the full review log below) without touching the database.
 * Strongly recommended to run this first — the KONDISI column is messy
 * free-form text typed by hand, and the review log is your chance to catch
 * anything the classifier guessed wrong BEFORE it's committed as BAIK/RUSAK
 * on ~9,000 equipment rows.
 *
 * By default (outside --dry-run) this script DELETES all existing
 * `equipment` and `stock` rows for this lab before reinserting — the import
 * is not incremental, it's a full resync from the spreadsheet, and a
 * previous run's rows (including any produced by an older, buggy version of
 * this script) would otherwise stack on top instead of being replaced. Pass
 * `--no-reset` to skip that and insert on top of whatever's already there
 * (not recommended unless you know why).
 *
 * If no path is given, defaults to
 * `src/lib/server/db/seeds/data/DAFTAR_INVENTARIS_ALAT_DAN_BAHAN_LAB_PREPARASI.xlsx`
 * — put the uploaded file there (create the `data/` folder, it's not
 * checked in) before running.
 *
 * ─── FIX LOG (see review from the previous run) ────────────────────────────
 * 1. EQUIPMENT COUNT INFLATION (critical): the source file merges the
 *    "JUMLAH TERSEDIA" cell vertically whenever one physical brand/variant's
 *    KONDISI breakdown is typed across several rows instead of one comma-
 *    separated cell (e.g. k-file/mani/#45-80(25mm) — 3 rows, each showing
 *    qty=50 because SheetJS/Excel replicates a merged cell's value to every
 *    row it spans). The old row-by-row loop treated each of those rows as
 *    its own full qty=50 batch, generating 150 equipment units for an item
 *    that only has 50. Fixed by detecting real multi-row merges on the
 *    JUMLAH TERSEDIA column and collapsing each merge into ONE entry: qty
 *    taken once, KONDISI text from every row in the merge concatenated
 *    before classification. Rows that just happen to share a value by
 *    coincidence (no actual merge) are untouched and still processed as
 *    separate rows, same as before.
 * 2. "tidak" (bad) alone wasn't recognized unless written as "tidak lengkap"
 *    or "tidak baik". A note like "baik (2 lengkap, 3 tidak)" only matched
 *    the "2 lengkap" fragment and silently classified the whole qty as
 *    BAIK. "tidak" on its own is now treated as a RUSAK marker too.
 * 3. Rows with a name but no parseable quantity were silently dropped with
 *    no trace. Now logged for review instead of disappearing.
 * 4. JUMLAH TERSEDIA cells containing more than a plain number (e.g. "40 box
 *    (7 pcs & 6 pcs)", "1 box (5 pcs/box)") were silently truncated to their
 *    leading digits via parseFloat, with no flag. Now logged so a human
 *    confirms whether "40" really means 40 individual units.
 * 5. Bahan SATUAN values that imply a multiplier (e.g. "box(1 box isi 4)")
 *    get a distinct, louder log message from a plain unmapped-unit default,
 *    since defaulting to PCS there silently understates real stock 4x.
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

const LAB_SLUG = 'preparasi';
const DRY_RUN = process.argv.includes('--dry-run');
const NO_RESET = process.argv.includes('--no-reset');
const FILE_PATH = path.resolve(
	process.argv.find((a) => a.endsWith('.xlsx')) ??
		'src/lib/server/db/seeds/data/DAFTAR_INVENTARIS_ALAT_DAN_BAHAN_LAB_PREPARASI.xlsx'
);

// ─── Review log ────────────────────────────────────────────────────────────
// Anything the parser had to guess about (ambiguous KONDISI text, fractional
// quantities, unmapped units) gets logged here instead of silently applied,
// so it's all visible in one place at the end of the run.
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

// ─── Sheet reading with merges resolved ─────────────────────────────────────
// The source file vertically merges cells to show "same as row above" (NO,
// URAIAN/NAMA BARANG, sometimes TIPE). SheetJS only stores a value on the
// top-left cell of a merge — this expands every merged range so every cell
// in it carries the group's real value, without guessing at cells that
// merely LOOK blank but aren't part of an actual merge (those stay null,
// which is the correct "not provided" for that row).
function sheetToGrid(ws: XLSX.WorkSheet): (string | number | null)[][] {
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

// ─── Merge-group detection (for one specific column) ────────────────────────
// sheetToGrid() replicates a merged cell's value to every row it spans, which
// is correct for reading — but it destroys the information we actually need
// here: whether several rows are FRAGMENTS of one physical entry (one real
// quantity, split KONDISI notes) or just separate rows that coincidentally
// hold the same number. This walks the sheet's own `!merges` list for a
// single column and returns, per row, the top row of the merge it belongs to
// (or null if that row's cell in this column isn't part of a multi-row
// merge). Rows sharing the same non-null id are one physical entry.
function buildMergeGroupMap(ws: XLSX.WorkSheet, col: number, rowCount: number): (number | null)[] {
	const map: (number | null)[] = new Array(rowCount).fill(null);
	for (const merge of ws['!merges'] ?? []) {
		if (merge.s.c !== col || merge.e.c !== col) continue; // only merges confined to this column
		if (merge.s.r === merge.e.r) continue; // single-row "merge" isn't a grouping signal
		for (let r = merge.s.r; r <= merge.e.r; r++) map[r] = merge.s.r;
	}
	return map;
}

function clean(v: string | number | null): string | null {
	if (v === null || v === undefined) return null;
	const s = String(v).trim();
	return s === '' ? null : s;
}

// Same parsing as a plain cleanNum would do, but also reports whether the cell held anything
// beyond a plain number — e.g. "40 box (7 pcs & 6 pcs)" parses to 40 via
// parseFloat's leading-number behavior, silently discarding "box (7 pcs & 6
// pcs)". That discarded text is often exactly the part that says the number
// means "boxes", not "individual units" — worth a flag rather than silence.
function parseQtyCell(v: string | number | null): {
	qty: number | null;
	hadExtraText: boolean;
	raw: string | null;
} {
	if (v === null || v === undefined) return { qty: null, hadExtraText: false, raw: null };
	if (typeof v === 'number') return { qty: v, hadExtraText: false, raw: String(v) };
	const s = String(v).trim();
	if (s === '') return { qty: null, hadExtraText: false, raw: null };
	const n = parseFloat(s.replace(',', '.'));
	if (isNaN(n)) return { qty: null, hadExtraText: false, raw: s };
	const strictlyNumeric = /^-?\d+([.,]\d+)?$/.test(s);
	return { qty: n, hadExtraText: !strictlyNumeric, raw: s };
}

// ─── "Alat" (ASSET) condition classifier ────────────────────────────────────
// KONDISI on the Alat sheet is meant to be BAIK/RUSAK, but is typed as free
// text: plain words ("baik", "buruk"), synonyms ("baru" = good, "rusak" =
// bad), negated phrases ("tidak lengkap" = bad), and occasional inline
// breakdowns ("13 baru, 2 baik, 6 buruk"). Those breakdowns do NOT reliably
// sum to the row's JUMLAH TERSEDIA (e.g. one row has qty=49 but a note
// totalling 21) — so breakdowns are used only for their BAIK:RUSAK *ratio*,
// applied proportionally to the real quantity, not taken as an absolute
// count.
function classifyWord(word: string): 'BAIK' | 'RUSAK' | null {
	if (['baik', 'baru', 'lengkap'].includes(word)) return 'BAIK';
	// "tidak" standalone (e.g. "2 lengkap, 3 tidak") means "not [complete/good]"
	// and is just as much a bad-condition marker as "buruk"/"rusak" — it used
	// to only get caught when written as the two-word phrase "tidak lengkap"/
	// "tidak baik", so a lone "3 tidak" fell through unclassified and the
	// whole quantity silently defaulted to BAIK.
	if (['buruk', 'rusak', 'tidak'].includes(word)) return 'RUSAK';
	return null;
}

function splitAlatCondition(
	raw: string | null,
	qty: number,
	ctx: { item: string; brand: string | null; variant: string | null }
): { baik: number; rusak: number } {
	if (!raw) {
		logReview('Alat', ctx.item, ctx.brand, ctx.variant, 'KONDISI kosong, di-default BAIK');
		return { baik: qty, rusak: 0 };
	}

	let text = raw.toLowerCase().trim();
	// "tidak lengkap" / "tidak baik" are negations of a good word — normalize
	// to "rusak" up front so the classifier below doesn't misread them as good.
	text = text.replace(/tidak\s+lengkap/g, 'rusak').replace(/tidak\s+baik/g, 'rusak');

	// Inline numbered breakdown, e.g. "13 baru, 2 baik, 6 buruk"
	const numbered = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(baik|baru|lengkap|buruk|rusak|tidak)/g)];
	if (numbered.length > 0) {
		let goodCount = 0;
		let badCount = 0;
		for (const m of numbered) {
			const n = parseFloat(m[1].replace(',', '.'));
			if (classifyWord(m[2]) === 'BAIK') goodCount += n;
			else badCount += n;
		}
		const total = goodCount + badCount;
		if (total > 0) {
			const baik = Math.round((goodCount / total) * qty);
			logReview(
				'Alat',
				ctx.item,
				ctx.brand,
				ctx.variant,
				`KONDISI "${raw}" — rasio baik:rusak diterapkan proporsional ke qty=${qty} (bukan angka literal di teks, karena tidak selalu cocok dengan JUMLAH TERSEDIA)`
			);
			return { baik, rusak: qty - baik };
		}
	}

	// Single classifier word (possibly repeated / with noise around it)
	const words = text.match(/baik|baru|lengkap|buruk|rusak|tidak/g) ?? [];
	const classes = new Set(words.map(classifyWord).filter(Boolean));
	if (classes.size === 1) {
		const cls = [...classes][0];
		return cls === 'BAIK' ? { baik: qty, rusak: 0 } : { baik: 0, rusak: qty };
	}

	// Unrecognized or ambiguous (e.g. "10-26 (1 box)") — default BAIK, flagged
	logReview(
		'Alat',
		ctx.item,
		ctx.brand,
		ctx.variant,
		`KONDISI tidak dikenali: "${raw}" — di-default BAIK`
	);
	return { baik: qty, rusak: 0 };
}

// ─── "Bahan" (CONSUMABLE) unit mapping ──────────────────────────────────────
// item.baseUnit is a fixed enum (PCS/BOX/METER/ROLL/UNIT/BOTOL) that doesn't
// cover every SATUAN value in the sheet (pack, kotak, bungkus, jar, tube,
// kantong, lembar...). Mapped to the closest existing enum value; flagged so
// it's easy to find and correct in the UI afterward if the approximation
// isn't good enough for a given item.
function mapBahanUnit(
	satuan: string | null,
	ctx: { item: string }
): (typeof schema.item.$inferInsert)['baseUnit'] {
	const s = (satuan ?? '').toLowerCase().trim();
	const map: Record<string, (typeof schema.item.$inferInsert)['baseUnit']> = {
		pcs: 'PCS',
		botol: 'BOTOL',
		box: 'BOX',
		kotak: 'BOX',
		pack: 'BOX',
		bungkus: 'BOX',
		roll: 'ROLL'
	};
	if (map[s]) return map[s];

	// Some unmapped SATUAN values spell out a per-container multiplier, e.g.
	// "box(1 box isi 4)" or "box (30 pcs/box)" — JUMLAH TERSEDIA on those rows
	// is a count of *boxes*, not individual pieces. Defaulting straight to
	// PCS without saying so would silently understate real stock (e.g. "2
	// box(1 box isi 4)" -> stored as "2 PCS" instead of ~8 individual
	// pieces). Flagged with a louder, distinct message so it isn't mistaken
	// for a plain "unit name didn't match the enum" case.
	if (/\d/.test(s)) {
		logReview(
			'Bahan',
			ctx.item,
			null,
			null,
			`SATUAN "${satuan}" menyiratkan pengali per kemasan (isi per box/kotak) — JUMLAH TERSEDIA kemungkinan dihitung per kemasan, BUKAN per pcs; di-default unit PCS TANPA konversi, qty tidak dikalikan. Tinjau dan konversi manual jika perlu.`
		);
		return 'PCS';
	}

	logReview(
		'Bahan',
		ctx.item,
		null,
		null,
		`SATUAN "${satuan ?? '(kosong)'}" tidak ada di enum baseUnit — di-default PCS`
	);
	return 'PCS';
}

// ─── item upsert (shared) ────────────────────────────────────────────────────
const itemCache = new Map<string, string>(); // "TYPE::name" -> item.id

async function upsertItem(
	name: string,
	type: 'ASSET' | 'CONSUMABLE',
	baseUnit: (typeof schema.item.$inferInsert)['baseUnit']
): Promise<string> {
	const cacheKey = `${type}::${name}`;
	if (itemCache.has(cacheKey)) return itemCache.get(cacheKey)!;

	const existing = await db.query.item.findFirst({
		where: and(eq(schema.item.name, name), eq(schema.item.type, type))
	});

	let itemId: string;
	if (existing) {
		itemId = existing.id;
	} else {
		itemId = crypto.randomUUID();
		if (!DRY_RUN) {
			await db.insert(schema.item).values({
				id: itemId,
				name,
				type,
				baseUnit,
				minStock: 0
			});
		}
	}
	itemCache.set(cacheKey, itemId);
	return itemId;
}

// ─── Alat (ASSET) import ─────────────────────────────────────────────────────
// Columns (0-indexed): A=NO(0) B=URAIAN(1) C=MEREK(2) D=TIPE(3) E=JUMLAH(4) F=KONDISI(5)
// Header spans rows 1-2 (0-indexed 0-1), data starts row 3 (0-indexed 2).
//
// One physical brand/variant's KONDISI breakdown is sometimes typed across
// SEVERAL rows instead of one comma-separated cell (e.g. "46 baru" / "1
// baik" / "3 buruk" on three consecutive rows). The source file marks this
// by vertically merging the JUMLAH TERSEDIA cell across those rows, so Excel
// shows the same qty on each. Those rows are ONE entry with ONE real
// quantity — not three separate qty=50 batches — so they're detected via
// the sheet's own merge ranges (buildMergeGroupMap) and collapsed into a
// single entry before condition-splitting, instead of being processed
// row-by-row.
type AlatEntry = {
	name: string;
	brand: string | null;
	variant: string | null;
	qty: number;
	kondisiTexts: string[];
};

async function seedAlat(labId: string) {
	const wb = XLSX.readFile(FILE_PATH);
	const ws = wb.Sheets['Alat'];
	if (!ws) throw new Error('Sheet "Alat" tidak ditemukan di file');
	const grid = sheetToGrid(ws);
	const qtyMergeGroup = buildMergeGroupMap(ws, 4, grid.length); // column E = JUMLAH TERSEDIA

	let equipmentBatch: (typeof schema.equipment.$inferInsert)[] = [];
	let itemCount = 0;
	let equipmentCount = 0;

	const flush = async () => {
		if (equipmentBatch.length === 0) return;
		if (!DRY_RUN) await db.insert(schema.equipment).values(equipmentBatch);
		equipmentBatch = [];
	};

	const processEntry = async (entry: AlatEntry) => {
		const itemId = await upsertItem(entry.name, 'ASSET', 'UNIT');
		itemCount++;

		const combinedKondisi = entry.kondisiTexts.length > 0 ? entry.kondisiTexts.join(', ') : null;
		const { baik, rusak } = splitAlatCondition(combinedKondisi, entry.qty, {
			item: entry.name,
			brand: entry.brand,
			variant: entry.variant
		});

		for (let i = 0; i < baik; i++) {
			equipmentBatch.push({
				id: crypto.randomUUID(),
				itemId,
				brand: entry.brand,
				variant: entry.variant,
				laboratoriumId: labId,
				condition: 'BAIK',
				status: 'READY'
			});
		}
		for (let i = 0; i < rusak; i++) {
			equipmentBatch.push({
				id: crypto.randomUUID(),
				itemId,
				brand: entry.brand,
				variant: entry.variant,
				laboratoriumId: labId,
				condition: 'RUSAK',
				status: 'READY'
			});
		}
		equipmentCount += baik + rusak;

		if (equipmentBatch.length >= 500) await flush();
	};

	let openGroup: { groupId: number; entry: AlatEntry } | null = null;

	for (let r = 2; r < grid.length; r++) {
		const row = grid[r];
		const name = clean(row[1] as string);
		const brand = clean(row[2] as string);
		const variant = clean(row[3] as string);
		const kondisi = clean(row[5] as string);
		const { qty: qtyRaw, hadExtraText, raw: qtyRawText } = parseQtyCell(row[4]);

		if (!name) continue; // spacer/section rows with no item name — nothing to seed

		if (qtyRaw === null) {
			// Has a name but no readable quantity at all — previously dropped
			// with zero trace. Flag it: could be a genuine "0 on hand" gap in
			// the source, or a typo, but either way a human should know.
			logReview(
				'Alat',
				name,
				brand,
				variant,
				'JUMLAH TERSEDIA kosong/tidak terbaca — baris dilewati, tidak diimpor'
			);
			continue;
		}

		let qty = qtyRaw;
		if (!Number.isInteger(qty)) {
			logReview(
				'Alat',
				name,
				brand,
				variant,
				`JUMLAH TERSEDIA pecahan (${qty}) — dibulatkan ke ${Math.round(qty)}`
			);
			qty = Math.round(qty);
		}
		if (hadExtraText) {
			logReview(
				'Alat',
				name,
				brand,
				variant,
				`JUMLAH TERSEDIA "${qtyRawText}" mengandung teks selain angka — diambil angka depan (${Math.trunc(qtyRaw)}) sebagai qty; tinjau apakah ini benar jumlah unit individual atau jumlah kemasan (box/set)`
			);
		}
		if (qty <= 0) continue;

		const groupId = qtyMergeGroup[r];

		if (groupId !== null && openGroup && openGroup.groupId === groupId) {
			// Continuation of the same merged-qty entry — same physical
			// brand/variant, just another KONDISI fragment. Accumulate the
			// text, don't touch qty (it's the same merged value by definition),
			// and don't emit equipment yet.
			if (kondisi) openGroup.entry.kondisiTexts.push(kondisi);
			continue;
		}

		// Starting a new entry — flush whatever group was open first.
		if (openGroup) await processEntry(openGroup.entry);

		const entry: AlatEntry = {
			name,
			brand,
			variant,
			qty,
			kondisiTexts: kondisi ? [kondisi] : []
		};
		if (groupId !== null) {
			openGroup = { groupId, entry };
		} else {
			openGroup = null;
			await processEntry(entry);
		}
	}
	if (openGroup) await processEntry(openGroup.entry);
	await flush();

	console.log(`[Alat] ${itemCount} baris brand/tipe diproses -> ${equipmentCount} unit equipment`);
}

// ─── Bahan (CONSUMABLE) import ───────────────────────────────────────────────
// Columns (0-indexed): A=NO(0) B=URAIAN(1) C=MEREK(2) D=TIPE(3) E=JUMLAH(4)
// F=SATUAN(5) G=KONDISI(6). Single header row, data starts row 2 (0-indexed 1).
//
// stock's unique index is (itemId, laboratoriumId, brand, variant) — it does
// NOT include condition. Some rows in the sheet share the same item/brand/
// variant but differ only by a KONDISI split (e.g. "Disposable diagnostik
// set": 16 units "lengkap/baru" + 53 units "Tidak lengkap/lama", both with
// no brand/variant). Those get aggregated into one stock row: quantities
// summed, condition notes joined, so the total on-hand count stays correct
// even though the per-condition breakdown becomes a combined note rather
// than two separate rows.
async function seedBahan(labId: string) {
	const wb = XLSX.readFile(FILE_PATH);
	const ws = wb.Sheets['Bahan'];
	if (!ws) throw new Error('Sheet "Bahan" tidak ditemukan di file');
	const grid = sheetToGrid(ws);

	type Agg = {
		itemName: string;
		brand: string | null;
		variant: string | null;
		qty: number;
		conditions: string[];
		unit: string | null;
	};
	const aggregated = new Map<string, Agg>();

	for (let r = 1; r < grid.length; r++) {
		const row = grid[r];
		const name = clean(row[1] as string);
		const brand = clean(row[2] as string);
		const variant = clean(row[3] as string);
		const satuan = clean(row[5] as string);
		const kondisi = clean(row[6] as string);
		const { qty: qtyRaw, hadExtraText, raw: qtyRawText } = parseQtyCell(row[4]);

		if (!name) continue;

		if (qtyRaw === null) {
			logReview(
				'Bahan',
				name,
				brand,
				variant,
				'JUMLAH TERSEDIA kosong/tidak terbaca — baris dilewati, tidak diimpor'
			);
			continue;
		}

		let qty = qtyRaw;
		if (!Number.isInteger(qty)) {
			logReview(
				'Bahan',
				name,
				brand,
				variant,
				`JUMLAH TERSEDIA pecahan (${qty}) — dibulatkan ke ${Math.round(qty)}`
			);
			qty = Math.round(qty);
		}
		if (hadExtraText) {
			logReview(
				'Bahan',
				name,
				brand,
				variant,
				`JUMLAH TERSEDIA "${qtyRawText}" mengandung teks selain angka — diambil angka depan (${Math.trunc(qtyRaw)}) sebagai qty; tinjau apakah ini benar jumlah unit individual atau jumlah kemasan (box/set)`
			);
		}
		if (qty <= 0) continue;

		const key = `${name}::${brand ?? ''}::${variant ?? ''}`;
		const existing = aggregated.get(key);
		if (existing) {
			existing.qty += qty;
			if (kondisi) existing.conditions.push(kondisi);
			logReview(
				'Bahan',
				name,
				brand,
				variant,
				`Baris duplikat item/brand/tipe digabung (stock tidak punya kolom kondisi unik) — qty dijumlahkan, kondisi digabung`
			);
		} else {
			aggregated.set(key, {
				itemName: name,
				brand,
				variant,
				qty,
				conditions: kondisi ? [kondisi] : [],
				unit: satuan
			});
		}
	}

	let itemCount = 0;
	let stockCount = 0;

	for (const agg of aggregated.values()) {
		const baseUnit = mapBahanUnit(agg.unit, { item: agg.itemName });
		const itemId = await upsertItem(agg.itemName, 'CONSUMABLE', baseUnit);
		itemCount++;

		const condition = agg.conditions.length > 0 ? agg.conditions.join('; ') : 'baik';

		if (!DRY_RUN) {
			// Relies on stock's real unique index (itemId, laboratoriumId, brand,
			// variant) rather than hand-rolled equality checks — MySQL's NULL !=
			// NULL semantics make matching nullable brand/variant columns via a
			// plain WHERE unreliable, but the unique index itself treats them
			// consistently for conflict detection.
			await db
				.insert(schema.stock)
				.values({
					id: crypto.randomUUID(),
					itemId,
					laboratoriumId: labId,
					qty: agg.qty,
					brand: agg.brand,
					variant: agg.variant,
					condition
				})
				.onDuplicateKeyUpdate({
					set: {
						qty: sql`${schema.stock.qty} + ${agg.qty}`,
						condition,
						updatedAt: new Date()
					}
				});
		}
		stockCount++;
	}

	console.log(`[Bahan] ${itemCount} item unik -> ${stockCount} baris stock`);
}

// ─── Reset (scoped to this lab only) ────────────────────────────────────────
// This import is a full resync from the spreadsheet, not an incremental
// append — re-running it should reproduce the spreadsheet's current state,
// not add to whatever's already in the DB (which is also how the previous
// run's inflated equipment counts would otherwise survive a re-seed).
// Deliberately does NOT touch `item` — that catalog is keyed by (name, type)
// with no lab column, so it's shared/global; other labs or a future re-run
// may still reference the same item rows, and leaving them in place is
// harmless (an item with zero equipment/stock rows just sits unused).
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
	console.log(`Import inventaris Preparasi dari: ${FILE_PATH}`);
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
	console.error('Import inventaris Preparasi gagal:', err);
	process.exit(1);
});
