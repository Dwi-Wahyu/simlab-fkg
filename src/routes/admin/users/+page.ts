import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch, url, data }) => {
	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';
	const search = url.searchParams.get('search') || '';

	const fetchUsers = async () => {
		const query = new URLSearchParams({ page, limit, search });
		const res = await fetch(`/api/admin/users?${query.toString()}`);
		if (res.status === 403) {
			throw error(403, 'Forbidden: Akses khusus Superadmin');
		}
		if (!res.ok) {
			throw new Error('Gagal memuat data pengguna');
		}
		return await res.json();
	};

	return {
		...data,
		usersPromise: fetchUsers()
	};
};
