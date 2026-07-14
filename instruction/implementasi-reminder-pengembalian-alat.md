# Implementasi: Reminder Pengembalian Alat (H-1 & Overdue)

## Keputusan Desain (Hasil Diskusi)

| Pertanyaan        | Keputusan                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| Mekanisme trigger | **Lazy check** — dijalankan menempel di request yang sudah pasti terjadi tiap hari (bukan cron terpisah)  |
| Laboran           | Dapat **notifikasi tersimpan** (lonceng) **+** alert daftar (bukan cuma alert)                            |
| Scope waktu       | **H-1** (sehari sebelum jatuh tempo) **+ overdue** (sudah lewat tenggat), overdue cuma dikirim **sekali** |

## Temuan Tambahan Penting Saat Scan

1. **`<NotificationBell>` saat ini di-comment-out** di `src/routes/admin/+layout.svelte` (baris
   ~119–123). Server (`+layout.server.ts`) sudah query notifikasi tiap request, tapi **tidak ada
   satu pun tempat di UI yang menampilkannya sekarang**. Fitur ini otomatis butuh mengaktifkan
   bell tersebut kembali — kalau tidak, notifikasi yang kita buat tidak akan pernah terlihat user.
2. **`src/routes/admin/+layout.server.ts` adalah titik pijak alami untuk lazy check** — ia sudah
   jalan di **setiap** halaman `/admin/*` untuk **setiap** user yang login (peminjam, kepalaLab,
   laboran semua lewat sini), jadi persis kebutuhan "lazy check saat request masuk" tanpa perlu
   menambah hook baru.
3. `lending` sudah punya kolom `laboratoriumId` langsung (tidak perlu join lewat
   `lendingItem → equipment` untuk tahu lending itu milik lab mana) — mempermudah scoping notifikasi
   ke kepalaLab/laboran lab terkait.

---

## 1. Skema: Kolom Idempotency + Penanda Scan Global

### 1.1 Idempotency per-lending (biar reminder tidak dikirim berkali-kali)

**File: `schema.ts`**, tambahkan ke tabel `lending`:

```diff
 export const lending = mysqlTable('lending', {
 	...
 	startDate: timestamp('start_date').notNull(),
 	endDate: timestamp('end_date'),
+
+	h1ReminderSentAt: timestamp('h1_reminder_sent_at'),
+	overdueReminderSentAt: timestamp('overdue_reminder_sent_at'),
+
 	createdAt: timestamp('created_at').defaultNow().notNull()
 });
```

Kenapa disimpan di kolom `lending` langsung (bukan di-scan dari tabel `notification`): jauh lebih
murah di-query (`WHERE h1ReminderSentAt IS NULL`) dibanding harus `EXISTS`-kan ke tabel notifikasi
tiap kali, dan langsung jelas terbaca statusnya saat lihat baris lending di DB.

### 1.2 Penanda "kapan terakhir scan harian jalan" (gating lazy check)

Supaya lazy check **tidak scan seluruh tabel `lending` di setiap request** (mahal kalau data besar
dan traffic tinggi), perlu 1 baris penanda kecil yang bilang "scan untuk hari ini sudah pernah
jalan belum". Tambahkan tabel generik kecil (bisa dipakai lagi nanti untuk kebutuhan
lazy-scheduled-task lain):

```ts
export const schedulerState = mysqlTable('scheduler_state', {
	key: varchar('key', { length: 100 }).primaryKey(), // contoh: 'lending-reminder-scan'
	lastRunAt: timestamp('last_run_at').notNull()
});
```

Generate & jalankan migration untuk kedua perubahan ini (`bun run db:generate`).

---

## 2. Modul Scan Reminder

**File baru: `src/lib/server/reminder.ts`**

```ts
import { db } from '$lib/server/db';
import { lending, laboratoriumMember, schedulerState } from '$lib/server/db/schema';
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
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
```

> **Perbaikan bug kecil yang ikut ditemukan:** `createNotification()` di
> `src/lib/server/notification.ts` menerima parameter `organizationId`, tapi kolom yang ada di
> tabel `notification` namanya `laboratoriumId` — parameter itu sekarang **tidak pernah benar-benar
> tersimpan** (nilainya hilang diam-diam). Ini di luar topik reminder, tapi karena fungsi ini
> dipakai lagi di sini, perbaiki dulu:
>
> ```diff
>  return await db.insert(notification).values({
>  	id: uuidv4(),
>  	userId: userId || null,
> -	organizationId: organizationId || null,
> +	laboratoriumId: organizationId || null,
>  	...
> ```
>
> (Tidak wajib untuk fitur reminder ini karena kita selalu kirim lewat `userId`, tapi kalau nanti
> ingin kirim notifikasi ke seluruh anggota lab sekaligus lewat `laboratoriumId`, bug ini harus
> dibenerin dulu.)

