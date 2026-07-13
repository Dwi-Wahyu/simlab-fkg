# MODULE 7 — JADWAL AUTOFILL SERI, DISTRIBUSI KELOMPOK PER INSTRUKTUR, FIX LOGBOOK, CSL ADDITIVE SEEDER

Instruksi ini disusun untuk agent CLI (Claude Code / setara) yang akan bekerja
langsung di repo `simlab-fkg`. Setiap bagian independen tapi harus dikerjakan
berurutan karena Bagian 3 bergantung pada pemahaman Bagian 1, dan Bagian 4
adalah bugfix yang **wajib** menyertai Bagian 3 (kalau tidak, fitur baru akan
percuma karena halaman penilaian salah baca data).

Jangan jalankan `bun run db:generate` / `db:migrate` kecuali instruksi di
bawah secara eksplisit meminta perubahan skema (Bagian 3 tidak butuh migrasi
sama sekali — kolom yang dipakai sudah ada).

---

## RINGKASAN TEMUAN (baca dulu sebelum eksekusi)

1. `practicumSeries` (`src/lib/server/db/schema.ts`) **sudah** punya
   `blockId` dan `laboratoriumId`. Tapi form Tambah/Edit Jadwal
   (`src/routes/admin/jadwal-praktikum/tambah/+page.svelte` dan
   `[id]/edit/+page.svelte`) tidak memanfaatkannya — pengguna harus pilih
   Blok dan Laboratorium manual meski sudah pilih Seri.
2. `practicumScheduleInstructor` (skema sama) sudah punya kolom nullable
   `groupId` yang mereferensi `kelompokMahasiswa.id`, **tanpa unique
   constraint** pada `(scheduleId, instructorId)`. Artinya satu instruktur
   BOLEH punya lebih dari satu baris untuk schedule yang sama, masing-masing
   dengan `groupId` berbeda — ini pas untuk kasus satu dosen menguji lebih
   dari satu kelompok. Skema **tidak perlu diubah** untuk Bagian 3.
3. Form Tambah/Edit Jadwal saat ini hanya mengirim `instructorIds[]` polos
   dan tidak pernah mengisi `groupId` sama sekali saat insert
   `practicumScheduleInstructor` — ini akar masalah kenapa fitur pembagian
   kelompok per dosen belum ada.
4. `src/routes/admin/penilaian/[id]/+page.server.ts` sudah punya logika
   scoping kelompok (baris 43–111), TAPI menggunakan
   `schedule.instructors.find(...)` (ambil baris pertama) untuk resolve
   `groupId` milik instruktur yang login. Begitu satu instruktur punya lebih
   dari satu baris (multi-kelompok, hasil Bagian 3), logika ini akan salah:
   hanya kelompok pertama yang kebaca, kelompok lain hilang. **Wajib
   diperbaiki di Bagian 4.**
5. Error `Tidak ada template logbook di sistem` (di
   `src/lib/server/logbook/generateLogbook.ts:299`) BUKAN karena kode salah
   atau file `.docx` template hilang — file
   `static/templates/logbook/TEMPLATE_LOGBOOK_PRAKTIKUM_SIMLAB.docx` sudah
   ada di disk. Penyebabnya: baris di tabel `practicum_logbook_template`
   memang kosong, karena seeder-nya (`src/lib/server/db/seeds/logbook-templates.ts`,
   script `db:seed-logbook-templates`) adalah **script terpisah yang harus
   dijalankan manual** dan tidak pernah dipanggil dari
   `src/lib/server/db/seeds/index.ts` (seeder utama `db:seed`). Jadi di
   environment mana pun yang hanya menjalankan `bun run db:seed`, tabel ini
   akan selalu kosong dan fitur logbook akan selalu gagal. Ini bug proses
   seeding, bukan bug generator.
6. Seeder CSL yang sudah ada di `src/lib/server/db/seeds/index.ts`
   (blok `else if (blockName === 'Blok Bedah Minor')`, sekitar baris
   211–229 dan 298–318) HANYA membuat **satu** modul checklist palsu
   (`CSL Bedah Minor - Ekstraksi Gigi`) dengan 11 kriteria karangan yang
   **tidak cocok** dengan dokumen sumber manapun. Dokumen asli
   `Format Penilaian CSL - Blok Bedah Minor.docx` berisi **5 sesi CSL
   berbeda** (Kewaspadaan Standar, Teknik Anestesi Lokal, Peresepan Obat,
   Pencabutan Gigi Closed Method, Penjahitan Pasca Pencabutan), masing-masing
   dengan section (A/B/C/D) dan jumlah kriteria sendiri, cocok dengan
   struktur rekap `_CSL_1__FORM_PENILAIAN_CSL_BM_BLOK_BEDAH_MINOR_2026.xlsx`
   (per kelompok REG A/B). Seeder perlu diganti agar mencerminkan kelima
   sesi asli ini. Generator export CSL
   (`src/lib/server/csl/generateCslAssessment.ts`) sudah generik — ia
   membaca `sectionLabel` dan `scoreLegend` per modul, tidak hardcode nama
   modul apa pun — jadi menambah modul CSL baru **aman dan aditif**, tidak
   menyentuh alur skor `TOTAL`/`RUBRIK` yang sudah ada.

---

## BAGIAN 1 — AUTOFILL BLOK & LABORATORIUM DARI SERI PRAKTIKUM

**File:**

- `src/routes/admin/jadwal-praktikum/tambah/+page.svelte`
- `src/routes/admin/jadwal-praktikum/[id]/edit/+page.svelte`

**Tujuan:** saat user memilih `Seri Praktikum`, input `Laboratorium` dan
`Blok` otomatis terisi dari `practicumSeries.laboratoriumId` dan
`practicumSeries.blockId` milik seri tersebut, tapi user tetap bisa override
manual (misal seri tidak punya blok/lab, atau user memang ingin beda).

### Langkah

1. Di kedua file, tambahkan `onValueChange` pada `Select.Root` untuk
   `seriesId`:

```svelte
<Select.Root
	type="single"
	name="seriesId"
	bind:value={selectedSeriesId}
	onValueChange={(v) => {
		const seri = data.series.find((s: any) => s.id === v);
		if (seri) {
			if (seri.laboratoriumId) selectedLab = seri.laboratoriumId;
			if (seri.blockId) selectedBlock = seri.blockId;
			// blockId berubah → reset modul terpilih karena filteredModules bergantung selectedBlock
			selectedModules = [];
		}
	}}
>
```

