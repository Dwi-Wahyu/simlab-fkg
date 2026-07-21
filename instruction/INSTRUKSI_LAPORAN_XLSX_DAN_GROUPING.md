# Instruksi: Laporan Ekspor XLSX Periodik (Alat & BHP) + Tampilan Grup Kategori

Konteks proyek: SvelteKit + Drizzle ORM (MySQL), ExcelJS untuk generate xlsx (sudah dipakai di
`lib/server/reports/inventoryExport.ts`), shadcn-svelte untuk komponen UI (`Calendar`, `Popover`,
`Accordion`, `Dialog` sudah terpasang di `lib/components/ui/*`), `@internationalized/date` sudah
menjadi dependency. Semua path relatif terhadap `src/`.

> Fitur ini **menggantikan** mekanisme export lama yang satu tombol menghasilkan 1 workbook berisi
> 2 sheet (`Alat` + `Bahan`) di `lib/server/reports/inventoryExport.ts` dan
> `routes/admin/laporan/inventaris/export/+server.ts`. Ke depan, **setiap halaman daftar
> (Alat / BHP) punya fungsi ekspornya sendiri**, masing-masing menghasilkan **1 file dengan 1
> sheet saja**, dan mendukung filter periode (Bulanan/Semester).

---

## TASK A — Skema: tambah kolom `direction` pada tabel `movement`

### Kenapa perlu
Untuk menghitung "Barang Masuk" vs "Terpakai/Keluar" BHP per periode, laporan butuh tahu arah
setiap transaksi. `eventType = 'RECEIVE'` selalu masuk, `'ISSUE'` selalu keluar — tapi
`'ADJUSTMENT'` saat ini disimpan sebagai **selisih absolut** (`Math.abs(qty - currentQty)`, lihat
`routes/api/admin/inventaris/bhp/stock/+server.ts` baris ~123-126), sehingga arahnya (menambah
atau mengurangi stok) hilang.

### Perubahan

**A.1** File `lib/server/db/schema.ts` — tambahkan enum & kolom baru pada `movement`:
```ts
export const movementDirectionEnum = mysqlEnum('movement_direction', ['IN', 'OUT']);

export const movement = mysqlTable(
    'movement',
    {
        ...
        eventType: movementEventTypeEnum.notNull(),
        qty: int('qty').notNull().default(1),
        // Hanya diisi untuk eventType = 'ADJUSTMENT'. RECEIVE selalu tersirat IN,
        // ISSUE selalu tersirat OUT — kolom ini HANYA untuk membedakan arah ADJUSTMENT.
        direction: movementDirectionEnum,
        ...
    },
    ...
);
```
Generate & jalankan migration drizzle (`drizzle-kit generate` lalu `drizzle-kit migrate`, sesuaikan
script di `package.json`).

**A.2** File `routes/api/admin/inventaris/bhp/stock/+server.ts` — isi `direction` saat insert
movement:
```ts
await tx.insert(movement).values({
    id: movementId,
    itemId,
    eventType,
    qty: movementQty,
    direction: eventType === 'ADJUSTMENT' ? (qty - currentQty >= 0 ? 'IN' : 'OUT') : null,
    unit: targetItem.baseUnit,
    laboratoriumId,
    notes: notes ?? null,
    picId: locals.user!.id
});
```

> **Catatan keterbatasan data lama:** baris `movement` ber-`eventType = 'ADJUSTMENT'` yang dibuat
> **sebelum** migrasi ini akan punya `direction = NULL` (arah tidak diketahui). Laporan periode
> yang mencakup transaksi ADJUSTMENT lama tersebut akan mengecualikannya dari agregasi
> Masuk/Keluar (lihat Task B.3) — cukup dijelaskan sebagai catatan kaki di file xlsx, tidak perlu
> backfill data lama kecuali diminta terpisah.

---

## TASK B — Generator Laporan XLSX

### B.1 Struktur file baru
Buat 2 modul terpisah (jangan gabung ke `inventoryExport.ts` yang lama — biarkan file lama tetap
ada untuk fitur "Daftar Inventaris" sederhana bila masih dipakai di tempat lain, atau hapus jika
sudah tidak direferensikan sama sekali setelah Task C selesai):

- `lib/server/reports/alatPeriodicReport.ts` → `generateAlatPeriodicReport(params)`
- `lib/server/reports/bhpPeriodicReport.ts` → `generateBhpPeriodicReport(params)`

