import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { Faker, id_ID } from '@faker-js/faker';

const faker = new Faker({ locale: [id_ID] });

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
	spmi
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
	spmi
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

	console.log('Mendaftarkan superadmin...');
	const existingSuperadmin = await db.query.user.findFirst({
		where: eq(authSchema.user.email, 'superadmin@gmail.com')
	});

	let globalSuperadminId: string;

	if (!existingSuperadmin) {
		const signUpResponse = await auth.api.signUpEmail({
			body: {
				email: 'superadmin@gmail.com',
				username: 'superadmin',
				password: process.env.DEFAULT_PASSWORD ?? 'password',
				name: 'Global Superadmin'
			}
		});

		if (!signUpResponse) throw new Error('Gagal mendaftarkan superadmin');
		globalSuperadminId = signUpResponse.user.id;

		await db
			.update(authSchema.user)
			.set({ role: 'superadmin' })
			.where(eq(authSchema.user.id, globalSuperadminId));
	} else {
		globalSuperadminId = existingSuperadmin.id;
		const hashedPwd = await hashPassword(process.env.DEFAULT_PASSWORD ?? 'password');
		await db.update(authSchema.account)
			.set({ password: hashedPwd })
			.where(eq(authSchema.account.userId, globalSuperadminId));
		console.log('Password superadmin di-reset ke default.');
	}

	// Buat Laboratorium Utama secara langsung di DB untuk menghindari 401
	console.log('Membuat laboratorium...');
	const labs = [
		{ name: 'Laboratorium Molar', slug: 'molar' },
		{ name: 'Laboratorium Premolar', slug: 'premolar' }
	];

	const labIds: Record<string, string> = {};

	for (const labData of labs) {
		const existingLab = await db.query.laboratorium.findFirst({
			where: eq(authSchema.laboratorium.slug, labData.slug)
		});

		if (!existingLab) {
			const id = crypto.randomUUID();
			await db.insert(authSchema.laboratorium).values({
				id,
				...labData,
				createdAt: new Date()
			});
			labIds[labData.slug] = id;
		} else {
			labIds[labData.slug] = existingLab.id;
		}

		// Jadikan superadmin sebagai owner di laboratorium tersebut jika belum ada
		const existingMember = await db.query.laboratoriumMember.findFirst({
			where: and(
				eq(authSchema.laboratoriumMember.laboratoriumId, labIds[labData.slug]),
				eq(authSchema.laboratoriumMember.userId, globalSuperadminId)
			)
		});

		if (!existingMember) {
			await db.insert(authSchema.laboratoriumMember).values({
				id: crypto.randomUUID(),
				laboratoriumId: labIds[labData.slug],
				userId: globalSuperadminId,
				createdAt: new Date(),
				role: 'superadmin'
			});
		}
	}

	const labIdMolar = labIds['molar'];

	console.log('Laboratorium dan Superadmin berhasil diproses.');

	console.log('Membuat departemen dan blok...');
	const departmentData = [
		{
			name: 'Konservasi Gigi',
			blocks: ['Restorasi Gigi Direk', 'Endodontik Dasar', 'Estetika Dental']
		},
		{
			name: 'Periodonsia',
			blocks: ['Jaringan Periodontal Dasar', 'Penyakit Periodontal', 'Bedah Periodontal']
		},
		{
			name: 'Prostodonsia',
			blocks: ['Gigi Tiruan Lepasan', 'Gigi Tiruan Cekat', 'Rehabilitasi Stomatognatik']
		},
		{
			name: 'Ortodonsia',
			blocks: ['Tumbuh Kembang Kranial', 'Maloklusi & Diagnosis', 'Mekanoterapi Ortodonti']
		},
		{
			name: 'Bedah Mulut',
			blocks: ['Anestesi Lokal & Ekstraksi', 'Bedah Dentoalveolar', 'Trauma Maksilofasial']
		}
	];

	for (const dept of departmentData) {
		let existingDept = await db.query.department.findFirst({
			where: eq(schema.department.name, dept.name)
		});

		let deptId: string;
		if (!existingDept) {
			deptId = crypto.randomUUID();
			await db.insert(schema.department).values({
				id: deptId,
				name: dept.name
			});
		} else {
			deptId = existingDept.id;
		}

		// Insert Blok yang sesuai dengan departemen tersebut
		for (const blockName of dept.blocks) {
			let existingBlock = await db.query.block.findFirst({
				where: and(eq(schema.block.name, blockName), eq(schema.block.departmentId, deptId))
			});

			let blockId: string;
			if (!existingBlock) {
				blockId = crypto.randomUUID();
				await db.insert(schema.block).values({
					id: blockId,
					name: blockName,
					departmentId: deptId
				});
			} else {
				blockId = existingBlock.id;
			}

			// Insert Modul untuk setiap blok (minimal 1)
			const modules = [
				{
					name: `Modul 1 - Dasar ${blockName}`,
					description: `Pengenalan dasar-dasar pada materi ${blockName}`
				},
				{
					name: `Modul 2 - Lanjutan ${blockName}`,
					description: `Pendalaman materi dan teknik ${blockName}`
				}
			];

			for (const mod of modules) {
				const existingMod = await db.query.practicumModule.findFirst({
					where: and(eq(schema.practicumModule.name, mod.name), eq(schema.practicumModule.blockId, blockId))
				});

				if (!existingMod) {
					await db.insert(schema.practicumModule).values({
						id: crypto.randomUUID(),
						...mod,
						blockId: blockId
					});
				}
			}
		}
	}

	console.log('Membuat data inventori (Warehouse, Item, Equipment)...');
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

	const items = [
		{
			name: 'Dental Unit',
			type: 'ASSET' as const,
			equipmentType: 'DENTAL_UNIT' as const,
			baseUnit: 'UNIT' as const
		},
		{
			name: 'Autoclave',
			type: 'ASSET' as const,
			equipmentType: 'LAB_INSTRUMENT' as const,
			baseUnit: 'UNIT' as const
		},
		{
			name: 'Micromotor',
			type: 'ASSET' as const,
			equipmentType: 'INSTRUMENT' as const,
			baseUnit: 'UNIT' as const
		},
		{
			name: 'Scaler',
			type: 'ASSET' as const,
			equipmentType: 'INSTRUMENT' as const,
			baseUnit: 'UNIT' as const
		},
		{
			name: 'Light Cure',
			type: 'ASSET' as const,
			equipmentType: 'INSTRUMENT' as const,
			baseUnit: 'UNIT' as const
		}
	];

	for (const itemData of items) {
		let existingItem = await db.query.item.findFirst({
			where: eq(schema.item.name, itemData.name)
		});

		let itemId: string;
		if (!existingItem) {
			itemId = crypto.randomUUID();
			await db.insert(schema.item).values({
				id: itemId,
				...itemData,
				createdAt: new Date()
			});
		} else {
			itemId = existingItem.id;
		}

		// Buat 10 unit equipment untuk setiap item jika belum ada sama sekali
		const existingEquipments = await db.query.equipment.findMany({
			where: eq(schema.equipment.itemId, itemId)
		});

		if (existingEquipments.length === 0) {
			for (let i = 1; i <= 10; i++) {
				await db.insert(schema.equipment).values({
					id: crypto.randomUUID(),
					itemId: itemId,
					warehouseId: warehouseId,
					laboratoriumId: labIdMolar,
					serialNumber: `${itemData.name.substring(0, 3).toUpperCase()}-${faker.string.alphanumeric(8).toUpperCase()}`,
					brand: faker.company.name(),
					status: 'READY',
					condition: 'BAIK',
					createdAt: new Date()
				});
			}
		}
	}

	console.log('\nSeeding selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding gagal:', err);
	process.exit(1);
});
