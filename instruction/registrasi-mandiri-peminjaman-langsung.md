# Implementasi: Registrasi Mandiri Mahasiswa + Pengajuan Peminjaman Alat Langsung

## Latar Belakang & Tujuan

Saat ini semua akun (termasuk role `peneliti`, yang di seluruh UI aplikasi ini dilabeli
**"Mahasiswa"** — lihat `mapRole()` di halaman peminjaman dan `quickAccessUsers` di halaman login)
harus dibuatkan oleh superadmin lewat `/admin/users/[role_slug]/tambah`. Tidak ada jalur bagi
mahasiswa umum untuk membuat akun sendiri.

Tujuan fitur ini: mahasiswa yang butuh pinjam alat **di luar praktikum** (penelitian/skripsi,
lomba, kegiatan organisasi mahasiswa) bisa:

1. Mendaftar sendiri pakai NIM sebagai username → otomatis masuk sebagai role `peneliti`.
2. Kalau NIM itu ternyata sudah pernah terdaftar, sistem **tidak membuat akun duplikat** —
   langsung memakai akun yang sudah ada.
3. Langsung diarahkan ke form pengajuan peminjaman alat yang terpisah dari form staf
   (`/admin/peminjaman/baru` yang sekarang), lalu pengajuan itu masuk ke alur verifikasi Kepala
   Lab yang sudah ada.

**Catatan penting hasil scan:** field `purpose` pada tabel `lending` saat ini cuma punya
`PRAKTIKUM`, `PENELITIAN_DOSEN`, `PENGABDIAN_MASYARAKAT` — tidak ada opsi untuk penelitian
mahasiswa/lomba/organisasi mahasiswa. Ini perlu ditambahkan (bagian 4).

**Temuan penting lain (baca sebelum implementasi):** alur "verifikasi oleh Kepala Lab" yang
disebut di requirement **belum benar-benar ada di kode**. `/admin/peminjaman/baru` (dipakai staf)
langsung men-set `status: 'APPROVED'` saat insert — tidak pernah lewat status `DRAFT` menunggu
approval. Tidak ada action `approve`/`reject` di mana pun di codebase, walau kolom
`rejectedReason`, `approvedBy`, dan tabel `approval` sudah disiapkan di skema untuk itu. Jadi
fitur ini **juga harus membangun** action approve/reject tersebut (bagian 6) — kalau tidak,
pengajuan mahasiswa akan menumpuk di status `DRAFT` tanpa ada cara bagi Kepala Lab untuk
menyetujuinya.

---

## Ringkasan Alur

```
Mahasiswa buka /daftar
  → isi NIM (username), Nama, Password
  → submit
      ├─ Username belum ada → buat akun baru (role: peneliti) → auto sign-in
      └─ Username sudah ada → coba sign-in pakai password yang diinput
            ├─ Password cocok → pakai akun itu (TIDAK membuat akun baru)
            └─ Password salah → tampilkan error, arahkan ke "Lupa Password"
  → redirect ke /admin/peminjaman/ajukan (form pengajuan, bukan dashboard)

Mahasiswa isi form pengajuan (unit/organisasi, keperluan, alat, tanggal, no. surat, upload surat)
  → submit → lending.status = 'DRAFT', item belum di-bind ke unit alat fisik tertentu

Kepala Lab buka detail pengajuan → Setujui / Tolak (fitur baru, lihat bagian 6)
  ├─ Setujui → sistem bind alat yang tersedia, status → 'APPROVED', alat → IN_USE
  └─ Tolak → status → 'REJECTED' + alasan
```

---

## 1. Catatan Keamanan — Kenapa "Pakai Akun yang Sudah Ada" Tetap Butuh Password

Requirement menyebut _"jika username sudah [terdaftar,] langsung gunakan akun tersebut tanpa
membuat akun baru"_. Ini **tidak bisa berarti login otomatis tanpa verifikasi password** — kalau
begitu, siapa pun yang tahu/menebak NIM orang lain bisa mengambil alih akun itu (lihat riwayat
peminjaman, data pribadi) hanya dengan mengetik NIM tersebut di form registrasi. Itu celah
keamanan serius.