Parameter bersama (`type ReportParams`):
```ts
interface ReportParams {
    laboratoriumId: string;
    laboratoriumName: string;
    mode: 'monthly' | 'semester';
    periodStart: Date; // 00:00:00 hari pertama
    periodEnd: Date;   // 23:59:59 hari terakhir
}
```
- `mode = 'monthly'`: `periodStart` = tanggal 1 pada bulan yang dipilih user, `periodEnd` = hari
  terakhir bulan tersebut (dihitung di route handler, lihat Task C).
- `mode = 'semester'`: `periodStart`/`periodEnd` = persis tanggal yang dipilih user di 2 datepicker
  (tidak perlu snap ke awal/akhir bulan).

### B.2 `generateAlatPeriodicReport` — logika per item

Query semua `item` bertipe `ASSET` yang **pernah** punya `equipment` di `laboratoriumId` terkait
(baik yang masih aktif maupun yang sudah dihapus dalam rentang, supaya baris "Pengurangan" tetap
tampil), lalu untuk tiap item hitung dari tabel `equipment` (kolom `createdAt`, `isDeleted`,
`deletedAt`, `condition`, `status` — semuanya sudah ada di schema, tidak perlu migrasi tambahan):

```ts
// per item, per equipment milik laboratoriumId ybs:
totalAwal   = count( createdAt < periodStart AND (isDeleted = false OR deletedAt >= periodStart) )
penambahan  = count( createdAt BETWEEN periodStart AND periodEnd )
pengurangan = count( isDeleted = true AND deletedAt BETWEEN periodStart AND periodEnd )
totalAkhir  = totalAwal + penambahan - pengurangan
// kondisi & status diambil dari unit yang termasuk himpunan "aktif per periodEnd"
// (createdAt <= periodEnd AND (isDeleted = false OR deletedAt > periodEnd)):
kondisiBaik   = count(condition = 'BAIK')  dari himpunan aktif tsb
kondisiRusak  = count(condition = 'RUSAK') dari himpunan aktif tsb
tersedia      = count(status = 'READY')    dari himpunan aktif tsb
sedangDipinjam= count(status IN ('IN_USE', 'MAINTENANCE')) dari himpunan aktif tsb
```
> `status IN_USE` dan `MAINTENANCE` digabung ke kolom **Sedang Dipinjam** supaya
> `Tersedia + Sedang Dipinjam = Total Akhir` selalu konsisten (memenuhi rumus yang diminta). Jika
> nanti dibutuhkan kolom "Maintenance" terpisah, tambahkan kolom baru — jangan pecah dari kolom
> "Sedang Dipinjam" tanpa mengubah rumus total di atas.
>
> **Catatan keterbatasan:** kolom Kondisi & Status merefleksikan nilai **saat ini** (live) pada
> tabel `equipment`, bukan snapshot historis per `periodEnd`, karena skema tidak menyimpan riwayat
> perubahan kondisi/status. Tambahkan footnote di baris bawah tabel xlsx yang menjelaskan hal ini
> (lihat B.4).

Implementasi disarankan pakai 1 query Drizzle dengan `sql<number>` aggregate per item (mirip pola
`routes/admin/laporan/btk16/+page.server.ts` dan `routes/api/admin/inventaris/alat/+server.ts`),
atau ambil semua baris `equipment` (join `item`) sekali lalu agregasi di memori dengan JS — proyek
ini sudah punya preseden agregasi di memori (`routes/api/admin/inventaris/bhp/+server.ts`), pilih
pendekatan yang lebih mudah dirawat.

Urutkan hasil berdasarkan `item.name` (alfabetis), nomor urut mulai dari 1. **Item tanpa unit
sama sekali dalam rentang manapun** (totalAwal = penambahan = pengurangan = totalAkhir = 0)
**tidak perlu ditampilkan** di laporan.

### B.3 `generateBhpPeriodicReport` — logika per item

Query semua `movement` dengan `itemId IS NOT NULL` (bukan `equipmentId`), `laboratoriumId` sesuai
filter, `eventType IN ('RECEIVE', 'ISSUE', 'ADJUSTMENT')`, join ke `item` (`type = 'CONSUMABLE'`).

