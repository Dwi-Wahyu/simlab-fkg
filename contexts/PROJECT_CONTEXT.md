# SIM LAB - SISTEM INFORMASI MANAJEMEN LABORATORIUM FKG UNHAS

## 1. Ringkasan Proyek

Aplikasi **SIM LAB** adalah sistem manajemen laboratorium terintegrasi yang dirancang untuk mengelola operasional, inventaris, dan kepatuhan standar di lingkungan **Fakultas Kedokteran Gigi Universitas Hasanuddin**. Sistem ini memfasilitasi koordinasi antara pengelola fakultas, berbagai laboratorium spesialis, dosen, hingga mahasiswa peneliti untuk memastikan penggunaan fasilitas yang efisien dan aman.

**Tujuan utama:**

- **Sentralisasi Inventaris:** Manajemen alat medis (dental chair, autoclave, dll) dan Bahan Habis Pakai (BHP).
- **Standarisasi Akademik:** Mendukung kegiatan praktikum mahasiswa dan penelitian dosen.
- **Kepatuhan & Keamanan:** Pengelolaan limbah medis (B3) dan audit mutu laboratorium secara berkala.
- **Efisiensi Alur:** Digitalisasi proses peminjaman alat dan pelaporan SPMI.

## 2. Struktur Peran (8 Roles - RBAC)

Aplikasi menggunakan kontrol akses berbasis peran (RBAC) yang ketat untuk menjaga integritas data:

| Role                     | Deskripsi Singkat                                                                 |
| :----------------------- | :-------------------------------------------------------------------------------- |
| **Superadmin**           | Kontrol penuh sistem, manajemen user pusat, dan konfigurasi global.               |
| **Koordinator**          | Bertindak sebagai koordinator lab tertentu.                                       |
| **Kepala Lab**           | Penanggung jawab tertinggi; otoritas persetujuan utama.                           |
| **Instruktur (Dosen)**   | Memverifikasi kebutuhan alat untuk praktikum mahasiswa atau penelitian bimbingan. |
| **Peneliti (Mahasiswa)** | User yang mengajukan peminjaman alat, ruang, atau penggunaan BHP.                 |
| **Staff**                | Pengelola data harian, input stok masuk/keluar, dan verifikasi fisik barang.      |
| **Teknisi**              | Bertanggung jawab atas pemeliharaan, kalibrasi alat, dan perbaikan kerusakan.     |
| **SPMI**                 | Auditor mutu internal yang memantau standar operasional dan kepatuhan regulasi.   |

## 3. Modul Spesifik

### 3.1 Modul Peminjaman

Modul ini mengelola siklus hidup penggunaan aset laboratorium oleh civitas akademika.

- **Workflow:** Pengajuan oleh Peneliti $\rightarrow$ Verifikasi oleh Instruktur $\rightarrow$ Persetujuan Kepala Lab $\rightarrow$ Serah terima oleh Staff.
- **Tracking:** Mencatat durasi penggunaan, kondisi alat sebelum dan sesudah dipinjam.
- **Integrasi:** Terhubung langsung ke tabel `inventory_movement` untuk memastikan status `equipment` berubah menjadi 'DIPINJAM'.

### 3.2 Modul Limbah

Mengelola pembuangan sisa praktikum dan material medis berbahaya (B3).

- **Pencatatan:** Input volume/berat limbah berdasarkan kategori (infeksius, tajam, kimia, dll).
- **Penyimpanan Sementara:** Monitoring kapasitas TPS (Tempat Penyimpanan Sementara) Limbah sebelum diangkut pihak ketiga.
- **Manifest:** Dokumentasi serah terima limbah untuk keperluan pelaporan lingkungan hidup.

### 3.3 Modul Quality & Audit

Fokus pada standarisasi dan penjaminan mutu laboratorium sesuai standar SPMI Unhas.

- **Kalibrasi:** Jadwal rutin untuk alat-alat presisi tinggi (dental unit, radiografi).
- **Audit Internal:** Checklist kepatuhan SOP oleh role SPMI.
- **Temuan & Tindak Lanjut:** Pencatatan ketidaksesuaian (non-conformity) dan monitoring perbaikannya oleh Kepala Lab.

### 3.4 Modul Inventaris & Manajemen Aset

Mengelola katalog barang dan keberadaan fisik aset di laboratorium.

- **Kategorisasi:** Pemisahan tegas antara **Asset** (di-track per unit via `equipment`) dan **Consumable** (di-track via `stock` qty).
- **Konversi Satuan:** Mendukung konversi multi-level (misal: Box ke Pcs) untuk akurasi stok BHP melalui `item_unit_conversion`.
- **Kondisi Aset:** Monitoring status `equipment` (BAIK, RUSAK_RINGAN, RUSAK_BERAT) dan status operasional (READY, IN_USE, MAINTENANCE).

