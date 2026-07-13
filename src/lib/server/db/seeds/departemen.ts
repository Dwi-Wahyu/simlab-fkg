import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema, mode: 'default' });

export const DEPARTEMEN_SEEDS = [
	'Departemen Biologi Oral',
	'Departemen Ilmu Bahan dan Teknologi',
	'Departemen Ilmu Kedokteran Gigi Anak',
	'Departemen Ilmu Kedokteran Gigi Masyarakat - Pencegahan',
	'Departemen Ilmu Penyakit Mulut',
	'Departemen Konservasi Gigi',
	'Departemen Oral and Maxillofacial Radiology',
	'Departemen Ortodonti',
	'Departemen Periodonsia',
	'Departemen Prostodonsia',
	'Departement Oral and Maxillofacial Surgery'
];

async function main() {
	console.log(`Seeding ${DEPARTEMEN_SEEDS.length} departemen...`);

	for (const depName of DEPARTEMEN_SEEDS) {
		let existingDep = await db.query.department.findFirst({
			where: eq(schema.department.name, depName)
		});

		if (!existingDep) {
			await db.insert(schema.department).values({
				id: crypto.randomUUID(),
				name: depName,
				createdAt: new Date()
			});
			console.log(`- Departemen dibuat: ${depName}`);
		} else {
			console.log(`- Departemen sudah ada: ${depName}`);
		}
	}

	console.log('\nSeeding departemen selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
