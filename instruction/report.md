# LAPORAN IMPLEMENTASI SIM LAB - MODUL 1 S/D MODUL 5

Laporan ini menyajikan rangkuman lengkap langkah-demi-langkah pengerjaan pair-programming untuk sistem informasi SIM LAB FKG. Implementasi meliputi pembaruan database, perbaikan performa ekspor, pembagian kelompok mahasiswa, hingga redesign visual halaman penilaian.

---

## 1. MODUL 1 — INVENTORY CONDITION SIMPLIFICATION

### Tujuan
Menyederhanakan kondisi inventaris alat/bahan dari 4 kondisi (`BAIK`, `RUSAK_RINGAN`, `RUSAK_BERAT`, `HILANG`) menjadi 2 nilai utama saja (`BAIK` dan `RUSAK`) agar mempermudah monitoring ketersediaan barang laboratorium.

### Langkah Implementasi
1. **Pembaruan Skema Database (`src/lib/server/db/schema.ts`):**
   * Memodifikasi `equipmentConditionEnum` dan `inventoryReportStatusEnum` agar hanya menampung `'BAIK'` dan `'RUSAK'`.
   * Melakukan eksekusi `bun run db:generate` and `bun run db:migrate` untuk menerapkan perubahan skema.
2. **Refaktorisasi Agregasi API & Komponen Frontend:**
   * Memperbarui query dashboard dan card statistik aset agar mendeteksi sisa kerusakan hanya berdasarkan filter `'RUSAK'`.
   * Menyederhanakan form dropdown laporan kondisi di panel laboran agar hanya memunculkan dua opsi kondisi.

---

## 2. MODUL 2 — SPREADSHEET XLSX EXPORT

### Tujuan
Menambahkan fitur ekspor laporan inventaris laboratorium ke dalam format Spreadsheet (XLSX) yang dinamis, memuat seluruh data inventaris alat dan bahan per laboratorium.

### Langkah Implementasi
1. **Pembuatan Helper Ekspor (`src/lib/server/reports/inventoryExport.ts`):**
   * Menggunakan library spreadsheet bawaan project untuk menyusun dokumen secara terstruktur.
   * Menambahkan header tabel (No, Nama Alat, Kode Aset, Merek, Spesifikasi, Kondisi, Lokasi, Jumlah).
   * Melakukan styling warna header hijau tua (`#2D5A43`) khas FKG.
2. **Pembuatan Server Endpoint (`src/routes/admin/laporan/inventaris/export/+server.ts`):**
   * Menulis HTTP GET handler yang memproses ID Laboratorium dari search parameter.
   * Menyajikan buffer file ekspor dengan header `Content-Disposition: attachment; filename="..."` agar terunduh otomatis.
3. **Penyediaan Tombol Ekspor di UI:**
   * Menambahkan tombol "Ekspor XLSX" pada halaman daftar inventaris admin yang diarahkan langsung ke server endpoint.

---

## 3. MODUL 3 — LABORATORIUM & KEPALALAB SEEDER

### Tujuan
Menyediakan data awal (seeds) untuk 3 laboratorium utama di FKG beserta akun Kepala Laboratorium pendukungnya agar sistem dapat langsung diuji pasca migrasi database bersih.

### Langkah Implementasi
1. **Penulisan Seeder Laboratorium (`src/lib/server/db/seeds/laboratorium.ts`):**
   * Menambahkan 3 laboratorium utama: `Preparasi (lt 2)`, `Terpadu (lt 4)`, dan `Frontier Dental Lab Research (lt 4)`.
   * Menambahkan logika pembuatan user `kepalaLab` yang terikat ke masing-masing laboratorium tersebut.
   * Memastikan username dibersihkan dari simbol atau tanda minus di akhir nama agar lolos validasi Better Auth.
2. **Integrasi Script Seeding (`package.json`):**
   * Menambahkan command `"db:seed-laboratorium"` untuk menjalankan script secara terpisah.

---

## 4. MODUL 4 — MAHASISWA KELOMPOK (GROUPING)

### Tujuan
Mengelompokkan mahasiswa per kelas praktikum ke dalam kelompok-kelompok kecil (sekitar 13-15 orang) untuk koordinasi dosen instruktur yang lebih spesifik.