```ts
function signedQty(m) {
    if (m.eventType === 'RECEIVE') return m.qty;
    if (m.eventType === 'ISSUE') return -m.qty;
    // ADJUSTMENT
    if (m.direction === 'IN') return m.qty;
    if (m.direction === 'OUT') return -m.qty;
    return 0; // direction NULL (data lama) -> diabaikan dari agregasi, lihat catatan Task A.2
}

stokAwal        = sum( signedQty(m) for m where m.createdAt < periodStart )
barangMasuk     = sum( m.qty for m where m.createdAt BETWEEN periodStart AND periodEnd
                        and (m.eventType = 'RECEIVE' or (m.eventType='ADJUSTMENT' and m.direction='IN')) )
terpakaiKeluar  = sum( m.qty for m where m.createdAt BETWEEN periodStart AND periodEnd
                        and (m.eventType = 'ISSUE' or (m.eventType='ADJUSTMENT' and m.direction='OUT')) )
stokAkhir       = stokAwal + barangMasuk - terpakaiKeluar
```
Urutkan berdasarkan `item.name`. Item yang sama sekali tidak punya movement pada
`laboratoriumId` tersebut tidak perlu ditampilkan.

### B.4 Format XLSX (berlaku untuk kedua laporan)

Struktur baris di sheet (contoh untuk Alat, pola sama untuk BHP):

| Baris | Isi |
|---|---|
| 1 | Judul: `Laporan Inventaris Alat` (untuk BHP: `Laporan Stok Bahan Habis Pakai`) — merge sepanjang jumlah kolom, font besar bold |
| 2 | Konteks: `Laboratorium: {nama lab}` |
| 3 | Konteks: `Periode: {format tanggal}` — Bulanan → `Juli 2026`; Semester → `21 Jan 2026 s/d 21 Jul 2026` |
| 4 | (baris kosong, spasi) |
| 5 | Header kolom (bold, background warna beda dari body — reuse `fgColor: 'FF2D5A47'` seperti di `inventoryExport.ts`, font putih) |
| 6..n | Data |
| n+1 | (baris kosong) |
| n+2 | Footnote kecil, italic, abu-abu: `*Kondisi & status alat merefleksikan data terkini, bukan snapshot historis per akhir periode.` (khusus laporan Alat saja) |

Ketentuan teknis ExcelJS:
- `worksheet.mergeCells('A1:I1')` (jumlah kolom I untuk Alat = 9, sesuaikan G untuk BHP = 7) untuk
  baris judul & konteks.
- Header row: `cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D5A47' } }`,
  `font: { bold: true, color: { argb: 'FFFFFFFF' } }`, border tipis di semua sel data.
- Set lebar kolom eksplisit (`worksheet.getColumn(n).width = ...`) supaya nama alat/bahan yang
  panjang tidak terpotong.
- `worksheet.views = [{ state: 'frozen', ySplit: 5 }]` supaya header tetap terlihat saat scroll.
- Kolom numerik (`Total Awal`, `Penambahan`, dst.) rata tengah; kolom nama rata kiri.
- Nama sheet: `'Laporan Alat'` / `'Laporan BHP'` (satu sheet per workbook, sesuai permintaan).

Kolom Alat (urutan wajib): `No, Nama Alat, Satuan, Total Awal, Penambahan, Pengurangan,
Total Akhir (Aset), Kondisi Baik, Kondisi Rusak, Tersedia (Ready), Sedang Dipinjam`

Kolom BHP (urutan wajib): `No, Nama Bahan (BHP), Satuan, Stok Awal, Barang Masuk,
Terpakai / Keluar, Stok Akhir`

---

## TASK C — Endpoint & Dialog Filter Periode di Halaman Daftar

### C.1 Endpoint baru (menggantikan endpoint lama)

Buat:
- `routes/admin/laporan/inventaris/alat/export/+server.ts`
- `routes/admin/laporan/inventaris/bhp/export/+server.ts`

Keduanya menerima query param:
- `mode` = `monthly` | `semester` (wajib)
- `date` = `YYYY-MM-DD` (wajib jika `mode=monthly`) → server hitung
  `periodStart = startOfMonth(date)`, `periodEnd = endOfMonth(date)`
- `start`, `end` = `YYYY-MM-DD` (wajib jika `mode=semester`) → dipakai langsung sebagai
  `periodStart`/`periodEnd` (set jam ke `00:00:00` dan `23:59:59`)
