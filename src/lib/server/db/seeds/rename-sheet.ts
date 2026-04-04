import * as XLSX from 'xlsx';

/**
 * Fungsi untuk membersihkan nama sheet
 */
function getNewSheetName(name: string): string {
	let cleaned = name.replace(/ABSEN/gi, '').trim();

	const mapping: { [key: string]: string } = {
		REG: 'REGULER',
		INTER: 'INTERNASIONAL'
	};

	Object.keys(mapping).forEach((key) => {
		const regex = new RegExp(`\\b${key}\\b`, 'g');
		cleaned = cleaned.replace(regex, mapping[key]);
	});

	return cleaned;
}

/**
 * Memproses dan mengganti nama sheet di dalam workbook
 */
function processAndRenameSheets(filePath: string) {
	const workbook = XLSX.readFile(filePath);

	// Kita buat array baru untuk SheetNames agar tidak terjadi konflik saat looping
	const originalSheetNames = [...workbook.SheetNames];

	originalSheetNames.forEach((oldName) => {
		const newName = getNewSheetName(oldName);

		console.log(`Mengubah: "${oldName}" -> "${newName}"`);

		// 1. Ambil data dari sheet lama
		const worksheet = workbook.Sheets[oldName];

		// 2. Jika nama berubah, pindahkan data ke key baru dan hapus yang lama
		if (oldName !== newName) {
			// Masukkan worksheet ke dalam key nama baru
			workbook.Sheets[newName] = worksheet;
			// Hapus key nama lama
			delete workbook.Sheets[oldName];

			// Perbarui nama di daftar SheetNames
			const index = workbook.SheetNames.indexOf(oldName);
			if (index !== -1) {
				workbook.SheetNames[index] = newName;
			}
		}

		// 3. Proses data (seperti permintaan sebelumnya)
		const data = XLSX.utils.sheet_to_json<any>(worksheet, {
			header: 'A',
			range: 1
		});

		console.log(`Data dari ${newName} berhasil diproses (${data.length} baris).`);
	});

	// Opsi: Simpan kembali ke file baru jika ingin melihat hasilnya
	XLSX.writeFile(workbook, 'src/lib/server/db/seeds/list-mahasiswa-clean.xlsx');
}

processAndRenameSheets('src/lib/server/db/seeds/list-mahasiswa.xlsx');