### Langkah Implementasi
1. **Pembaruan Skema Relasi Kelompok (`src/lib/server/db/schema.ts`):**
   * Membuat tabel `kelompokMahasiswa` (berisi ID kelompok, nama kelompok, classId).
   * Membuat tabel `kelompokMahasiswaMember` (berisi pemetaan userId mahasiswa ke kelompokId).
   * Menambahkan field `groupId` (nullable) pada tabel `practicumScheduleInstructor` dengan rule `onDelete: 'set null'`.
2. **Halaman Manajemen Kelompok (`src/routes/admin/kelompok-mahasiswa`):**
   * Membangun server actions (`+page.server.ts`) untuk penambahan kelompok baru secara unik per kelas, pengubahan nama, dan penghapusan kelompok dengan peringatan jumlah anggota aktif.
   * Membikin template view (`+page.svelte`) dengan filter dropdown kelas praktikum.
3. **Halaman Alokasi Anggota (`src/routes/admin/kelompok-mahasiswa/[id]`):**
   * Menggunakan split 2 panel view di frontend.
   * **Panel Kiri**: Daftar mahasiswa yang tersedia (belum memiliki kelompok). Dilengkapi pencarian nama/NIM serta filter angkatan.
   * **Panel Kanan**: Daftar anggota kelompok aktif dengan tombol hapus instan.
   * Transaksi didukung oleh SvelteKit `enhance` agar update data berjalan mulus tanpa page reload.
4. **Pembagian Kelompok Otomatis di Seeder (`src/lib/server/db/seeds/mahasiswa.ts`):**
   * Membuat helper `seedKelompokMahasiswa` yang membagi seluruh mahasiswa per kelas praktikum secara merata ke dalam 4 kelompok.

---

## 5. MODUL 5 — ASSESSMENT DYNAMIC TABLE REDESIGN

### Tujuan
Mengganti alur penilaian mahasiswa dari yang sebelumnya bertahap (drill-down per mahasiswa) menjadi satu tabel besar dinamis yang live-editing langsung di baris mahasiswa. Mendukung penggabungan kolom preparasi/restorasi, mode checklist CSL baru, dan ekspor lembar penilaian CSL bedah minor format Word (DOCX).

### Langkah Implementasi
1. **Pembaruan Skema Modul Penilaian (`src/lib/server/db/schema.ts`):**
   * Menambahkan field `groupLabel` and `scoreLegend` pada tabel `practicumModule`.
   * Menambahkan nilai `'CHECKLIST'` ke dalam enum `practicumModuleScoringModeEnum`.
   * Menambahkan field `sectionLabel` pada tabel `practicumModuleCriteria` untuk pengelompokan rubrik checklist CSL.
2. **Ekstraksi Logika Penilaian Bersama (`src/lib/server/assessment.ts`):**
   * Memindahkan fungsi `saveAssessment` ke dalam server helper terpusat.
   * Menulis logika perhitungan nilai checklist CSL: `finalScore = Math.round((totalScore / totalMax) * 100)`.
   * Menghubungkan endpoint detail lama (`mahasiswa/[studentId]`) ke helper baru agar perilakunya tetap konsisten.
3. **Penerapan Scoping Kelompok (`[id]/+page.server.ts`):**
   * Membatasi daftar mahasiswa yang tampil pada halaman dosen penguji agar hanya menampilkan kelompok yang dia ampu (jika `groupId` terisi).
   * Memberikan dropdown filter kelompok untuk admin/koordinator.
4. **Redesign Halaman Tabel Penilaian (`[id]/+page.svelte`):**
   * Menggabungkan modul-modul Konservasi Gigi yang memiliki `groupLabel` yang sama menjadi kolom double-header (e.g. "Kelas I (SITE 1)" -> sub-kolom "PREP" dan "RESTO").
   * Menyediakan input skor langsung di sel tabel untuk modul bertipe `TOTAL` (menyimpan otomatis saat input kehilangan fokus/blur dengan indikator loading).
   * Menyediakan tombol klik untuk modul bertipe `RUBRIK` dan `CHECKLIST` yang membuka Dialog pengisian instan. Khusus checklist CSL, menampilkan tombol segmented 0/1/2 interaktif beserta live-readout persentase skor akhir di bawah dialog.
   * Menambahkan kolom rata-rata akhir dengan pengaman pembagian nol (`-`).
