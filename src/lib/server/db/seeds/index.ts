import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { Faker, id_ID } from '@faker-js/faker';
import XLSX from 'xlsx';
import path from 'path';

const faker = new Faker({ locale: [id_ID] });

import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, admin, username, customSession } from 'better-auth/plugins';

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
import { eq } from 'drizzle-orm';

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

async function seedMahasiswa() {
	console.log('\nSedang melakukan seeding mahasiswa dari Excel...');
	const filePath = path.resolve('src/lib/server/db/seeds/list-mahasiswa-clean.xlsx');
	const workbook = XLSX.readFile(filePath);

	for (const sheetName of workbook.SheetNames) {
		console.log(`Memproses kelas: ${sheetName}`);
		const worksheet = workbook.Sheets[sheetName];
		// range: 1 means start from row 2
		const data = XLSX.utils.sheet_to_json<any>(worksheet, { header: 'A', range: 1 });

		// Ekstrak angka tahun dari nama yang sudah dibersihkan
		const yearMatch = sheetName.match(/\d+/);
		let batch = '2024'; // Default fallback

		if (yearMatch) {
			const yearStr = yearMatch[0];
			// Jika tahun hanya 2 digit (misal: "24"), ubah jadi "2024"
			batch = yearStr.length === 2 ? `20${yearStr}` : yearStr;
		}

		// Bersihkan nama kelas dari angka tahun
		const cleanClassName = sheetName.replace(/\d+/, '').trim();

		// Membuat format Tahun Akademik: "2024/2025"
		const academicYear = `${batch}/${parseInt(batch) + 1}`;

		const classId = crypto.randomUUID();
		await db.insert(schema.practicumClass).values({
			id: classId,
			name: cleanClassName,
			batch: batch,
			academicYear: academicYear
		});

		let count = 0;
		for (const row of data) {
			const nim = row['B'];
			const name = row['C'];

			if (!nim || !name || nim === 'NIM') continue;

			const email = `${nim.toLowerCase()}@student.unhas.ac.id`;
			const username = nim.toLowerCase();

			try {
				const userResponse = await auth.api.signUpEmail({
					body: {
						email: email,
						username: username,
						password: 'password123',
						name: name.toString().toUpperCase()
					}
				});

				if (userResponse) {
					await db
						.update(authSchema.user)
						.set({ role: 'peneliti' })
						.where(eq(authSchema.user.id, userResponse.user.id));

					await db.insert(schema.practicumClassMember).values({
						id: crypto.randomUUID(),
						classId: classId,
						userId: userResponse.user.id
					});
					count++;
				}
			} catch (e) {
				// Cek apakah user sudah ada (misal duplicate email/username)
				console.error(`Gagal membuat user ${nim}:`, e);
			}
		}
		console.log(`- Berhasil menambahkan ${count} mahasiswa ke kelas ${sheetName}`);
	}
}