- `labId` = wajib untuk `superadmin`/`koordinator` (ambil dari select lab yang sudah ada di
  halaman, lihat `INSTRUKSI_PERBAIKAN_INVENTARIS.md` Task 1); untuk `kepalaLab`/`laboran` paksa
  pakai `locals.user.laboratorium.id`, abaikan query `labId` yang dikirim client.

Role yang boleh mengakses: `['kepalaLab', 'laboran', 'superadmin', 'koordinator']` (samakan dengan
role yang boleh melihat halaman Alat/BHP — cek pola di
`routes/admin/laporan/inventaris/export/+server.ts` lama sebagai referensi, tambahkan
`koordinator` karena role ini juga punya izin `inventory: view`).

Validasi: `mode` harus salah satu dari 2 nilai; untuk `monthly` wajib ada `date` valid; untuk
`semester` wajib `start` dan `end` valid serta `start <= end`. Balas `400` dengan pesan jelas bila
tidak valid.

Response: sama seperti endpoint lama (`Content-Type` xlsx, `Content-Disposition` attachment).
Nama file, contoh:
- Alat bulanan: `Laporan_Alat_{labSlug}_Juli_2026.xlsx`
- Alat semester: `Laporan_Alat_{labSlug}_2026-01-21_sd_2026-07-21.xlsx`
- BHP mengikuti pola sama dengan prefix `Laporan_BHP_`.

Hapus/nonaktifkan `routes/admin/laporan/inventaris/export/+server.ts` dan
`lib/server/reports/inventoryExport.ts` setelah dipastikan tidak ada pemakai lain (grep referensi
`generateInventoryExport` dan `/admin/laporan/inventaris/export` di seluruh `routes/`).

### C.2 Komponen dialog filter periode (reusable)

Buat `lib/components/ExportPeriodicReportDialog.svelte`, props:
```ts
let {
    open = $bindable(false),
    reportLabel,           // "Laporan Inventaris Alat" | "Laporan Stok BHP"
    exportBasePath,         // "/admin/laporan/inventaris/alat/export" | ".../bhp/export"
    labs = [],               // daftar lab (untuk superadmin/koordinator)
    isRestrictedLabUser = false,
    userLabId = ''
}: Props = $props();
```

Isi dialog (gunakan `Dialog` dari `$lib/components/ui/dialog`, `RadioGroup` bila tersedia — cek
`lib/components/ui/radio-group`; jika tidak ada, pakai 2 tombol toggle sederhana):

1. Pilihan jenis laporan: **Bulanan** / **Semester** (`let periodMode = $state<'monthly'|'semester'>('monthly')`).
2. Jika `periodMode === 'monthly'` → tampilkan **1** date picker (pola persis
   `SHADCN_DATEPICKER.md` bagian "Usage" — `Popover` + `Calendar type="single"`), simpan ke
   `let selectedDate = $state<DateValue>()`. Label: "Pilih Bulan" — boleh tetap pakai calendar
   harian penuh (user cukup klik tanggal mana saja pada bulan yang dituju; sub-teks kecil di bawah
   picker: "Laporan akan mencakup 1 s/d akhir bulan yang dipilih").
3. Jika `periodMode === 'semester'` → tampilkan **2** date picker berdampingan (flex row),
   masing-masing state terpisah: `let startDate = $state<DateValue>()`,
   `let endDate = $state<DateValue>()`, label "Tanggal Awal" / "Tanggal Akhir". Validasi
   `endDate >= startDate` sebelum submit (tampilkan pesan error inline bila tidak valid, jangan
   biarkan tombol submit aktif).
4. Jika `!isRestrictedLabUser` → tampilkan `Select.Root` laboratorium (wajib dipilih sebelum
   submit), reuse pola select lab yang sudah dikonsolidasi di Task 1
   (`INSTRUKSI_PERBAIKAN_INVENTARIS.md`).
5. Tombol "Unduh Laporan" (`disabled` bila validasi belum lengkap) → bangun URL:
   ```ts
   function buildExportUrl(): string {
       const params = new URLSearchParams();
       params.set('mode', periodMode);
       if (periodMode === 'monthly') {
           params.set('date', selectedDate!.toString()); // YYYY-MM-DD
       } else {
           params.set('start', startDate!.toString());
           params.set('end', endDate!.toString());
       }
       if (!isRestrictedLabUser) params.set('labId', selectedLabId);
       return `${exportBasePath}?${params.toString()}`;
   }
   ```
   Lalu `window.location.href = buildExportUrl()` (unduh langsung, konsisten dengan tombol Export
   lama yang berupa link `<Button href=...>`), atau gunakan `<a>` dengan `href` yang di-derive dari
   `buildExportUrl()` agar tidak butuh JS click handler tambahan.
   Tutup dialog (`open = false`) setelah klik unduh.

