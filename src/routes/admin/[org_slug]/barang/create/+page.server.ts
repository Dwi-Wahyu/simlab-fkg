// import { db } from '$lib/server/db';
// import { item } from '$lib/server/db/schema';
// import { error, fail } from '@sveltejs/kit';
// import type { Actions } from './$types';
// import { v4 as uuidv4 } from 'uuid';

// export const actions: Actions = {
// 	default: async ({ request }) => {
// 		try {
// 			const formData = await request.formData();
// 			const name = formData.get('name') as string;
// 			const baseUnit = formData.get('baseUnit') as 'PCS' | 'BOX' | 'METER' | 'ROLL' | 'UNIT';
// 			const description = formData.get('description') as string;

// 			if (!name || !baseUnit) throw error(400, 'Nama dan Satuan wajib diisi');

// 			await db.insert(item).values({
// 				id: uuidv4(),
// 				name,
// 				type: 'CONSUMABLE',
// 				baseUnit,
// 				description,
// 				createdAt: new Date()
// 			});

// 			return { success: true, message: 'Peminjaman berhasil diajukan' };
// 		} catch (error) {
// 			console.error('Error creating lending:', err);
// 			return fail(500, { message: 'Gagal membuat pengajuan peminjaman' });
// 		}
// 	}
// };

import { db } from '$lib/server/db';
import { item } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { v4 as uuidv4 } from 'uuid';

export const actions: Actions = {
	default: async ({ request, params }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const baseUnit = formData.get('baseUnit') as 'PCS' | 'BOX' | 'METER' | 'ROLL' | 'UNIT';
		const description = formData.get('description') as string;

		if (!name || !baseUnit) throw error(400, 'Nama dan Satuan wajib diisi');

		await db.insert(item).values({
			id: uuidv4(),
			name,
			type: 'CONSUMABLE',
			baseUnit,
			description,
			createdAt: new Date()
		});

		throw redirect(303, `/${params.org_slug}/barang`);
	}
};
