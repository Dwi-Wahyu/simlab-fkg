import { apiKey } from '@better-auth/api-key';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, customSession, organization, username } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
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
} from './auth.roles';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: 'mysql',
		schema: {
			...schema,
			organization: schema.laboratorium,
			member: schema.laboratoriumMember
		}
	}),
	emailAndPassword: { enabled: true },
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: true,
				defaultValue: 'user',
				input: true // Allow setting role during sign up if needed (seed)
			},
			displayUsername: {
				type: 'string',
				required: false
			}
		}
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24 // 1 day (every 1 day the session expiration is updated)
	},
	advanced: {
		disableOriginCheck: true
	},
	databaseHooks: {
		session: {
			create: {
				after: async (session) => {
					await db.insert(schema.auditLog).values({
						id: crypto.randomUUID(),
						userId: session.userId,
						action: 'LOGIN',
						tableName: 'session',
						recordId: session.id,
						newValue: JSON.stringify({
							ipAddress: session.ipAddress,
							userAgent: session.userAgent
						}),
						createdAt: new Date()
					});
				}
			}
		}
	},
	plugins: [
		admin({
			adminRoles: ['superadmin'],
			ac: accessControl,
			roles: {
				superadmin,
				koordinator,
				kepalaLab,
				instruktur,
				peneliti,
				teknisi,
				spmi,
				laboran
			}
		}),
		username({
			maxUsernameLength: 60
		}),
		apiKey(),
		organization({
			ac: accessControl,
			roles: {
				superadmin,
				koordinator,
				kepalaLab,
				instruktur,
				peneliti,
				teknisi,
				spmi,
				laboran
			}
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

			// Jika user tidak ditemukan di DB (kasus langka saat session masih ada tapi user dihapus)
			if (!userWithLab) {
				return { user, session };
			}

			const firstMember = userWithLab?.members?.[0];

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
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