---

## 3. Pasang Lazy Trigger di `+layout.server.ts`

**File: `src/routes/admin/+layout.server.ts`**

```diff
 import { db } from '$lib/server/db';
 import { notification } from '$lib/server/db/schema';
 import { and, desc, eq, or, count } from 'drizzle-orm';
 import type { LayoutServerLoad } from './$types';
 import { redirect } from '@sveltejs/kit';
+import { maybeRunLendingReminderScan } from '$lib/server/reminder';

 export const load: LayoutServerLoad = async ({ locals }) => {
 	if (!locals.user) {
 		return redirect(302, `/`);
 	}
+
+	// Lazy trigger: cek & jalankan scan reminder H-1/overdue kalau belum jalan hari ini.
+	// Non-blocking — tidak perlu ditunggu (await) supaya tidak menambah latency navigasi user.
+	maybeRunLendingReminderScan().catch((err) =>
+		console.error('[reminder-scan] gagal menjalankan scan:', err)
+	);

 	const latestNotifications = await db.query.notification.findMany({
 		...
```

Catatan: dibiarkan **tidak di-`await`** (fire-and-forget) supaya tidak menambah waktu tunggu ke
setiap navigasi halaman admin. Ini aman karena `maybeRunLendingReminderScan()` sendiri sudah
idempotent dan dilindungi throttle in-memory + penanda DB — kalaupun ada 2 request nyaris
bersamaan yang sama-sama lolos throttle awal, insert `schedulerState` dengan
`onDuplicateKeyUpdate` mencegah scan dobel dalam praktiknya cukup aman untuk kasus reminder
(bukan transaksi finansial), meski secara teori ada race window kecil. Kalau mau 100% aman dari
race itu, bisa upgrade nanti pakai advisory lock DB — tidak perlu untuk skala fitur ini sekarang.

---

## 4. Aktifkan Kembali `NotificationBell`

**File: `src/routes/admin/+layout.svelte`**

```diff
-<!-- <NotificationBell
-	notifications={data.notifications}
-	unreadCount={data.unreadCount}
-	organizationId={data.user.laboratorium?.id}
-/> -->
+<NotificationBell
+	notifications={data.notifications}
+	unreadCount={data.unreadCount}
+	organizationId={data.user.laboratorium?.id}
+/>
```

Cek dulu kenapa ini di-comment sebelumnya (mungkin ada alasan spesifik, misal bug rendering) —
kalau memang sengaja dimatikan karena sesuatu yang belum kelar, selesaikan itu dulu sebelum
fitur reminder ini dianggap "selesai", karena tanpa ini kepalaLab (yang cuma dapat notifikasi,
tanpa alert) **tidak akan melihat reminder-nya sama sekali**.

---

## 5. Alert (On-Demand, Tidak Disimpan) — Peminjam & Laboran

Ini **tidak butuh scan/trigger apa pun** — query langsung tiap dashboard dibuka. Tambahkan ke
**`src/routes/api/admin/dashboard/[role]/+server.ts`**.

### 5.1 Alert untuk peminjam (role `peneliti`)

```ts
if (role === 'peneliti') {
	const dueSoonOrOverdue = await db.query.lending.findMany({
		where: and(
			eq(lending.requestedBy, userId),
			eq(lending.status, 'DIPINJAM'),
			sql`${lending.endDate} IS NOT NULL AND DATE(${lending.endDate}) <= DATE(DATE_ADD(NOW(), INTERVAL 1 DAY))`
		),
		with: { items: { with: { equipment: { with: { item: true } } } } }
	});

	// sertakan di response existing peneliti dashboard, misal:
	// return { ..., returnAlerts: dueSoonOrOverdue.map(...) }
}
```

Tampilkan sebagai **banner** di `PenelitiDashboard.svelte` bagian paling atas (di atas ringkasan
kartu yang sudah ada), warna merah/kuning tergantung H-1 vs sudah lewat, dengan tombol
"Kembalikan Sekarang" → link ke `/admin/peminjaman/{id}`.

### 5.2 Alert untuk laboran (role `laboran`)

