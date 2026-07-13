import { eq, type AnyMySqlTable } from 'drizzle-orm';
import { db } from './index';

// Any soft-delete-enabled table has these columns.
type SoftDeletable = {
	isDeleted: any;
	deletedAt: any;
	deletedBy: any;
	id: any;
};

/** WHERE condition for "not soft-deleted." Use in every SELECT on a soft-delete table. */
export function notDeleted<T extends SoftDeletable>(table: T) {
	return eq(table.isDeleted, false);
}

/**
 * Soft-delete a single row by id. Pass an already-open transaction (`tx`) when part of a
 * larger transaction (e.g. cascading to child rows), or `db` directly for a single-table delete.
 */
export async function softDelete<T extends SoftDeletable>(
	executor: typeof db,
	table: T,
	id: string,
	actorId: string
) {
	return executor
		.update(table as unknown as AnyMySqlTable)
		.set({ isDeleted: true, deletedAt: new Date(), deletedBy: actorId } as any)
		.where(eq(table.id, id));
}

/** Restore a soft-deleted row. */
export async function restore<T extends SoftDeletable>(executor: typeof db, table: T, id: string) {
	return executor
		.update(table as unknown as AnyMySqlTable)
		.set({ isDeleted: false, deletedAt: null, deletedBy: null } as any)
		.where(eq(table.id, id));
}
