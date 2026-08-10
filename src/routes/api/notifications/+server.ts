import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notification } from '$lib/server/db/schema';
import { eq, or } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const currentUser = locals.user;
	if (!currentUser) throw error(401, 'Unauthorized');

	const body = await request.json();
	const { id, markAllRead } = body;

	try {
		if (markAllRead) {
			const labId = currentUser.laboratorium?.id;
			await db
				.update(notification)
				.set({ read: true })
				.where(
					or(
						eq(notification.userId, currentUser.id),
						labId ? eq(notification.laboratoriumId, labId) : undefined
					)
				);
			return json({ success: true });
		}

		if (id) {
			await db
				.update(notification)
				.set({ read: true })
				.where(eq(notification.id, id));
			return json({ success: true });
		}

		return json({ error: 'Payload tidak valid' }, { status: 400 });
	} catch (err: any) {
		console.error('Error updating notification:', err);
		return json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const currentUser = locals.user;
	if (!currentUser) throw error(401, 'Unauthorized');

	const body = await request.json();
	const { id, clearAll } = body;

	try {
		if (clearAll) {
			const labId = currentUser.laboratorium?.id;
			await db
				.delete(notification)
				.where(
					or(
						eq(notification.userId, currentUser.id),
						labId ? eq(notification.laboratoriumId, labId) : undefined
					)
				);
			return json({ success: true });
		}

		if (id) {
			await db
				.delete(notification)
				.where(eq(notification.id, id));
			return json({ success: true });
		}

		return json({ error: 'Payload tidak valid' }, { status: 400 });
	} catch (err: any) {
		console.error('Error deleting notification:', err);
		return json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 });
	}
};