5. **Ekspor Word CSL (`[id]/mahasiswa/[studentId]/export-csl/+server.ts` & `src/lib/server/csl/generateCslAssessment.ts`):**
   * Menyediakan template dokumen minimal `static/templates/csl/TEMPLATE_CSL_ASSESSMENT.docx` berisi target placeholder.
   * Membikin builder OpenXML tabel checklist yang menuliskan tanda centang (`✓`) secara dinamis di bawah kolom skor (0 / 1 / 2) berdasarkan nilai kriteria yang disimpan, lengkap dengan baris total, baris persentase akhir, serta komentar penguji.
   * Membatasi akses ekspor hanya untuk dosen penguji terjadwal, koordinator laboratorium, atau superadmin.

---

## 6. MODUL 6 — MAINTENANCE NOTA & APPROVAL

### Tujuan
Menambahkan kemampuan pada sistem pemeliharaan peralatan (`maintenance`) bertipe non-kalibrasi (`PREVENTIF` / `KOREKTIF`) untuk dapat mengunggah bukti pembayaran/nota fisik (Nota), serta mewajibkan proses verifikasi dan persetujuan (approval) oleh Kepala Laboratorium atau Superadmin sebelum pemeliharaan dianggap selesai secara sah di sistem.

### Langkah Implementasi
1. **Perubahan Skema Database (`src/lib/server/db/schema.ts`):**
   * Menambahkan kolom `notaFileName` varchar(255) nullable ke dalam tabel `maintenance`.
   * Menjalankan `bun run db:generate` dan `bun run db:migrate` untuk mendaftarkan dan menerapkan kolom baru ke database lokal MySQL.
2. **Sentralisasi Logika Server (`src/lib/server/maintenance.ts`):**
   * Membuat fungsi `submitMaintenanceForApproval` untuk membuat baris approval baru berstatus `PENDING` ketika maintenance `KOREKTIF`/`PREVENTIF` diubah statusnya menjadi `COMPLETED` (dilengkapi proteksi penduplikasian baris persetujuan pending).
   * Membuat fungsi `reviewMaintenanceApproval` untuk mencatat status approval (`APPROVED` / `REJECTED`), memperbarui log audit sistem, serta memicu notifikasi otomatis ke teknisi penanggung jawab (tanpa membatalkan status kelayakan fisik alat).
3. **Penyediaan Upload Nota di UI Pemeliharaan:**
   * Memasang area file upload bergaya drag-and-drop / dashed border dengan live image preview pada form Tambah Baru (`create/+page.svelte`) dan Edit (`[id]/edit/+page.svelte`).
   * Menulis logika server-side untuk menyimpan file Nota ke direktori lokal `/static/uploads/receipts/` menggunakan UUID acak dan mendaftarkan nama filenya saja ke kolom `notaFileName` database.
4. **Halaman Khusus Persetujuan (`src/routes/admin/pemeliharaan/approval`):**
   * Membuat halaman daftar pengajuan approval baru yang hanya dapat diakses oleh Kepala Lab dan Superadmin.
   * Menyaring data pengajuan secara dinamis: Kepala Lab hanya melihat usulan alat milik laboratorium yang dipimpinnya, sedangkan Superadmin dapat melihat keseluruhan.
   * Menambahkan dialog konfirmasi setuju/tolak terintegrasi (penolakan mewajibkan pengisian catatan/alasan penolakan).
5. **Koneksi Navigasi dan Dashboard:**
   * Menghubungkan halaman approval baru ke tombol notifikasi badge interaktif di header utama daftar pemeliharaan jika terdapat item yang pending.
   * Menampilkan badge status review approval kecil di samping status `COMPLETED` pada tabel daftar pemeliharaan.
   * Menyematkan widget visual "Pemeliharaan Menunggu Review" pada dashboard Kepala Laboratorium (`KepalaLabDashboard.svelte`) yang bersumber dari API dashboard `/src/routes/api/admin/dashboard/[role]/+server.ts` yang disaring per lab.