### C.3 Pasang dialog di kedua halaman daftar

File `routes/admin/inventaris/alat/+page.svelte` dan `routes/admin/inventaris/bhp/+page.svelte`:
- Ganti tombol `<Button href="/admin/laporan/inventaris/export?..."> <Download/> Export </Button>`
  (hasil konsolidasi di `INSTRUKSI_PERBAIKAN_INVENTARIS.md` Task 1) menjadi tombol yang membuka
  dialog: `<Button onclick={() => (showExportDialog = true)}><Download class="size-4"/> Export</Button>`.
- Tambahkan `let showExportDialog = $state(false);` dan render:
  ```svelte
  <ExportPeriodicReportDialog
      bind:open={showExportDialog}
      reportLabel="Laporan Inventaris Alat"
      exportBasePath="/admin/laporan/inventaris/alat/export"
      labs={laboratories}
      isRestrictedLabUser={['kepalaLab','laboran'].includes(data.user?.role)}
      userLabId={data.user?.laboratorium?.id ?? ''}
  />
  ```
  (untuk halaman BHP: `reportLabel="Laporan Stok Bahan Habis Pakai"`,
  `exportBasePath="/admin/laporan/inventaris/bhp/export"`).

---

## TASK D — Tampilan Daftar Item: Grup Berdasarkan Kategori

### Tujuan
Di halaman daftar Alat & BHP, tambahkan opsi tampilan **"Kelompok Kategori"** sebagai alternatif
dari tabel biasa. Contoh hasil akhir:
```
Lab. Molekuler (Destruksi/Analisis/Storage/Kultur)
  - Autoclave/Sterilizer ES-315 (Merk Tomy)
  - ELISA Washer Intelispedd washer IW-8 (Biosan)
...
Tanpa Kategori
  - (item-item tanpa categoryId, selalu jadi grup PALING BAWAH)
```

### D.1 Toggle tampilan

File `routes/admin/inventaris/alat/+page.svelte` & `bhp/+page.svelte`:
- Tambahkan state `let viewMode = $state<'table' | 'grouped'>('table');`, sinkron ke query param
  `?view=grouped` (pola sama seperti sinkronisasi `search`/`categoryId` yang sudah ada) supaya bisa
  di-bookmark/share.
- Tambahkan `Tabs` (dari `$lib/components/ui/tabs`, sudah tersedia) atau 2 tombol toggle kecil di
  header controls: "Tabel" / "Kelompok Kategori".
- Saat `viewMode === 'grouped'`, **sembunyikan** filter kategori (`SearchableSelect` kategori) dan
  kontrol pagination (`limit`/`page`) — karena mode ini menampilkan semua item terfilter (oleh
  `search` & `laboratoriumId` saja) sekaligus, dikelompokkan otomatis per kategori.

### D.2 Data untuk mode grouped

Tambahkan param baru di API list (`routes/api/admin/inventaris/bhp/+server.ts` dan
`.../alat/+server.ts`): `groupBy=category`. Ketika param ini dikirim:
- Abaikan `page`/`limit` (atau set limit besar, mis. 1000, sebagai safety net).
- Tambahkan ke response field `categoryId` & `categoryName` per item (join ke
  `equipmentCategory`, `LEFT JOIN` supaya item tanpa kategori tetap ikut dengan `categoryName =
  null`).

Alternatif lebih sederhana (tanpa ubah API): fetch ulang di client dengan `limit=1000` +
`groupBy` **hanya dilakukan di client-side** menggunakan data `categories` yang sudah di-fetch di
`onMount`, group `res.items` berdasarkan `item.categoryId`. Pilih pendekatan ini bila ingin
perubahan minimal di backend — cukup pastikan field `categoryId` sudah ikut di-return oleh kedua
API list (cek `routes/api/admin/inventaris/bhp/+server.ts` & `.../alat/+server.ts`, tambahkan bila
belum ada di `processedItems`/`itemStats` select).

### D.3 Rendering grup

