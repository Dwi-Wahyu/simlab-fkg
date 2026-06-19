import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch, url }) => {
	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';
	const search = url.searchParams.get('search') || '';

	const fetchData = async () => {
		const query = new URLSearchParams({ page, limit, search });
		const res = await fetch(`/api/admin/inventaris/alat?${query.toString()}`);
		if (!res.ok) throw new Error('Gagal memuat data alat');
		return await res.json();
	};

	return {
		alatPromise: fetchData()
	};
};