Implementasi yang benar dan tetap memenuhi maksud requirement: form registrasi **sama seperti
form login** (username + password), tapi action-nya "Daftar / Masuk" gabungan:

- Kalau username belum terdaftar → buat akun baru dengan password yang diisi.
- Kalau username sudah terdaftar → coba masuk pakai password yang diisi. Kalau cocok, dia
  "langsung pakai akun tersebut" (persis seperti diminta) — tanpa perlu tahu bedanya dia
  "mendaftar" atau "masuk", dari sisi mahasiswa terasa seperti satu alur mulus. Kalau password
  tidak cocok, baru tampilkan pesan error yang mengarahkan ke halaman Lupa Password.

Ini memenuhi UX yang diminta (mahasiswa tidak perlu pusing apakah dia "sudah pernah daftar atau
belum") sekaligus tidak membuka celah account takeover.

---

## 2. Skema: Tambah Opsi `purpose` untuk Kebutuhan Mahasiswa

**File: `src/lib/server/db/schema.ts`**

```diff
 purpose: mysqlEnum('purpose', [
 	'PRAKTIKUM',
 	'PENELITIAN_DOSEN',
-	'PENGABDIAN_MASYARAKAT'
+	'PENGABDIAN_MASYARAKAT',
+	'PENELITIAN_MAHASISWA',
+	'LOMBA',
+	'ORGANISASI_MAHASISWA'
 ]).notNull(),
```

Generate & jalankan migration (`bun run drizzle-kit generate`) — ini `ALTER TABLE ... MODIFY
COLUMN purpose ENUM(...)`, aman untuk data lama karena cuma menambah opsi.

---

## 3. Halaman Registrasi Publik: `/daftar`

### 3.1 `src/routes/daftar/+page.svelte`

Duplikat tampilan dari `src/routes/+page.svelte` (halaman login) — sama persis strukturnya
(panel form kiri, panel branding kanan, warna `#006a34`, dsb.) supaya konsisten secara visual,
dengan perbedaan:

- Judul: **"Daftar Mahasiswa"** (bukan "Selamat Datang").
- Subjudul: _"Untuk mengajukan peminjaman alat di luar praktikum (penelitian, lomba, organisasi
  mahasiswa)"_.
- Field tambahan **Nama Lengkap** di atas field Username.
- Label field Username diganti jadi **"NIM"**, placeholder "Masukkan NIM Anda".
- Field **Konfirmasi Password** ditambahkan (validasi klien: harus sama dengan Password).
- Tombol submit: **"Daftar / Masuk"** (bukan "Masuk ke Sistem"), ikon `UserPlus`.
- Hapus blok "Remember me" dan "Lupa password?" dari form ini (tidak relevan saat baru
  daftar) — tapi tetap sediakan link kecil di bawah tombol submit: _"Sudah pernah daftar dan lupa
  password? [Klik di sini](/lupa-password)"_.
- Footer bawah form tambahkan link balik: _"Sudah punya akun staf/dosen? [Masuk di sini](/)"_.

Struktur script mirror `+page.svelte` (pakai `enhance`, `applyAction`, toast) tapi action target
`?/daftarAtauMasuk`, dan field tambahan `name`, `confirmPassword`.

```svelte
<script lang="ts">
	import { UserPlus, Loader2, User, Lock, IdCard } from '@lucide/svelte';
	import type { ActionResult } from '@sveltejs/kit';
	import { applyAction, enhance } from '$app/forms';
	import { toast } from '$lib/components/toast';

	let { form } = $props();
	let isLoading = $state(false);
	let name = $state('');
	let username = $state('');
	let password = $state('');
	let confirmPassword = $state('');

	function handleDaftar() {
		if (password !== confirmPassword) {
			toast.destructive('Password tidak cocok', {
				description: 'Pastikan Password dan Konfirmasi Password sama.'
			});
			return;
		}
		isLoading = true;
		return async ({ result }: { result: ActionResult }) => {
			if (result.type === 'redirect') {
				toast.success('Berhasil', { description: 'Selamat datang, silakan lanjutkan pengajuan.' });
			} else {
				isLoading = false;
				if (result.type === 'failure') {
					toast.destructive('Gagal', {
						description: result.data?.message || 'Periksa kembali data Anda.'
					});
				}
			}
			await applyAction(result);
		};
	}
</script>
```

