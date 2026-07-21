# Instruksi Perbaikan & Fitur Modul Inventaris (BHP & Alat)

Konteks: SvelteKit + Drizzle ORM (MySQL). Semua path relatif terhadap `src/`.
Jalankan `pnpm check` / `pnpm lint` (sesuaikan package manager proyek) setelah setiap task selesai.

---

## TASK 1 — Filter Laboratorium: perbaiki di BHP, hapus duplikasi di Alat

### Root cause
- **Halaman Alat** (`routes/admin/inventaris/alat/+page.svelte`) punya **DUA** select laboratorium:
  1. `selectedExportLabId` — di samping tombol **Export** (baris ~190-208), hanya dipakai untuk membangun link export, **tidak** memfilter tabel.
  2. `selectedLabId` — di samping filter kategori (baris ~330-340), sudah benar: memanggil `handleLabChange()` → `updateUrl({ laboratoriumId, page: 1 })`, sehingga filter tabel bekerja.
- **Halaman BHP** (`routes/admin/inventaris/bhp/+page.svelte`) **hanya punya** select `selectedExportLabId` di samping tombol Export. Tidak ada select filter lab di samping kategori sama sekali, dan `routes/admin/inventaris/bhp/+page.ts` **tidak pernah mengirim** `laboratoriumId` ke API (`/api/admin/inventaris/bhp`). API BHP (`routes/api/admin/inventaris/bhp/+server.ts`) juga **tidak membaca** query param `laboratoriumId` sama sekali — hanya auto-filter berdasarkan lab milik user jika role `kepalaLab`/`laboran`. Superadmin/koordinator tidak bisa memfilter per lab.

### Perbaikan

**1.1 Halaman Alat — hapus select duplikat di samping Export, pakai satu select yang sama untuk filter & export**

File: `routes/admin/inventaris/alat/+page.svelte`
- Hapus blok `<Select.Root type="single" bind:value={selectedExportLabId}>...</Select.Root>` yang berada tepat di samping tombol Export (baris ~190-199).
- Ganti href tombol Export agar memakai `selectedLabId` (bukan `selectedExportLabId`):
  ```svelte
  <Button
      href="/admin/laporan/inventaris/export?labId={selectedLabId === 'all' ? '' : selectedLabId}"
      variant="outline"
      class="gap-2"
  >
      <Download class="size-4" /> Export
  </Button>
  ```
  Jika endpoint export superadmin **mewajibkan** `labId` terisi (cek `routes/admin/laporan/inventaris/export/+server.ts`), tambahkan `disabled={data.user?.role === 'superadmin' && (!selectedLabId || selectedLabId === 'all')}` pada tombol tersebut, dan beri default value `selectedLabId` ke lab pertama saat `laboratories` selesai di-fetch di `onMount` **hanya jika** user adalah superadmin dan belum ada query param `laboratoriumId` di URL.
- Hapus state `selectedExportLabId` dan `exportLabName` yang sudah tidak dipakai.
- Select `selectedLabId` (yang di samping filter kategori) **tetap** di posisinya sekarang — tidak perlu dipindah, cukup jadikan satu-satunya select lab di halaman ini.

**1.2 Halaman BHP — tambahkan filter lab yang benar-benar bekerja, letakkan di samping filter kategori**

File: `routes/admin/inventaris/bhp/+page.svelte`
- Tambahkan state baru mengikuti pola di halaman Alat:
  ```ts
  let selectedLabId = $state(pageStore.url.searchParams.get('laboratoriumId') || 'all');
  const selectedLabName = $derived(
      laboratories.find((l) => l.id === selectedLabId)?.name ?? 'Semua Laboratorium'
  );

  function handleLabChange(newLabId: string | undefined) {
      if (newLabId === undefined) return;
      selectedLabId = newLabId;
      updateUrl({ laboratoriumId: newLabId === 'all' ? '' : newLabId, page: 1 });
  }
  ```
