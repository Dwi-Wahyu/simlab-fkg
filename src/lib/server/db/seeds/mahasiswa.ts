import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import XLSX from 'xlsx';
import path from 'path';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, admin, username, customSession } from 'better-auth/plugins';
import { hashPassword } from 'better-auth/crypto';
import { eq, and } from 'drizzle-orm';

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

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

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
		const data = XLSX.utils.sheet_to_json<any>(worksheet, { header: 'A', range: 1 });

		const yearMatch = sheetName.match(/\d+/);
		let batch = '2024';

		if (yearMatch) {
			const yearStr = yearMatch[0];
			batch = yearStr.length === 2 ? `20${yearStr}` : yearStr;
		}

		const cleanClassName = sheetName.replace(/\d+/, '').trim();
		const academicYear = `${batch}/${parseInt(batch) + 1}`;

		let existingClass = await db.query.practicumClass.findFirst({
			where: and(
				eq(schema.practicumClass.batch, batch),
				eq(schema.practicumClass.name, cleanClassName)
			)
		});

		let classId: string;
		if (!existingClass) {
			classId = crypto.randomUUID();
			await db.insert(schema.practicumClass).values({
				id: classId,
				name: cleanClassName,
				batch: batch,
				academicYear: academicYear
			});
		} else {
			classId = existingClass.id;
		}

		let count = 0;
		for (const row of data) {
			const nim = row['B'];
			const name = row['C'];

			if (!nim || !name || nim === 'NIM') continue;

			const email = `${nim.toLowerCase()}@student.unhas.ac.id`;
			const username = nim.toLowerCase();

			try {
				const existingStudent = await db.query.user.findFirst({
					where: eq(authSchema.user.email, email)
				});

				if (!existingStudent) {
					const userResponse = await auth.api.signUpEmail({
						body: {
							email: email,
							username: username,
							password: process.env.DEFAULT_PASSWORD ?? 'password',
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

						await db.insert(schema.practicumLogbook).values({
							id: crypto.randomUUID(),
							userId: userResponse.user.id
						});
						count++;
					}
				} else {
					const hashedPwd = await hashPassword(process.env.DEFAULT_PASSWORD ?? 'password');
					await db.update(authSchema.account)
						.set({ password: hashedPwd })
						.where(eq(authSchema.account.userId, existingStudent.id));
				}
			} catch (e) {
				console.error(`Gagal membuat user ${nim}:`, e);
			}
		}
		console.log(`- Berhasil menambahkan ${count} mahasiswa ke kelas ${sheetName}`);
	}
}

async function seedLogbooks() {
	console.log('\nMemastikan semua peneliti memiliki logbook...');
	const allPeneliti = await db.query.user.findMany({
		where: eq(authSchema.user.role, 'peneliti')
	});

	console.log(`Ditemukan ${allPeneliti.length} user dengan role 'peneliti'.`);

	const allLogbooks = await db.query.practicumLogbook.findMany();
	const existingUserIds = new Set(allLogbooks.map((l) => l.userId));

	console.log(`Ditemukan ${existingUserIds.size} logbook yang sudah ada.`);

	let count = 0;
	for (const p of allPeneliti) {
		if (!existingUserIds.has(p.id)) {
			await db.insert(schema.practicumLogbook).values({
				id: crypto.randomUUID(),
				userId: p.id
			});
			count++;
		}
	}
	console.log(`- Berhasil memastikan ${count} logbook baru dibuat.`);
}