6. **Seeder Data Pengujian:**
   * Memperbarui script seeder utama (`src/lib/server/db/seeds/index.ts`) agar otomatis membuat 3 baris pemeliharaan contoh lengkap dengan relasi approval-nya: satu pending (disertai placeholder Nota fisik), satu disetujui, dan satu ditolak beserta catatan umpan baliknya.

---
*Laporan ini disusun secara otomatis sebagai dokumentasi resmi hasil pengerjaan project SIM LAB FKG.*

---

## 7. MODUL 7 — JADWAL AUTOFILL SERI, DISTRIBUSI KELOMPOK PER INSTRUKTUR, FIX LOGBOOK, CSL ADDITIVE SEEDER

### Tujuan
Memperbaiki dan melengkapi fitur manajemen jadwal praktikum, distribusi kelompok mahasiswa per instruktur dosen, error generate logbook, dan data CSL Blok Bedah Minor yang tidak akurat. Modul ini mencakup 6 bagian terpisah yang saling berkaitan.

---

### Bagian 1 — Autofill Blok & Laboratorium dari Seri Praktikum

**File:**
- `src/routes/admin/jadwal-praktikum/tambah/+page.svelte`
- `src/routes/admin/jadwal-praktikum/[id]/edit/+page.svelte`

**Masalah:** Saat admin memilih Seri Praktikum di form Tambah/Edit Jadwal, field Laboratorium dan Blok tidak otomatis terisi meskipun Seri sudah punya `laboratoriumId` dan `blockId`.

**Langkah Implementasi:**
1. Menambahkan `onValueChange` pada `Select.Root` untuk `seriesId` di kedua file.
2. Handler membaca `seri.laboratoriumId` dan `seri.blockId` lalu mengisi state `selectedLab` dan `selectedBlock` secara otomatis.
3. Saat `blockId` berubah, `selectedModules` direset agar daftar modul difilter ulang sesuai blok baru.
4. Autofill hanya terpicu dari event user (`onValueChange`), bukan reactive `$effect`, sehingga nilai jadwal existing tidak tertimpa saat Edit pertama render.

---

### Bagian 2 — Hapus Input Semester

**File:**
- `src/routes/admin/jadwal-praktikum/tambah/+page.svelte`
- `src/routes/admin/jadwal-praktikum/tambah/+page.server.ts`
- `src/routes/admin/jadwal-praktikum/[id]/edit/+page.svelte`
- `src/routes/admin/jadwal-praktikum/[id]/edit/+page.server.ts`
- `src/lib/server/db/schema.ts`

**Masalah:** Input Semester tidak relevan dan menambah kebingungan pada form jadwal.

**Langkah Implementasi:**
1. Menghapus blok `<div class="space-y-2">` berisi `Label` + `Input` semester dari kedua file `.svelte`.
2. Menghapus state `semesterValue` dan parsing `semester` dari kedua file `+page.server.ts`.
3. Menghapus `semester` dari objek `values({...})` (Tambah) dan `.set({...})` (Edit).
4. **Kolom tidak dihapus dari skema** — cukup menambahkan komentar `DEPRECATED` di `schema.ts` untuk kompatibilitas data historis dan menghindari migrasi destruktif.

---

### Bagian 3 — Distribusi Kelompok per Instruktur

**File:**
- `src/routes/admin/jadwal-praktikum/tambah/+page.svelte`
- `src/routes/admin/jadwal-praktikum/tambah/+page.server.ts`
- `src/routes/admin/jadwal-praktikum/[id]/edit/+page.svelte`
- `src/routes/admin/jadwal-praktikum/[id]/edit/+page.server.ts`

**Masalah:** Form jadwal hanya mengirim `instructorIds[]` tanpa `groupId`, sehingga fitur distribusi kelompok per dosen tidak pernah terisi.