- Tambahkan sinkronisasi `selectedLabId` di dalam `$effect` yang sudah ada (yang menyinkronkan `searchQuery`/`selectedCategoryId`/`currentSort` dari URL).
- Pastikan `laboratories` di-fetch untuk **semua role** yang boleh melihat lintas-lab (superadmin **dan** koordinator — cek daftar role di Task 3), bukan hanya `role === 'superadmin'` seperti sekarang di `onMount`.
- Di markup, **hapus** select `selectedExportLabId` di samping tombol Export (sama seperti Task 1.1), dan tambahkan select lab baru di samping `SearchableSelect` kategori (baris ~477-497), persis meniru struktur select lab di halaman Alat:
  ```svelte
  {#if !['kepalaLab', 'laboran'].includes(data.user?.role)}
      <Select.Root type="single" value={selectedLabId} onValueChange={handleLabChange}>
          <Select.Trigger class="h-10 w-fit bg-white">
              {selectedLabName}
          </Select.Trigger>
          <Select.Content>
              <Select.Item value="all" label="Semua Laboratorium">Semua Laboratorium</Select.Item>
              {#each laboratories as lab}
                  <Select.Item value={lab.id} label={lab.name}>{lab.name}</Select.Item>
              {/each}
          </Select.Content>
      </Select.Root>
  {/if}
  ```
- Update tombol Export agar memakai `selectedLabId` sama seperti Task 1.1.

**1.3 Teruskan `laboratoriumId` dari halaman ke API**

File: `routes/admin/inventaris/bhp/+page.ts`
- Tambahkan pembacaan & penerusan `laboratoriumId`, mengikuti pola persis `routes/admin/inventaris/alat/+page.ts`:
  ```ts
  const laboratoriumId = url.searchParams.get('laboratoriumId') || '';
  ...
  if (laboratoriumId) {
      query.set('laboratoriumId', laboratoriumId);
  }
  ```

**1.4 Terapkan filter lab di API BHP**

File: `routes/api/admin/inventaris/bhp/+server.ts`
- Saat ini `targetLabId` hanya diisi otomatis dari `user.laboratorium?.id` untuk role `kepalaLab`/`laboran`. Tambahkan dukungan query param seperti di `routes/api/admin/inventaris/alat/+server.ts`:
  ```ts
  const queryLabId = url.searchParams.get('laboratoriumId');
  const isRestrictedRole = ['kepalaLab', 'laboran'].includes(user.role);
  const targetLabId = isRestrictedRole
      ? user.laboratorium?.id ?? 'none'
      : queryLabId && queryLabId !== '' && queryLabId !== 'all'
          ? queryLabId
          : null;
  ```
- Gunakan `targetLabId` ini pada logika `filteredStocks` yang sudah ada (baris ~42-47) — logikanya sudah kompatibel, tinggal sumber `targetLabId`-nya diperluas.

---

## TASK 2 — Item BHP yang sudah di-soft-delete masih muncul di tabel

### Root cause
`routes/api/admin/inventaris/bhp/+server.ts`, method `GET`: query `db.query.item.findMany({ where: ... })` hanya memfilter `eq(fields.type, 'CONSUMABLE')`, `categoryId`, dan `search` — **tidak pernah** mengecek `isDeleted`. Bandingkan dengan `routes/api/admin/inventaris/alat/+server.ts` yang sudah benar (`eq(item.isDeleted, false)` ada di `conditions`).

Aksi hapus (`routes/admin/inventaris/bhp/[id]/+page.server.ts`, action `deleteItem`) **sudah benar** — item di-set `isDeleted: true`. Masalah murni di query listing.

### Perbaikan
File: `routes/api/admin/inventaris/bhp/+server.ts`
- Tambahkan kondisi `eq(fields.isDeleted, false)` ke dalam array `conditions` pada `db.query.item.findMany`:
  ```ts
  const conditions = [eq(fields.type, 'CONSUMABLE'), eq(fields.isDeleted, false)];
  ```
- Import `notDeleted` dari `$lib/server/db/soft-delete` sebagai alternatif jika ingin konsisten dengan pola di file lain (`notDeleted(item)`), boleh dipakai menggantikan `eq(fields.isDeleted, false)`.
- Cek juga apakah `stocks: true` (relasi) perlu memfilter `stockBatch`/`stock` yang isDeleted — jika stock/stockBatch item yang dihapus ikut dihapus (lihat `deleteItem` action, batch di-soft-delete juga), tambahkan filter relasi:
  ```ts
  with: {
      stocks: {
          where: (s, { eq }) => eq(s.isDeleted, false) // hanya jika kolom isDeleted ada di tabel stock; jika tidak ada, lewati baris ini
      }
  }
  ```
  (Cek dulu apakah tabel `stock` punya kolom `isDeleted`; jika tidak, cukup filter di level `item` saja karena `deleteItem` sudah men-set `stock.qty = 0` untuk item yang dihapus.)

