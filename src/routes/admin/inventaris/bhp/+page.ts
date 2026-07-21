import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch, url }) => {
	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';
	const search = url.searchParams.get('search') || '';
	const categoryId = url.searchParams.get('categoryId') || '';
	const laboratoriumId = url.searchParams.get('laboratoriumId') || '';
	const sort = url.searchParams.get('sort') || '';
	const view = url.searchParams.get('view') || '';

	const fetchData = async () => {
		const query = new URLSearchParams({ page, limit, search });
		if (categoryId) {
			query.set('categoryId', categoryId);
		}
		if (laboratoriumId) {
			query.set('laboratoriumId', laboratoriumId);
		}
		if (sort) {
			query.set('sort', sort);
		}
		if (view) {
			query.set('view', view);
		}
		const res = await fetch(`/api/admin/inventaris/bhp?${query.toString()}`);
		if (!res.ok) throw new Error('Gagal memuat data bahan');
		return await res.json();
	};

	return {
		bhpPromise: fetchData()
	};
};