### 3.5 Modul Distribusi & Mutasi (Movement)

Pusat kontrol pergerakan barang di seluruh ekosistem laboratorium.

- **Tipe Mutasi:** Mencakup `RECEIVE` (Masuk), `ISSUE` (Keluar), `TRANSFER`, `LENDING` (Peminjaman), hingga `MAINTENANCE`.
- **Transparansi:** Pencatatan gudang asal (`fromWarehouse`) dan tujuan (`toWarehouse`) serta PIC penanggung jawab untuk setiap pergerakan.
- **Klasifikasi:** Mendukung pengelompokan lokasi seperti Gudang Pusat, Unit Lab, atau Vendor Repair.

### 3.6 Modul Pelaporan & Notifikasi

Fasilitas monitoring performa dan pemberitahuan real-time.

- **Inventory Report:** Rekapitulasi bulanan stok awal, masuk, keluar, dan stok akhir per laboratorium yang divalidasi oleh Kepala Lab dan SPMI.
- **Notifikasi Terarah:** Sistem pengingat (Push/In-app) berdasarkan prioritas (LOW, MEDIUM, HIGH) untuk approval atau jadwal maintenance.
- **Audit Log:** Rekam jejak (Trail) setiap perubahan data pada tabel-tabel kritikal untuk akuntabilitas.

## 4. Core Tech Stack (Konsisten)

- **Framework:** SvelteKit 2.x (Svelte 5 Runes)
- **Runtime:** Bun
- **Database:** MySQL via Drizzle ORM
- **Auth:** Better Auth (Custom Table untuk integrasi Role)
- **Styling:** Tailwind CSS

## 5. Struktur Database Utama

- **`organization`:** Representasi **Laboratorium** (misal: Lab Konservasi Gigi, Lab Radiologi).
- **`item`:** Definisi barang (Katalog), dibedakan menjadi **ASSET** dan **CONSUMABLE**.
- **`equipment`:** Instance fisik dari `item` ASSET yang memiliki nomor seri dan histori kondisi.
- **`movement`:** Master log untuk segala jenis transaksi fisik barang/alat.
- **`stock`:** Saldo real-time barang habis pakai (Consumable) di lokasi tertentu.
- **`maintenance`:** Pencatatan histori servis, perbaikan, dan kalibrasi alat medis.
- **`waste_log`:** Pencatatan transaksi keluar-masuk limbah medis.
- **`audit_checklist` & `inventory_report`:** Data output untuk keperluan manajemen dan audit mutu.
- **`notification` & `audit_log`:** Infrastruktur pendukung komunikasi dan keamanan data.

## 6. Component Example Usage

### Select

```
<script>
	import * as Select from '$lib/components/ui/select/index.js';

    const equipmentTypeOptions = [
		{ value: 'FURNITURE', label: 'Mebel / Furniture' },
		{ value: 'INSTRUMENT', label: 'Instrumen' },
		{ value: 'EQUIPMENT', label: 'Alat / Perangkat' },
		{ value: 'DENTAL_UNIT', label: 'Dental Unit' },
		{ value: 'LAB_INSTRUMENT', label: 'Instrumen Lab' },
		{ value: 'IMAGING', label: 'Imaging' }
	];

    const equipTrigger = $derived(
		equipmentTypeOptions.find((o) => o.value === selectedEquipmentType)?.label ?? 'Pilih Jenis'
	);
</script>

<Select.Root
    type="single"
    name="equipmentType"
    bind:value={selectedEquipmentType}
    disabled={selectedType !== 'ASSET'}
>
    <Select.Trigger classgrid w-full max-w-[400px] grid-cols-2="w-full text-left">
        {equipTrigger}
    </Select.Trigger>
    <Select.Content>
        {#each equipmentTypeOptions as opt (opt.value)}
            <Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
        {/each}
    </Select.Content>
</Select.Root>
```

### Tabs

```
<script>
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	let activeTab = $state('alat');
</script>

<Tabs.Root
    value={activeTab}
    onValueChange={(v) => activeTab = v}
    class="w-full"
>
    <Tabs.List class="grid w-full grid-cols-2">
        <Tabs.Trigger value="alat">
            Alat ({alatItems.length})
        </Tabs.Trigger>
        <Tabs.Trigger value="bahan">
            Bahan ({bahanItems.length})
        </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="alat">
        Alat
    </Tabs.Content>
    <Tabs.Content value="bahan">
        Bahan
    </Tabs.Content>
</Tabs.Root>
```