Gunakan `Accordion` (`$lib/components/ui/accordion`) yang sudah terpasang:
```svelte
{#if viewMode === 'grouped'}
    <Accordion.Root type="multiple" value={groupKeys}>
        {#each sortedGroups as group (group.key)}
            <Accordion.Item value={group.key}>
                <Accordion.Trigger>
                    <span class="font-semibold">{group.name}</span>
                    <Badge variant="secondary" class="ml-2">{group.items.length} item</Badge>
                </Accordion.Trigger>
                <Accordion.Content>
                    <!-- render tiap item mirip baris tabel biasa, cukup nama + merk/varian singkat -->
                    {#each group.items as item}
                        <div class="flex items-center justify-between border-b py-2 px-3">
                            <span>{item.name}{item.brand ? ` (Merk ${item.brand})` : ''}</span>
                            <a href="/admin/inventaris/{alat|bhp}/{item.id}" class="text-sm text-blue-600">Detail</a>
                        </div>
                    {/each}
                </Accordion.Content>
            </Accordion.Item>
        {/each}
    </Accordion.Root>
{:else}
    <!-- tabel biasa yang sudah ada -->
{/if}
```

Logika pengurutan grup (JS, di client atau server sama saja):
```ts
function groupByCategory(items: any[], categories: { id: string; name: string }[]) {
    const map = new Map<string, any[]>();
    for (const it of items) {
        const key = it.categoryId ?? '__none__';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(it);
    }
    const named = categories
        .filter((c) => map.has(c.id))
        .map((c) => ({ key: c.id, name: c.name, items: map.get(c.id)! }))
        .sort((a, b) => a.name.localeCompare(b.name));
    const withoutCategory = map.get('__none__');
    if (withoutCategory && withoutCategory.length > 0) {
        named.push({ key: '__none__', name: 'Tanpa Kategori', items: withoutCategory });
    }
    return named;
}
```
Pastikan grup `Tanpa Kategori` **selalu** ditambahkan terakhir (push setelah sort, bukan ikut
di-`sort` bersama grup lain) — sesuai permintaan.

Item di dalam tiap grup diurutkan berdasarkan nama (`localeCompare`), dan untuk Alat tampilkan
merk (`(Merk {brand})`) mengikuti contoh yang diberikan bila tersedia.

---

## Checklist Pengujian Manual

- [ ] Halaman Alat: klik tombol Export → dialog muncul, pilih "Bulanan" → hanya 1 date picker
      tampil.
- [ ] Halaman Alat: pilih "Semester" pada dialog → 2 date picker (Awal/Akhir) tampil, tombol unduh
      nonaktif jika tanggal akhir < tanggal awal.
- [ ] Superadmin/koordinator wajib memilih lab sebelum tombol unduh aktif; kepalaLab/laboran tidak
      melihat select lab dan otomatis pakai lab sendiri.
- [ ] File xlsx Alat yang diunduh: 1 sheet saja, judul & periode di baris atas, header berwarna,
      kolom sesuai urutan yang diminta, `Total Akhir = Kondisi Baik + Kondisi Rusak = Tersedia +
      Sedang Dipinjam` untuk setiap baris.
- [ ] File xlsx BHP yang diunduh: 1 sheet saja, `Stok Akhir = Stok Awal + Barang Masuk - Terpakai/
      Keluar` untuk setiap baris, sample data (`Casa, Meter, 150, 50, 80, 120`) bisa direplikasi
      dengan riwayat transaksi yang sesuai.
- [ ] Ubah kategori BHP/Alat lalu lakukan RECEIVE/ISSUE/ADJUSTMENT beberapa kali dengan tanggal
      berbeda (pakai seed/manual DB) → laporan bulan yang berbeda menunjukkan angka Stok
      Awal/Akhir yang saling menyambung secara konsisten antar periode berurutan.
- [ ] Halaman daftar Alat & BHP: toggle ke "Kelompok Kategori" → item tampil dikelompokkan sesuai
      kategori, kategori terurut alfabetis, grup "Tanpa Kategori" selalu di posisi paling bawah.
- [ ] Filter pencarian (`search`) & filter lab tetap berfungsi saat mode "Kelompok Kategori" aktif;
      filter kategori & pagination disembunyikan di mode ini.
- [ ] Endpoint export lama (`/admin/laporan/inventaris/export`) sudah tidak dipakai di UI manapun
      (cek tidak ada link tersisa) sebelum dihapus.