---

## TASK 3 — Sembunyikan tombol "Tambah BHP" untuk role `koordinator`

### Root cause
File: `routes/admin/inventaris/bhp/+page.svelte`, baris ~384-386. Tombol "Tambah BHP" dirender **tanpa pengecekan role sama sekali**:
```svelte
<Button href="/admin/inventaris/bhp/tambah">
    <Plus /> Tambah BHP
</Button>
```
Bandingkan dengan tombol "Tambah Alat" di `routes/admin/inventaris/alat/+page.svelte` yang sudah dibungkus `{#if ['kepalaLab', 'laboran'].includes(data.user?.role)}`.

### Perbaikan
Bungkus tombol tersebut agar tidak tampil untuk `koordinator`:
```svelte
{#if data.user?.role !== 'koordinator'}
    <Button href="/admin/inventaris/bhp/tambah">
        <Plus /> Tambah BHP
    </Button>
{/if}
```
> Catatan: jangan ubah menjadi whitelist role tertentu (mis. hanya `kepalaLab`/`laboran`) kecuali diminta eksplisit — saat ini role lain (superadmin, admin, dsb.) juga menggunakan tombol ini; permintaan hanya untuk menyembunyikan dari `koordinator`.

Lakukan pengecekan yang sama di server action `routes/admin/inventaris/bhp/tambah/+page.server.ts` (`load` & `actions.default`) agar `koordinator` juga tidak bisa mengakses/submit form ini langsung lewat URL (defense in depth):
```ts
if (locals.user.role === 'koordinator') {
    throw redirect(302, `${base}/admin/inventaris/bhp`);
}
```
Tambahkan di awal `load`, dan return `fail(403, { message: 'Anda tidak memiliki wewenang.' })` di awal `actions.default` bila role `koordinator`.

---

## TASK 4 — Checkbox "jangan tandai sebagai baru" + ubah rentang badge "Baru" dari 1 hari → 1 minggu

### Root cause
Badge "Baru" saat ini dihitung oleh fungsi `isNewItem()` yang **diduplikasi identik** di 4 file:
- `routes/admin/inventaris/bhp/+page.svelte`
- `routes/admin/inventaris/bhp/[id]/+page.svelte`
- `routes/admin/inventaris/alat/+page.svelte`
- `routes/admin/inventaris/alat/[id]/+page.svelte`

Semua memakai jendela waktu `24 * 60 * 60 * 1000` (1 hari), dan tidak ada mekanisme untuk menandai item sebagai "jangan anggap baru".

### 4.1 Sentralisasi fungsi badge + ubah jadi 1 minggu
Buat util baru, mis. `lib/utils/item-badge.ts`:
```ts
const NEW_ITEM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 1 minggu

export function isWithinNewItemWindow(
    createdAt: string | Date | null | undefined
): boolean {
    if (!createdAt) return false;
    const createdDate = new Date(createdAt);
    const diff = Date.now() - createdDate.getTime();
    return diff > 0 && diff <= NEW_ITEM_WINDOW_MS;
}

// Dipakai khusus untuk badge level Item (BHP/Alat) yang bisa dinonaktifkan manual
export function shouldShowNewBadge(
    createdAt: string | Date | null | undefined,
    hideNewBadge: boolean | null | undefined
): boolean {
    if (hideNewBadge) return false;
    return isWithinNewItemWindow(createdAt);
}
```
Ganti semua definisi lokal `function isNewItem(...)` di 4 file di atas dengan import dari util ini:
- Di **halaman list** (`bhp/+page.svelte`, `alat/+page.svelte`): badge item memakai `shouldShowNewBadge(item.createdAt, item.hideNewBadge)` (lihat 4.2 untuk field `hideNewBadge`).
- Di **halaman detail** (`bhp/[id]/+page.svelte` untuk `batch.createdAt`, `alat/[id]/+page.svelte` untuk `equipment.createdAt`): tetap pakai `isWithinNewItemWindow(...)` saja — badge di level batch/unit **tidak** dipengaruhi checkbox item (checkbox hanya relevan saat item pertama kali dibuat, bukan setiap penambahan stok/unit baru).

