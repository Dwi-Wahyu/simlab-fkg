# Implementasi: Lepaskan Relasi `practicumSeries` ↔ `block`/`department`

## Latar Belakang & Masalah

Saat ini `practicumSeries` ("Clinical Skill Lab", dst.) punya `blockId` langsung, sehingga secara
struktural **satu seri hanya bisa dipakai untuk satu blok**. Padahal secara praktik, "Clinical
Skill Lab" itu bukan konsep yang unik per blok — tiap blok (Bedah Minor, Jaringan Keras Gigi, dst.)
punya modul, kriteria, dan bahkan **struktur form penilaian yang beda total**:

- Blok Bedah Minor: kriteria "Persiapan", "Prosedur Cuci Tangan Bedah", "Gowning & Gloving" (lihat
  `Format Penilaian CSL - Blok Bedah Minor.docx`, sebelumnya juga dibahas soal rubrik berjenjang).
- Blok Jaringan Keras: tabel per kelas/site (Kelas I–V) dengan kolom **Prep/Resto terpisah**, plus
  kolom Inlay/Onlay/Overlay (lihat `form-penilaian-preparasi-restorasi.jpeg`) dan legenda skor
  dengan kode A–E yang beda lagi dari Bedah Minor.

Tapi **nama seri-nya sama-sama "Clinical Skill Lab"**. Karena `practicumSeries.blockId` memaksa
1 seri = 1 blok, admin harus bikin seri baru berulang tiap ada blok baru padahal secara konsep itu
seri/kegiatan yang sama, cuma modul & kriterianya beda (dan itu sudah ditangani di level
`practicumModule.blockId`, bukan di level seri).

**Temuan penting saat scan:** `practicumSchedule` (jadwal) **sudah punya `blockId` sendiri**,
independen dari seri (`schema.ts` baris ~808). Jadi secara data, block sebenarnya sudah readily
available di level jadwal, bukan cuma "dioper" dari seri. Form Tambah/Edit Jadwal saat ini punya
dua select: "Seri Praktikum" dan "Blok" — dan ketika seri dipilih, kalau seri itu kebetulan punya
`blockId`, blok ikut ke-auto-select (`if (seri.blockId) selectedBlock = seri.blockId`). Kalau
relasi ini dihapus, auto-select ini otomatis tidak terjadi lagi — dan itu **memang tujuannya**:
blok dipilih independen per jadwal, tidak lagi "diwariskan" dari seri.

**Soal department:** sudah dicek, **tidak ada select department terpisah** di form Tambah/Edit
Jadwal saat ini. Department cuma muncul sebagai teks bantuan di bawah tiap opsi Blok
(`{block.department.name}`), diambil dari `block.departmentId` (`schema.ts` baris ~769). Jadi
requirement "hilangkan department select karena sudah terwakili oleh blok" **sudah terpenuhi oleh
desain yang ada** — tidak ada kolom `departmentId` di `practicumSchedule` dan tidak perlu
ditambahkan. Poin aksi di sini murni memastikan kita **tidak menambah `departmentId` baru** di
manapun saat migrasi ini (department tetap derived dari `block.departmentId`, satu sumber
kebenaran).

---

## Ringkasan Pendekatan