```ts
if (role === 'laboran') {
	const labId = currentUser.laboratorium?.id;
	const returnAlerts = labId
		? await db.query.lending.findMany({
				where: and(
					eq(lending.laboratoriumId, labId),
					eq(lending.status, 'DIPINJAM'),
					sql`${lending.endDate} IS NOT NULL AND DATE(${lending.endDate}) <= DATE(DATE_ADD(NOW(), INTERVAL 1 DAY))`
				),
				with: {
					requestedByUser: { columns: { name: true, username: true } },
					items: { with: { equipment: { with: { item: true } } } }
				}
			})
		: [];

	// return { ..., returnAlerts }
}
```

Tampilkan di `LaboranDashboard.svelte` sebagai **daftar/tabel** (bukan cuma banner ringkas, sesuai
permintaan): kolom Nama Peminjam, Daftar Alat, Tanggal Jatuh Tempo, Status (H-1 / Terlambat), dan
tombol/link **"Proses Pengembalian"** → `/admin/peminjaman/{id}` (halaman detail yang sudah punya
action `returnItems`, tinggal dipakai).

### 5.3 KepalaLab — sengaja TIDAK ditambahkan alert

Sesuai keputusan ("hanya notifikasi saja"), **tidak perlu** menyentuh
`KepalaLabDashboard.svelte`/bagian kepalaLab di API dashboard untuk fitur ini. Mereka cukup
mengandalkan lonceng notifikasi dari bagian 2 & 4.

---

## 6. Checklist Implementasi

- [ ] Tambah kolom `h1ReminderSentAt`, `overdueReminderSentAt` di `lending` + tabel
      `schedulerState` + migration
- [ ] Buat `src/lib/server/reminder.ts` (`maybeRunLendingReminderScan`,
      `scanH1Reminders`, `scanOverdueReminders`, `notifyForLending`)
- [ ] Perbaiki bug `organizationId` → `laboratoriumId` di `src/lib/server/notification.ts`
- [ ] Pasang pemanggilan `maybeRunLendingReminderScan()` (non-blocking) di
      `src/routes/admin/+layout.server.ts`
- [ ] Aktifkan kembali `<NotificationBell>` di `src/routes/admin/+layout.svelte` (cek dulu alasan
      kenapa di-comment)
- [ ] Tambah query alert peminjam & laboran di `src/routes/api/admin/dashboard/[role]/+server.ts`
- [ ] Tambah UI banner alert di `PenelitiDashboard.svelte`
- [ ] Tambah UI tabel alert + tombol "Proses Pengembalian" di `LaboranDashboard.svelte`
- [ ] Uji: buat lending dummy dengan `endDate` = besok, buka halaman admin apa saja sebagai user
      manapun → cek baris `schedulerState` ke-insert, `lending.h1ReminderSentAt` terisi,
      notifikasi muncul di peminjam + kepalaLab lab terkait + laboran lab terkait, alert muncul di
      dashboard peminjam & laboran
- [ ] Uji: buka halaman admin lagi hari yang sama → pastikan **tidak ada notifikasi dobel**
      (scan tidak jalan ulang karena `schedulerState.lastRunAt` sudah hari ini)
- [ ] Uji overdue: buat lending dengan `endDate` = kemarin, status `DIPINJAM` → cek notifikasi
      overdue terkirim sekali, lalu pastikan **tidak terkirim lagi** di hari-hari berikutnya
      (`overdueReminderSentAt` sudah terisi)
- [ ] Uji lending yang sudah `RETURNED` sebelum H-1 tiba → pastikan tidak ikut ke-notifikasi
      (query sudah difilter `status = 'DIPINJAM'`, tinggal dipastikan konsisten)

---

## 7. Trade-off yang Perlu Disadari dari Pilihan "Lazy Check"

Karena mekanismenya nempel di request pertama yang lolos throttle, **jam pasti pengiriman
notifikasi tidak presisi** — bisa jam 6 pagi (kalau ada user login pagi), bisa juga baru siang
kalau traffic pagi sepi. Untuk kebutuhan "reminder sehari sebelum jatuh tempo", ini biasanya masih
cukup wajar (yang penting notifikasi ada _sebelum_ hari-H, bukan jam berapa persisnya). Kalau nanti
ternyata dirasa kurang presisi (misal butuh terkirim tepat jam 7 pagi tiap hari untuk alasan
operasional), tinggal ganti isi `maybeRunLendingReminderScan()` dipanggil dari scheduler in-process
(`node-cron`) tanpa perlu ubah logika `runLendingReminderScan()`-nya sama sekali — pemisahan
"kapan dipanggil" vs "apa yang dilakukan" ini sengaja dibuat modular untuk itu.

Pastikan menjalankan migrasi dengan `bun run db:migrate`