### 4.2 Tambah kolom `hideNewBadge` pada tabel `item`
File: `lib/server/db/schema.ts`, di definisi `item` (sekitar baris 143-178):
```ts
export const item = mysqlTable(
    'item',
    {
        ...
        hideNewBadge: boolean('hide_new_badge').default(false).notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        ...softDeleteColumns
    },
    ...
);
```
Generate migration drizzle (`pnpm drizzle-kit generate` atau perintah yang dipakai proyek — cek `package.json` script `db:generate`), lalu jalankan migrate di environment dev.

### 4.3 Tambah checkbox di form Tambah BHP & Tambah Alat
File `routes/admin/inventaris/bhp/tambah/+page.svelte` dan `routes/admin/inventaris/alat/tambah/+page.svelte`:
- Tambahkan state `let hideNewBadge = $state(false);`
- Tambahkan checkbox di form (gunakan komponen checkbox yang sudah ada di `$lib/components/ui/checkbox`, cek dulu apakah tersedia; jika tidak ada, gunakan `<input type="checkbox">` native dengan styling Tailwind konsisten dengan form lain):
  ```svelte
  <div class="flex items-center gap-2">
      <input type="checkbox" id="hideNewBadge" name="hideNewBadge" bind:checked={hideNewBadge} value="true" />
      <Label for="hideNewBadge">Jangan tandai sebagai barang baru</Label>
  </div>
  ```
- Nonaktifkan/beri keterangan kecil bahwa opsi ini **hanya berlaku jika item benar-benar baru** (bukan menambah stok/unit ke item yang sudah ada) — misalnya tampilkan teks bantu: "Berlaku hanya saat mendaftarkan item baru. Jika nama sudah terdaftar, opsi ini diabaikan."

File `routes/admin/inventaris/bhp/tambah/+page.server.ts` dan `routes/admin/inventaris/alat/tambah/+page.server.ts`, di `actions.default`:
```ts
const hideNewBadge = formData.get('hideNewBadge') === 'true';
...
if (isNewItem) {
    await tx.insert(item).values({
        ...
        hideNewBadge
    });
}
```
(Jangan set `hideNewBadge` saat `isNewItem` false — mengikuti keterangan bantu di atas.)

### 4.4 Sertakan `hideNewBadge` di response API list
File `routes/api/admin/inventaris/bhp/+server.ts`:
- Tambahkan `hideNewBadge: i.hideNewBadge` ke object yang di-return dalam `processedItems.map(...)`.

File `routes/api/admin/inventaris/alat/+server.ts`:
- Tambahkan `hideNewBadge: item.hideNewBadge` ke `select({...})` pada query `itemStats`.

### 4.5 Update pemakaian badge di UI list
File `routes/admin/inventaris/bhp/+page.svelte` & `routes/admin/inventaris/alat/+page.svelte`:
```svelte
{#if shouldShowNewBadge(item.createdAt, item.hideNewBadge)}
    <Badge ...>Baru</Badge>
{/if}
```

---

## TASK 5 — Tombol "Tambah Alat" / "Tambah Stok" di halaman detail sebagai referensi cepat

### Tujuan
Dari halaman **detail Alat** (`routes/admin/inventaris/alat/[id]/+page.svelte`) dan **detail BHP/Stok** (`routes/admin/inventaris/bhp/[id]/+page.svelte`), tambahkan tombol yang mengarah ke halaman create (`.../tambah`) dengan item saat ini otomatis terisi sebagai referensi (nama, kategori, satuan, dll — meniru perilaku `selectAsset()` / `selectBhp()` yang sudah ada di masing-masing form tambah, yang saat ini hanya bisa dipicu manual lewat dialog pencarian).

### 5.1 Tambahkan query param `itemId` ke tombol pada halaman detail

File `routes/admin/inventaris/alat/[id]/+page.svelte` (di dekat tombol aksi/header halaman):
```svelte
<Button href="/admin/inventaris/alat/tambah?itemId={res.item.id}" class="gap-2">
    <Plus class="size-4" /> Tambah Alat
</Button>
```

File `routes/admin/inventaris/bhp/[id]/+page.svelte` (di dekat tombol "Hapus Item" pada header, sekitar baris ~158-166):
```svelte
<Button href="/admin/inventaris/bhp/tambah?itemId={res.item.id}" class="gap-2">
    <Plus class="size-4" /> Tambah Stok
</Button>
```
Import ikon `Plus` dari `@lucide/svelte` di kedua file jika belum diimport.

