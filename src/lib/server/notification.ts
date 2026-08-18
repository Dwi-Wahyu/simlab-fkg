import { db } from '$lib/server/db';
import { notification, user, laboratoriumMember, laboratorium } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface NotificationAction {
	type: string;
	resourceId: string;
	webPath: string;
	mobilePath?: string;
}

export interface CreateNotificationParams {
	userId?: string;
	organizationId?: string;
	title: string;
	body: string;
	priority?: NotificationPriority;
	action?: NotificationAction;
}

/**
 * Helper to create a notification for a user or an organization.
 */
export async function createNotification(params: CreateNotificationParams) {
	const { userId, organizationId, title, body, priority = 'MEDIUM', action } = params;

	if (!userId && !organizationId) {
		throw new Error('Either userId or organizationId must be provided to create a notification.');
	}

	return await db.insert(notification).values({
		id: uuidv4(),
		userId: userId || null,
		laboratoriumId: organizationId || null,
		title,
		body,
		priority,
		action: action ? JSON.stringify(action) : null,
		read: false,
		createdAt: new Date()
	});
}

/**
 * Send notification to all users attached to a specific laboratorium ID when a lending request is created.
 * Messages are customized based on whether the user is a kepalaLab (needs to verify) or laboran.
 */
export async function sendLendingSubmittedNotification(
	lendingId: string,
	labId: string,
	requester: { name: string; role: string }
) {
	if (!labId) return;

	// 1. Fetch lab details
	const lab = await db.query.laboratorium.findFirst({
		where: eq(laboratorium.id, labId),
		columns: { name: true }
	});
	const labName = lab?.name || 'Laboratorium';

	// 2. Fetch members attached to this laboratorium
	const labMembers = await db.query.laboratoriumMember.findMany({
		where: eq(laboratoriumMember.laboratoriumId, labId),
		with: {
			user: {
				columns: { id: true, name: true, role: true, isDeleted: true }
			}
		}
	});

	const activeMembers = labMembers.filter((m) => m.user && !m.user.isDeleted);

	let usersToNotify: Array<{ userId: string; role: string }> = [];

	if (activeMembers.length > 0) {
		usersToNotify = activeMembers.map((m) => ({
			userId: m.userId!,
			role: m.role || m.user!.role
		}));
	} else {
		// Fallback: fetch all active kepalaLab & laboran users in the system
		const staffUsers = await db.query.user.findMany({
			where: and(inArray(user.role, ['kepalaLab', 'laboran']), eq(user.isDeleted, false)),
			columns: { id: true, role: true }
		});
		usersToNotify = staffUsers.map((u) => ({
			userId: u.id,
			role: u.role
		}));
	}

	// De-duplicate by userId
	const uniqueUserMap = new Map<string, string>();
	for (const u of usersToNotify) {
		if (!uniqueUserMap.has(u.userId)) {
			uniqueUserMap.set(u.userId, u.role);
		}
	}

	const roleLabel =
		requester.role === 'mahasiswa'
			? 'Mahasiswa'
			: requester.role === 'dosen'
				? 'Dosen'
				: requester.role;

	for (const [userId, userRole] of uniqueUserMap.entries()) {
		const isKepalaLab = userRole === 'kepalaLab';

		const title = isKepalaLab
			? 'Pengajuan Peminjaman Menunggu Verifikasi'
			: 'Pengajuan Peminjaman Baru';

		const body = isKepalaLab
			? `${requester.name} (${roleLabel}) telah mengajukan peminjaman alat baru di ${labName} yang memerlukan verifikasi Anda.`
			: `${requester.name} (${roleLabel}) telah mengajukan peminjaman alat baru di ${labName}.`;

		await createNotification({
			userId,
			title,
			body,
			priority: 'HIGH',
			action: {
				type: 'LENDING_REQUESTED',
				resourceId: lendingId,
				webPath: `/admin/peminjaman/${lendingId}`
			}
		});
	}
}