2. Pastikan `load()` di `+page.server.ts` (Tambah & Edit) sudah
   menyertakan `laboratoriumId` dan `blockId` pada query `series` — cek
   `db.query.practicumSeries.findMany(...)` tidak punya `columns` filter
   sehingga semua field ikut terbawa, jadi tidak perlu perubahan di
   `+page.server.ts` untuk bagian ini.
3. Tetap biarkan `Select.Root` untuk `labId` dan `blockId` interaktif
   (jangan `disabled`) — ini cuma **default value**, bukan lock, supaya
   admin tetap bisa override kalau perlu jadwal lintas-lab.
4. Di halaman Edit, saat `load()` awal, `selectedSeriesId` di-set dari
   `data.schedule.seriesId` — pastikan autofill **tidak** overwrite
   `selectedLab`/`selectedBlock` yang sudah tersimpan di jadwal existing saat
   pertama render (autofill hanya boleh terpicu dari event `onValueChange`
   user, bukan reactive effect yang jalan tiap render). Karena kita pasang
   di `onValueChange` (bukan `$effect`), ini sudah aman secara default.

---

## BAGIAN 2 — HAPUS INPUT SEMESTER

**File:**

- `src/routes/admin/jadwal-praktikum/tambah/+page.svelte`
- `src/routes/admin/jadwal-praktikum/tambah/+page.server.ts`
- `src/routes/admin/jadwal-praktikum/[id]/edit/+page.svelte`
- `src/routes/admin/jadwal-praktikum/[id]/edit/+page.server.ts`

### Svelte (kedua file `+page.svelte`)

Hapus blok berikut (grid dua kolom yang berisi Seri + Semester — ubah jadi
satu kolom penuh untuk Seri saja, atau gabungkan dengan field lain sesuai
selera layout):

```svelte
<div class="space-y-2">
	<Label for="semester">Semester</Label>
	<Input
		id="semester"
		name="semester"
		type="number"
		placeholder="Misal: 3"
		bind:value={semesterValue}
	/>
</div>
```

Hapus juga state `let semesterValue = $state('');` yang sudah tidak
terpakai.

### Server (kedua file `+page.server.ts`)

Hapus baris parsing:

```ts
const semester = parseInt(formData.get('semester') as string) || null;
```

Dan hapus `semester,` dari `values({...})` (Tambah) / `.set({...})` (Edit).

### Skema (`src/lib/server/db/schema.ts`)

**Jangan hapus kolom `semester` dari tabel `practicumSchedule`** — ini
kolom nullable yang aman ditinggal (tidak butuh migrasi destruktif), untuk
menghindari risiko pada data historis atau laporan lain yang mungkin masih
membaca kolom ini. Cukup tambahkan komentar penanda deprecated di atas
field:

```ts
// DEPRECATED: input dihapus dari UI Tambah/Edit Jadwal (Modul 7). Kolom
// dibiarkan ada untuk kompatibilitas data lama, jangan diisi dari form baru.
semester: int('semester'),
```

Jika suatu saat benar-benar ingin didrop, itu keputusan terpisah (perlu cek
dulu apakah ada laporan/export lain yang membaca `practicumSchedule.semester`
— jalankan `grep -rn "\.semester" src/` sebelum memutuskan).

---

## BAGIAN 3 — DISTRIBUSI KELOMPOK PER INSTRUKTUR

**File:**

- `src/routes/admin/jadwal-praktikum/tambah/+page.svelte`
- `src/routes/admin/jadwal-praktikum/tambah/+page.server.ts`
- `src/routes/admin/jadwal-praktikum/[id]/edit/+page.svelte`
- `src/routes/admin/jadwal-praktikum/[id]/edit/+page.server.ts`

### Konsep

- Setelah instruktur dicentang di panel kanan, tampilkan daftar kelompok
  (`kelompokMahasiswa`) yang scoped ke `selectedClassId` yang sedang dipilih
  di form.
- State klien berubah dari `selectedInstructors: string[]` menjadi peta
  `instructorGroupMap: Record<string, string[]>` (instructorId → array
  kelompokId yang ia tangani untuk jadwal ini). Instruktur yang dicentang
  tapi belum pilih kelompok apa pun boleh punya array kosong (artinya scope
  "seluruh kelas", konsisten dengan `groupId` nullable di skema untuk kasus
  non-CSL seperti OSCE/Pelatihan yang tidak butuh scoping kelompok).
- Kelompok yang sudah dipilih instruktur A **hilang** dari daftar pilihan
  instruktur B, C, dst (dihitung dari union semua kelompok yang sudah
  dipakai instruktur lain, bukan termasuk milik instruktur yang sedang
  dilihat).
- Sebelum submit, validasi: kalau kelas yang dipilih punya kelompok
  (`data.groups` yang classId cocok tidak kosong) dan ada instruktur
  terpilih, maka **semua** kelompok kelas tersebut harus sudah teralokasi ke
  salah satu instruktur (tidak ada kelompok yang tersisa "menganggur").
  Sediakan tombol "Bagi Rata Otomatis" yang mengisi sisa kelompok yang
  belum dipilih siapa pun secara merata (round-robin) ke instruktur-instruktur
  yang terpilih.

### 3.1 Load data kelompok (`+page.server.ts` Tambah & Edit)

Tambahkan query kelompok di `load()` (kedua file):

```ts
const groups = await db.query.kelompokMahasiswa.findMany({
	orderBy: (km, { asc }) => [asc(km.name)]
});
```

Tambahkan `groups` ke object return `load()`. (Ambil semua kelompok lintas
kelas sekaligus, filter per-`classId` dilakukan di client karena
`selectedClassId` reaktif — menghindari round-trip server tiap ganti kelas.)

Import `kelompokMahasiswa` dari `$lib/server/db/schema` di kedua file.

### 3.2 State & UI (`+page.svelte` Tambah & Edit)

Ganti state instruktur:

