# Implementasi: Rubrik Berjenjang (Banded Rubric) per Kriteria Penilaian

## Latar Belakang

Form CSL saat ini (`(CSL 1) FORM PENILAIAN CSL BM BLOK BEDAH MINOR 2026.xlsx`) memakai rubrik
analitik per kriteria, di mana setiap kriteria (mis. "Persiapan", "Prosedur Cuci Tangan Bedah",
"Gowning & Gloving") punya **beberapa rentang skor**, dan setiap rentang punya **deskripsi**:

| Kode | Kriteria                   | Rentang | Deskripsi                                                          |
| ---- | -------------------------- | ------- | ------------------------------------------------------------------ |
| A    | Persiapan                  | 95–100  | Seluruh alat dan persiapan diri lengkap dan sesuai standar aseptik |
| A    | Persiapan                  | 80–94   | Persiapan cukup lengkap, ada kekurangan minor                      |
| B    | Prosedur Cuci Tangan Bedah | 90–100  | Semua langkah WHO dilakukan dengan urutan dan teknik yang benar    |
| B    | Prosedur Cuci Tangan Bedah | 80–90   | Sebagian langkah benar, ada kesalahan teknik/urutan                |
| C    | Gowning & Gloving          | 90–100  | Teknik aseptik benar, tidak ada kontaminasi                        |
| C    | Gowning & Gloving          | 80–90   | Teknik cukup benar, terdapat risiko kontaminasi kecil              |

Skema saat ini **tidak mendukung** ini:

- `practicumModuleCriteria` hanya punya `description` tunggal (bukan per-rentang).
- `practicumModule.scoreLegend` cuma peta `value -> label` datar (dipakai mode `CHECKLIST`), tidak
  bisa menyatakan rentang (`min`–`max`) yang terikat ke kriteria tertentu.
- Input skor di halaman penilaian cuma `<input type=number>` polos, tanpa panduan rentang.

Dokumen ini menjelaskan cara menambahkan **band (rentang skor + deskripsi) per kriteria**, dan
menampilkannya di seluruh alur: form input dosen, halaman rekap kelas, dan file rekapitulasi
Excel per tab "Kelompok".

---

## 1. Skema Database

### 1.1 Tabel baru: `practicum_criteria_band`

Tambahkan di `src/lib/server/db/schema.ts`, tepat setelah definisi `practicumModuleCriteria`:

```ts
export const practicumCriteriaBand = mysqlTable(
	'practicum_criteria_band',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		criteriaId: varchar('criteria_id', { length: 36 }).notNull(),
		minScore: int('min_score').notNull(), // contoh: 80
		maxScore: int('max_score').notNull(), // contoh: 94
		label: varchar('label', { length: 100 }), // opsional, contoh: "Baik"
		description: text('description').notNull(), // "Persiapan cukup lengkap, ada kekurangan minor"
		sortOrder: int('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('practicum_criteria_band_criteria_idx').on(table.criteriaId),
		foreignKey({
			name: 'pcb_criteria_fk',
			columns: [table.criteriaId],
			foreignColumns: [practicumModuleCriteria.id]
		}).onDelete('cascade')
	]
);
```

> Catatan desain: band **tidak menggantikan** `practicumModuleCriteria.description` — biarkan
> kolom itu untuk deskripsi umum kriteria (kalau ada), dan `practicumCriteriaBand` khusus untuk
> rentang skor + deskripsi per rentang. Kalau kriteria tidak punya band (module lama/other block),
> UI tetap fallback ke input angka polos seperti sekarang — **tidak breaking**.

### 1.2 Relations

Tambahkan di bagian relations (dekat `practicumModuleCriteriaRelations` yang sudah ada):

```ts
export const practicumCriteriaBandRelations = relations(practicumCriteriaBand, ({ one }) => ({
	criteria: one(practicumModuleCriteria, {
		fields: [practicumCriteriaBand.criteriaId],
		references: [practicumModuleCriteria.id]
	})
}));
```

