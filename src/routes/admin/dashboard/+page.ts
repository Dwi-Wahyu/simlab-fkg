// src/routes/admin/dashboard/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch, data }) => {
	const role = data.role;

	const fetchDashboard = async () => {
		const res = await fetch(`/api/admin/dashboard/${role}`);
		if (!res.ok) throw new Error('Gagal memuat data dashboard');
		return await res.json();
	};

	return {
		role,
		dashboardPromise: fetchDashboard()
	};
};
