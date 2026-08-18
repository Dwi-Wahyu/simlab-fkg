export const LENDING_PURPOSE_MAP: Record<string, string> = {
	PRAKTIKUM: 'Praktikum',
	PENELITIAN_DOSEN: 'Penelitian Dosen',
	PENGABDIAN_MASYARAKAT: 'Pengabdian Masyarakat',
	PENELITIAN_MAHASISWA: 'Penelitian / Skripsi Mahasiswa',
	LOMBA: 'Lomba / Kompetisi',
	ORGANISASI_MAHASISWA: 'Kegiatan Organisasi Mahasiswa'
};

export const LENDING_STATUS_MAP: Record<string, string> = {
	DRAFT: 'Menunggu Verifikasi',
	APPROVED: 'Disetujui',
	REJECTED: 'Ditolak',
	DIPINJAM: 'Sedang Dipinjam',
	RETURNED: 'Dikembalikan'
};

/**
 * Format lending purpose enum to Indonesian text.
 */
export function formatLendingPurpose(purpose: string | null | undefined): string {
	if (!purpose) return '-';
	return LENDING_PURPOSE_MAP[purpose] || purpose.replace(/_/g, ' ');
}

/**
 * Format lending status enum to Indonesian text.
 */
export function formatLendingStatus(status: string | null | undefined): string {
	if (!status) return '-';
	return LENDING_STATUS_MAP[status] || status;
}

/**
 * Get status info object containing label and CSS badge classes for a given status.
 */
export function getLendingStatusInfo(status: string | null | undefined): {
	label: string;
	class: string;
} {
	switch (status) {
		case 'APPROVED':
			return {
				label: 'Disetujui',
				class: 'bg-blue-100 text-blue-800 border-blue-200'
			};
		case 'DIPINJAM':
			return {
				label: 'Sedang Dipinjam',
				class: 'bg-orange-100 text-orange-800 border-orange-200'
			};
		case 'RETURNED':
			return {
				label: 'Dikembalikan',
				class: 'bg-green-100 text-green-800 border-green-200'
			};
		case 'REJECTED':
			return {
				label: 'Ditolak',
				class: 'bg-red-100 text-red-800 border-red-200'
			};
		case 'DRAFT':
			return {
				label: 'Menunggu Verifikasi',
				class: 'bg-yellow-100 text-yellow-800 border-yellow-200'
			};
		default:
			return {
				label: status || 'Unknown',
				class: 'bg-gray-100 text-gray-800 border-gray-200'
			};
	}
}

export const PURPOSE_OPTIONS = [
	{ value: 'PRAKTIKUM', label: 'Praktikum' },
	{ value: 'PENELITIAN_DOSEN', label: 'Penelitian Dosen' },
	{ value: 'PENGABDIAN_MASYARAKAT', label: 'Pengabdian Masyarakat' },
	{ value: 'PENELITIAN_MAHASISWA', label: 'Penelitian / Skripsi Mahasiswa' },
	{ value: 'LOMBA', label: 'Lomba / Kompetisi' },
	{ value: 'ORGANISASI_MAHASISWA', label: 'Kegiatan Organisasi Mahasiswa' }
];

export const STATUS_OPTIONS = [
	{ value: 'semua', label: 'Semua Status' },
	{ value: 'dipinjam', label: 'Sedang Dipinjam' },
	{ value: 'menunggu', label: 'Menunggu / Disetujui' },
	{ value: 'selesai', label: 'Selesai / Ditolak' }
];
