import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq, and } from 'drizzle-orm';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema, mode: 'default' });

export const BLOK_MAPPINGS = [
	{ name: 'Penyakit Jaringan Lunak', departmentName: 'Departemen Ilmu Penyakit Mulut' },
	{
		name: 'Pencegahan dan Perawatan Gigi Anak',
		departmentName: 'Departemen Ilmu Kedokteran Gigi Anak'
	},
	{ name: 'Penyakit Periodontal', departmentName: 'Departemen Periodonsia' },
	{ name: 'Endodontik dan Terapi', departmentName: 'Departemen Konservasi Gigi' },
	{ name: 'Maloklusi', departmentName: 'Departemen Ortodonti' },
	{ name: 'Bedah Oromaksilofasial', departmentName: 'Departement Oral and Maxillofacial Surgery' },
	{ name: 'Gigi Tiruan Cekat', departmentName: 'Departemen Prostodonsia' },
	{ name: 'Anatomi dan Embriologi Gigi', departmentName: 'Departemen Biologi Oral' },
	{
		name: 'Ilmu Bahan dan Teknologi Ked. Gigi',
		departmentName: 'Departemen Ilmu Bahan dan Teknologi'
	},
	{ name: 'Penyakit Jaringan Keras Gigi', departmentName: 'Departemen Konservasi Gigi' },
	{ name: 'Bedah Minor', departmentName: 'Departement Oral and Maxillofacial Surgery' },
	{ name: 'Penyakit Jaringan Lunak 2', departmentName: 'Departemen Ilmu Penyakit Mulut' },
	{ name: 'Sistem Stomatognatik 2', departmentName: 'Departemen Biologi Oral' },
	{ name: 'Oral Rehabilitasi 1', departmentName: 'Departemen Prostodonsia' }
];

async function main() {
	console.log(`Seeding ${BLOK_MAPPINGS.length} blok...`);

	for (const mapping of BLOK_MAPPINGS) {
		// Cari ID departemen berdasarkan namanya
		const department = await db.query.department.findFirst({
			where: eq(schema.department.name, mapping.departmentName)
		});

		if (!department) {
			console.error(
				`Error: Departemen "${mapping.departmentName}" tidak ditemukan untuk blok "${mapping.name}"!`
			);
			continue;
		}

		let existingBlock = await db.query.block.findFirst({
			where: and(eq(schema.block.name, mapping.name), eq(schema.block.departmentId, department.id))
		});

		if (!existingBlock) {
			await db.insert(schema.block).values({
				id: crypto.randomUUID(),
				name: mapping.name,
				departmentId: department.id,
				createdAt: new Date()
			});
			console.log(`- Blok dibuat: ${mapping.name} (${mapping.departmentName})`);
		} else {
			console.log(`- Blok sudah ada: ${mapping.name} (${mapping.departmentName})`);
		}
	}

	console.log('\nSeeding blok selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