1. **Hapus `blockId` dari `practicumSeries`.** Seri jadi murni "jenis/nama kegiatan" (mis. "Clinical
   Skill Lab", "OSCE"), dipakai lintas blok.
2. **`practicumSchedule.blockId` jadi satu-satunya sumber kebenaran block per jadwal** (sudah ada,
   tidak berubah struktur). Department tetap derived via `block.departmentId` (tidak berubah).
3. **`practicumModule.blockId` tidak berubah** — modul & kriteria penilaian tetap terikat ke blok
   spesifik, itu sudah benar dan itulah yang menangani perbedaan struktur form Bedah Minor vs
   Jaringan Keras.
4. **Restrict delete `practicumSeries`** — tolak penghapusan kalau masih ada `practicumSchedule`
   atau `practicumLogbookGeneration` yang mereferensikannya.
5. Perbaiki 2 tempat yang tadinya resolve template logbook lewat `series.blockId` — sekarang harus
   resolve lewat `schedule.blockId` masing-masing jadwal di dalam seri tersebut.

---

## 1. Migrasi Skema

### 1.1 `schema.ts` — hapus kolom & relasi

```diff
 export const practicumSeries = mysqlTable('practicum_series', {
 	id: varchar('id', { length: 36 }).primaryKey(),
 	name: varchar('name', { length: 255 }).notNull(), // "Clinical Skill Lab"
 	description: text('description'),
-	blockId: varchar('block_id', { length: 36 }).references(() => block.id, { onDelete: 'cascade' }),
 	laboratoriumId: varchar('laboratorium_id', { length: 36 }).references(() => laboratorium.id, {
 		onDelete: 'cascade'
 	}),
 	createdAt: timestamp('created_at').defaultNow().notNull()
 });
```

```diff
 export const blockRelations = relations(block, ({ one, many }) => ({
 	department: one(department, {
 		fields: [block.departmentId],
 		references: [department.id]
 	}),
-	practicumSchedules: many(practicumSchedule),
-	practicumSeries: many(practicumSeries)
+	practicumSchedules: many(practicumSchedule)
 }));

 export const practicumSeriesRelations = relations(practicumSeries, ({ one, many }) => ({
 	laboratorium: one(laboratorium, {
 		fields: [practicumSeries.laboratoriumId],
 		references: [laboratorium.id]
 	}),
-	block: one(block, {
-		fields: [practicumSeries.blockId],
-		references: [block.id]
-	}),
 	schedules: many(practicumSchedule)
 }));
```

> `practicumSchedule.blockId`, `practicumScheduleRelations.block`, dan `practicumModule.blockId`
> **tidak disentuh** — semuanya tetap seperti sekarang.

### 1.2 Generate & tinjau migration

```bash
bun run db:generate
```

Migration yang dihasilkan akan berupa `ALTER TABLE practicum_series DROP FOREIGN KEY ..., DROP
COLUMN block_id`. **Sebelum menjalankan migration**, lakukan langkah 1.3 dulu (backfill), karena
begitu kolom di-drop, informasi "seri ini dulunya block apa" hilang permanen dari
`practicum_series` — meski itu memang bukan masalah karena setelah migrasi ini block per jadwal
sudah ada masing-masing di `practicum_schedule.block_id`.

### 1.3 Backfill pengecekan data lama (wajib sebelum drop kolom)

Sebelum migration dijalankan di production, pastikan **setiap `practicum_schedule` yang
`seriesId`-nya terisi juga punya `blockId` sendiri terisi** — karena setelah kolom
`practicum_series.block_id` hilang, satu-satunya sumber block untuk fitur logbook (bagian 3) adalah
`practicum_schedule.block_id`.

```sql
-- Cek jadwal yang punya seri tapi TIDAK punya blockId sendiri
SELECT ps.id, ps.title, ps.series_id, s.name AS series_name
FROM practicum_schedule ps
JOIN practicum_series s ON s.id = ps.series_id
WHERE ps.block_id IS NULL AND s.block_id IS NOT NULL;
```

Kalau query di atas mengembalikan baris, jalankan backfill sebelum drop kolom:

```sql
UPDATE practicum_schedule ps
JOIN practicum_series s ON s.id = ps.series_id
SET ps.block_id = s.block_id
WHERE ps.block_id IS NULL AND s.block_id IS NOT NULL;
```

Baru setelah itu jalankan migration drop kolom.

---

## 2. Restrict Delete `practicumSeries`

**File: `src/routes/admin/master/seri/+page.server.ts`**

Saat ini action `delete` langsung `db.delete(...)` tanpa cek apa pun — padahal:
- `practicumSchedule.seriesId` → `onDelete: 'set null'` (jadwal tidak ikut terhapus, tapi
  kehilangan pengelompokan seri-nya secara diam-diam — silent data loss dari sisi pelaporan).
- `practicumLogbookGeneration.seriesId` → `onDelete: 'cascade'` (riwayat logbook yang sudah
  pernah digenerate mahasiswa **ikut terhapus**).

Ubah action `delete` supaya menolak jika masih dipakai:

```ts
import { practicumSeries, practicumSchedule, practicumLogbookGeneration } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';

// ...

delete: async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const formData = await request.formData();
	const id = formData.get('id') as string;

	if (!id) return fail(400, { message: 'ID tidak ditemukan' });

	const [{ scheduleCount }] = await db
		.select({ scheduleCount: count() })
		.from(practicumSchedule)
		.where(eq(practicumSchedule.seriesId, id));

	const [{ logbookCount }] = await db
		.select({ logbookCount: count() })
		.from(practicumLogbookGeneration)
		.where(eq(practicumLogbookGeneration.seriesId, id));

	if (scheduleCount > 0 || logbookCount > 0) {
		return fail(400, {
			message: `Seri ini tidak bisa dihapus karena masih dipakai oleh ${scheduleCount} jadwal dan ${logbookCount} riwayat logbook. Hapus atau pindahkan jadwal terkait terlebih dahulu.`
		});
	}

	try {
		await db.delete(practicumSeries).where(eq(practicumSeries.id, id));
		return { success: true };
	} catch (e) {
		console.error(e);
		return fail(500, { message: 'Gagal menghapus seri praktikum' });
	}
}
```

Di **`src/routes/admin/master/seri/+page.svelte`**, tampilkan pesan `form?.message` ini di dialog
konfirmasi hapus (pola notifikasi error yang sudah dipakai di halaman lain, cek
`NotificationDialog` yang sudah dipakai di halaman penilaian).

> Opsional tapi disarankan: tampilkan jumlah jadwal terpakai langsung di tabel daftar seri (mis.
> kolom "Jumlah Jadwal"), supaya admin sadar sebelum mencoba hapus, bukan cuma dapat error setelah klik.

---

## 3. Update Form Master Seri (hapus pemilihan blok)

**File: `src/routes/admin/master/seri/+page.server.ts`** (load & actions `create`/`update`)

Hapus `blockId` dari payload create/update dan dari data yang dikirim ke UI:

```diff
 const series = await db.query.practicumSeries.findMany({
 	with: {
-		block: true,
 		laboratorium: true
 	},
 	orderBy: (ps, { desc }) => [desc(ps.createdAt)]
 });

-const blocks = await db.query.block.findMany({ with: { department: true } });
 const labs = await db.query.laboratorium.findMany();

-return { series, blocks, labs };
+return { series, labs };
```

```diff
 create: async ({ request, locals }) => {
 	...
 	const name = formData.get('name') as string;
 	const description = formData.get('description') as string;
-	const blockId = formData.get('blockId') as string;
 	const labId = formData.get('labId') as string;
 	...
 	await db.insert(practicumSeries).values({
 		id: uuidv4(),
 		name,
 		description,
-		blockId: blockId || null,
 		laboratoriumId: labId || null
 	});
```

(Sama untuk action `update`.)

**File: `src/routes/admin/master/seri/+page.svelte`**

Hapus:
- Kolom tabel "Blok" (baris ~143, ~157).
- Select "Blok" dan hidden input `blockId` di form tambah (baris ~257–269) dan edit (baris
  ~334–346).
- State `formBlockId` dan turunannya (`blockTriggerContent`, dsb.).

Ganti label/deskripsi form seri jadi lebih jelas bahwa ini kegiatan generik lintas blok, misalnya
placeholder nama: *"Clinical Skill Lab"*, deskripsi: *"Bisa dipakai untuk jadwal di blok mana pun —
blok dipilih saat membuat jadwal."*

---

## 4. Update Form Tambah/Edit Jadwal

**File: `src/routes/admin/jadwal-praktikum/tambah/+page.svelte`** dan
**`src/routes/admin/jadwal-praktikum/[id]/edit/+page.svelte`**

Hapus logika auto-select blok dari seri (baris ~222–225 di `tambah`):

```diff
 const seri = data.series.find((s: any) => s.id === v);
-if (seri.blockId) selectedBlock = seri.blockId;
```

Select "Blok" **tetap ada dan wajib diisi manual** — tidak berubah selain kehilangan auto-fill
tadi. Tambahkan helper text singkat di bawah select Blok kalau perlu, misalnya: *"Blok menentukan
modul & kriteria penilaian yang tersedia untuk jadwal ini."* — supaya jelas kenapa field ini
dipisah dari Seri.

**File: `src/routes/admin/jadwal-praktikum/tambah/+page.server.ts`** dan
**`.../[id]/edit/+page.server.ts`**

Tidak ada perubahan struktural — `blockId` sudah diambil & disimpan independen dari `seriesId`
(lihat kode `action.default` yang sudah ada, baris ~62 & ~130). Cukup hilangkan query
`block: true`/join yang bersumber dari `practicumSeries` kalau ada (cek `load`, saat ini load
sudah query `blocks` terpisah dari `series`, jadi aman).

---

## 5. Fix Resolusi Template Logbook (WAJIB — ini yang akan patah kalau dilewati)

Dua tempat ini sekarang resolve blok logbook lewat `series.blockId`. Setelah kolom itu dihapus,
kedua tempat ini **akan selalu fallback ke template pertama yang ada di DB** (`finalTemplate =
templateRecord ?? await db.query.practicumLogbookTemplate.findFirst()`) — yaitu template yang
salah untuk blok tersebut. Ini silent bug, tidak error, tapi hasil PDF logbook mahasiswa jadi
pakai template blok yang salah.

### 5.1 `src/lib/server/logbook/generateLogbook.ts` (`generateLogbookForSeries`)

```diff
 // 2. Seri + laboratorium
 const series = await getSeriesWithLab(seriesId);
 if (!series) throw new Error('Seri praktikum tidak ditemukan');

+// 2b. Ambil jadwal-jadwal dalam seri ini lebih awal, untuk resolve blockId
+//     (blok sekarang melekat ke jadwal, bukan ke seri)
+const seriesSchedulesForBlock = await db.query.practicumSchedule.findMany({
+	where: eq(practicumSchedule.seriesId, seriesId),
+	orderBy: (s, { asc }) => [asc(s.startTime)],
+	columns: { blockId: true }
+});
+const resolvedBlockId =
+	seriesSchedulesForBlock.find((s) => s.blockId)?.blockId ?? null;
+
 // 3. Template file + metadata field
 let templateRecord = null;
-if (series.blockId) {
+if (resolvedBlockId) {
 	templateRecord = await db.query.practicumLogbookTemplate.findFirst({
 		where: (t, { exists, eq: eqFn, and: andFn }) =>
 			exists(
 				db
 					.select()
 					.from(practicumModule)
 					.where(
 						andFn(
 							eqFn(practicumModule.id, t.moduleId),
-							eqFn(practicumModule.blockId, series.blockId!)
+							eqFn(practicumModule.blockId, resolvedBlockId)
 						)
 					)
 			)
 	});
 }
```

> Catatan asumsi: kode ini mengambil `blockId` dari **jadwal pertama** (urut `startTime`) dalam
> seri yang punya `blockId` terisi. Ini valid selama satu *run* seri untuk satu kelas/kelompok
> tetap konsisten satu blok (yang memang jadi pola pemakaian nyata — "Clinical Skill Lab" untuk
> kelas blok Bedah Minor angkatan tsb tetap seluruhnya jadwal blok Bedah Minor). Kalau nanti ada
> kasus satu seri sungguh-sungguh mencampur jadwal lintas-blok untuk mahasiswa yang sama, logika
	ini perlu diubah jadi pilih template **per jadwal**, bukan sekali per generate — di luar cakupan
> perubahan ini, cukup dicatat sebagai batasan yang diketahui.

Hapus baris duplikat `const schedules = await db.query.practicumSchedule.findMany({ where:
eq(practicumSchedule.seriesId, seriesId), ... })` di langkah 4 kalau mau reuse
`seriesSchedulesForBlock` — atau biarkan terpisah (query ringan, tidak masalah performa) dan cukup
tambahkan `blockId` ke `columns` schedule yang sudah di-fetch di langkah 4, lalu hapus query
tambahan di atas. Pilih salah satu, yang penting hindari 2 query duplikat kalau bisa digabung.

### 5.2 `src/routes/admin/logbook-saya/[seriesId]/+page.server.ts`

Pola identik — perbaikan sama:

```diff
 const series = await db.query.practicumSeries.findFirst({
 	where: eq(practicumSeries.id, seriesId),
 	with: {
 		laboratorium: true,
-		block: { with: { department: true } },
 		schedules: {
 			orderBy: (s, { asc }) => [asc(s.startTime)]
 		}
 	}
 });

 if (!series) throw error(404, 'Seri praktikum tidak ditemukan');

+const resolvedBlockId = series.schedules.find((s) => s.blockId)?.blockId ?? null;
+const resolvedBlock = resolvedBlockId
+	? await db.query.block.findFirst({
+			where: eq(block.id, resolvedBlockId),
+			with: { department: true }
+		})
+	: null;
+
 let templateRecord = null;
-if (series.blockId) {
+if (resolvedBlockId) {
 	templateRecord = await db.query.practicumLogbookTemplate.findFirst({
 		where: (t, { exists, eq: eqFn, and: andFn }) =>
 			exists(
 				db
 					.select()
 					.from(practicumModule)
 					.where(
 						andFn(
 							eqFn(practicumModule.id, t.moduleId),
-							eqFn(practicumModule.blockId, series.blockId!)
+							eqFn(practicumModule.blockId, resolvedBlockId)
 						)
 					)
 			)
 	});
 }
```

Lalu update return value yang tadinya baca `series.block?.name` / `series.block?.department?.name`:

```diff
 return {
 	series: {
 		id: series.id,
 		name: series.name,
 		laboratoriumName: series.laboratorium?.name ?? '-',
-		blockName: series.block?.name ?? '-',
-		departmentName: series.block?.department?.name ?? '-'
+		blockName: resolvedBlock?.name ?? '-',
+		departmentName: resolvedBlock?.department?.name ?? '-'
 	},
 	...
 };
```

Ingat tambahkan import `block` dari `$lib/server/db/schema` di file ini.

### 5.3 `src/routes/admin/logbook-saya/+page.server.ts` (daftar seri milik mahasiswa)

File ini menampilkan `series.block?.name` sebagai kolom "Blok" di daftar. Karena satu seri kini
bisa mencakup banyak blok, ganti jadi menampilkan **daftar blok unik** dari jadwal-jadwal di seri
tersebut:

```diff
 const seriesList = await db.query.practicumSeries.findMany({
 	with: {
-		block: true,
 		laboratorium: true,
-		schedules: true
+		schedules: { with: { block: true } }
 	}
 });

 ...

 return {
 	id: series.id,
 	name: series.name,
 	laboratoriumName: series.laboratorium?.name ?? '-',
-	blockName: series.block?.name ?? '-',
+	blockName:
+		[...new Set(series.schedules.map((s) => s.block?.name).filter(Boolean))].join(', ') || '-',
 	totalSchedules: series.schedules.length,
 	...
 };
```

Ini otomatis menampilkan "Bedah Minor" untuk seri yang jadwalnya semua satu blok, atau "Bedah
Minor, Jaringan Keras Gigi" kalau memang tercampur (transparan ke mahasiswa, tidak menyembunyikan
informasi).