```ts
// Ganti: let selectedInstructors = $state<string[]>([]);
let instructorGroupMap = $state<Record<string, string[]>>({});
let expandedInstructorId = $state<string | null>(null);

const selectedInstructorIds = $derived(Object.keys(instructorGroupMap));

const groupsForClass = $derived(data.groups.filter((g: any) => g.classId === selectedClassId));

// Union semua kelompok yang sudah dipakai instruktur MANAPUN
function assignedElsewhere(instructorId: string): Set<string> {
	const used = new Set<string>();
	for (const [id, groupIds] of Object.entries(instructorGroupMap)) {
		if (id === instructorId) continue;
		for (const gid of groupIds) used.add(gid);
	}
	return used;
}

function availableGroupsFor(instructorId: string) {
	const used = assignedElsewhere(instructorId);
	return groupsForClass.filter((g: any) => !used.has(g.id));
}

function toggleInstructor(id: string) {
	if (id in instructorGroupMap) {
		const next = { ...instructorGroupMap };
		delete next[id];
		instructorGroupMap = next;
		if (expandedInstructorId === id) expandedInstructorId = null;
	} else {
		instructorGroupMap = { ...instructorGroupMap, [id]: [] };
		expandedInstructorId = id;
	}
}

function toggleGroupForInstructor(instructorId: string, groupId: string) {
	const current = instructorGroupMap[instructorId] ?? [];
	const next = current.includes(groupId)
		? current.filter((g) => g !== groupId)
		: [...current, groupId];
	instructorGroupMap = { ...instructorGroupMap, [instructorId]: next };
}

// Kelompok kelas yang belum dipilih instruktur manapun
const unassignedGroups = $derived(
	groupsForClass.filter((g: any) => !Object.values(instructorGroupMap).flat().includes(g.id))
);

function autoDistributeGroups() {
	const instructorIds = selectedInstructorIds;
	if (instructorIds.length === 0 || unassignedGroups.length === 0) return;
	const next = { ...instructorGroupMap };
	unassignedGroups.forEach((g: any, idx: number) => {
		const targetId = instructorIds[idx % instructorIds.length];
		next[targetId] = [...(next[targetId] ?? []), g.id];
	});
	instructorGroupMap = next;
}

const hasUnassignedGroups = $derived(
	groupsForClass.length > 0 && selectedInstructorIds.length > 0 && unassignedGroups.length > 0
);
```

Ganti checkbox instruktur di panel kanan agar pakai `instructorGroupMap`,
dan sisipkan daftar kelompok expandable persis di bawah instruktur yang
sedang dicentang/expanded:

```svelte
{#each filteredInstructors as instructor (instructor.id)}
	<div class="rounded-md border">
		<label
			class="flex cursor-pointer items-center space-y-0 space-x-3 p-4 transition-colors hover:bg-accent"
		>
			<Checkbox
				id={instructor.id}
				checked={instructor.id in instructorGroupMap}
				onCheckedChange={() => toggleInstructor(instructor.id)}
			/>
			<div class="flex flex-1 flex-col gap-0.5">
				<span class="text-sm leading-none font-medium">{instructor.name}</span>
				<span class="text-xs text-muted-foreground">{instructor.email}</span>
			</div>
			{#if instructor.id in instructorGroupMap && groupsForClass.length > 0}
				<span class="text-xs text-muted-foreground">
					{(instructorGroupMap[instructor.id] ?? []).length} kelompok
				</span>
			{/if}
		</label>

		{#if instructor.id in instructorGroupMap && groupsForClass.length > 0}
			<div class="space-y-2 border-t bg-muted/20 p-3">
				<p class="text-xs font-medium text-muted-foreground">
					Kelompok yang ditangani {instructor.name}:
				</p>
				{#each groupsForClass as group (group.id)}
					{@const isMine = (instructorGroupMap[instructor.id] ?? []).includes(group.id)}
					{@const isTakenByOther = !isMine && assignedElsewhere(instructor.id).has(group.id)}
					{#if !isTakenByOther}
						<label class="flex items-center gap-2 text-sm">
							<Checkbox
								checked={isMine}
								onCheckedChange={() => toggleGroupForInstructor(instructor.id, group.id)}
							/>
							{group.name}
						</label>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<p class="text-center text-sm text-muted-foreground py-8">Instruktur tidak ditemukan.</p>
{/each}
```

Di footer card instruktur, tambahkan peringatan + tombol bagi rata:

```svelte
<Card.Footer class="flex flex-col items-stretch gap-2 border-t bg-muted/20 p-4">
	<div class="flex items-center justify-between">
		<span class="text-sm text-muted-foreground">
			{selectedInstructorIds.length} Instruktur dipilih
		</span>
		{#if selectedInstructorIds.length > 0}
			<Button variant="ghost" size="sm" onclick={() => (instructorGroupMap = {})}>Reset</Button>
		{/if}
	</div>
	{#if hasUnassignedGroups}
		<div
			class="flex items-center justify-between gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-700"
		>
			<span>{unassignedGroups.length} kelompok belum ditugaskan ke instruktur manapun.</span>
			<Button type="button" variant="outline" size="sm" onclick={autoDistributeGroups}>
				Bagi Rata Otomatis
			</Button>
		</div>
	{/if}
</Card.Footer>
```

Tambahkan hidden input untuk kirim data ke server — satu input per pasangan
instruktur+kelompok (kalau instruktur tidak punya kelompok, kirim satu baris
dengan groupId kosong supaya instruktur tetap tercatat):

```svelte
{#each Object.entries(instructorGroupMap) as [instructorId, groupIds]}
	{#if groupIds.length > 0}
		{#each groupIds as groupId}
			<input type="hidden" name="assignments" value="{instructorId}:{groupId}" />
		{/each}
	{:else}
		<input type="hidden" name="assignments" value="{instructorId}:" />
	{/if}
{/each}
```

Hapus input hidden lama `instructorIds` (kalau ada) dan hapus fungsi lama
`toggleInstructor(id: string)` versi array — sudah digantikan definisi baru
di atas.

**Validasi submit** — di `use:enhance`, sebelum submit, cek
`hasUnassignedGroups` dan `selectedInstructorIds.length === 0`, tampilkan
`NotificationDialog` error dan `return { update: false }`-style cancel (atau
cukup cegah submit dengan `if (hasUnassignedGroups) { ...; return; }` sebelum
`return async ({ result }) => {...}` — sesuaikan dengan pola `enhance` yang
sudah dipakai di file ini, taruh pengecekan di awal callback sebelum
`conflictError = null;`).

### 3.3 Server action — parsing `assignments` (`+page.server.ts` Tambah & Edit)

Ganti:

```ts
const instructorIds = formData.getAll('instructorIds') as string[];
```

Menjadi:

```ts
const assignmentPairs = formData.getAll('assignments') as string[];
const assignments = assignmentPairs.map((pair) => {
	const [instructorId, groupId] = pair.split(':');
	return { instructorId, groupId: groupId || null };
});
const instructorIds = [...new Set(assignments.map((a) => a.instructorId))];
```