Lalu update `practicumModuleCriteriaRelations` yang sudah ada supaya punya `many(bands)`:

```ts
export const practicumModuleCriteriaRelations = relations(
	practicumModuleCriteria,
	({ one, many }) => ({
		module: one(practicumModule, {
			fields: [practicumModuleCriteria.moduleId],
			references: [practicumModule.id]
		}),
		scores: many(practicumAssessmentCriteriaScore),
		bands: many(practicumCriteriaBand) // <-- tambahan
	})
);
```

### 1.3 Migration

```bash
bun run db:generate
```

Review hasil SQL yang digenerate di `drizzle/000X_xxx.sql` — harus berupa `CREATE TABLE
practicum_criteria_band (...)` dengan FK ke `practicum_module_criteria(id)` `ON DELETE CASCADE`.
Jalankan migration seperti biasa (`bun run db:migrate`).

---

## 2. Server: validasi & query

### 2.1 `assessment.ts` — tidak perlu mengubah validasi keras

Band di sini bersifat **panduan (guidance)**, bukan pemaksaan — dosen tetap boleh input angka
bebas 0–`maxScore` seperti sekarang (kebijakan penilaian tetap di tangan dosen; band cuma bantu
dia memutuskan angka mana yang pantas). Jadi **tidak ada perubahan wajib** di
`saveAssessment()` / validasi `RUBRIK` mode.

Opsional (kalau nanti mau strict mode): tambahkan util `findMatchingBand(score, bands)` untuk
menandai band yang cocok — dipakai murni untuk **tampilan**, bukan blokir simpan.

### 2.2 Query criteria harus ikut include `bands`

Cari semua tempat yang query `practicumModule.criteria` / `practicumModuleCriteria` dengan
`db.query...with: { criteria: ... }`, dan tambahkan `bands`:

**File yang perlu diubah:**

- `src/routes/admin/penilaian/[id]/+page.server.ts`
- `src/routes/admin/penilaian/[id]/mahasiswa/[studentId]/+page.server.ts`
- `src/lib/server/assessment.ts` (query `moduleObj` — opsional, hanya perlu kalau mengaktifkan
  `findMatchingBand`)

Contoh pola (sesuaikan dengan bentuk query yang sudah ada di masing-masing file):

```ts
with: {
	modules: {
		with: {
			module: {
				with: {
					criteria: {
						orderBy: (c, { asc }) => [asc(c.sortOrder)],
						with: {
							bands: {
								orderBy: (b, { desc }) => [desc(b.minScore)] // tertinggi dulu
							}
						}
					}
				}
			}
		}
	}
}
```

---

## 3. UI: editor band di Master Modul

### 3.1 `src/routes/admin/master/modul/tambah/+page.svelte` dan `.../[id]/edit/+page.svelte`

Saat ini tiap baris kriteria hanya punya `name` + `maxScore`. Tambahkan sub-daftar band yang bisa
ditambah/dihapus per kriteria, mengikuti pola array state yang sudah dipakai untuk `criteria`:

```ts
type Band = { id: string; minScore: number; maxScore: number; label: string; description: string };
type Criterion = {
	id: string;
	name: string;
	maxScore: number;
	bands: Band[];
};

let criteria = $state<Criterion[]>([
	{ id: Math.random().toString(), name: '', maxScore: 100, bands: [] }
]);

function addBand(critId: string) {
	const crit = criteria.find((c) => c.id === critId);
	if (!crit) return;
	crit.bands.push({
		id: Math.random().toString(),
		minScore: 80,
		maxScore: 100,
		label: '',
		description: ''
	});
}

function removeBand(critId: string, bandId: string) {
	const crit = criteria.find((c) => c.id === critId);
	if (!crit) return;
	crit.bands = crit.bands.filter((b) => b.id !== bandId);
}
```

Markup tambahan di dalam `{#each criteria as criterion}` (di bawah field `name`/`maxScore` yang
sudah ada), gunakan collapsible/section kecil supaya tidak mengubah drastis layout yang ada:

