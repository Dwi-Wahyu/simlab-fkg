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
 *   in `stock.condition` (free text column, no enum to fight with) — and
 *   inserts one `stock_batch` row per SOURCE ROW that fed that `stock` row
 *   (qty = initialQty = that row's qty), with `expiryDate` parsed from
 *   "EXP. DATE" where unambiguous (see fix #8 below), so `stock.qty` stays
 *   a true aggregate of its batches per the stock_batch design.
 * - Every item name gets registered in the `item` catalog even when its
 *   qty can't be read (0 stock/0 equipment in that case) — see fix #6.
 *   Getting every name into inventory is the priority; stock/batches can be
 *   corrected manually afterward.
 * - "Rencana Pengadaan baru" sheet is intentionally NOT read (out of scope
 *   per instruction — that's procurement planning, not current inventory).
 * - "PENGGUNAAN BLOK ... SEMESTER ..." columns on both sheets are NOT
 *   imported — there's no schedule-usage column on `stock`/`equipment` yet
 *   to put it in. Revisit if/when that's added. (EXP. DATE, unlike that
 *   column, now IS imported — see fix #8.)
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
 * 6. CRITICAL — rows with an unreadable JUMLAH TERSEDIA (e.g. all
 *    "stainless steel crown" rows, "Chisel", "caries indikator") used to
 *    `continue` before ever calling upsertItem, so the item's NAME never
 *    reached the `item` catalog at all — not just "zero stock", genuinely
 *    absent from inventory. Fixed: the item is now always registered (with
 *    0 stock/0 equipment), only the qty-bearing row is skipped. Getting
 *    every name into inventory is the priority; stock/batches can be
 *    corrected manually afterward.
 * 7. `stock_batch` (added after this script was first written — see
 *    module-12-bhp-expiry-date-batch-tracking.md) was not populated at all;
 *    `stock.qty` was written directly with no batch rows backing it, so
 *    `stock.qty` (meant to be a fast aggregate of its batches) silently
 *    stopped being one, and the BHP detail page (which reads batches) would
 *    show an item with stock but an empty batch list. Fixed: every source
 *    row that contributes qty to a `stock` row now gets its own
 *    `stock_batch` row (qty = initialQty = that row's qty), instead of
 *    being flattened into just a combined text note. This also means what
 *    used to be logged as "duplicate rows merged" is now genuinely
 *    preserved as separate batches under one aggregated `stock` row — no
 *    information is lost, it just moved from a text note to real rows.
 * 8. The sheet's EXP. DATE column (previously not imported — no column to
 *    put it in) is now parsed into `stock_batch.expiryDate` where it's
 *    unambiguous: a real Excel date, "MM/YY", "MM-YY", or "YYYY-MM"/"YYYY/MM".
 *    Bare years ("2025"), unrecognizable numbers, and cells describing
 *    several sub-batches at once (e.g. "2 pack 03/29 3 pack 08/29") are left
 *    null and logged for manual review rather than guessed at — same
 *    "log, don't guess" policy as the KONDISI classifier.
 * 9. Stock upsert switched from `onDuplicateKeyUpdate` (relying on the
 *    unique index on itemId/laboratoriumId/brand/variant) to an explicit
 *    find-then-insert/update. MySQL unique indexes treat NULL as distinct
 *    from NULL, so two rows that both have a null brand/variant do NOT
 *    collide on that index — onDuplicateKeyUpdate would silently insert a
 *    second row instead of updating the first for any such item. In
 *    practice the in-memory aggregation map already prevented this within a
 *    single run, but the explicit lookup is also what's needed to get the
 *    real `stock.id` to attach `stock_batch` rows to, so both problems are
 *    fixed by the same change.
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

// Strips Unicode "format" characters (category Cf: word joiner, zero-width
// space/non-joiner/joiner, BOM, etc.) and normalizes non-breaking spaces to
// regular ones before trimming/collapsing whitespace. Source data has at
// least one name ("micro applicator / microbrush") with a leading U+2060
// WORD JOINER that's invisible in Excel but is still a real character in
// the cell string — left in place, it wouldn't match a plainly-typed version
// of the same name (e.g. if someone re-adds the item manually later via the
// UI), silently fragmenting it into a second, separate `item` row.
function stripInvisible(s: string): string {
	return s
		.replace(/\p{Cf}/gu, '') // zero-width/word-joiner/BOM/format chars
		.replace(/\u00a0/g, ' ') // non-breaking space -> regular space
		.replace(/\s+/g, ' ')
		.trim();
}

function clean(v: string | number | null): string | null {
	if (v === null || v === undefined) return null;
	const s = stripInvisible(String(v));
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

// ─── "EXP. DATE" parsing (Bahan sheet only) ──────────────────────────────────
// Free-text/mixed-type column, same spirit as KONDISI: parse what's
// unambiguous, log and leave null what isn't, never guess a split we can't
// verify. Handles:
//  - a real Excel date (arrives as a JS Date when the workbook is read with
//    `cellDates: true`, which main() below now does)
//  - "MM/YY", "MM-YY" (month first, 2-4 digit year) -> last day of that month
//  - "YYYY-MM", "YYYY/MM" (year first) -> last day of that month
// Left null + logged (never guessed):
//  - a bare year with no month ("2025") — not precise enough for a real date
//  - a number that isn't a recognizable date at all (e.g. stray "97")
//  - cells describing several sub-batches at once (e.g. "2 pack 03/29 3 pack
//    08/29 4 pack 10/29", "3 botol 02/29 1 botol 12/24") — splitting these
//    into separate batches would require guessing which fraction of the
//    row's JUMLAH TERSEDIA each sub-quantity corresponds to, same reasoning
//    as why KONDISI breakdowns are applied as a ratio, not literal counts
//  - anything else that doesn't cleanly match the patterns above
function parseExpiryCell(raw: string | number | Date | null): {
	expiryDate: string | null;
	issue: string | null;
} {
	if (raw === null || raw === undefined) return { expiryDate: null, issue: null };

	if (raw instanceof Date) {
		if (isNaN(raw.getTime())) return { expiryDate: null, issue: null };
		return { expiryDate: raw.toISOString().slice(0, 10), issue: null };
	}

	const s = String(raw).trim();
	if (s === '') return { expiryDate: null, issue: null };

	const lastDayOf = (year: number, month: number) => {
		const lastDay = new Date(year, month, 0).getDate();
		return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
	};

	if (/^\d{4}$/.test(s)) {
		return {
			expiryDate: null,
			issue: `EXP. DATE "${s}" hanya berupa tahun (tanpa bulan) — tidak cukup presisi untuk expiryDate, tinjau manual`
		};
	}

	if (/^-?\d+([.,]\d+)?$/.test(s)) {
		return {
			expiryDate: null,
			issue: `EXP. DATE "${s}" berupa angka yang tidak dikenali sebagai tanggal — tinjau manual`
		};
	}

	const monthFirstTokens = s.match(/\b\d{1,2}[/-]\d{2,4}\b/g) ?? [];
	const yearFirstTokens = s.match(/\b\d{4}[/-]\d{1,2}\b/g) ?? [];
	const totalTokens = monthFirstTokens.length + yearFirstTokens.length;

	if (totalTokens > 1) {
		return {
			expiryDate: null,
			issue: `EXP. DATE "${s}" berisi beberapa tanggal per sub-batch — tidak dipecah otomatis (perlu tahu proporsi qty per sub-batch), tinjau dan buat batch terpisah manual jika perlu`
		};
	}

	if (monthFirstTokens.length === 1) {
		const m = monthFirstTokens[0].match(/^(\d{1,2})[/-](\d{2,4})$/)!;
		const month = parseInt(m[1], 10);
		let year = parseInt(m[2], 10);
		if (year < 100) year += 2000;
		if (month >= 1 && month <= 12) {
			return { expiryDate: lastDayOf(year, month), issue: null };
		}
	}

	if (yearFirstTokens.length === 1) {
		const m = yearFirstTokens[0].match(/^(\d{4})[/-](\d{1,2})$/)!;
		const year = parseInt(m[1], 10);
		const month = parseInt(m[2], 10);
		if (month >= 1 && month <= 12) {
			return { expiryDate: lastDayOf(year, month), issue: null };
		}
	}

	return {
		expiryDate: null,
		issue: `EXP. DATE "${s}" tidak dikenali formatnya — tinjau manual`
	};
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
		if (!DRY_RUN) {
			await db.update(schema.item).set({ hideNewBadge: true }).where(eq(schema.item.id, itemId));
		}
	} else {
		itemId = crypto.randomUUID();
		if (!DRY_RUN) {
			await db.insert(schema.item).values({
				id: itemId,
				name,
				type,
 baseUnit,
				minStock: 0,
				hideNewBadge: true
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
		const {
			qty: qtyRaw,
			hadExtraText,
			raw: qtyRawText
		} = parseQtyCell(row[4] as string | number | null);

		if (!name) continue; // spacer/section rows with no item name — nothing to seed

		if (qtyRaw === null) {
			// Has a name but no readable quantity at all. The item is still
			// registered in the catalog (0 equipment units) — the priority is
			// every name existing in inventory; only the qty-bearing row is
			// skipped. Previously this `continue` ran before upsertItem, so
			// the name never reached the catalog at all.
			await upsertItem(name, 'ASSET', 'UNIT');
			itemCount++;
			logReview(
				'Alat',
				name,
				brand,
				variant,
				'JUMLAH TERSEDIA kosong/tidak terbaca — item didaftarkan ke katalog dengan 0 unit, baris qty dilewati (isi manual)'
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
		if (qty <= 0) {
			// Same "still register the name" rule as the unreadable-qty case.
			await upsertItem(name, 'ASSET', 'UNIT');
			itemCount++;
			logReview(
				'Alat',
				name,
				brand,
				variant,
				`JUMLAH TERSEDIA bernilai ${qty} setelah dibulatkan — item didaftarkan ke katalog dengan 0 unit`
			);
			continue;
		}

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
// F=SATUAN(5) G=KONDISI(6) H=EXP. DATE(7). Single header row, data starts
// row 2 (0-indexed 1).
//
// stock's unique index is (itemId, laboratoriumId, brand, variant) — it does
// NOT include condition or expiry. Several source rows can legitimately
// share the same item/brand/variant (a KONDISI split, or simply separate
// "Receive" events at different times with different expiry dates) — those
// are aggregated into one `stock` row for the qty total, but each source
// row keeps its own `stock_batch` row underneath (qty, its own expiryDate
// if parseable, its own condition note), instead of being flattened into
// just a combined text note. `stock.qty` is then a true sum of its batches.
async function seedBahan(labId: string) {
	const wb = XLSX.readFile(FILE_PATH, { cellDates: true });
	const ws = wb.Sheets['Bahan'];
	if (!ws) throw new Error('Sheet "Bahan" tidak ditemukan di file');
	const grid = sheetToGrid(ws);

	type BatchEntry = { qty: number; expiryDate: string | null; kondisi: string | null };
	type Agg = {
		itemName: string;
		brand: string | null;
		variant: string | null;
		qty: number;
		conditions: string[];
		unit: string | null;
		batches: BatchEntry[];
	};
	const aggregated = new Map<string, Agg>();

	for (let r = 1; r < grid.length; r++) {
		const row = grid[r];
		const name = clean(row[1] as string);
		const brand = clean(row[2] as string);
		const variant = clean(row[3] as string);
		const satuan = clean(row[5] as string);
		const kondisi = clean(row[6] as string);
		const {
			qty: qtyRaw,
			hadExtraText,
			raw: qtyRawText
		} = parseQtyCell(row[4] as string | number | null);

		if (!name) continue;

		if (qtyRaw === null) {
			// Item still goes into the catalog (0 stock) — the priority is
			// every name existing in inventory, not that every row carries a
			// usable qty. Previously this `continue` ran before upsertItem,
			// so the name never reached the catalog at all (e.g. all the
			// "stainless steel crown" / "caries indikator" rows).
			const baseUnit = mapBahanUnit(satuan, { item: name });
			await upsertItem(name, 'CONSUMABLE', baseUnit);
			logReview(
				'Bahan',
				name,
				brand,
				variant,
				'JUMLAH TERSEDIA kosong/tidak terbaca — item didaftarkan ke katalog dengan 0 stok, baris qty dilewati (isi manual)'
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
		if (qty <= 0) {
			const baseUnit = mapBahanUnit(satuan, { item: name });
			await upsertItem(name, 'CONSUMABLE', baseUnit);
			logReview(
				'Bahan',
				name,
				brand,
				variant,
				`JUMLAH TERSEDIA bernilai ${qty} setelah dibulatkan — item didaftarkan ke katalog dengan 0 stok`
			);
			continue;
		}

		const { expiryDate, issue: expiryIssue } = parseExpiryCell(
			row[7] as string | number | Date | null
		);
		if (expiryIssue) logReview('Bahan', name, brand, variant, expiryIssue);

		const key = `${name}::${brand ?? ''}::${variant ?? ''}`;
		const existing = aggregated.get(key);
		if (existing) {
			existing.qty += qty;
			if (kondisi) existing.conditions.push(kondisi);
			existing.batches.push({ qty, expiryDate, kondisi });
			logReview(
				'Bahan',
				name,
				brand,
				variant,
				`Baris duplikat item/brand/tipe digabung ke satu baris stock — qty dijumlahkan, kondisi digabung; masing-masing baris tetap jadi stock_batch terpisah`
			);
		} else {
			aggregated.set(key, {
				itemName: name,
				brand,
				variant,
				qty,
				conditions: kondisi ? [kondisi] : [],
				unit: satuan,
				batches: [{ qty, expiryDate, kondisi }]
			});
		}
	}

	let itemCount = 0;
	let stockCount = 0;
	let batchCount = 0;

	for (const agg of aggregated.values()) {
		const baseUnit = mapBahanUnit(agg.unit, { item: agg.itemName });
		const itemId = await upsertItem(agg.itemName, 'CONSUMABLE', baseUnit);
		itemCount++;

		const condition = agg.conditions.length > 0 ? agg.conditions.join('; ') : 'baik';

		if (!DRY_RUN) {
			// Explicit find-then-insert/update instead of onDuplicateKeyUpdate:
			// MySQL treats NULL as distinct from NULL in a unique index, so two
			// rows that both have a null brand/variant would NOT collide on
			// stock's unique index and onDuplicateKeyUpdate would silently
			// insert a second row instead of updating the first. This lookup
			// also gives us the real stock.id to attach stock_batch rows to.
			const existingStockRow = await db.query.stock.findFirst({
				where: (s, { eq: eqOp, and: andOp, isNull }) =>
					andOp(
						eqOp(s.itemId, itemId),
						eqOp(s.laboratoriumId, labId),
						agg.brand ? eqOp(s.brand, agg.brand) : isNull(s.brand),
						agg.variant ? eqOp(s.variant, agg.variant) : isNull(s.variant)
					)
			});

			let stockId: string;
			if (existingStockRow) {
				stockId = existingStockRow.id;
				await db
					.update(schema.stock)
					.set({
						qty: sql`${schema.stock.qty} + ${agg.qty}`,
						condition,
						updatedAt: new Date()
					})
					.where(eq(schema.stock.id, stockId));
			} else {
				stockId = crypto.randomUUID();
				await db.insert(schema.stock).values({
					id: stockId,
					itemId,
					laboratoriumId: labId,
					qty: agg.qty,
					brand: agg.brand,
					variant: agg.variant,
					condition
				});
			}

			for (const batch of agg.batches) {
				await db.insert(schema.stockBatch).values({
					stockId,
					qty: batch.qty,
					initialQty: batch.qty,
					expiryDate: batch.expiryDate,
					notes: batch.kondisi
						? `Kondisi asal (impor seed): ${batch.kondisi}`
						: 'Diimpor dari file inventaris (seed)'
				});
				batchCount++;
			}
		} else {
			batchCount += agg.batches.length;
		}
		stockCount++;
	}

	console.log(
		`[Bahan] ${itemCount} item unik -> ${stockCount} baris stock, ${batchCount} baris stock_batch`
	);
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