Validasi wajib (tambahkan ke pengecekan `if (!title || ...)` yang sudah
ada): `instructorIds.length === 0` (ganti pengecekan lama
`instructorIds.length === 0` supaya tetap konsisten, cukup pakai variabel
baru).

Ganti loop insert instruktur (Tambah — di dalam `db.transaction`):

```ts
for (const assignment of assignments) {
	await tx.insert(practicumScheduleInstructor).values({
		id: uuidv4(),
		scheduleId,
		instructorId: assignment.instructorId,
		groupId: assignment.groupId
	});
}
```

Dan di Edit, sama persis tapi pakai `scheduleId: id` seperti pola delete +
insert ulang yang sudah ada:

```ts
await tx.delete(practicumScheduleInstructor).where(eq(practicumScheduleInstructor.scheduleId, id));
for (const assignment of assignments) {
	await tx.insert(practicumScheduleInstructor).values({
		id: uuidv4(),
		scheduleId: id,
		instructorId: assignment.instructorId,
		groupId: assignment.groupId
	});
}
```

### 3.4 Prefill kelompok saat Edit jadwal existing

Di `[id]/edit/+page.svelte`, saat inisialisasi state dari `data.schedule`,
bangun `instructorGroupMap` awal dari `data.schedule.instructors` (yang
sudah di-load dengan relasi `instructors: true` di `+page.server.ts`):

```ts
let instructorGroupMap = $state<Record<string, string[]>>(
	(() => {
		const map: Record<string, string[]> = {};
		for (const instr of data.schedule.instructors) {
			if (!(instr.instructorId in map)) map[instr.instructorId] = [];
			if (instr.groupId) map[instr.instructorId].push(instr.groupId);
		}
		return map;
	})()
);
```

---

## BAGIAN 4 — FIX BUG SCOPING MULTI-KELOMPOK DI HALAMAN PENILAIAN

**File wajib diperbaiki (prasyarat Bagian 3 supaya benar-benar berfungsi):**
`src/routes/admin/penilaian/[id]/+page.server.ts`

Sekarang (baris ~51–66):

```ts
const currentInstructorRow = schedule.instructors.find((i) => i.instructorId === instructorId);
const hasGroupScoping = currentInstructorRow?.groupId;
const isScopedUser = !['superadmin', 'koordinator'].includes(locals.user.role);

const filterGroupId = url.searchParams.get('groupId') || undefined;
const resolvedGroupId = isScopedUser ? hasGroupScoping : filterGroupId;

let students: any[] = [];
if (resolvedGroupId) {
	const groupMembers = await db.query.kelompokMahasiswaMember.findMany({
		where: eq(kelompokMahasiswaMember.kelompokId, resolvedGroupId),
		with: { user: true }
	});
	students = groupMembers.map((gm) => ({ user: gm.user }));
} else {
	students = await db.query.practicumClassMember.findMany({
		where: eq(practicumClassMember.classId, classId),
		with: { user: true }
	});
}
```

Ganti dengan versi yang mengumpulkan **semua** `groupId` milik instruktur
yang login (bisa lebih dari satu baris sejak Bagian 3), lalu ambil anggota
dari semua kelompok tersebut sekaligus:

```ts
const myInstructorRows = schedule.instructors.filter((i) => i.instructorId === instructorId);
const myGroupIds = [
	...new Set(myInstructorRows.map((i) => i.groupId).filter((g): g is string => !!g))
];
const isScopedUser = !['superadmin', 'koordinator'].includes(locals.user.role);

const filterGroupId = url.searchParams.get('groupId') || undefined;
// Untuk user scoped (instruktur biasa): pakai SEMUA kelompok yang jadi tanggung jawabnya.
// Untuk superadmin/koordinator: tetap pakai filter dropdown groupId tunggal seperti sebelumnya.
const resolvedGroupIds = isScopedUser ? myGroupIds : filterGroupId ? [filterGroupId] : [];

let students: any[] = [];
if (resolvedGroupIds.length > 0) {
	const groupMembers = await db.query.kelompokMahasiswaMember.findMany({
		where: inArray(kelompokMahasiswaMember.kelompokId, resolvedGroupIds),
		with: { user: true }
	});
	// Dedup jika (secara tidak sengaja) ada mahasiswa yang ganda lintas kelompok.
	const seen = new Set<string>();
	students = groupMembers
		.filter((gm) => {
			if (seen.has(gm.user.id)) return false;
			seen.add(gm.user.id);
			return true;
		})
		.map((gm) => ({ user: gm.user }));
} else {
	students = await db.query.practicumClassMember.findMany({
		where: eq(practicumClassMember.classId, classId),
		with: { user: true }
	});
}
```

`inArray` sudah diimpor di file ini (dipakai di bawah untuk
`criteriaScores`), jadi tidak perlu tambah import baru.

Catatan: kalau instruktur scoped punya baris dengan `groupId: null` DAN
baris lain dengan `groupId` terisi untuk schedule yang sama (kombinasi
campuran — seharusnya jarang terjadi dari UI Bagian 3 karena UI konsisten
per instruktur, tapi bisa terjadi dari data lama), `myGroupIds` akan
kosongkan filter `null` lewat `.filter(Boolean)` sehingga fallback ke
"seluruh kelas" tidak sengaja tercampur dengan scoping parsial — ini
edge case yang aman diabaikan untuk sekarang, cukup catat sebagai known
limitation di komentar kode.

Cek juga `+page.svelte` halaman ini (`src/routes/admin/penilaian/[id]/+page.svelte`)
apakah ada logika UI yang mengasumsikan satu `groupId` tunggal per
instruktur (misal dropdown filter kelompok untuk koordinator/superadmin) —
biarkan logika dropdown filter tunggal untuk koordinator/superadmin apa
adanya (mereka memang melihat satu kelompok pada satu waktu lewat query
param), yang penting hanya bagian resolusi otomatis untuk instruktur biasa
yang perlu union semua kelompoknya.

---

## BAGIAN 5 — FIX ERROR "Tidak ada template logbook di sistem"

Ini **bukan bug kode generator**. Diagnosis: file template docx sudah ada
di `static/templates/logbook/TEMPLATE_LOGBOOK_PRAKTIKUM_SIMLAB.docx`, tapi
tabel `practicum_logbook_template` di database kosong karena seeder-nya
(`src/lib/server/db/seeds/logbook-templates.ts`) adalah script mandiri
(`bun run db:seed-logbook-templates`) yang tidak pernah dipanggil dari
seeder utama `src/lib/server/db/seeds/index.ts` (`bun run db:seed`).

