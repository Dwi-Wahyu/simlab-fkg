import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

async function main() {
	console.log('Seeding logbook template fields...');

	const templates = await db.query.practicumLogbookTemplate.findMany();

	for (const tpl of templates) {
		const fields: Array<typeof schema.practicumLogbookTemplateField.$inferInsert> = [
			{
				templateId: tpl.id,
				placeholderKey: 'seriesName',
				label: 'Nama Seri Praktikum',
				valueType: 'text',
				source: 'auto',
				autoSourcePath: 'series.name',
				sortOrder: 0
			},
			{
				templateId: tpl.id,
				placeholderKey: 'studentName',
				label: 'Nama Mahasiswa',
				valueType: 'text',
				source: 'auto',
				autoSourcePath: 'student.name',
				sortOrder: 1
			},
			{
				templateId: tpl.id,
				placeholderKey: 'studentNim',
				label: 'NIM Mahasiswa',
				valueType: 'text',
				source: 'auto',
				autoSourcePath: 'student.username',
				sortOrder: 2
			},
			{
				templateId: tpl.id,
				placeholderKey: 'laboratoriumName',
				label: 'Nama Laboratorium',
				valueType: 'text',
				source: 'auto',
				autoSourcePath: 'series.laboratorium.name',
				defaultValue: '-',
				sortOrder: 3
			},
			{
				templateId: tpl.id,
				placeholderKey: 'fotoMahasiswa',
				label: 'Foto Mahasiswa',
				valueType: 'image',
				source: 'auto',
				autoSourcePath: 'student.image',
				sortOrder: 4
			}
			// tableLogbook TIDAK didaftarkan di sini — itu ditangani oleh
			// tableBuilderKey pada practicumLogbookTemplate (lihat 0.6).
		];

		for (const f of fields) {
			const existing = await db.query.practicumLogbookTemplateField.findFirst({
				where: (t, { and: andFn, eq: eqFn }) =>
					andFn(eqFn(t.templateId, tpl.id), eqFn(t.placeholderKey, f.placeholderKey))
			});
			if (existing) {
				console.log(`- Sudah ada: ${tpl.name} / ${f.placeholderKey}`);
				continue;
			}
			await db.insert(schema.practicumLogbookTemplateField).values(f);
			console.log(`+ Field ditambahkan: ${tpl.name} / ${f.placeholderKey}`);
		}
	}

	console.log('\nSeeding selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeder gagal:', err);
	process.exit(1);
});
