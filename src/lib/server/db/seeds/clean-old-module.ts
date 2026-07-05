import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { eq } from 'drizzle-orm';
import { config } from 'dotenv';
config();

async function main() {
	const client = mysql.createPool(process.env.DATABASE_URL ?? '');
	const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });
	const oldMod = await db.query.practicumModule.findFirst({
		where: eq(schema.practicumModule.name, 'CSL Bedah Minor - Ekstraksi Gigi')
	});
	if (!oldMod) { console.log('Modul lama tidak ditemukan.'); await client.end(); return; }
	console.log('Menemukan modul lama: ' + oldMod.name + ' (ID: ' + oldMod.id + ')');
	const assessments = await db.query.practicumAssessment.findMany({ where: eq(schema.practicumAssessment.moduleId, oldMod.id) });
	if (assessments.length > 0) {
		console.log('SKIP: ' + assessments.length + ' assessment aktif terhubung.');
	} else {
		await db.delete(schema.practicumLogbookTemplate).where(eq(schema.practicumLogbookTemplate.moduleId, oldMod.id));
		await db.delete(schema.practicumModuleCriteria).where(eq(schema.practicumModuleCriteria.moduleId, oldMod.id));
		await db.delete(schema.practicumModule).where(eq(schema.practicumModule.id, oldMod.id));
		console.log('Modul lama berhasil dihapus.');
	}
	await client.end();
}
main().catch(err => { console.error('Gagal:', err); process.exit(1); });