Form fields kirim: `name`, `username`, `password`. (`confirmPassword` cukup dicek di klien, tidak
perlu dikirim ke server.)

### 3.2 `src/routes/daftar/+page.server.ts`

```ts
import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';

const SELF_SERVICE_REDIRECT = '/admin/peminjaman/ajukan';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		return redirect(302, SELF_SERVICE_REDIRECT);
	}
	return {};
};

export const actions: Actions = {
	daftarAtauMasuk: async (event) => {
		const formData = await event.request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';
		const username = formData.get('username')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		if (!name || !username || !password) {
			return fail(400, { message: 'Nama, NIM, dan password wajib diisi' });
		}
		if (password.length < 8) {
			return fail(400, { message: 'Password minimal 8 karakter' });
		}

		// 1. Cek apakah username (NIM) sudah terdaftar
		const existing = await db.query.user.findFirst({
			where: (u, { eq: eqFn, and: andFn }) =>
				andFn(eqFn(u.username, username), eqFn(u.isDeleted, false))
		});

		if (existing) {
			// 2a. Sudah terdaftar → JANGAN buat akun baru, coba masuk dengan password yang diinput
			try {
				await auth.api.signInUsername({
					body: { username, password, callbackURL: SELF_SERVICE_REDIRECT }
				});
			} catch (error) {
				if (error instanceof APIError) {
					return fail(401, {
						message:
							'NIM ini sudah terdaftar dan password yang Anda masukkan salah. Gunakan menu "Lupa password?" jika tidak ingat password Anda.'
					});
				}
				return fail(500, { message: 'Terjadi kesalahan sistem' });
			}
			return redirect(302, SELF_SERVICE_REDIRECT);
		}

		// 2b. Belum terdaftar → buat akun baru dengan role default 'peneliti' (Mahasiswa)
		try {
			const synthesizedEmail = `${username}@nim.simlab.local`; // lihat catatan bagian 3.3
			const signUpResponse = await auth.api.signUpEmail({
				body: {
					email: synthesizedEmail,
					username,
					password,
					name
				}
			});

			if (!signUpResponse) throw new Error('Gagal membuat akun');

			await db
				.update(userTable)
				.set({ role: 'peneliti' })
				.where(eq(userTable.id, signUpResponse.user.id));
		} catch (error) {
			console.error(error);
			if (error instanceof APIError) {
				return fail(error.status as number, { message: error.message || 'Gagal mendaftar' });
			}
			return fail(500, { message: 'Terjadi kesalahan sistem' });
		}

		return redirect(302, SELF_SERVICE_REDIRECT);
	}
};
```

> `auth.api.signUpEmail` di better-auth otomatis membuat session (auto sign-in) setelah sukses,
> jadi tidak perlu panggilan `signInUsername` tambahan di jalur akun-baru — cek perilaku ini di
> versi better-auth yang dipakai project (`package.json`); kalau versi yang dipakai ternyata TIDAK
> auto-create session, tambahkan pemanggilan `auth.api.signInUsername` setelah update role, sama
> seperti pola di jalur akun-sudah-ada.

### 3.3 Soal Email (wajib diisi di DB tapi tidak diminta ke mahasiswa)

Kolom `user.email` adalah `NOT NULL` (`auth.schema.ts` baris 20). Supaya mahasiswa tidak perlu
mengisi email di form (yang tujuannya memang menyederhanakan proses untuk kasus pakai
"pinjam alat cepat, di luar praktikum"), sistem mensintesis email placeholder dari NIM
(`{username}@nim.simlab.local`) seperti contoh di atas.