### Langkah perbaikan

1. **Immediate fix (jalankan di environment yang error):**

   ```bash
   bun run db:seed-logbook-templates
   ```

   Ini akan mengisi satu baris `practicumLogbookTemplate` per
   `practicumModule` yang ada, dengan file default
   `TEMPLATE_LOGBOOK_PRAKTIKUM_SIMLAB.docx`.

2. **Fix permanen — integrasikan ke seeder utama** supaya environment baru
   (clean install / CI / staging) tidak mengalami hal yang sama:
   - Di `src/lib/server/db/seeds/index.ts`, setelah blok seeding
     `practicumModule` selesai (setelah loop `for (const dept of departmentData)`
     rampung, sebelum lanjut ke seeding inventori), panggil helper yang
     melakukan hal yang sama seperti `logbook-templates.ts`, tapi sebagai
     fungsi yang dipanggil di proses `db:seed` yang sama (bukan proses
     terpisah dengan koneksi DB sendiri). Refactor `logbook-templates.ts`
     agar logic-nya diekspor sebagai fungsi (`export async function
seedLogbookTemplates(db)`), lalu: - `logbook-templates.ts` tetap bisa dijalankan standalone (untuk
     backward compat script `db:seed-logbook-templates`), sekarang cuma
     memanggil fungsi yang diekspor dengan `db` lokal miliknya sendiri. - `index.ts` mengimpor fungsi tersebut dan memanggilnya dengan `db`
     instance yang sudah ada di `index.ts`, sehingga satu kali `bun run
db:seed` sudah cukup untuk semua termasuk template logbook.
   - Field `tableBuilderKey: 'logbook-rowspan-table'` dan nama
     `Template Logbook — ${mod.name}` tetap sama seperti sekarang, tidak
     perlu diubah.

3. **Perbaikan pesan error supaya lebih actionable** di
   `src/lib/server/logbook/generateLogbook.ts` sekitar baris 376–377,
   ganti pesan generik jadi lebih spesifik untuk admin yang membaca log:

   ```ts
   const finalTemplate = templateRecord ?? (await db.query.practicumLogbookTemplate.findFirst());
   if (!finalTemplate) {
   	throw new Error(
   		'Tidak ada template logbook terdaftar di database (tabel practicum_logbook_template kosong). ' +
   			'Jalankan `bun run db:seed-logbook-templates` setelah seeder modul dijalankan.'
   	);
   }
   ```

   Ini murni perbaikan pesan diagnostik, tidak mengubah alur fungsi.

4. Setelah menjalankan seeder, verifikasi endpoint
   `src/routes/api/logbook/[seriesId]/download/+server.ts` berhasil dengan
   mencoba generate ulang logbook mahasiswa yang tadinya gagal.

---

## BAGIAN 6 — CSL ADDITIVE SEEDER (DATA ASLI DARI DOKUMEN SUMBER)

**Penting — baca dulu:** ini murni **menambah/mengoreksi data seed**, sama
sekali tidak mengubah alur skor `TOTAL`/`RUBRIK` dinamis yang sudah jadi di
Modul 5, dan tidak mengubah halaman tabel penilaian `+page.svelte`. Yang
diubah hanya isi data di dalam blok `else if (blockName === 'Blok Bedah
Minor')` pada `src/lib/server/db/seeds/index.ts`, karena isinya saat ini
adalah **data karangan yang tidak cocok** dengan dokumen sumber
`Format_Penilaian_CSL_-_Blok_Bedah_Minor.docx`.

### Temuan dari dokumen sumber

Dokumen berisi **5 sesi CSL berbeda** untuk Blok Bedah Minor, masing-masing
dengan judul, section (A/B/C/...), dan total skor maksimal sendiri (semua
kriteria bernilai maksimal 2 — skala 0/1/2, cocok dengan
`practicumModuleScoringModeEnum.CHECKLIST` yang sudah ada):

1. **Kewaspadaan Standar** (Cuci tangan bedah WHO, gown operasi, glove
   steril) — total 12 kriteria, skor maksimal 24.
2. **Teknik Anestesi Lokal** — total 11 kriteria, skor maksimal 22.
3. **Peresepan Obat Pasca Pencabutan Gigi** — total 15 kriteria, skor
   maksimal 30.
4. **Pencabutan Gigi dengan Closed Method di Model** — total 22 kriteria,
   skor maksimal 44.
5. **Penjahitan pada Luka Pasca Pencabutan Gigi** — total 16 kriteria,
   skor maksimal 32.

Struktur ini juga cocok dengan sheet rekap
`_CSL_1__FORM_PENILAIAN_CSL_BM_BLOK_BEDAH_MINOR_2026.xlsx`, yang berisi 17
sheet per kelompok (`KELOMPOK 1 REG A` ... `KELOMPOK 8 REG B`,
`KELAS INTERNASIONAL`) — konfirmasi bahwa satu form CSL memang dinilai per
kelompok kecil, sejalan dengan `kelompokMahasiswa` (Modul 4) dan
`groupId` di `practicumScheduleInstructor` (Bagian 3/4 di atas).

### Langkah implementasi

Di `src/lib/server/db/seeds/index.ts`:

1. **Hapus** variabel tunggal `cslCriteria` (baris ~211–222) — ganti jadi 5
   array kriteria terpisah, satu per sesi CSL, masing-masing dengan
   `sectionLabel` sesuai section asli di dokumen. Definisikan tepat sebelum
   loop `for (const dept of departmentData)`:

