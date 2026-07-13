import { config } from 'dotenv';

config();

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
		username({
			maxUsernameLength: 40
		}),
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

export const LABORATORIUM_SEEDS = [
	{ name: 'Preparasi (lt 2)', slug: 'preparasi' },
	{ name: 'Terpadu (lt 4)', slug: 'terpadu' },
	{
		name: 'Frontier Dental Lab Research (lt 4)',
		slug: 'frontier_dental_lab_research'
	}
];

export async function seedLaboratorium(db: any) {
	console.log('Seeding 3 laboratorium + kepalaLab...');

	for (const lab of LABORATORIUM_SEEDS) {
		// 1. Upsert laboratorium by slug
		const existingLab = await db.query.laboratorium.findFirst({
			where: eq(authSchema.laboratorium.slug, lab.slug)
		});

		let labId: string;
		if (!existingLab) {
			labId = crypto.randomUUID();
			await db.insert(authSchema.laboratorium).values({
				id: labId,
				name: lab.name,
				slug: lab.slug,
				createdAt: new Date()
			});
			console.log(`- Lab dibuat: ${lab.name}`);
		} else {
			labId = existingLab.id;
			console.log(`- Lab sudah ada: ${lab.name}`);
		}

		// 2. Upsert a kepalaLab user for this specific lab
		const email = `kepalalab.${lab.slug}@unhas.ac.id`;
		const usernameSlug = `kepalalab.${lab.slug}`
			.replace(/[^a-zA-Z0-9_.]/g, '_')
			.replace(/[^a-zA-Z0-9]+$/, '');

		const existingUser = await db.query.user.findFirst({
			where: eq(authSchema.user.email, email)
		});

		let userId: string;
		if (!existingUser) {
			const userResponse = await auth.api.signUpEmail({
				body: {
					email,
					username: usernameSlug,
					password: process.env.DEFAULT_PASSWORD ?? 'password',
					name: `Kepala Lab ${lab.name}`
				}
			});
			if (!userResponse) {
				console.error(`Gagal membuat kepalaLab untuk ${lab.name}`);
				continue;
			}
			userId = userResponse.user.id;
			console.log(`  -> User kepalaLab dibuat: ${email}`);
		} else {
			userId = existingUser.id;
			const hashedPwd = await hashPassword(process.env.DEFAULT_PASSWORD ?? 'password');
			await db
				.update(authSchema.account)
				.set({ password: hashedPwd })
				.where(eq(authSchema.account.userId, userId));
			// Also sync username in case it was previously truncated
			await db
				.update(authSchema.user)
				.set({ username: usernameSlug } as any)
				.where(eq(authSchema.user.id, userId));
			console.log(`  -> User kepalaLab sudah ada, password & username direset: ${email}`);
		}

		await db
			.update(authSchema.user)
			.set({ role: 'kepalaLab' })
			.where(eq(authSchema.user.id, userId));

		// 3. Attach as laboratoriumMember with role kepalaLab
		const existingMember = await db.query.laboratoriumMember.findFirst({
			where: (m, { and, eq }) => and(eq(m.laboratoriumId, labId), eq(m.userId, userId))
		});

		if (!existingMember) {
			await db.insert(authSchema.laboratoriumMember).values({
				id: crypto.randomUUID(),
				laboratoriumId: labId,
				userId,
				role: 'kepalaLab',
				createdAt: new Date()
			});
			console.log(`  -> Ditambahkan sebagai kepalaLab member`);
		}
	}
}

async function main() {
	await seedLaboratorium(db);
	console.log('\nSeeding laboratorium selesai!');
	process.exit(0);
}

if (import.meta.main) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