**Konsekuensi yang perlu disadari:** akun dengan email sintetis ini **tidak bisa memakai fitur
"Lupa Password" berbasis email** (kalau fitur itu memang berbasis pengiriman email — cek
`src/routes/lupa-password/+page.server.ts` untuk memastikan mekanismenya sebelum menganggap ini
aman diabaikan). Kalau `lupa-password` memang berbasis email, tambahkan catatan di halaman profil
mahasiswa (`/admin/profil`) yang mendorong mereka mengganti ke email asli, atau — alternatif lebih
aman — jadikan field email **opsional-tapi-ditawarkan** di form daftar (`Email (opsional, untuk
reset password)`), dan hanya pakai email sintetis kalau dikosongkan. Ini pilihan produk, sebutkan
ke pengguna sebelum memutuskan salah satu.

---

## 4. Halaman Pengajuan Peminjaman Mandiri: `/admin/peminjaman/ajukan`

Ini **halaman terpisah** dari `/admin/peminjaman/baru` (yang tetap khusus staf: pilih banyak
peminjam sekaligus, langsung auto-approved, pilih lab manual). Halaman baru ini:

- Hanya bisa diakses role `peneliti` (dan boleh juga `instruktur`, karena keduanya sama-sama
  dilayani di section "Peminjaman Saya" pada halaman list yang sudah ada).
- `requestedBy` selalu **user yang sedang login** (tidak ada pemilihan peminjam lain).
- Tidak ada field pilih laboratorium manual — cukup pilih alat, sistem cari lab mana saja yang
  punya stok (atau minta pilih lab hanya kalau alat yang sama ada di beberapa lab, sesuaikan
  dengan pola yang sudah ada di `baru/+page.server.ts` bagian fetch `availableItems`).
- Status hasil insert **`DRAFT`** (menunggu verifikasi Kepala Lab), bukan langsung `APPROVED`.
- **Belum bind ke unit alat (`equipmentId`) tertentu saat submit** — hanya simpan
  `itemId` + `qty` yang diminta. Binding ke serial number alat spesifik + perubahan status alat ke
  `IN_USE` baru dilakukan **saat Kepala Lab menyetujui** (bagian 6). Ini penting supaya alat tidak
  "terkunci" (`IN_USE`) untuk pengajuan yang belum tentu disetujui.

### 4.1 `src/routes/admin/peminjaman/ajukan/+page.server.ts`

