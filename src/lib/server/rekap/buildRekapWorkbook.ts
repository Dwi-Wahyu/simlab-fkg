import * as XLSX from 'xlsx';

interface Column {
	scheduleId: string;
	moduleId: string;
	subLabel: string;
}

interface Group {
	title: string;
	singleColumn: boolean;
	columns: Column[];
}

interface Student {
	userId: string;
	username: string;
	name: string;
}

interface RekapSheet {
	sheetName: string;      // e.g. "Kelompok 1", or "Tanpa Kelompok"
	penilai: string;        // e.g. "Budi Santoso, S.Ked" or "-" if none assigned
	students: Student[];
}

interface Params {
	groups: Group[];
	sheets: RekapSheet[];
	getScore: (studentId: string, scheduleId: string, moduleId: string) => number | string | null;
}

function buildHeaderRows(groups: Group[]): {
	headerRow1: (string | number)[];
	headerRow2: (string | number)[];
	merges: XLSX.Range[];
} {
	const headerRow1: (string | number)[] = ['No', 'NIM', 'Nama Mahasiswa'];
	const headerRow2: (string | number)[] = ['', '', ''];
	const merges: XLSX.Range[] = [];
	let colCursor = 3; // 0-indexed, after No/NIM/Nama

	for (const g of groups) {
		headerRow1.push(g.title);
		for (let i = 1; i < g.columns.length; i++) headerRow1.push('');
		if (g.singleColumn) {
			merges.push({ s: { r: 0, c: colCursor }, e: { r: 1, c: colCursor } });
			headerRow2.push('');
		} else {
			merges.push({ s: { r: 0, c: colCursor }, e: { r: 0, c: colCursor + g.columns.length - 1 } });
			for (const c of g.columns) headerRow2.push(c.subLabel);
		}
		colCursor += g.columns.length;
	}
	headerRow1.push('Rata-rata');
	headerRow2.push('');
	merges.push({ s: { r: 0, c: colCursor }, e: { r: 1, c: colCursor } });
	merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
	merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
	merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });

	return { headerRow1, headerRow2, merges };
}

function sanitizeSheetName(name: string, used: Set<string>): string {
	let clean = name.replace(/[:\\\/\?\*\[\]]/g, '').slice(0, 31).trim() || 'Sheet';
	let candidate = clean;
	let i = 2;
	while (used.has(candidate)) {
		const suffix = ` (${i})`;
		candidate = clean.slice(0, 31 - suffix.length) + suffix;
		i++;
	}
	used.add(candidate);
	return candidate;
}

export function buildRekapWorkbookBuffer({ groups, sheets, getScore }: Params): Buffer {
	const wb = XLSX.utils.book_new();
	const columns = groups.flatMap((g) => g.columns);

	if (sheets.length === 0) {
		const { headerRow1, headerRow2, merges } = buildHeaderRows(groups);
		const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2]);
		ws['!merges'] = merges;
		XLSX.utils.book_append_sheet(wb, ws, 'Rekapitulasi Nilai');
	} else {
		const usedNames = new Set<string>();
		for (const sheet of sheets) {
			const { headerRow1, headerRow2, merges } = buildHeaderRows(groups);
			const titleRow = [`Penilai (DPJP): ${sheet.penilai}`];

			// Shift merges by +1 row and add title merge
			const shiftedMerges = merges.map((m) => ({
				s: { r: m.s.r + 1, c: m.s.c },
				e: { r: m.e.r + 1, c: m.e.c }
			}));
			shiftedMerges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: headerRow1.length - 1 } });

			// Student rows
			const studentRows: (string | number)[][] = [];
			sheet.students.forEach((s, i) => {
				const scores = columns.map((c) => getScore(s.userId, c.scheduleId, c.moduleId));
				const valid = scores.filter((v): v is number => typeof v === 'number');
				const avg = valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : '';
				studentRows.push([i + 1, s.username, s.name, ...scores.map((v) => v ?? ''), avg]);
			});

			const ws = XLSX.utils.aoa_to_sheet([titleRow, headerRow1, headerRow2, ...studentRows]);
			ws['!merges'] = shiftedMerges;

			const sanitizedName = sanitizeSheetName(sheet.sheetName, usedNames);
			XLSX.utils.book_append_sheet(wb, ws, sanitizedName);
		}
	}

	return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
