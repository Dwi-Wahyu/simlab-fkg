# Laporan Perubahan Kode - Laporan Periodic XLSX & Grouping Kategori Inventaris

**Instruction File:** `instruction/INSTRUKSI_LAPORAN_XLSX_DAN_GROUPING.md`

- **Modified Files:**
  - `src/lib/server/db/schema.ts`
  - `src/routes/api/admin/inventaris/bhp/stock/+server.ts`
  - `src/routes/api/admin/inventaris/alat/+server.ts`
  - `src/routes/api/admin/inventaris/bhp/+server.ts`
  - `src/routes/admin/inventaris/alat/+page.ts`
  - `src/routes/admin/inventaris/bhp/+page.ts`
  - `src/routes/admin/inventaris/alat/+page.svelte`
  - `src/routes/admin/inventaris/bhp/+page.svelte`
  - `src/lib/server/reports/alatPeriodicReport.ts` (BARU)
  - `src/lib/server/reports/bhpPeriodicReport.ts` (BARU)
  - `src/routes/admin/laporan/inventaris/alat/export/+server.ts` (BARU)
  - `src/routes/admin/laporan/inventaris/bhp/export/+server.ts` (BARU)
  - `src/lib/components/ExportPeriodicReportDialog.svelte` (BARU)

- **Logic Changes:**
  - **Task A (Movement Direction Schema & Logic):**
    - Menambahkan kolom `movement_direction` dengan enum (`IN`, `OUT`) pada tabel `movement` di `schema.ts`.
    - Mengupdate penulisan `movement` di `bhp/stock/+server.ts` agar mencatat `direction` dengan tepat (`IN` untuk penambahan stok, `OUT` untuk pengurangan/issue/adjustment negatif).
  - **Task B (Report Generators ExcelJS):**
    - Membuat modul generator `generateAlatPeriodicReport` dan `generateBhpPeriodicReport` menggunakan `exceljs`.
    - Menyusun header tabel sesuai layout resmi, warna background hijau (`FF2D5A47`), font putih tebal, border tipis, auto column width, dan freeze pane di bawah header (`ySplit: 5`).
    - Menghitung stok awal (awal periode), masuk, keluar, dan stok akhir (akhir periode) dengan formula akumulasi pergerakan historis secara akurat.
  - **Task C (Server Endpoints & Dialog UI):**
    - Membuat endpoint GET `/admin/laporan/inventaris/alat/export` dan `/admin/laporan/inventaris/bhp/export` yang memvalidasi role user, parsing query `mode` (`monthly` vs `semester`), `date`, `start`, `end`, `labId`, serta menghasilkan file download `.xlsx` dengan nama terformat.
    - Membuat komponen re-usable `ExportPeriodicReportDialog.svelte` dengan pilihan mode Bulanan / Semester, date pickers, dan seleksi lab (dengan auto-lock untuk Kepala Lab & Laboran).
    - Memasang dialog pada halaman daftar `/admin/inventaris/alat` dan `/admin/inventaris/bhp`.
  - **Task D (Category Grouping View & Accordion):**
    - Mengupdate API endpoint `api/admin/inventaris/alat` dan `api/admin/inventaris/bhp` untuk mendukung parameter `view=grouped` / `groupBy=category` sehingga mengembalikan `categoryId` dan menaikkan limit hingga 1000 item.
    - Menambahkan toggle "Tabel" vs "Kelompok Kategori" di halaman daftar. Saat dalam tampilan "Kelompok Kategori", items dikelompokkan secara teratur berdasarkan kategori (dengan kelompok "Tanpa Kategori" di paling bawah), dan ditampilkan dalam komponen `Accordion`.

- **Impact on Graph:**
  - Terbentuk hubungan baru antara halaman daftar inventaris (Alat & BHP) dengan komponen `ExportPeriodicReportDialog`.
  - Terbentuk dependency dari endpoint export ke module generator laporan `alatPeriodicReport` dan `bhpPeriodicReport`.
  - Terbentuk relasi query baru pada `movement` yang memanfaatkan kolom `movement_direction`.