```ts
type CslCriterion = { name: string; sectionLabel: string; maxScore: number; sortOrder: number };

const cslKewaspadaanStandar: CslCriterion[] = [
	{
		name: 'Mempersiapkan semua alat yang dibutuhkan (sabun antiseptik, jas operasi/gown steril, sarung tangan/glove steril)',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 1
	},
	{
		name: 'Mempersiapkan diri (melepas aksesoris, kuku pendek dan bersih)',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 2
	},
	{
		name: 'Mengalirkan air dan membasahi tangan hingga siku',
		sectionLabel: 'B. Prosedur Cuci Tangan Bedah (WHO)',
		maxScore: 2,
		sortOrder: 3
	},
	{
		name: 'Mengambil sabun antiseptik dan melakukan 6 langkah WHO pada telapak hingga punggung tangan',
		sectionLabel: 'B. Prosedur Cuci Tangan Bedah (WHO)',
		maxScore: 2,
		sortOrder: 4
	},
	{
		name: 'Membersihkan kuku dan sela jari secara teliti',
		sectionLabel: 'B. Prosedur Cuci Tangan Bedah (WHO)',
		maxScore: 2,
		sortOrder: 5
	},
	{
		name: 'Melakukan scrubbing/gosokan dari arah tangan menuju siku (satu arah)',
		sectionLabel: 'B. Prosedur Cuci Tangan Bedah (WHO)',
		maxScore: 2,
		sortOrder: 6
	},
	{
		name: 'Membilas dengan air mengalir dari ujung jari ke arah siku (tangan tetap lebih tinggi dari siku)',
		sectionLabel: 'B. Prosedur Cuci Tangan Bedah (WHO)',
		maxScore: 2,
		sortOrder: 7
	},
	{
		name: 'Menutup kran dengan siku/pedal dan mengeringkan tangan dengan handuk steril secara aseptik',
		sectionLabel: 'B. Prosedur Cuci Tangan Bedah (WHO)',
		maxScore: 2,
		sortOrder: 8
	},
	{
		name: 'Mengambil jas operasi steril, membiarkan terbuka tanpa menyentuh benda non-steril',
		sectionLabel: 'C. Prosedur Gowning',
		maxScore: 2,
		sortOrder: 9
	},
	{
		name: 'Memasukkan kedua tangan ke lengan jas tanpa mengeluarkan jari dari ujung manset (teknik tertutup)',
		sectionLabel: 'C. Prosedur Gowning',
		maxScore: 2,
		sortOrder: 10
	},
	{
		name: 'Memakai sarung tangan dengan teknik tertutup (tangan tetap di dalam manset jas)',
		sectionLabel: 'D. Prosedur Gloving',
		maxScore: 2,
		sortOrder: 11
	},
	{
		name: 'Memastikan sarung tangan menutupi manset jas operasi dan tidak ada kebocoran/kontaminasi',
		sectionLabel: 'D. Prosedur Gloving',
		maxScore: 2,
		sortOrder: 12
	}
];

const cslAnestesiLokal: CslCriterion[] = [
	{
		name: 'Menyiapkan alat: spuit/cito-ject, ampul/karpul anestesi, antiseptik (povidone iodine), kapas/tampon',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 1
	},
	{
		name: 'Persiapan pasien: rekam medik dan informed consent',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 2
	},
	{
		name: 'Posisi kerja dokter dan posisi kursi pasien sesuai regio yang akan dianestesi',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 3
	},
	{
		name: 'Aplikasi antiseptik pada area mukosa yang akan disuntik',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 4
	},
	{
		name: 'Memegang spuit dengan teknik yang benar (pen grasp)',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 5
	},
	{
		name: 'Melakukan insersi jarum dengan sudut yang tepat (45 derajat untuk infiltrasi)',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 6
	},
	{
		name: 'Teknik infiltrasi pada mucobuccal fold / teknik blok menentukan landmark (plica pterygomandibularis, linea obliqua interna)',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 7
	},
	{
		name: 'Melakukan aspirasi (memastikan jarum tidak masuk pembuluh darah)',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 8
	},
	{
		name: 'Mendeponir larutan anestesi secara perlahan',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 9
	},
	{
		name: 'Menarik jarum keluar dengan hati-hati dan menutup jarum (one-hand technique)',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 10
	},
	{
		name: 'Evaluasi efek anestesi (subjektif: rasa kebas; objektif: tes dengan sonde/eksavator)',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 11
	}
];

const cslPeresepanObat: CslCriterion[] = [
	{
		name: 'Memeriksa rekam medis pasien dan indikasi pencabutan',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 1
	},
	{
		name: 'Memastikan tidak ada kontraindikasi obat (alergi, penyakit sistemik, interaksi obat)',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 2
	},
	{
		name: 'Menuliskan identitas dokter (nama, SIP) pada resep',
		sectionLabel: 'B. Prosedur (Peresepan)',
		maxScore: 2,
		sortOrder: 3
	},
	{
		name: 'Menuliskan identitas pasien (nama, umur, alamat/berat badan)',
		sectionLabel: 'B. Prosedur (Peresepan)',
		maxScore: 2,
		sortOrder: 4
	},
	{
		name: 'Menuliskan tanggal penulisan resep',
		sectionLabel: 'B. Prosedur (Peresepan)',
		maxScore: 2,
		sortOrder: 5
	},
	{
		name: 'Menuliskan tanda R/ (Recipe) dengan benar',
		sectionLabel: 'B. Prosedur (Peresepan)',
		maxScore: 2,
		sortOrder: 6
	},
	{
		name: 'Analgesik: memilih jenis dan dosis yang tepat (misal Paracetamol 500mg, Asam Mefenamat 500mg, atau Ibuprofen 400mg)',
		sectionLabel: 'B. Prosedur (Peresepan)',
		maxScore: 2,
		sortOrder: 7
	},
	{
		name: 'Antibiotik: memilih antibiotik yang rasional (misal Amoxicillin 500mg) sesuai infeksi/prosedur',
		sectionLabel: 'B. Prosedur (Peresepan)',
		maxScore: 2,
		sortOrder: 8
	},
	{
		name: 'Menuliskan jumlah obat (jumlah total/angka romawi)',
		sectionLabel: 'B. Prosedur (Peresepan)',
		maxScore: 2,
		sortOrder: 9
	},
	{
		name: 'Menuliskan aturan pakai (signa) yang jelas (frekuensi, waktu penggunaan)',
		sectionLabel: 'B. Prosedur (Peresepan)',
		maxScore: 2,
		sortOrder: 10
	},
	{
		name: 'Menuliskan tanda tangan atau paraf dokter',
		sectionLabel: 'B. Prosedur (Peresepan)',
		maxScore: 2,
		sortOrder: 11
	},
	{
		name: 'Menjelaskan tujuan pemberian obat kepada pasien',
		sectionLabel: 'C. Tahap Pasca Interaksi (Edukasi)',
		maxScore: 2,
		sortOrder: 12
	},
	{
		name: 'Menjelaskan efek samping obat yang mungkin terjadi',
		sectionLabel: 'C. Tahap Pasca Interaksi (Edukasi)',
		maxScore: 2,
		sortOrder: 13
	},
	{
		name: 'Menginstruksikan pasien untuk meminum antibiotik hingga habis',
		sectionLabel: 'C. Tahap Pasca Interaksi (Edukasi)',
		maxScore: 2,
		sortOrder: 14
	},
	{
		name: 'Menginstruksikan pasien penggunaan analgesik hanya saat nyeri',
		sectionLabel: 'C. Tahap Pasca Interaksi (Edukasi)',
		maxScore: 2,
		sortOrder: 15
	}
];

const cslPencabutanClosedMethod: CslCriterion[] = [
	{
		name: 'Mempersiapkan semua alat yang dibutuhkan (diagnostik set, tang ekstraksi, elevator)',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 1
	},
	{
		name: 'Mempersiapkan semua bahan yang dibutuhkan (betadine, kapas dan tampon)',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 2
	},
	{
		name: 'Mempersiapkan pasien (rekam medik, informed consent)',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 3
	},
	{
		name: 'Tiap kelompok terdiri dari 2 orang yang bertindak sebagai dokter dan pasien',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 4
	},
	{
		name: 'Dokter menggunakan jas kerja dan masker (surgical mask)',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 5
	},
	{
		name: 'Dokter menyapa pasien dan mempersilahkan pasien duduk di kursi unit',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 6
	},
	{
		name: 'Dokter melakukan cuci tangan (scrubbing up)',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 7
	},
	{
		name: 'Dokter menggunakan sarung tangan (gloved hand)',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 8
	},
	{
		name: 'Dokter berada di tempat (tools dental unit) yang telah disediakan',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 9
	},
	{
		name: 'Dokter memilih dan menentukan jenis teknik anestesi',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 10
	},
	{
		name: 'Dokter melakukan desinfeksi extra dan intra oral',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 11
	},
	{
		name: 'Dokter melakukan teknik anestesi',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 12
	},
	{
		name: 'Dokter melakukan evaluasi efek dan keefektifan anestesi',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 13
	},
	{
		name: 'Dokter memilih dan menentukan jenis teknik pencabutan yang digunakan',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 14
	},
	{
		name: 'Dokter memilih dan menentukan jenis tang yang digunakan',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 15
	},
	{
		name: 'Dokter melakukan pencabutan gigi sesuai teknik yang dipilih',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 16
	},
	{
		name: 'Dokter melakukan pembersihan daerah luka pencabutan',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 17
	},
	{
		name: 'Dokter memberikan instruksi setelah pencabutan gigi',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 18
	},
	{
		name: 'Dokter mengevaluasi kemungkinan komplikasi yang terjadi',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 19
	},
	{
		name: 'Dokter mempersilahkan pasien bertanya bila ada hal yang belum jelas',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 20
	},
	{
		name: 'Dokter mempersilahkan pasien pulang',
		sectionLabel: 'B. Prosedur',
		maxScore: 2,
		sortOrder: 21
	},
	{
		name: 'Mengumpulkan seluruh alat yang telah digunakan ke wadah yang telah disiapkan',
		sectionLabel: 'C. Manajemen Setelah Prosedur',
		maxScore: 2,
		sortOrder: 22
	}
];

const cslPenjahitan: CslCriterion[] = [
	{
		name: 'Persiapan alat & bahan (needle holder, gunting, pinset sirurgis, jarum, benang, kassa, povidone iodine)',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 1
	},
	{
		name: 'Persiapan diri (mencuci tangan 6 langkah, memakai masker dan sarung tangan steril)',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 2
	},
	{
		name: 'Persiapan pasien (posisi kerja dan lampu operasional yang tepat)',
		sectionLabel: 'A. Persiapan',
		maxScore: 2,
		sortOrder: 3
	},
	{
		name: 'Debridement (membersihkan sisa bekuan darah/debris dengan kassa steril)',
		sectionLabel: 'B. Tahap Pre-Suturing',
		maxScore: 2,
		sortOrder: 4
	},
	{
		name: 'Inspeksi soket (memastikan tidak ada perdarahan aktif yang masif sebelum dijahit)',
		sectionLabel: 'B. Tahap Pre-Suturing',
		maxScore: 2,
		sortOrder: 5
	},
	{
		name: 'Melakukan aplikasi antiseptik pada area kerja/anestesi lokal tambahan (bila perlu) dan fiksasi tepi luka',
		sectionLabel: 'B. Tahap Pre-Suturing',
		maxScore: 2,
		sortOrder: 6
	},
	{
		name: 'Pemasangan jarum: dipegang pada 1/3 belakang (dekat mata benang) menggunakan needle holder',
		sectionLabel: 'C. Tahap Prosedur Penjahitan',
		maxScore: 2,
		sortOrder: 7
	},
	{
		name: 'Penetrasi: jarum masuk tegak lurus terhadap jaringan, minimal 2-3 mm dari tepi luka',
		sectionLabel: 'C. Tahap Prosedur Penjahitan',
		maxScore: 2,
		sortOrder: 8
	},
	{
		name: 'Teknik penjahitan: menggunakan teknik simple interrupted suture (atau sesuai instruksi)',
		sectionLabel: 'C. Tahap Prosedur Penjahitan',
		maxScore: 2,
		sortOrder: 9
	},
	{
		name: 'Simpul (knotting): membuat simpul bedah dengan tegangan yang pas (tidak terlalu kencang/kendur)',
		sectionLabel: 'C. Tahap Prosedur Penjahitan',
		maxScore: 2,
		sortOrder: 10
	},
	{
		name: 'Posisi simpul: diletakkan di samping garis luka (bukan tepat di atas luka)',
		sectionLabel: 'C. Tahap Prosedur Penjahitan',
		maxScore: 2,
		sortOrder: 11
	},
	{
		name: 'Pemotongan benang: memotong ujung benang dengan menyisakan sekitar 2-3 mm',
		sectionLabel: 'C. Tahap Prosedur Penjahitan',
		maxScore: 2,
		sortOrder: 12
	},
	{
		name: 'Asepsis: menjaga sterilitas alat dan benang selama prosedur berlangsung',
		sectionLabel: 'C. Tahap Prosedur Penjahitan',
		maxScore: 2,
		sortOrder: 13
	},
	{
		name: 'Melakukan aplikasi antiseptik terakhir di atas area jahitan',
		sectionLabel: 'D. Tahap Akhir & Edukasi',
		maxScore: 2,
		sortOrder: 14
	},
	{
		name: 'Instruksi pasien: menghindari menyentuh jahitan, diet lunak, dan jadwal kontrol/lepas jahitan',
		sectionLabel: 'D. Tahap Akhir & Edukasi',
		maxScore: 2,
		sortOrder: 15
	},
	{
		name: 'Manajemen sampah medis (membuang jarum ke sharp container)',
		sectionLabel: 'D. Tahap Akhir & Edukasi',
		maxScore: 2,
		sortOrder: 16
	}
];

const cslScoreLegend = [
	{ value: 0, label: 'Tidak dilakukan' },
	{ value: 1, label: 'Dilakukan tapi belum memuaskan/sempurna' },
	{ value: 2, label: 'Dilakukan dengan memuaskan/sempurna' }
];
```

