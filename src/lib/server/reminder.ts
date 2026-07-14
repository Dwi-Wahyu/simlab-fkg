import { db } from '$lib/server/db';
import { lending, laboratoriumMember, schedulerState } from '$lib/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { createNotification } from './notification';

const SCAN_KEY = 'lending-reminder-scan';

/** Cek in-memory: hindari query DB penanda scan di SETIAP request kalau baru saja dicek. */
let lastLocalCheck = 0;
const LOCAL_CHECK_THROTTLE_MS = 30 * 60 * 1000; // cek ulang DB paling cepat tiap 30 menit

export async function maybeRunLendingReminderScan() {
	const now = Date.now();
	if (now - lastLocalCheck < LOCAL_CHECK_THROTTLE_MS) return; // sudah dicek baru-baru ini, skip
	lastLocalCheck = now;

	const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

	const state = await db.query.schedulerState.findFirst({
		where: eq(schedulerState.key, SCAN_KEY)
	});
	const lastRunDate = state?.lastRunAt?.toISOString().slice(0, 10);

	if (lastRunDate === today) return; // sudah jalan hari ini, tidak perlu lagi

	// Tandai dulu SEBELUM scan (mencegah request paralel lain ikut menjalankan scan yang sama)
	await db
		.insert(schedulerState)
		.values({ key: SCAN_KEY, lastRunAt: new Date() })
		.onDuplicateKeyUpdate({ set: { lastRunAt: new Date() } });

	await runLendingReminderScan();
}

async function runLendingReminderScan() {
	await scanH1Reminders();
	await scanOverdueReminders();
}

async function scanH1Reminders() {
	// Lending aktif, jatuh tempo BESOK (H-1), belum pernah dikirimi reminder H-1
	const dueTomorrow = await db.query.lending.findMany({
		where: and(
			eq(lending.status, 'DIPINJAM'),
			isNull(lending.h1ReminderSentAt),
			sql`${lending.endDate} IS NOT NULL AND DATE(${lending.endDate}) = DATE(DATE_ADD(NOW(), INTERVAL 1 DAY))`
		),
		with: { requestedByUser: true }
	});

	for (const l of dueTomorrow) {
		await notifyForLending(l, 'H1');
		await db.update(lending).set({ h1ReminderSentAt: new Date() }).where(eq(lending.id, l.id));
	}
}

async function scanOverdueReminders() {
	// Lending aktif, tenggat SUDAH LEWAT, belum pernah dikirimi reminder overdue (sekali saja)
	const overdue = await db.query.lending.findMany({
		where: and(
			eq(lending.status, 'DIPINJAM'),
			isNull(lending.overdueReminderSentAt),
			sql`${lending.endDate} IS NOT NULL AND DATE(${lending.endDate}) < CURDATE()`
		),
		with: { requestedByUser: true }
	});

	for (const l of overdue) {
		await notifyForLending(l, 'OVERDUE');
		await db.update(lending).set({ overdueReminderSentAt: new Date() }).where(eq(lending.id, l.id));
	}
}

async function notifyForLending(
	l: {
		id: string;
		requestedBy: string | null;
		laboratoriumId: string | null;
		requestedByUser?: { name: string } | null;
	},
	kind: 'H1' | 'OVERDUE'
) {
	const action = {
		type: 'LENDING_DETAIL',
		resourceId: l.id,
		webPath: `/admin/peminjaman/${l.id}`
	};

	// 1. Notifikasi untuk PEMINJAM
	if (l.requestedBy) {
		await createNotification({
			userId: l.requestedBy,
			title: kind === 'H1' ? 'Pengembalian Alat Besok' : 'Pengembalian Alat Terlambat',
			body:
				kind === 'H1'
					? 'Alat yang Anda pinjam jatuh tempo dikembalikan besok. Segera kembalikan tepat waktu.'
					: 'Alat yang Anda pinjam sudah melewati tanggal pengembalian. Segera kembalikan ke laboratorium.',
			priority: 'HIGH',
			action
		});
	}

	if (!l.laboratoriumId) return;

	// 2. Notifikasi untuk KEPALA LAB lab terkait (hanya notifikasi, tanpa alert dashboard)
	const kepalaLabMembers = await db.query.laboratoriumMember.findMany({
		where: and(
			eq(laboratoriumMember.laboratoriumId, l.laboratoriumId),
			eq(laboratoriumMember.role, 'kepalaLab')
		)
	});
	for (const member of kepalaLabMembers) {
		if (!member.userId) continue;
		await createNotification({
			userId: member.userId,
			title:
				kind === 'H1'
					? 'Ada Peminjaman Jatuh Tempo Besok'
					: 'Ada Peminjaman Terlambat Dikembalikan',
			body: `Peminjaman oleh ${l.requestedByUser?.name ?? 'mahasiswa'} ${
				kind === 'H1' ? 'jatuh tempo besok' : 'sudah melewati tenggat pengembalian'
			}.`,
			priority: kind === 'H1' ? 'MEDIUM' : 'HIGH',
			action
		});
	}

	// 3. Notifikasi untuk LABORAN lab terkait (notifikasi tersimpan + tetap muncul di alert list)
	const laboranMembers = await db.query.laboratoriumMember.findMany({
		where: and(
			eq(laboratoriumMember.laboratoriumId, l.laboratoriumId),
			eq(laboratoriumMember.role, 'laboran')
		)
	});
	for (const member of laboranMembers) {
		if (!member.userId) continue;
		await createNotification({
			userId: member.userId,
			title: kind === 'H1' ? 'Alat Perlu Dikembalikan Besok' : 'Alat Terlambat Dikembalikan',
			body: `${l.requestedByUser?.name ?? 'Mahasiswa'} perlu mengembalikan alat ${
				kind === 'H1' ? 'besok' : '(sudah lewat tenggat)'
			}. Siapkan proses pengembalian.`,
			priority: kind === 'H1' ? 'MEDIUM' : 'HIGH',
			action
		});
	}
}