async function seedTestingPeneliti() {
	console.log('\nMemastikan akun testing peneliti tersedia...');
	const email = 'peneliti@unhas.ac.id';
	const username = 'peneliti';

	const existingUser = await db.query.user.findFirst({
		where: eq(authSchema.user.email, email)
	});

	let userId: string;

	if (!existingUser) {
		const userResponse = await auth.api.signUpEmail({
			body: {
				email: email,
				username: username,
				password: process.env.DEFAULT_PASSWORD ?? 'password',
				name: 'Mahasiswa Testing'
			}
		});

		if (userResponse) {
			userId = userResponse.user.id;
			await db
				.update(authSchema.user)
				.set({ role: 'peneliti' })
				.where(eq(authSchema.user.id, userId));
			console.log(`- Berhasil membuat akun testing peneliti (${username})`);
		} else {
			console.error(`- Gagal membuat akun testing peneliti`);
			return;
		}
	} else {
		userId = existingUser.id;
		const hashedPwd = await hashPassword(process.env.DEFAULT_PASSWORD ?? 'password');
		await db.update(authSchema.account)
			.set({ password: hashedPwd })
			.where(eq(authSchema.account.userId, userId));
		console.log(`- Akun testing peneliti (${username}) sudah ada, password di-reset`);
	}

	// Pastikan user ini masuk ke setidaknya satu kelas (ambil kelas pertama yang ada)
	const firstClass = await db.query.practicumClass.findFirst();
	if (firstClass) {
		const existingMember = await db.query.practicumClassMember.findFirst({
			where: and(
				eq(schema.practicumClassMember.classId, firstClass.id),
				eq(schema.practicumClassMember.userId, userId)
			)
		});

		if (!existingMember) {
			await db.insert(schema.practicumClassMember).values({
				id: crypto.randomUUID(),
				classId: firstClass.id,
				userId: userId
			});
			console.log(`- Menambahkan testing peneliti ke kelas ${firstClass.name}`);
		}
	}
}

async function seedKelompokMahasiswa() {
	console.log('\nSedang melakukan seeding kelompok mahasiswa...');
	const allClasses = await db.query.practicumClass.findMany();

	for (const cls of allClasses) {
		const groupsToCreate = ['Kelompok 1', 'Kelompok 2', 'Kelompok 3', 'Kelompok 4'];
		const groupIds: string[] = [];

		for (const name of groupsToCreate) {
			let existing = await db.query.kelompokMahasiswa.findFirst({
				where: and(
					eq(schema.kelompokMahasiswa.classId, cls.id),
					eq(schema.kelompokMahasiswa.name, name)
				)
			});

			let groupId: string;
			if (!existing) {
				groupId = crypto.randomUUID();
				await db.insert(schema.kelompokMahasiswa).values({
					id: groupId,
					name,
					classId: cls.id,
					createdAt: new Date()
				});
				console.log(`- Kelompok dibuat: ${name} untuk kelas ${cls.name} (${cls.batch})`);
			} else {
				groupId = existing.id;
			}
			groupIds.push(groupId);
		}

		// Distribute the class's members across the 4 groups
		const members = await db.query.practicumClassMember.findMany({
			where: eq(schema.practicumClassMember.classId, cls.id)
		});

		let addedCount = 0;
		for (let i = 0; i < members.length; i++) {
			const member = members[i];
			const assignedGroupId = groupIds[i % groupIds.length];

			const existingKmm = await db.query.kelompokMahasiswaMember.findFirst({
				where: and(
					eq(schema.kelompokMahasiswaMember.kelompokId, assignedGroupId),
					eq(schema.kelompokMahasiswaMember.userId, member.userId)
				)
			});

			if (!existingKmm) {
				await db.insert(schema.kelompokMahasiswaMember).values({
					id: crypto.randomUUID(),
					kelompokId: assignedGroupId,
					userId: member.userId,
					createdAt: new Date()
				});
				addedCount++;
			}
		}
		if (addedCount > 0) {
			console.log(`- Berhasil mendistribusikan ${addedCount} mahasiswa ke kelompok kelas ${cls.name}`);
		}
	}
}

async function main() {
	console.log('Sedang melakukan seeding mahasiswa...');
	await seedTestingPeneliti();
	await seedMahasiswa();
	await seedLogbooks();
	await seedKelompokMahasiswa();
	console.log('\nSeeding mahasiswa selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding mahasiswa gagal:', err);
	process.exit(1);
});