```svelte
<div class="mt-3 space-y-2 rounded-lg border bg-muted/10 p-3">
	<div class="flex items-center justify-between">
		<Label class="text-xs font-semibold text-muted-foreground uppercase">
			Rubrik Rentang Skor (Opsional)
		</Label>
		<Button type="button" variant="ghost" size="sm" onclick={() => addBand(criterion.id)}>
			+ Tambah Rentang
		</Button>
	</div>

	{#each criterion.bands as band, bandIdx (band.id)}
		<div class="grid grid-cols-12 items-start gap-2">
			<Input type="number" class="col-span-2" placeholder="Min" bind:value={band.minScore} />
			<Input type="number" class="col-span-2" placeholder="Max" bind:value={band.maxScore} />
			<Textarea
				class="col-span-7"
				placeholder="Deskripsi rentang, mis. 'Seluruh alat dan persiapan diri lengkap...'"
				bind:value={band.description}
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class="col-span-1"
				onclick={() => removeBand(criterion.id, band.id)}
			>
				<Trash2 class="size-4" />
			</Button>
			<!-- hidden inputs untuk form submit -->
			<input type="hidden" name="bandMin_{criterion.id}_{bandIdx}" value={band.minScore} />
			<input type="hidden" name="bandMax_{criterion.id}_{bandIdx}" value={band.maxScore} />
			<input type="hidden" name="bandDesc_{criterion.id}_{bandIdx}" value={band.description} />
		</div>
	{/each}
</div>
```

> Serialisasi: cara paling simpel mengikuti pola project ini (yang sudah pakai `criteria` sebagai
> hidden JSON field, cek implementasi `tambah/+page.svelte` saat ini) — kalau kriteria sudah
> diserialisasi sebagai satu blok JSON di hidden input, tambahkan `bands: Band[]` langsung ke
> struktur JSON tersebut, tidak perlu hidden input per-field seperti contoh di atas. Sesuaikan
> dengan pola serialisasi aktual di file tersebut.

### 3.2 `+page.server.ts` (tambah & edit)

Setelah insert/update `practicumModuleCriteria`, insert juga baris `practicumCriteriaBand` untuk
tiap band yang dikirim, dan pastikan urutan berdasarkan `sortOrder` (mis. urut dari band skor
tertinggi ke terendah, biar konsisten dengan tampilan form aslinya).

Untuk edit: hapus dulu band lama milik kriteria itu lalu insert ulang (paling sederhana dan aman
untuk kasus tambah/hapus band), mirip pola yang kemungkinan sudah dipakai untuk re-sync
`criteria` saat edit modul.

---

## 4. UI: halaman penilaian per-mahasiswa

**File: `src/routes/admin/penilaian/[id]/mahasiswa/[studentId]/+page.svelte`**

Ganti blok deskripsi kriteria tunggal (baris yang sekarang cuma menampilkan
`{criterion.description}`) dengan tampilan rubrik penuh + highlight band yang sedang cocok
dengan angka yang diketik dosen:

```svelte
{#each criteria as criterion (criterion.id)}
	<div class="flex flex-col gap-3 border-b pb-4 last:border-0 last:pb-0">
		<div class="flex items-center justify-between gap-4">
			<div class="flex flex-col">
				<span class="text-sm font-semibold">{criterion.name}</span>
				{#if criterion.description}
					<span class="text-xs text-muted-foreground">{criterion.description}</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<Input
					type="number"
					name="criteriaScore_{criterion.id}"
					min="0"
					max={criterion.maxScore}
					class="w-24 text-right font-mono font-bold"
					bind:value={criteriaValues[criterion.id]}
					disabled={!isOriginalInstructor}
					required
				/>
				<span class="text-xs font-semibold text-muted-foreground">/ {criterion.maxScore}</span>
			</div>
		</div>

		{#if criterion.bands && criterion.bands.length > 0}
			<div class="ml-1 space-y-1 rounded-lg border bg-muted/5 p-2 text-xs">
				{#each criterion.bands as band (band.id)}
					{@const active =
						criteriaValues[criterion.id] >= band.minScore &&
						criteriaValues[criterion.id] <= band.maxScore}
					<div
						class="flex gap-2 rounded px-2 py-1 {active
							? 'bg-primary/10 font-medium text-primary'
							: 'text-muted-foreground'}"
					>
						<span class="w-16 shrink-0 font-mono">{band.minScore}-{band.maxScore}</span>
						<span>{band.description}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/each}
```

