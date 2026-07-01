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

interface Params {
	groups: Group[];
	students: Student[];
	getScore: (studentId: string, scheduleId: string, moduleId: string) => number | string | null;
}

export function buildRekapWorkbookBuffer({ groups, students, getScore }: Params): Buffer {
	const columns = groups.flatMap((g) => g.columns);

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

	const rows: (string | number)[][] = [headerRow1, headerRow2];
	students.forEach((s, i) => {
		const scores = columns.map((c) => getScore(s.userId, c.scheduleId, c.moduleId));
		const valid = scores.filter((v): v is number => typeof v === 'number');
		const avg = valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : '';
		rows.push([i + 1, s.username, s.name, ...scores.map((v) => v ?? ''), avg]);
	});

	const ws = XLSX.utils.aoa_to_sheet(rows);
	ws['!merges'] = merges;
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Rekapitulasi Nilai');
	return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
