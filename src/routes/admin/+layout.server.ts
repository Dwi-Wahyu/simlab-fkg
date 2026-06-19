import { db } from '$lib/server/db';
import { notification } from '$lib/server/db/schema';
import { and, desc, eq, or, count } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, `/`);
	}

	const latestNotifications = await db.query.notification.findMany({
		where: (notif, { eq, or }) =>
			or(eq(notif.userId, locals.user.id), eq(notif.laboratoriumId, locals.user.laboratorium?.id)),
		orderBy: [desc(notification.createdAt)],
		limit: 5
	});

	const [unreadCountResult] = await db
		.select({ count: count() })
		.from(notification)
		.where(
			and(
				eq(notification.read, false),
				or(
					eq(notification.userId, locals.user.id),
					eq(notification.laboratoriumId, locals.user.laboratorium?.id)
				)
			)
		);

	return {
		user: locals.user,
		notifications: latestNotifications.map((n) => ({
			...n,
			action: n.action ? JSON.parse(n.action) : null
		})),
		unreadCount: unreadCountResult?.count ?? 0
	};
};