**Langkah Implementasi:**
1. **Load data kelompok** — menambahkan query `kelompokMahasiswa.findMany` di `load()` kedua server file dan menyertakan `groups` di return value.
2. **Refactor state klien** — mengganti `selectedInstructors: string[]` menjadi `instructorGroupMap: Record<string, string[]>` (instructorId → array kelompokId).
3. **Helper functions** — menambahkan `assignedElsewhere()`, `availableGroupsFor()`, `toggleInstructor()`, `toggleGroupForInstructor()`, `autoDistributeGroups()` beserta derived `groupsForClass`, `unassignedGroups`, `hasUnassignedGroups`.
4. **UI instruktur expandable** — setiap instruktur yang dicentang menampilkan daftar kelompok yang bisa dipilih. Kelompok yang sudah dipilih instruktur lain tidak muncul di pilihan instruktur saat ini.
5. **Footer card** — menambahkan peringatan jumlah kelompok yang belum ditugaskan dan tombol "Bagi Rata Otomatis" yang mendistribusikan sisa kelompok secara round-robin.
6. **Hidden inputs** — format `assignments=instructorId:kelompokId` per pasangan; instruktur tanpa kelompok dikirim `instructorId:` (groupId kosong).
7. **Validasi submit** — mencegah form submit jika ada kelompok yang belum ditugaskan (`hasUnassignedGroups`).
8. **Server action** — parsing `assignments` baru, insert `practicumScheduleInstructor` dengan `groupId` per assignment.
9. **Prefill Edit** — membangun `instructorGroupMap` awal dari `data.schedule.instructors` saat halaman Edit dibuka.

---

### Bagian 4 — Fix Bug Scoping Multi-Kelompok di Halaman Penilaian

**File:** `src/routes/admin/penilaian/[id]/+page.server.ts`

**Masalah:** Logika scoping kelompok menggunakan `.find()` yang hanya mengambil baris pertama instruktur — jika satu instruktur menangani lebih dari satu kelompok (akibat Bagian 3), kelompok kedua dan seterusnya tidak terbaca.

**Langkah Implementasi:**
1. Mengganti `schedule.instructors.find(...)` dengan `.filter(...)` untuk mengumpulkan semua baris instruktur yang login.
2. Mengekstrak semua `groupId` yang valid dari baris-baris tersebut ke `myGroupIds: string[]`.
3. Menggunakan `inArray(kelompokMahasiswaMember.kelompokId, resolvedGroupIds)` untuk mengambil mahasiswa dari semua kelompok yang jadi tanggung jawab instruktur tersebut sekaligus.
4. Menambahkan deduplikasi mahasiswa jika secara tidak sengaja terdapat mahasiswa yang masuk ke lebih dari satu kelompok.
5. Untuk superadmin/koordinator: tetap menggunakan filter `groupId` tunggal dari query param seperti sebelumnya.

---

### Bagian 5 — Fix Error "Tidak ada template logbook di sistem"

**File:**
- `src/lib/server/db/seeds/logbook-templates.ts`
- `src/lib/server/db/seeds/index.ts`
- `src/lib/server/logbook/generateLogbook.ts`

**Masalah:** Tabel `practicum_logbook_template` selalu kosong karena script seeder-nya (`db:seed-logbook-templates`) tidak pernah dipanggil dari seeder utama (`db:seed`), sehingga fitur generate logbook selalu gagal di environment baru.

**Langkah Implementasi:**
1. **Refactor `logbook-templates.ts`** — mengekspor logika seeding sebagai fungsi `export async function seedLogbookTemplates(db)` sehingga bisa dipanggil dari luar.
2. **Integrasi ke seeder utama** — mengimpor dan memanggil `seedLogbookTemplates(db)` di akhir fungsi `main()` di `src/lib/server/db/seeds/index.ts`, sehingga satu kali `bun run db:seed` sudah cukup.
3. **Perbaikan pesan error** — memperbarui pesan di `generateLogbook.ts` menjadi lebih spesifik dan actionable, menyertakan instruksi `bun run db:seed-logbook-templates`.
4. Menjalankan `bun run db:seed-logbook-templates` untuk immediate fix di environment yang sedang error.

---

### Bagian 6 — CSL Additive Seeder (Data Asli dari Dokumen Sumber)

**File:** `src/lib/server/db/seeds/index.ts`

