import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch, url }) => {
	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';
	const search = url.searchParams.get('search') || '';
	const categoryId = url.searchParams.get('categoryId') || '';
	const sort = url.searchParams.get('sort') || '';

	const fetchData = async () => {
		const query = new URLSearchParams({ page, limit, search });
		if (categoryId) {
			query.set('categoryId', categoryId);
		}
		if (sort) {
			query.set('sort', sort);
		}
		const res = await fetch(`/api/admin/inventaris/bhp?${query.toString()}`);
		if (!res.ok) throw new Error('Gagal memuat data bahan');
		return await res.json();
	};

	return {
		bhpPromise: fetchData()
	};
};
