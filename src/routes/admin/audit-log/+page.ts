import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch, url }) => {
	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';
	const startDate = url.searchParams.get('startDate') || '';
	const endDate = url.searchParams.get('endDate') || '';
	const role = url.searchParams.get('role') || 'ALL';
	const menu = url.searchParams.get('menu') || 'ALL';
	const action = url.searchParams.get('action') || 'ALL';

	const fetchData = async () => {
		const query = new URLSearchParams({
			page,
			limit,
			startDate,
			endDate,
			role,
			menu,
			action
		});
		const res = await fetch(`/api/admin/audit-log?${query.toString()}`);
		if (res.status === 403) {
			throw error(403, 'Forbidden: Akses khusus Superadmin');
		}
		if (!res.ok) {
			throw new Error('Gagal memuat data audit log');
		}
		return await res.json();
	};

	return {
		logsPromise: fetchData()
	};
};
