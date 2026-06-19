import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch, params }) => {
	const fetchUserDetail = async () => {
		// Simulasi delay 2 detik untuk melihat skeleton loading
		await new Promise((resolve) => setTimeout(resolve, 2000));

		const res = await fetch(`https://jsonplaceholder.typicode.com/users/${params.id}`);

		if (!res.ok) {
			throw new Error('Gagal mengambil detail pengguna');
		}

		return await res.json();
	};

	return {
		userPromise: fetchUserDetail()
	};
};