### 5.2 Auto-prefill form Tambah berdasarkan `itemId` di query string

File `routes/admin/inventaris/alat/tambah/+page.svelte`:
- Import `page as pageStore` dari `$app/state` (jika belum ada).
- Tambahkan di awal `<script>`, setelah `filteredAssets`/`selectAsset` didefinisikan:
  ```ts
  import { onMount } from 'svelte';

  onMount(() => {
      const refItemId = pageStore.url.searchParams.get('itemId');
      if (refItemId) {
          const asset = data.existingAssets.find((a: any) => a.id === refItemId);
          if (asset) selectAsset(asset);
      }
  });
  ```
- Pastikan `data.existingAssets` (dari `+page.server.ts`) sudah menyertakan relasi `equipments` (dipakai `selectAsset` untuk `brand`/`variant`/`storageLocation`/`laboratoriumId`/`condition`/`status`) — cek query `existingAssets` di `routes/admin/inventaris/alat/tambah/+page.server.ts`; jika belum ada `with: { equipments: true }`, tambahkan supaya prefill lengkap:
  ```ts
  const existingAssets = await db.query.item.findMany({
      where: and(eq(item.type, 'ASSET'), eq(item.isDeleted, false)),
      with: { equipments: { limit: 1 } } // atau ambil semua lalu pakai equipments?.[0] seperti kode client saat ini
  });
  ```

File `routes/admin/inventaris/bhp/tambah/+page.svelte`:
- Sama seperti di atas, tapi memanggil `selectBhp`:
  ```ts
  import { onMount } from 'svelte';

  onMount(() => {
      const refItemId = pageStore.url.searchParams.get('itemId');
      if (refItemId) {
          const bhp = data.existingBhp.find((b: any) => b.id === refItemId);
          if (bhp) selectBhp(bhp);
      }
  });
  ```
  (`selectBhp` di form ini tidak butuh relasi stok, jadi `existingBhp` di `+page.server.ts` tidak perlu diubah.)

> Catatan UX: setelah prefill otomatis via `itemId`, field `laboratoriumId`/`brand`/`variant`/qty tetap dikosongkan (BHP) atau memakai default lab pertama unit alat (Alat) — user tetap mengisi jumlah/stok baru secara manual, karena tujuan tombol ini hanya mempercepat pengisian identitas item, bukan menduplikasi transaksi stok sebelumnya.

---

## Checklist Pengujian Manual

- [ ] BHP: pilih laboratorium di filter (samping kategori) → tabel BHP ter-filter sesuai lab, URL berisi `?laboratoriumId=...`.
- [ ] BHP & Alat: hanya ada **satu** select laboratorium di header halaman (tidak ada lagi select terpisah di samping tombol Export).
- [ ] BHP & Alat: tombol Export tetap membawa `labId` yang benar sesuai select lab yang dipilih.
- [ ] Hapus (soft delete) satu item BHP → item tidak lagi muncul di tabel daftar BHP maupun di hasil pencarian/kategori manapun.
- [ ] Login sebagai `koordinator` → tombol "Tambah BHP" tidak muncul di halaman daftar BHP; akses langsung ke `/admin/inventaris/bhp/tambah` di-redirect.
- [ ] Login sebagai role lain (mis. `laboran`) → tombol "Tambah BHP" tetap muncul seperti biasa.
- [ ] Buat item BHP/Alat baru **tanpa** centang checkbox → badge "Baru" muncul dan tetap tampil hingga 7 hari sejak dibuat, lalu hilang otomatis.
- [ ] Buat item BHP/Alat baru **dengan** centang checkbox "jangan tandai sebagai barang baru" → badge "Baru" tidak pernah muncul untuk item tersebut di halaman daftar.
- [ ] Tambah stok/unit ke item yang **sudah ada** (bukan item baru) → checkbox tidak berpengaruh (item lama tidak tiba-tiba tertandai baru atau sebaliknya).
- [ ] Dari halaman detail Alat, klik "Tambah Alat" → form tambah alat terbuka dengan nama/kategori/merk/dll sudah terisi sesuai item tersebut.
- [ ] Dari halaman detail BHP, klik "Tambah Stok" → form tambah BHP terbuka dengan nama/kategori/satuan sudah terisi sesuai item tersebut.