```ts
import { db } from '$lib/server/db';
import { item, equipment, lending, lendingItem } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !['peneliti', 'instruktur'].includes(locals.user.role)) {
		throw redirect(302, '/admin/peminjaman');
	}

	// Tampilkan semua item ASSET yang punya minimal 1 unit READY di lab mana pun
	const availableItems = await db.query.item.findMany({
		where: eq(item.type, 'ASSET'),
		with: {
			equipments: {
				where: eq(equipment.status, 'READY'),
				columns: { id: true, laboratoriumId: true },
				with: { laboratorium: { columns: { id: true, name: true } } }
			}
		}
	});

	return {
		items: availableItems.filter((i) => i.equipments.length > 0)
	};
};

export const actions: Actions = {
	ajukan: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser || !['peneliti', 'instruktur'].includes(currentUser.role)) {
			return fail(403, { message: 'Tidak diizinkan' });
		}

		const formData = await request.formData();
		const unit = (formData.get('unit') as string)?.trim();
		const purpose = formData.get('purpose') as string;
		const startDate = formData.get('startDate') as string;
		const endDate = formData.get('endDate') as string;
		const nomorSurat = formData.get('nomorSurat') as string;
		const surat = formData.get('surat') as File;
		const itemDataRaw = formData.get('items') as string; // [{itemId, qty}]

		if (!unit || !purpose || !startDate || !itemDataRaw) {
			return fail(400, { message: 'Data pengajuan belum lengkap' });
		}

		if (!surat || surat.size === 0) {
			return fail(400, {
				message:
					'Surat permohonan wajib diunggah. Pastikan surat sudah ditandatangani sebelum diunggah.'
			});
		}
		if (surat.size > 10 * 1024 * 1024) {
			return fail(400, { message: 'Ukuran file surat maksimal 10MB' });
		}

		const selectedItems = JSON.parse(itemDataRaw) as { itemId: string; qty: number }[];
		if (selectedItems.length === 0) {
			return fail(400, { message: 'Pilih minimal 1 alat yang ingin dipinjam' });
		}

		const ext = path.extname(surat.name) || '.pdf';
		const fileName = `${uuidv4()}${ext}`;
		const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'letter');
		if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
		fs.writeFileSync(path.join(uploadDir, fileName), Buffer.from(await surat.arrayBuffer()));

		const lendingId = uuidv4();

		try {
			await db.transaction(async (tx) => {
				await tx.insert(lending).values({
					id: lendingId,
					requestedBy: currentUser.id,
					laboratoriumId: null, // ditentukan saat approval, lihat bagian 6
					unit,
					purpose: purpose as any,
					nomorSurat: nomorSurat || null,
					surat: fileName,
					startDate: new Date(startDate),
					endDate: endDate ? new Date(endDate) : null,
					status: 'DRAFT' // menunggu verifikasi Kepala Lab
				});

				// Simpan intent alat (belum bind ke unit fisik/equipmentId tertentu)
				for (const sel of selectedItems) {
					await tx.insert(lendingItem).values({
						id: uuidv4(),
						lendingId,
						equipmentId: null,
						qty: sel.qty
					});
				}
			});

			return { success: true, lendingId };
		} catch (err: any) {
			console.error('Error creating self-service lending:', err);
			return fail(500, { message: err.message || 'Gagal mengirim pengajuan' });
		}
	}
};
```

> Catatan: `lendingItem.equipmentId` disimpan `null` sementara untuk menandai "belum di-bind".
> Query yang menampilkan `lendingItem` di tempat lain (`with: { equipment: { with: { item: true }
} }`) perlu menangani `equipment: null` dengan graceful fallback (tampilkan nama alat via join
> alternatif, atau — lebih sederhana — tambahkan kolom `itemId` langsung ke `lendingItem` supaya
> nama alat yang diminta tetap bisa ditampilkan sebelum di-bind ke `equipmentId`). **Rekomendasi:**
> tambahkan kolom baru `requestedItemId` (nullable, FK ke `item.id`) di `lendingItem` khusus untuk
> menyimpan "alat jenis apa yang diminta" sebelum approval — supaya UI detail pengajuan (bagian 5)
> tetap bisa menampilkan daftar alat yang diminta walau `equipmentId` masih kosong.

Tambahan skema (`schema.ts`):

```diff
 export const lendingItem = mysqlTable('lending_item', {
 	id: varchar('id', { length: 36 }).primaryKey(),
 	lendingId: varchar('lending_id', { length: 36 }).references(() => lending.id, {
 		onDelete: 'cascade'
 	}),
 	equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id),
+	requestedItemId: varchar('requested_item_id', { length: 36 }).references(() => item.id),
 	qty: int('qty').default(1),
 	...
```

Isi `requestedItemId: sel.itemId` saat insert di atas. Saat approval (bagian 6), field ini dipakai
untuk mencari `equipment` yang cocok, lalu `equipmentId` diisi.

### 4.2 `src/routes/admin/peminjaman/ajukan/+page.svelte`

Bangun form baru (jangan reuse `baru/+page.svelte` langsung — struktur beda: tidak ada pemilihan
peminjam/lab manual). Ikuti gaya visual card/form yang sama seperti halaman peminjaman lain
(`Card.Root`, `Input`, `Select`, tombol hijau `#006a34` konsisten dengan tema login/daftar).