---

## 6. Bagian yang SUDAH AMAN, tidak perlu diubah

Hasil scan penuh terhadap seluruh penggunaan `practicumSeries` di project:

| File | Status |
|---|---|
| `src/routes/admin/kalender-jadwal/+page.server.ts` | Aman — hanya `with: { series: true }` untuk label, tidak akses `.blockId`/`.block` |
| `src/routes/admin/rekapitulasi/+page.server.ts` | Aman — hanya pakai `seriesId`, `series.name`, `series.laboratoriumId` |
| `src/routes/admin/rekapitulasi/export/+server.ts` | Aman — sama seperti di atas |
| `src/lib/server/db/seeds/test-rekap.ts` | Perlu dicek manual — kemungkinan seeder lama yang insert `practicumSeries` dengan `blockId`; hapus field itu dari seeder supaya tidak error saat `bun run db:seed` (lihat bagian 7) |
| `src/lib/server/rekap/*`, `src/lib/rekap/buildRekapMatrix.ts` | Aman — modul rekap sudah pakai `module.component`/`module.blockId`, bukan `series.blockId` |
| `practicumModuleCriteria`, `practicumCriteriaBand` (dari instruksi sebelumnya) | Tidak terpengaruh sama sekali — tetap terikat ke `practicumModule`, yang tetap terikat ke `block` |