2. **Ganti** blok `else if (blockName === 'Blok Bedah Minor') { modules = [...] }`
   (sekitar baris 298–318) agar mendefinisikan **5 modul**, masing-masing
   membawa kriterianya sendiri (bukan lagi share satu `cslCriteria` global):

```ts
} else if (blockName === 'Blok Bedah Minor') {
	modules = [
		{
			name: 'CSL 1 - Kewaspadaan Standar',
			description: 'Cuci tangan bedah WHO, gown operasi, dan glove steril',
			scoringMode: 'CHECKLIST',
			scoreLegend: cslScoreLegend,
			criteria: cslKewaspadaanStandar
		},
		{
			name: 'CSL 2 - Teknik Anestesi Lokal',
			description: 'Prosedur anestesi lokal infiltrasi/blok',
			scoringMode: 'CHECKLIST',
			scoreLegend: cslScoreLegend,
			criteria: cslAnestesiLokal
		},
		{
			name: 'CSL 3 - Peresepan Obat Pasca Pencabutan Gigi',
			description: 'Peresepan analgesik dan antibiotik pasca ekstraksi',
			scoringMode: 'CHECKLIST',
			scoreLegend: cslScoreLegend,
			criteria: cslPeresepanObat
		},
		{
			name: 'CSL 4 - Pencabutan Gigi Closed Method di Model',
			description: 'Prosedur ekstraksi gigi teknik closed method',
			scoringMode: 'CHECKLIST',
			scoreLegend: cslScoreLegend,
			criteria: cslPencabutanClosedMethod
		},
		{
			name: 'CSL 5 - Penjahitan pada Luka Pasca Pencabutan Gigi',
			description: 'Prosedur suturing pasca ekstraksi gigi',
			scoringMode: 'CHECKLIST',
			scoreLegend: cslScoreLegend,
			criteria: cslPenjahitan
		}
	];
}
```

