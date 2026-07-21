import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch, url }) => {
	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';
	const search = url.searchParams.get('search') || '';
	const laboratoriumId = url.searchParams.get('laboratoriumId') || '';
	const categoryId = url.searchParams.get('categoryId') || '';
	const sort = url.searchParams.get('sort') || '';
	const view = url.searchParams.get('view') || '';

	const fetchData = async () => {
		const query = new URLSearchParams({ page, limit, search });
		if (laboratoriumId) {
			query.set('laboratoriumId', laboratoriumId);
		}
		if (categoryId) {
			query.set('categoryId', categoryId);
		}
		if (sort) {
			query.set('sort', sort);
		}
		if (view) {
			query.set('view', view);
		}
		const res = await fetch(`/api/admin/inventaris/alat?${query.toString()}`);
		if (!res.ok) throw new Error('Gagal memuat data alat');
		return await res.json();
	};

	return {
		alatPromise: fetchData()
	};
};