Ini menggantikan input angka "buta" jadi mirip lembar aslinya — dosen lihat rentang & deskripsi
persis seperti di Excel, dan baris yang sesuai dengan angka yang lagi diketik otomatis
ter-highlight.

---

## 5. UI: halaman rekap kelas

**File: `src/routes/admin/penilaian/[id]/+page.svelte`**

Halaman ini menampilkan tabel ringkas (1 kolom = rata-rata per modul), bukan breakdown per
kriteria — jadi jangan ubah struktur tabelnya. Tambahkan **ikon info di header kolom modul** yang
menampilkan rubrik lengkap (semua kriteria + band-nya) lewat tooltip/popover, supaya dosen/koordinator
yang buka tabel ini bisa cek acuan penilaian tanpa masuk ke tiap mahasiswa satu-satu.

```svelte
<Table.Head class="...">
	<div class="flex items-center justify-center gap-1">
		{col.label}
		{#if col.criteria?.length}
			<Popover.Root>
				<Popover.Trigger>
					<Info class="size-3.5 text-muted-foreground" />
				</Popover.Trigger>
				<Popover.Content class="w-80 space-y-3 text-left text-xs">
					{#each col.criteria as crit}
						<div>
							<p class="font-semibold">{crit.name}</p>
							{#each crit.bands ?? [] as band}
								<p class="text-muted-foreground">
									<span class="font-mono">{band.minScore}-{band.maxScore}</span>: {band.description}
								</p>
							{/each}
						</div>
					{/each}
				</Popover.Content>
			</Popover.Root>
		{/if}
	</div>
</Table.Head>
```

`col.criteria` perlu ditambahkan ke struktur `columns` yang dibangun di `<script>` bagian atas
file ini (turunan dari `buildRekapColumns` / query modul) — sertakan `criteria` (dengan `bands`)
saat memetakan `col` dari tiap modul, sesuai perubahan query di bagian 2.2.

---

## 6. Export Excel: rubrik per tab "Kelompok"

**File: `src/lib/server/rekap/buildRekapWorkbook.ts`** dan
**`src/routes/admin/penilaian/[id]/rekapitulasi/export/+server.ts`**

Tujuan: replikasi blok legenda seperti baris 18–23 di file Excel asli (`Kode | Kriteria | Rentang
| Deskripsi`), dicetak otomatis dari data DB, muncul di **setiap sheet Kelompok**.

### 6.1 Kumpulkan data rubrik di `export/+server.ts`

Setelah `allSchedules` didapat, ambil semua kriteria + band dari modul-modul yang dipakai di
schedule ini:

```ts
const moduleIds = [...new Set(allSchedules.flatMap((s) => s.modules.map((m) => m.moduleId)))];

const criteriaWithBands = await db.query.practicumModuleCriteria.findMany({
	where: inArray(practicumModuleCriteria.moduleId, moduleIds),
	orderBy: (c, { asc }) => [asc(c.sortOrder)],
	with: {
		bands: { orderBy: (b, { desc }) => [desc(b.minScore)] }
	}
});

// kelompokkan per kode urut (A, B, C, ...) supaya sama persis gaya form asli
const rubricRows = criteriaWithBands.flatMap((crit, i) => {
	const code = String.fromCharCode(65 + i); // A, B, C...
	if (crit.bands.length === 0) return [];
	return crit.bands.map((band, bi) => [
		bi === 0 ? code : '',
		bi === 0 ? crit.name : '',
		`${band.minScore}-${band.maxScore}`,
		band.description
	]);
});
```