3. **Sesuaikan loop insert modul** (sekitar baris 328–390) supaya membaca
   `mod.criteria` per-modul, bukan `cslCriteria` global. Cari bagian:

```ts
if (mod.scoringMode === 'CHECKLIST') {
	for (const crit of cslCriteria) {
```

Ganti jadi:

```ts
if (mod.scoringMode === 'CHECKLIST' && mod.criteria) {
	for (const crit of mod.criteria) {
```

Sisanya (insert/update `practicumModuleCriteria`) tetap sama persis, karena
sudah membaca `crit.name`, `crit.maxScore`, `crit.sortOrder`,
`crit.sectionLabel` secara generik.

4. **Data lama:** modul lama `CSL Bedah Minor - Ekstraksi Gigi` dengan 11
   kriteria karangan tidak akan otomatis terhapus oleh seeder (seeder cuma
   upsert berdasarkan `name`+`blockId`, tidak pernah delete). Setelah
   deploy perubahan ini, jalankan pembersihan manual satu kali (hanya di
   environment yang belum punya data penilaian nyata terhubung ke modul
   lama tersebut — cek dulu):

   ```bash
   # Cek dulu apakah modul lama ini sudah dipakai di penilaian nyata:
   # SELECT * FROM practicum_assessment WHERE module_id = '<id modul lama>';
   ```

   Jika belum ada assessment yang terhubung, modul lama beserta
   kriterianya aman dihapus manual lewat `db:studio` atau query SQL
   terarah (`DELETE FROM practicum_module WHERE name = 'CSL Bedah Minor -
Ekstraksi Gigi'` — `onDelete: 'cascade'` pada
   `practicumModuleCriteria.moduleId` akan otomatis membersihkan
   kriterianya). Jika **sudah** ada assessment nyata terhubung, jangan
   dihapus — biarkan sebagai modul historis, cukup pastikan modul baru
   (5 CSL di atas) yang dipakai untuk sesi selanjutnya.

5. Jalankan ulang seeder untuk menerapkan:

   ```bash
   bun run db:seed
   ```

6. Verifikasi: masuk ke halaman Tambah Jadwal, pilih Blok "Blok Bedah
   Minor", pastikan dropdown Modul menampilkan 5 modul CSL baru (bukan lagi
   satu modul lama), lalu buat jadwal uji dan cek halaman penilaian +
   ekspor CSL (`/admin/penilaian/[id]/mahasiswa/[studentId]/export-csl`)
   menghasilkan dokumen dengan section A/B/C/D sesuai kriteria modul yang
   dipilih.

---

## URUTAN PENGERJAAN YANG DISARANKAN

1. Bagian 1 (autofill) — perubahan kecil, cepat, tidak berisiko.
2. Bagian 2 (hapus semester) — perubahan kecil, tidak berisiko.
3. Bagian 3 + Bagian 4 sekaligus (distribusi kelompok + fix scoping) — harus
   satu paket karena saling bergantung secara fungsional.
4. Bagian 5 (fix logbook) — jalankan `bun run db:seed-logbook-templates`
   segera untuk fix cepat, baru kerjakan integrasi ke `index.ts` sebagai
   perbaikan jangka panjang.
5. Bagian 6 (CSL additive seeder) — independen, bisa dikerjakan kapan saja,
   tapi sebaiknya setelah Bagian 3/4 karena modul CSL baru ini akan
   dipakai bersama fitur distribusi kelompok per instruktur (satu dosen
   menguji satu/lebih kelompok pada satu sesi CSL).

Setelah semua selesai, jalankan `bun run check` untuk memastikan tidak ada
regresi TypeScript, dan uji manual alur: Tambah Jadwal → pilih Seri (cek
autofill) → pilih beberapa instruktur → distribusikan kelompok → submit →
buka halaman Penilaian sebagai masing-masing instruktur (cek hanya
kelompoknya yang tampil) → generate logbook mahasiswa (cek tidak error) →
generate ekspor CSL untuk salah satu dari 5 modul CSL baru.