**Masalah:** Seeder CSL Blok Bedah Minor sebelumnya hanya berisi satu modul dummy (`CSL Bedah Minor - Ekstraksi Gigi`) dengan 11 kriteria karangan yang tidak cocok dengan dokumen sumber asli.

**Langkah Implementasi:**
1. **Mendefinisikan 5 array kriteria** sesuai dokumen `Format Penilaian CSL - Blok Bedah Minor.docx`:
   - `cslKewaspadaanStandar` — 12 kriteria (cuci tangan bedah WHO, gowning, gloving)
   - `cslAnestesiLokal` — 11 kriteria (teknik infiltrasi/blok)
   - `cslPeresepanObat` — 15 kriteria (analgesik, antibiotik, edukasi pasien)
   - `cslPencabutanClosedMethod` — 22 kriteria (prosedur ekstraksi gigi penuh)
   - `cslPenjahitan` — 16 kriteria (suturing pasca pencabutan)
2. **Mendefinisikan `cslScoreLegend`** dengan skala 0 (tidak dilakukan) / 1 (belum sempurna) / 2 (sempurna).
3. **Mengganti blok modul** `else if (blockName === 'Blok Bedah Minor')` dengan 5 modul bernama `CSL 1` s.d. `CSL 5`, masing-masing membawa array kriterianya sendiri.
4. **Memperbarui loop insert** dari `for (const crit of cslCriteria)` menjadi `if (mod.scoringMode === 'CHECKLIST' && mod.criteria)` + `for (const crit of mod.criteria)` agar setiap modul membaca kriterianya sendiri.
5. **Membersihkan modul lama** — menjalankan script `src/lib/server/db/seeds/clean-old-module.ts` untuk menghapus modul `CSL Bedah Minor - Ekstraksi Gigi` yang sudah tidak ada assessment-nya.
6. Menjalankan `bun run db:seed` untuk menerapkan 5 modul CSL baru ke database.

---

### Perbaikan TypeScript Errors (Pasca Implementasi)

Setelah seluruh bagian selesai, ditemukan beberapa TypeScript error yang diperbaiki:

| File | Error | Fix |
|------|-------|-----|
| `generateLogbook.ts` | `Buffer` tidak kompatibel dengan `BlobPart` | Wrap dengan `new Uint8Array(docxBuffer)` sebelum masuk `Blob` |
| `export-csl/+server.ts` | `Buffer` tidak kompatibel dengan `BodyInit` | `new Response(new Uint8Array(buffer), ...)` |
| `rekapitulasi/export/+server.ts` | `Buffer` tidak kompatibel dengan `BodyInit` | `new Response(new Uint8Array(buffer), ...)` |
| `laporan/inventaris/export/+server.ts` | `Buffer` tidak kompatibel dengan `BodyInit` | `new Response(new Uint8Array(buffer), ...)` |
| `api/admin/penilaian/[id]/+server.ts` | `.where()` pada Drizzle query immutable + `.config.where` tidak ada | Membangun `finalWhere` lengkap sebelum konstruksi query; dipakai di kedua query (data + count) |
| `rekapitulasi/+page.svelte` | Svelte warn `state_referenced_locally` | Ganti ke `$state(untrack(() => data.search))` + `$effect` sync |
| `generateCslAssessment.ts` | `class: true` bukan relasi valid dalam `with` | Hapus `class: true` (merupakan kolom, bukan relasi) |
| `generateCslAssessment.ts` | `schedule.date` tidak ada di skema | Ganti ke `schedule.startTime` |

---

### Hasil Akhir

- ✅ Autofill Blok & Lab saat pilih Seri Praktikum
- ✅ Input Semester dihapus dari UI (kolom DB tetap ada, deprecated)
- ✅ Distribusi kelompok per instruktur dengan UI expandable + Bagi Rata Otomatis
- ✅ Halaman Penilaian menampilkan mahasiswa dari semua kelompok yang jadi tanggung jawab instruktur
- ✅ Generate logbook tidak lagi error "tidak ada template" setelah `bun run db:seed`
- ✅ 5 modul CSL Blok Bedah Minor sesuai dokumen sumber (76 kriteria total)
- ✅ Semua TypeScript error Module 7 teratasi