Lalu teruskan `rubricRows` ke `buildRekapWorkbookBuffer({ groups, sheets, getScore, rubricRows })`.

### 6.2 Tambahkan parameter `rubricRows` di `buildRekapWorkbook.ts`

```ts
interface Params {
	groups: Group[];
	sheets: RekapSheet[];
	getScore: (studentId: string, scheduleId: string, moduleId: string) => number | string | null;
	rubricRows?: (string | number)[][]; // <-- tambahan
}
```

Di dalam loop `for (const sheet of sheets)`, setelah `studentRows` selesai dibangun dan sebelum
`XLSX.utils.aoa_to_sheet(...)`, sisipkan blok rubrik dengan jarak 2 baris kosong — sama seperti
posisi baris 17-23 di file asli:

```ts
const rubricBlock: (string | number)[][] = [];
if (rubricRows && rubricRows.length > 0) {
	rubricBlock.push([]); // baris kosong pemisah
	rubricBlock.push(['', '', 'Rentang', 'Deskripsi']); // header kecil, opsional
	rubricBlock.push(...rubricRows);
}

const ws = XLSX.utils.aoa_to_sheet([
	titleRow,
	headerRow1,
	headerRow2,
	...studentRows,
	...rubricBlock
]);
ws['!merges'] = shiftedMerges;
```

Tambahkan juga merge untuk kolom deskripsi supaya teksnya tidak kepotong (opsional, sesuai selera
— kolom deskripsi di file asli itu 1 sel lebar, XLSX akan overflow otomatis ke kanan kalau sel
sebelahnya kosong, jadi ini opsional saja).

### 6.3 Hasil akhir

Tiap tab "KELOMPOK n" di file export akan berisi:

1. Judul (`Penilai (DPJP): ...`)
2. Header tabel nilai + baris mahasiswa (seperti sekarang)
3. Baris kosong pemisah
4. Tabel rubrik `Kode | Kriteria | Rentang | Deskripsi` — identik gaya baris 18–23 file asli,
   tapi digenerate dari data DB (bukan hardcode), jadi otomatis ikut berubah kalau kriteria/band
   diedit di Master Modul.

---

## 7. Checklist Implementasi

- [ ] Tambah tabel `practicum_criteria_band` + relations di `schema.ts`
- [ ] Generate & jalankan migration
- [ ] Update query criteria (`+page.server.ts` penilaian list & mahasiswa detail) untuk include `bands`
- [ ] Tambah editor band di form Master Modul (`tambah` & `edit`), termasuk server action insert/replace band
- [ ] Update `mahasiswa/[studentId]/+page.svelte`: tampilkan rubrik penuh + highlight band aktif
- [ ] Update `penilaian/[id]/+page.svelte`: tooltip/popover rubrik di header kolom modul
- [ ] Update `buildRekapWorkbook.ts` + `rekapitulasi/export/+server.ts`: sisipkan blok rubrik per tab Kelompok
- [ ] Uji dengan modul "Bedah Minor" (multi-band) dan modul lama tanpa band (pastikan fallback ke tampilan lama tetap jalan, tidak ada breaking change)
- [ ] Uji ekspor Excel untuk kelas dengan >1 kelompok, pastikan setiap tab dapat blok rubrik yang benar

---

## 8. Catatan: Preparasi/Restorasi (`practicumModule.component`)

Rekomendasi: **jangan** memfilter dropdown ini khusus untuk blok `"Penyakit Jaringan Keras Gigi"`.
Field ini sudah nullable/opsional dan `buildRekapMatrix.ts` sudah fallback dengan baik saat
`component = null`, jadi menampilkannya untuk semua blok tidak mengganggu blok lain — sementara
hardcode nama blok justru bikin rapuh (butuh ubah kode tiap ada blok baru yang perlu split
Preparasi/Restorasi). Kalau perlu, cukup tambahkan teks bantuan kecil di bawah field yang
menjelaskan kapan field ini relevan dipakai.
