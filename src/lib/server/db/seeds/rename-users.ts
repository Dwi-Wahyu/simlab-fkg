import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

async function main() {
	console.log('Running user display name mapping updates...');

	try {
		// Update username 'koordinator' to "PJ Mata Kuliah"
		await db
			.update(authSchema.user)
			.set({ name: 'PJ Mata Kuliah' })
			.where(eq(authSchema.user.username, 'koordinator'));
		console.log('- Updated username "koordinator" name to "PJ Mata Kuliah"');

		// Update username 'peneliti' to "Mahasiswa"
		await db
			.update(authSchema.user)
			.set({ name: 'Mahasiswa' })
			.where(eq(authSchema.user.username, 'peneliti'));
		console.log('- Updated username "peneliti" name to "Mahasiswa"');

		console.log('Update complete.');
		process.exit(0);
	} catch (err) {
		console.error('Update failed:', err);
		process.exit(1);
	}
}

main();
