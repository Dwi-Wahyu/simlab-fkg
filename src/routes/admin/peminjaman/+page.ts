import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch, url, data }) => {
	const status = url.searchParams.get('status') || '';
	const q = url.searchParams.get('q') || '';

	const fetchLendings = async () => {
		const query = new URLSearchParams();
		if (status) query.set('status', status);
		if (q) query.set('q', q);

		const res = await fetch(`/api/admin/peminjaman?${query.toString()}`);
		if (!res.ok) {
			throw new Error('Gagal memuat data peminjaman');
		}
		const result = await res.json();
		return (result.lendings || []) as any[];
	};

	return {
		...(data || {}),
		lendingsPromise: fetchLendings()
	};
};