---

## 7. Seeder

**File: `src/lib/server/db/seeds/test-rekap.ts`** (dan seeder lain kalau ada, cek dengan
`grep -rn "practicumSeries" src/lib/server/db/seeds`) — hapus field `blockId` dari setiap
`insert(practicumSeries).values({...})`. Kalau seeder mengandalkan `blockId` seri untuk
menentukan modul yang di-assign ke jadwal, pindahkan logika itu supaya baca `blockId` dari
`practicumSchedule` yang diseed, bukan dari seri.

---

## 8. Checklist Implementasi

- [ ] Jalankan query pengecekan (bagian 1.3), backfill `practicum_schedule.block_id` bila perlu
- [ ] Hapus `blockId` dari `practicumSeries` di `schema.ts` + relasi terkait
- [ ] Generate & jalankan migration (`db:generate`)
- [ ] Tambah guard restrict-delete di `master/seri/+page.server.ts` (cek `practicumSchedule` +
      `practicumLogbookGeneration`)
- [ ] Bersihkan form Master Seri (`+page.svelte` & `+page.server.ts`) dari field Blok
- [ ] Hapus auto-select blok dari seri di form Tambah/Edit Jadwal
- [ ] Perbaiki resolusi template logbook di `generateLogbook.ts` (`generateLogbookForSeries`)
- [ ] Perbaiki resolusi template & `blockName`/`departmentName` di
      `logbook-saya/[seriesId]/+page.server.ts`
