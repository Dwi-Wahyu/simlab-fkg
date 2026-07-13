import { relations, sql } from 'drizzle-orm';
import { mysqlTable, varchar, text, timestamp, boolean, index, int } from 'drizzle-orm/mysql-core';

export const softDeleteColumns = {
	isDeleted: boolean('is_deleted').default(false).notNull(),
	deletedAt: timestamp('deleted_at'),
	deletedBy: varchar('deleted_by', { length: 36 })
};

export const user = mysqlTable(
	'user',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 255 }).notNull(),
		username: varchar('username', { length: 255 }).notNull(),
		// DB-managed generated column (see drizzle/0008_soft_delete_partial_unique.sql). Never write to this.
		usernameActive: varchar('username_active', { length: 255 }).generatedAlwaysAs(
			sql`IF(\`is_deleted\` = 0, \`username\`, NULL)`,
			{ mode: 'stored' }
		),
		displayUsername: varchar('displayUsername', { length: 255 }),
		email: varchar('email', { length: 255 }).notNull(),
		// DB-managed generated column (see drizzle/0008_soft_delete_partial_unique.sql). Never write to this.
		emailActive: varchar('email_active', { length: 255 }).generatedAlwaysAs(
			sql`IF(\`is_deleted\` = 0, \`email\`, NULL)`,
			{ mode: 'stored' }
		),
		emailVerified: boolean('email_verified').default(false).notNull(),
		role: varchar('role', { length: 255 }).notNull(),
		image: text('image'),
		banned: boolean('banned'),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		...softDeleteColumns
	},
	(table) => [index('user_is_deleted_idx').on(table.isDeleted)]
);

export const session = mysqlTable(
	'session',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		expiresAt: timestamp('expires_at', { fsp: 3 }).notNull(),
		token: varchar('token', { length: 255 }).notNull().unique(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const apiKey = mysqlTable(
	'api_key',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		key: varchar('key', { length: 255 }).notNull().unique(),
		name: text('name'),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		expiresAt: timestamp('expires_at', { fsp: 3 }),
		lastUsedAt: timestamp('last_used_at', { fsp: 3 })
	},
	(table) => [index('api_key_userId_idx').on(table.userId)]
);

export const account = mysqlTable(
	'account',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', { fsp: 3 }),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { fsp: 3 }),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = mysqlTable(
	'verification',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		identifier: varchar('identifier', { length: 255 }).notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at', { fsp: 3 }).notNull(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

// Laboratorium as organization
export const laboratorium = mysqlTable(
	'laboratorium',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: text('name').notNull(),
		slug: varchar('slug', { length: 255 }),
		// DB-managed generated column (see drizzle/0008_soft_delete_partial_unique.sql). Never write to this.
		slugActive: varchar('slug_active', { length: 255 }).generatedAlwaysAs(
			sql`IF(\`is_deleted\` = 0, \`slug\`, NULL)`,
			{ mode: 'stored' }
		),
		logo: text('logo'),
		capacity: int('capacity').default(0),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		metadata: text('metadata'),
		...softDeleteColumns
	},
	(table) => [index('laboratorium_is_deleted_idx').on(table.isDeleted)]
);

// Tabel Member Laboratorium
export const laboratoriumMember = mysqlTable('laboratorium_member', {
	id: varchar('id', { length: 36 }).primaryKey(),
	laboratoriumId: varchar('laboratorium_id', { length: 36 }).references(() => laboratorium.id, {
		onDelete: 'cascade'
	}),
	userId: varchar('user_id', { length: 36 }).references(() => user.id, { onDelete: 'cascade' }),
	role: varchar('role', { length: 255 }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	})
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	})
}));

export const laboratoriumMemberRelations = relations(laboratoriumMember, ({ one }) => ({
	user: one(user, {
		fields: [laboratoriumMember.userId],
		references: [user.id]
	}),
	laboratorium: one(laboratorium, {
		fields: [laboratoriumMember.laboratoriumId],
		references: [laboratorium.id]
	})
}));

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
	user: one(user, {
		fields: [apiKey.userId],
		references: [user.id]
	})
}));