Bagian penting yang **wajib ada**:

1. **Unit/Organisasi** (`Input` teks) — contoh placeholder: _"Tim Riset Skripsi / UKM ... / Panitia
   Lomba ..."_.
2. **Keperluan** (`Select`) — opsi terbatas untuk konteks non-praktikum:
   ```ts
   const purposeOptions = [
   	{ value: 'PENELITIAN_MAHASISWA', label: 'Penelitian / Skripsi Mahasiswa' },
   	{ value: 'LOMBA', label: 'Lomba / Kompetisi' },
   	{ value: 'ORGANISASI_MAHASISWA', label: 'Kegiatan Organisasi Mahasiswa' }
   ];
   ```
3. **Pilih Alat** — daftar `data.items` dengan checkbox/qty stepper (mirror pola `filteredAlat` +
   `selectedItems` dari `baru/+page.svelte`, tapi tanpa pemilihan lab).
4. **Tanggal Mulai & Tanggal Selesai**.
5. **Nomor Surat** (opsional, teks).
6. **Upload Surat** — field file **wajib**, dengan **notice yang jelas dan mencolok** persis di
   atas/di bawah field upload:

   ```svelte
   <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
   	<strong>Penting:</strong> surat permohonan yang diunggah harus sudah
   	<strong>ditandatangani</strong> oleh pihak yang berwenang (dosen pembimbing/PJ kegiatan/ketua organisasi)
   	sebelum diunggah. Surat yang belum ditandatangani akan diminta untuk diunggah ulang oleh Kepala Lab
   	saat proses verifikasi.
   </div>
   <Label>Surat Permohonan (sudah ditandatangani, PDF/DOCX, maks 10MB)</Label>
   <Input type="file" name="surat" accept=".pdf,.docx" required />
   ```

7. Info banner di bagian atas form yang menjelaskan alurnya, supaya ekspektasi mahasiswa jelas:
   _"Pengajuan Anda akan diverifikasi oleh Kepala Lab terkait. Anda akan melihat status pengajuan
   di halaman 'Peminjaman Saya' setelah mengirim."_

8. Setelah submit sukses → redirect ke `/admin/peminjaman` (halaman "Peminjaman Saya" yang sudah
   ada), supaya mahasiswa langsung lihat status `DRAFT` pengajuannya di daftar.

---

## 5. Tambahkan Tombol Akses dari Halaman List yang Sudah Ada

**File: `src/routes/admin/peminjaman/+page.svelte`**

Section mahasiswa (`{#if data.user.role === 'peneliti' || data.user.role === 'instruktur'}`,
mulai baris ~255) saat ini **tidak punya tombol "Ajukan Peminjaman" sama sekali** — ini gap
lain yang ditemukan saat scan. Tambahkan tombol di header section tersebut:

```svelte
<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
	<div>
		<h1 class="text-3xl font-bold tracking-tight text-slate-900">Peminjaman Saya</h1>
		<p class="text-slate-500">Ajukan dan pantau status peminjaman alat laboratorium Anda.</p>
	</div>
	<Button href="/admin/peminjaman/ajukan" class="w-full gap-2 sm:w-fit">
		<Plus class="size-4" />
		Ajukan Peminjaman
	</Button>
</div>
```

(Import `Plus` dari `@lucide/svelte` kalau belum ada — cek import di atas file, kemungkinan sudah
ada karena dipakai di section staf.)

---

## 6. Melengkapi Alur Verifikasi Kepala Lab (Gap yang Wajib Dibangun)

Tanpa ini, pengajuan mahasiswa akan macet permanen di status `DRAFT`.

**File: `src/routes/admin/peminjaman/[id]/+page.server.ts`** — tambahkan 2 action baru:

