/// file: src/routes/testing-spa/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch }) => {
	const fetchUsersWithDelay = async () => {
		// Jeda 2 detik
		await new Promise((resolve) => setTimeout(resolve, 2000));

		const res = await fetch('https://jsonplaceholder.typicode.com/users');

		if (!res.ok) {
			throw new Error('Gagal mengambil data dari API');
		}

		// PERBAIKAN: Parsing JSON ke dalam variabel terlebih dahulu
		// agar aman dan mencegah error "body stream already read"
		const result = await res.json();
		return result;
	};

	return {
		// PERBAIKAN: Tidak perlu lagi dibungkus dalam properti 'streamed'.
		// Langsung lempar sebagai usersPromise
		usersPromise: fetchUsersWithDelay()
	};
};
