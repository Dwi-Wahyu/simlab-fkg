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
	console.log('Sedang melakukan seeding user staff/admin...');

	// Get Preparasi Lab for assignment
	let labPreparasi = await db.query.laboratorium.findFirst({
		where: eq(authSchema.laboratorium.slug, 'preparasi')
	});

	if (!labPreparasi) {
		console.log('Lab Preparasi tidak ditemukan. Mohon jalankan db:seed terlebih dahulu.');
		process.exit(1);
	}

	const rolesToSeed = ['koordinator', 'instruktur', 'teknisi', 'spmi', 'laboran'];

	for (const roleName of rolesToSeed) {
		const isInstruktur = roleName === 'instruktur';
		const prefix = isInstruktur ? 'dpjp' : roleName.toLowerCase();
		const email = `${prefix}@unhas.ac.id`;

		// Cek apakah user sudah ada
		const existingUser = await db.query.user.findFirst({
			where: eq(authSchema.user.email, email)
		});

		let userId: string;

		if (!existingUser) {
			// Buat User lewat API agar password di-hash
			const userResponse = await auth.api.signUpEmail({
				body: {
					email: email,
					username: prefix,
					password: process.env.DEFAULT_PASSWORD ?? 'password',
					name: isInstruktur ? 'DPJP' : faker.person.fullName()
				}
			});

			if (!userResponse) {
				console.error(`Gagal sign up email untuk role ${roleName}`);
				continue;
			}
			userId = userResponse.user.id;
			console.log(`- Berhasil membuat user baru: ${email} (${roleName})`);
		} else {
			userId = existingUser.id;
			
			// Jika user sudah ada, update password secara langsung melalui database
			try {
				const hashedPwd = await hashPassword(process.env.DEFAULT_PASSWORD ?? 'password');
				
				await db.update(authSchema.account)
					.set({ password: hashedPwd })
					.where(eq(authSchema.account.userId, userId));
					
				console.log(`- User sudah ada, password di-reset: ${email} (${roleName})`);
			} catch (err) {
				console.log(`- User sudah ada: ${email} (${roleName}) (Update password gagal: ${err})`);
			}
		}

		await db
			.update(authSchema.user)
			.set({ role: roleName })
			.where(eq(authSchema.user.id, userId));

		if (roleName === 'teknisi' || roleName === 'laboran') {
			// Tambahkan User ke Laboratorium dengan Role tersebut jika belum ada
			const existingMember = await db.query.laboratoriumMember.findFirst({
				where: and(
					eq(authSchema.laboratoriumMember.laboratoriumId, labPreparasi.id),
					eq(authSchema.laboratoriumMember.userId, userId)
				)
			});

			if (!existingMember) {
				await db.insert(authSchema.laboratoriumMember).values({
					id: crypto.randomUUID(),
					laboratoriumId: labPreparasi.id,
					userId: userId,
					role: roleName,
					createdAt: new Date()
				});
				console.log(`  -> Ditambahkan sebagai member ke lab Preparasi`);
			}
		}
	}

	console.log('\nSeeding user staff/admin selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding user staff/admin gagal:', err);
	process.exit(1);
});