```ts
import { equipment, item } from '$lib/server/db/schema';
import { and, inArray } from 'drizzle-orm';

// ... di dalam `actions`:

approveLending: async ({ params, locals, request }) => {
	const { id } = params;
	const currentUser = locals.user;
	if (!currentUser || !['kepalaLab', 'superadmin'].includes(currentUser.role)) {
		return fail(403, { message: 'Tidak diizinkan' });
	}

	const formData = await request.formData();
	const laboratoriumId =
		(formData.get('laboratoriumId') as string) || currentUser.laboratorium?.id || '';

	if (!laboratoriumId) {
		return fail(400, { message: 'Laboratorium wajib ditentukan saat menyetujui' });
	}

	try {
		await db.transaction(async (tx) => {
			const pendingItems = await tx.query.lendingItem.findMany({
				where: and(eq(lendingItem.lendingId, id), eq(lendingItem.equipmentId, null as any))
			});

			for (const pending of pendingItems) {
				if (!pending.requestedItemId) continue;

				const availableEquip = await tx.query.equipment.findMany({
					where: and(
						eq(equipment.itemId, pending.requestedItemId),
						eq(equipment.status, 'READY'),
						eq(equipment.laboratoriumId, laboratoriumId)
					),
					limit: pending.qty ?? 1
				});

				if (availableEquip.length < (pending.qty ?? 1)) {
					throw new Error(
						`Stok tidak cukup untuk salah satu alat yang diajukan di laboratorium ini`
					);
				}

				// Bind unit pertama ke baris ini, sisanya (kalau qty > 1) buat baris lendingItem baru
				await tx
					.update(lendingItem)
					.set({ equipmentId: availableEquip[0].id })
					.where(eq(lendingItem.id, pending.id));

				for (const extra of availableEquip.slice(1)) {
					await tx.insert(lendingItem).values({
						id: uuidv4(),
						lendingId: id,
						equipmentId: extra.id,
						requestedItemId: pending.requestedItemId,
						qty: 1
					});
				}

				for (const equip of availableEquip) {
					await tx.update(equipment).set({ status: 'IN_USE' }).where(eq(equipment.id, equip.id));
				}
			}

			await tx
				.update(lending)
				.set({ status: 'APPROVED', approvedBy: currentUser.id, laboratoriumId })
				.where(eq(lending.id, id));
		});

		return { success: true };
	} catch (err: any) {
		console.error('Error approving lending:', err);
		return fail(500, { message: err.message || 'Gagal menyetujui peminjaman' });
	}
},

rejectLending: async ({ params, locals, request }) => {
	const { id } = params;
	const currentUser = locals.user;
	if (!currentUser || !['kepalaLab', 'superadmin'].includes(currentUser.role)) {
		return fail(403, { message: 'Tidak diizinkan' });
	}

	const formData = await request.formData();
	const reason = (formData.get('reason') as string)?.trim();
	if (!reason) return fail(400, { message: 'Alasan penolakan wajib diisi' });

	try {
		await db
			.update(lending)
			.set({ status: 'REJECTED', rejectedReason: reason, approvedBy: currentUser.id })
			.where(eq(lending.id, id));
		return { success: true };
	} catch (err: any) {
		console.error('Error rejecting lending:', err);
		return fail(500, { message: err.message || 'Gagal menolak peminjaman' });
	}
}
```

**File: `src/routes/admin/peminjaman/[id]/+page.svelte`** — tampilkan tombol **Setujui** /
**Tolak** kalau `lendingData.status === 'DRAFT'` dan `currentUser.role` termasuk
`kepalaLab`/`superadmin`. Untuk **Tolak**, gunakan dialog kecil yang minta alasan (textarea, wajib
diisi) sebelum submit ke action `rejectLending`. Untuk **Setujui**, kalau Kepala Lab bisa
menangani lebih dari satu lab, tampilkan select laboratorium tujuan; kalau tidak (role
`kepalaLab` biasa, satu lab tetap), langsung submit tanpa perlu pilih apa-apa (server sudah
fallback ke `currentUser.laboratorium.id`).

Juga tampilkan surat yang diunggah (link download `/uploads/letter/{lending.surat}`) supaya
Kepala Lab bisa membuka & memverifikasi **surat tersebut memang sudah ditandatangani** sebelum
menekan Setujui — ini bagian penting dari alur verifikasi manual yang diminta.

