import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { eq } from 'drizzle-orm';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

/**
 * Nama file template yang sudah ada di static/templates/logbook/
 * Hanya nama file, bukan path.
 */
const DEFAULT_TEMPLATE_FILE = 'TEMPLATE_LOGBOOK_PRAKTIKUM_SIMLAB.docx';

async function main() {
	console.log('Seeding template logbook...');

	const modules = await db.query.practicumModule.findMany({
		with: { block: true }
	});

	if (modules.length === 0) {
		console.log('Tidak ada modul. Jalankan seeder modul terlebih dahulu.');
		process.exit(1);
	}

	for (const mod of modules) {
		const existing = await db.query.practicumLogbookTemplate.findFirst({
			where: eq(schema.practicumLogbookTemplate.moduleId, mod.id)
		});

		if (existing) {
			console.log(`- Sudah ada: ${mod.name}`);
			if (!existing.tableBuilderKey) {
				await db
					.update(schema.practicumLogbookTemplate)
					.set({ tableBuilderKey: 'logbook-rowspan-table' })
					.where(eq(schema.practicumLogbookTemplate.id, existing.id));
				console.log(`  * tableBuilderKey diperbarui ke: logbook-rowspan-table`);
			}
			continue;
		}

		await db.insert(schema.practicumLogbookTemplate).values({
			id: crypto.randomUUID(),
			moduleId: mod.id,
			name: `Template Logbook — ${mod.name}`,
			// Hanya nama file; path lengkap di-resolve saat generate: static/templates/logbook/<fileName>
			templateFilePath: DEFAULT_TEMPLATE_FILE,
			tableBuilderKey: 'logbook-rowspan-table'
		});

		console.log(`+ Template ditambahkan: ${mod.name}`);
	}

	console.log('\nSeeding selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeder gagal:', err);
	process.exit(1);
});