- [ ] Perbaiki tampilan `blockName` (jadi daftar unik) di `logbook-saya/+page.server.ts`
- [ ] Update/bersihkan seeder yang insert `practicumSeries` dengan `blockId`
- [ ] Uji: buat 1 seri "Clinical Skill Lab" generik, pakai untuk jadwal Blok Bedah Minor **dan**
      jadwal Blok Jaringan Keras Gigi secara terpisah → pastikan tiap jadwal tetap dapat modul &
      kriteria yang sesuai bloknya masing-masing, dan generate logbook menghasilkan PDF dengan
      template yang benar untuk tiap kasus
- [ ] Uji: coba hapus seri yang masih dipakai jadwal → harus ditolak dengan pesan jelas
- [ ] Uji: hapus seri yang benar-benar tidak dipakai → berhasil normal

---

## 9. Dampak terhadap Instruksi Sebelumnya (Rubrik Berjenjang)

Tidak ada konflik. Rubrik berjenjang per kriteria (`practicum_criteria_band`) menempel di
`practicumModuleCriteria`, yang menempel di `practicumModule`, yang tetap terikat ke `block`
seperti sekarang. Contoh dari gambar yang diberikan (rubrik kode A–E untuk Blok Jaringan Keras:
Caries Removal, Kelas I–V, Inlay/Onlay/Overlay) bisa langsung dimodelkan pakai skema band yang
sama — cukup buat modul terpisah per blok seperti pola yang sudah ada, isi kriteria + band-nya
sesuai tabel legenda masing-masing blok. Perubahan di dokumen ini murni di level **seri/jadwal**,
tidak menyentuh level **modul/kriteria/band**.

## 10. Migration

Jangan lupa jalankan:
`bun run db:migrate` 