---

## 7. Navigasi dari Halaman Login

**File: `src/routes/+page.svelte`**

Tambahkan link di bawah form login (di atas atau berdekatan dengan footer copyright), supaya
mahasiswa yang belum punya akun bisa langsung menemukan jalan masuk tanpa perlu tahu URL:

```svelte
<div class="mt-6 text-center text-sm text-muted-foreground">
	Mahasiswa yang ingin meminjam alat untuk penelitian, lomba, atau kegiatan organisasi?
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a href="/daftar" class="font-semibold text-[#006a34] hover:underline"> Daftar di sini </a>
</div>
```

Tempatkan tepat di atas `<footer class="mt-16 text-center">` yang sudah ada, supaya tetap dalam
alur visual yang sama (di bawah tombol submit & sebelum copyright).

---

## 8. Checklist Implementasi

- [ ] Tambah opsi `purpose` baru (`PENELITIAN_MAHASISWA`, `LOMBA`, `ORGANISASI_MAHASISWA`) di
      schema + migration
- [ ] Tambah kolom `requestedItemId` di `lendingItem` + migration
- [ ] Buat `src/routes/daftar/+page.svelte` (tampilan mirror login) + `+page.server.ts`
      (action `daftarAtauMasuk` dengan logika cek-username-dulu → create atau sign-in)
- [ ] Putuskan strategi email (sintesis otomatis vs opsional-ditawarkan) — cek dulu mekanisme
      `/lupa-password` sebelum memutuskan
- [ ] Buat `src/routes/admin/peminjaman/ajukan/+page.server.ts` + `+page.svelte` (form self-service,
      status awal `DRAFT`, item belum di-bind ke `equipmentId`, notice surat wajib ditandatangani)
- [ ] Tambah tombol "Ajukan Peminjaman" di section mahasiswa pada
      `src/routes/admin/peminjaman/+page.svelte`
- [ ] Tambah action `approveLending` & `rejectLending` di
      `src/routes/admin/peminjaman/[id]/+page.server.ts` + tombol Setujui/Tolak di
      `+page.svelte`, termasuk tampilan link surat untuk diverifikasi Kepala Lab
- [ ] Tambah link "Daftar di sini" di `src/routes/+page.svelte` (halaman login)
- [ ] Uji alur penuh: daftar NIM baru → auto masuk → ajukan peminjaman → cek status `DRAFT` di
      "Peminjaman Saya" → login sebagai Kepala Lab lab terkait → buka detail → Setujui → cek alat
      berubah `IN_USE` dan status `APPROVED`
- [ ] Uji alur "sudah pernah daftar": daftar dengan NIM yang sama lagi, password benar → berhasil
      masuk ke akun lama (cek tidak ada baris `user` baru dibuat); password salah → error jelas,
      tidak ada akun baru dibuat
- [ ] Uji reject: Kepala Lab tolak dengan alasan → status `REJECTED`, alasan tampil ke mahasiswa
      di halaman "Peminjaman Saya" (pola tampilan alasan penolakan sudah ada di
      `+page.svelte` baris ~534, pastikan tetap kompatibel)

---

## 9. Yang Sengaja Tidak Diubah

- `/admin/peminjaman/baru` (form staf, multi-peminjam, auto-approved) **tetap seperti sekarang** —
  ini tetap dipakai untuk kasus staf mendaftarkan peminjaman atas nama orang lain dan ingin
  langsung approved tanpa proses verifikasi tambahan (mis. untuk kebutuhan praktikum terjadwal).
- Role `peneliti` tidak diganti namanya jadi `mahasiswa` di level kode/DB — sudah konsisten
  dilabeli "Mahasiswa" di seluruh UI lewat fungsi `mapRole()`, jadi tidak perlu migrasi rename
  yang berisiko di banyak tempat (foreign key, access control roles, dsb).
