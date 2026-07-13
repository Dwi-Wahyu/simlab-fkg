import { config } from 'dotenv';
config();

import fs from 'fs/promises';
import path from 'path';

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { seedLogbookTemplates } from './logbook-templates';
import { seedLaboratorium } from './laboratorium';

import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, admin, username, customSession } from 'better-auth/plugins';
import { hashPassword } from 'better-auth/crypto';

// Impor semua role dari auth.roles.ts
import {
	accessControl,
	superadmin,
	koordinator,
	kepalaLab,
	instruktur,
	peneliti,
	teknisi,
	spmi,
	laboran
} from '../../auth.roles';
import { eq, and } from 'drizzle-orm';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

// Daftarkan semua role di sini agar dikenali oleh better-auth
const allAuthRoles = {
	superadmin,
	koordinator,
	kepalaLab,
	instruktur,
	peneliti,
	teknisi,
	spmi,
	laboran
};

export const auth = betterAuth({
	baseURL: process.env.ORIGIN,
	secret: process.env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: 'mysql',
		schema: {
			...authSchema,
			...schema,
			organization: authSchema.laboratorium,
			member: authSchema.laboratoriumMember
		}
	}),
	emailAndPassword: { enabled: true, requireEmailVerification: false },
	plugins: [
		admin(),
		username(),
		organization({
			ac: accessControl,
			roles: allAuthRoles
		}),
		customSession(async ({ user, session }) => {
			const userWithLab = await db.query.user.findFirst({
				where: (u, { eq }) => eq(u.id, user.id),
				with: {
					members: {
						with: { laboratorium: true }
					}
				}
			});

			const firstMember = userWithLab?.members?.[0];

			if (!userWithLab) {
				return {
					user,
					session
				};
			}

			return {
				user: {
					...user,
					role: userWithLab.role,
					laboratorium: firstMember?.laboratorium
						? {
								id: firstMember.laboratorium.id,
								slug: firstMember.laboratorium.slug,
								name: firstMember.laboratorium.name,
								logo: firstMember.laboratorium.logo ?? ''
							}
						: null
				},
				session
			};
		})
	]
});

async function main() {
	console.log('Sedang melakukan seeding...');

	await seedLaboratorium(db);

	console.log('Membuat data inventori (Warehouse, Item, Equipment, Category)...');
	let existingWarehouse = await db.query.warehouse.findFirst({
		where: eq(schema.warehouse.name, 'Gudang Utama FKG')
	});

	let warehouseId: string;
	if (!existingWarehouse) {
		warehouseId = crypto.randomUUID();
		await db.insert(schema.warehouse).values({
			id: warehouseId,
			name: 'Gudang Utama FKG',
			location: 'Lantai 1 Gedung A'
		});
	} else {
		warehouseId = existingWarehouse.id;
	}

	// Seed Maintenance and Approval data
	console.log('Membuat data pemeliharaan dan persetujuan (approval) seeder...');
	const sampleEquip = await db.query.equipment.findFirst();
	if (sampleEquip) {
		const uploadsDir = path.resolve('static/uploads/receipts');
		await fs.mkdir(uploadsDir, { recursive: true });
		await fs.writeFile(path.join(uploadsDir, 'placeholder.pdf'), 'Placeholder receipt content');

		// Find a kepalaLab user
		const kepalaLabUser = await db.query.user.findFirst({
			where: eq(authSchema.user.role, 'kepalaLab')
		});

		const firstMaintDesc = 'Pemeliharaan Alat - Kerusakan Motor';
		const existingMaint = await db.query.maintenance.findFirst({
			where: eq(schema.maintenance.description, firstMaintDesc)
		});

		if (!existingMaint) {
			// 1. Pending Approval Maintenance
			const maintPendingId = crypto.randomUUID();
			await db.insert(schema.maintenance).values({
				id: maintPendingId,
				equipmentId: sampleEquip.id,
				maintenanceType: 'KOREKTIF',
				description: firstMaintDesc,
				scheduledDate: new Date(),
				completionDate: new Date(),
				status: 'COMPLETED',
				cost: 150000,
				notaFileName: 'placeholder.pdf',
				createdAt: new Date()
			});

			await db.insert(schema.approval).values({
				id: crypto.randomUUID(),
				referenceType: 'MAINTENANCE',
				referenceId: maintPendingId,
				status: 'PENDING',
				createdAt: new Date()
			});

			// 2. Approved Maintenance
			const maintApprovedId = crypto.randomUUID();
			await db.insert(schema.maintenance).values({
				id: maintApprovedId,
				equipmentId: sampleEquip.id,
				maintenanceType: 'KOREKTIF',
				description: 'Pemeliharaan Alat - Ganti Kabel',
				scheduledDate: new Date(),
				completionDate: new Date(),
				status: 'COMPLETED',
				cost: 200000,
				notaFileName: 'placeholder.pdf',
				createdAt: new Date()
			});

			await db.insert(schema.approval).values({
				id: crypto.randomUUID(),
				referenceType: 'MAINTENANCE',
				referenceId: maintApprovedId,
				status: 'APPROVED',
				approvedBy: kepalaLabUser?.id ?? null,
				note: 'Nota valid dan sesuai.',
				createdAt: new Date()
			});

			// 3. Rejected Maintenance
			const maintRejectedId = crypto.randomUUID();
			await db.insert(schema.maintenance).values({
				id: maintRejectedId,
				equipmentId: sampleEquip.id,
				maintenanceType: 'PREVENTIF',
				description: 'Pemeliharaan Berkala Tahunan',
				scheduledDate: new Date(),
				completionDate: new Date(),
				status: 'COMPLETED',
				cost: 50000,
				notaFileName: 'placeholder.pdf',
				createdAt: new Date()
			});

			await db.insert(schema.approval).values({
				id: crypto.randomUUID(),
				referenceType: 'MAINTENANCE',
				referenceId: maintRejectedId,
				status: 'REJECTED',
				approvedBy: kepalaLabUser?.id ?? null,
				note: 'Foto nota buram. Mohon unggah ulang.',
				createdAt: new Date()
			});

			console.log('  -> Berhasil seeding data pemeliharaan & approval!');
		}
	}

	console.log('Seeding logbook templates...');
	await seedLogbookTemplates(db);

	console.log('\nSeeding selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding gagal:', err);
	process.exit(1);
});