async function main() {
	console.log('Sedang melakukan seeding...');

	console.log('Menghapus data lama...');
	await db.delete(schema.practicumClassMember);
	await db.delete(schema.practicumClass);
	await db.delete(schema.practicumScheduleModule);
	await db.delete(schema.practicumScheduleInstructor);
	await db.delete(schema.practicumSchedule);
	await db.delete(schema.practicumModule);
	await db.delete(schema.block);
	await db.delete(schema.department);
	await db.delete(schema.notification);
	await db.delete(schema.auditLog);
	await db.delete(schema.lendingItem);
	await db.delete(schema.lending);
	await db.delete(schema.equipment);
	await db.delete(schema.stock);
	await db.delete(schema.movement);
	await db.delete(schema.itemUnitConversion);
	await db.delete(schema.item);
	await db.delete(schema.warehouse);
	await db.delete(authSchema.laboratoriumMember);
	await db.delete(authSchema.session);
	await db.delete(authSchema.apiKey);
	await db.delete(authSchema.account);
	await db.delete(authSchema.user);
	await db.delete(authSchema.laboratorium);
	console.log('Data lama berhasil dihapus.');

	console.log('Mendaftarkan superadmin...');
	const signUpResponse = await auth.api.signUpEmail({
		body: {
			email: 'superadmin@gmail.com',
			username: 'superadmin',
			password: 'password123',
			name: 'Global Superadmin'
		}
	});

	if (!signUpResponse) throw new Error('Gagal mendaftarkan superadmin');

	const globalSuperadminId = signUpResponse.user.id;

	await db
		.update(authSchema.user)
		.set({ role: 'superadmin' })
		.where(eq(authSchema.user.id, globalSuperadminId));

	// Buat Laboratorium Utama secara langsung di DB untuk menghindari 401
	console.log('Membuat laboratorium...');
	const labIdMolar = crypto.randomUUID();
	const labIdPreMolar = crypto.randomUUID();
	await db.insert(authSchema.laboratorium).values({
		id: labIdMolar,
		name: 'Laboratorium Molar',
		slug: 'molar',
		createdAt: new Date()
	});

	await db.insert(authSchema.laboratorium).values({
		id: labIdPreMolar,
		name: 'Laboratorium Premolar',
		slug: 'premolar',
		createdAt: new Date()
	});

	// Jadikan superadmin sebagai owner di laboratorium tersebut
	await db.insert(authSchema.laboratoriumMember).values({
		id: crypto.randomUUID(),
		laboratoriumId: labIdMolar,
		userId: globalSuperadminId,
		createdAt: new Date(),
		role: 'superadmin'
	});

	await db.insert(authSchema.laboratoriumMember).values({
		id: crypto.randomUUID(),
		laboratoriumId: labIdPreMolar,
		userId: globalSuperadminId,
		createdAt: new Date(),
		role: 'superadmin'
	});

	console.log('Laboratorium dan Superadmin berhasil dibuat.');

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
		const deptId = crypto.randomUUID();

		// Insert Departemen
		await db.insert(schema.department).values({
			id: deptId,
			name: dept.name
		});

		// Insert Blok yang sesuai dengan departemen tersebut
		for (const blockName of dept.blocks) {
			const blockId = crypto.randomUUID();
			await db.insert(schema.block).values({
				id: blockId,
				name: blockName,
				departmentId: deptId
			});

			// Insert Modul untuk setiap blok (minimal 1)
			await db.insert(schema.practicumModule).values({
				id: crypto.randomUUID(),
				name: `Modul 1 - Dasar ${blockName}`,
				description: `Pengenalan dasar-dasar pada materi ${blockName}`,
				blockId: blockId
			});

			await db.insert(schema.practicumModule).values({
				id: crypto.randomUUID(),
				name: `Modul 2 - Lanjutan ${blockName}`,
				description: `Pendalaman materi dan teknik ${blockName}`,
				blockId: blockId
			});
		}
	}

	// Loop untuk membuat User bagi setiap Role
	console.log('Membuat user untuk setiap role...');
	const roles = Object.keys(allAuthRoles);

	for (const roleName of roles) {
		if (roleName === 'superadmin') continue;

		const email = `${roleName.toLowerCase()}@gmail.com`;

		// Buat User lewat API agar password di-hash
		const userResponse = await auth.api.signUpEmail({
			body: {
				email: email,
				username: roleName.toLowerCase(),
				password: 'password123',
				name: faker.person.fullName()
			}
		});

		await db
			.update(authSchema.user)
			.set({ role: roleName })
			.where(eq(authSchema.user.id, userResponse.user.id));

		if (userResponse && roleName === 'koordinator') {
			// Tambahkan User ke Laboratorium dengan Role tersebut langsung ke DB
			await db.insert(authSchema.laboratoriumMember).values({
				id: crypto.randomUUID(),
				laboratoriumId: labIdMolar,
				userId: userResponse.user.id,
				role: roleName,
				createdAt: new Date()
			});

			console.log(`- Berhasil membuat user ${email} dengan role: ${roleName}`);
		}
	}

	await seedMahasiswa();

	console.log('Membuat data inventori (Warehouse, Item, Equipment)...');
	const warehouseId = crypto.randomUUID();
	await db.insert(schema.warehouse).values({
		id: warehouseId,
		name: 'Gudang Utama FKG',
		location: 'Lantai 1 Gedung A'
	});

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
		const itemId = crypto.randomUUID();
		await db.insert(schema.item).values({
			id: itemId,
			...itemData,
			createdAt: new Date()
		});

		// Buat 10 unit equipment untuk setiap item
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

	console.log('\nSeeding selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding gagal:', err);
	process.exit(1);
});
