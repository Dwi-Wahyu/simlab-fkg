import { config } from 'dotenv';

config();

import { Faker, id_ID } from '@faker-js/faker';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { hashPassword } from 'better-auth/crypto';
import { betterAuth } from 'better-auth/minimal';
import { admin, customSession, organization, username } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import {
	accessControl,
	instruktur,
	kepalaLab,
	koordinator,
	laboran,
	peneliti,
	spmi,
	superadmin,
	teknisi
} from '../../auth.roles';
import * as authSchema from '../auth.schema';
import * as schema from '../schema';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, {
	schema: { ...schema, ...authSchema },
	mode: 'default'
});

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

// Jumlah DPJP (instruktur) yang akan di-seed. Username/email: dpjp1..dpjp4
const DPJP_COUNT = 4;

async function main() {
	console.log(`Sedang melakukan seeding ${DPJP_COUNT} user DPJP (instruktur)...`);

	for (let i = 1; i <= DPJP_COUNT; i++) {
		const username = `dpjp${i}`;
		const email = `${username}@unhas.ac.id`;
		const name = `DPJP ${i}`;

		// Cek apakah user sudah ada
		const existingUser = await db.query.user.findFirst({
			where: eq(authSchema.user.email, email)
		});

		let userId: string;

		if (!existingUser) {
			// Buat User lewat API agar password di-hash
			const userResponse = await auth.api.signUpEmail({
				body: {
					email,
					username,
					password: process.env.DEFAULT_PASSWORD ?? 'password',
					name
				}
			});

			if (!userResponse) {
				console.error(`Gagal sign up email untuk ${username}`);
				continue;
			}
			userId = userResponse.user.id;
			console.log(`- Berhasil membuat user baru: ${email} (${name})`);
		} else {
			userId = existingUser.id;

			// Jika user sudah ada, update password secara langsung melalui database
			try {
				const hashedPwd = await hashPassword(process.env.DEFAULT_PASSWORD ?? 'password');

				await db
					.update(authSchema.account)
					.set({ password: hashedPwd })
					.where(eq(authSchema.account.userId, userId));

				console.log(`- User sudah ada, password di-reset: ${email}`);
			} catch (err) {
				console.log(`- User sudah ada: ${email} (Update password gagal: ${err})`);
			}
		}

		// Pastikan role-nya instruktur (DPJP)
		await db
			.update(authSchema.user)
			.set({ role: 'instruktur' })
			.where(eq(authSchema.user.id, userId));
	}

	console.log('\nSeeding user DPJP selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding user DPJP gagal:', err);
	process.exit(1);
});
