import {
	mysqlTable,
	varchar,
	text,
	timestamp,
	boolean,
	mysqlEnum,
	index
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { organization, user } from './auth.schema';

export const auditLog = mysqlTable('audit_log', {
	id: varchar('id', { length: 36 }).primaryKey(),

	userId: varchar('user_id', { length: 36 }).references(() => user.id),

	action: varchar('action', { length: 50 }),
	tableName: varchar('table_name', { length: 50 }),

	recordId: varchar('record_id', { length: 36 }),

	oldValue: text('old_value'),
	newValue: text('new_value'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const notificationPriorityEnum = mysqlEnum('notification_priority', [
	'LOW',
	'MEDIUM',
	'HIGH'
]);

export const notification = mysqlTable(
	'notification',
	{
		id: varchar('id', { length: 36 }).primaryKey(),

		// Target: can be specific user OR specific organization
		userId: varchar('user_id', { length: 36 }).references(() => user.id, { onDelete: 'cascade' }),
		organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id, {
			onDelete: 'cascade'
		}),

		title: varchar('title', { length: 255 }).notNull(),
		body: text('body').notNull(),

		priority: notificationPriorityEnum.default('MEDIUM').notNull(),

		read: boolean('read').default(false).notNull(),

		// Action metadata (JSON)
		// Example: { "type": "PEMINJAMAN_DETAIL", "resourceId": "...", "webPath": "...", "mobilePath": "..." }
		action: text('action'),

		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('notification_userId_idx').on(table.userId),
		index('notification_organizationId_idx').on(table.organizationId),
		index('notification_read_idx').on(table.read)
	]
);

export const notificationRelations = relations(notification, ({ one }) => ({
	user: one(user, {
		fields: [notification.userId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [notification.organizationId],
		references: [organization.id]
	})
}));

export * from './auth.schema';
