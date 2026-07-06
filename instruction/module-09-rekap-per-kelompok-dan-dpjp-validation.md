# Instruction: Split rekap export by kelompok + require DPJP to have ≥1 kelompok

## Context

This is a SvelteKit + Drizzle (MySQL) project (Simlab). Two independent, unrelated fixes are
bundled in this instruction file because they're small. Do them as two separate commits.

Reference files (already provided alongside this instruction, do not re-derive them):
- `(CSL 1) FORM PENILAIAN CSL BM BLOK BEDAH MINOR 2026.xlsx` — the target **structural** pattern:
  one worksheet per kelompok (sheet name = kelompok name, e.g. "KELOMPOK 1 REG A"), each sheet
  listing only the students who belong to that kelompok, with the assessor's name shown on the
  sheet. Only copy the **structure** (sheet-per-kelompok, filtered roster, assessor name shown) —
  do NOT copy this file's specific columns (Persiapan / Prosedur Cuci Tangan Bedah / Gowning &
  Gloving); those are specific to that CSL form and unrelated to the general rekap export.
- `exported-example.xlsx` — the app's **current, incorrect** output: a single "Rekapitulasi Nilai"
  sheet dumping every student in the class regardless of kelompok, with no assessor/DPJP shown.

---

## Fix 1 — Rekap export: one sheet per kelompok, filtered roster, DPJP shown

### Problem

`GET /admin/penilaian/[id]/rekapitulasi/export` currently produces a single workbook sheet
("Rekapitulasi Nilai") containing every student in the practicum class, with no indication of
which DPJP (instruktur) is responsible for grading which kelompok. It should instead produce one
sheet per kelompok (matching the class), containing only that kelompok's students, with the
assigned DPJP name(s) shown on the sheet.

### Files to change

1. `src/lib/server/rekap/buildRekapWorkbook.ts`
2. `src/routes/admin/penilaian/[id]/rekapitulasi/export/+server.ts`

### 1. `src/lib/server/rekap/buildRekapWorkbook.ts`

Refactor so the header-row/merge construction is a reusable helper, and the exported function
writes **one sheet per kelompok** instead of one combined sheet.

- Extract the existing header-building logic (the code that currently builds `headerRow1`,
  `headerRow2`, and the base `merges` array from `groups`) into a private helper function, e.g.
  `buildHeaderRows(groups: Group[])`, returning `{ headerRow1, headerRow2, merges }`. Do not
  change the column logic itself (`groups`/`columns`/`subLabel` semantics stay exactly as they
  are today) — only lift it out of the main function body so it can be reused per-sheet.
- Change the `Params` interface: replace the single `students: Student[]` field with:
  ```ts
  interface RekapSheet {
  	sheetName: string;      // e.g. "Kelompok 1", or "Tanpa Kelompok"
  	penilai: string;        // e.g. "Budi Santoso, S.Ked" or "-" if none assigned
  	students: Student[];
  }

  interface Params {
  	groups: Group[];
  	sheets: RekapSheet[];
  	getScore: (studentId: string, scheduleId: string, moduleId: string) => number | string | null;
  }
  ```
- In `buildRekapWorkbookBuffer`, loop over `sheets` and, for each entry:
  - Call the extracted header helper to get `{ headerRow1, headerRow2, merges }` (fresh copy per
    sheet — don't mutate a shared array across iterations).
  - Prepend a title row above the two header rows: `['Penilai (DPJP): ' + sheet.penilai]`. Since
    this adds one row above the existing header rows, shift every row/col reference in `merges` by
    `+1` row (`r: 0` → `r: 1`, etc.) before pushing rows.
  - Add a merge for the new title row spanning all columns of that sheet:
    `{ s: { r: 0, c: 0 }, e: { r: 0, c: totalColumnCount - 1 } }` (compute `totalColumnCount` the
    same way `totalColspan` is computed client-side: `3 + columns.length` where `columns` is
    `groups.flatMap(g => g.columns)`, i.e. same column count as before plus the 3 leading columns
    and the trailing "Rata-rata" column — reuse whatever count the existing code already produces
    for the header rows, just add 1 for the title row on top).
  - Build the student rows exactly as before (same `avg` calculation), but only for
    `sheet.students` instead of the old flat `students` list.
  - Create the worksheet with `XLSX.utils.aoa_to_sheet([titleRow, headerRow1, headerRow2, ...studentRows])`
    and assign the shifted `merges` to `ws['!merges']`.
  - Append it to the workbook with a **sanitized, unique** sheet name:
    - Excel sheet names: max 31 characters, and must not contain `: \ / ? * [ ]`.
    - Write a small local helper, e.g.:
      ```ts
      function sanitizeSheetName(name: string, used: Set<string>): string {
      	let clean = name.replace(/[:\\\/\?\*\[\]]/g, '').slice(0, 31).trim() || 'Sheet';
      	let candidate = clean;
      	let i = 2;
      	while (used.has(candidate)) {
      		const suffix = ` (${i})`;
      		candidate = clean.slice(0, 31 - suffix.length) + suffix;
      		i++;
      	}
      	used.add(candidate);
      	return candidate;
      }
      ```
    - Track a `const usedNames = new Set<string>()` across the loop (declared once, outside the
      loop) and pass it into `sanitizeSheetName` on every iteration so collisions across kelompok
      with similar/truncated names are still handled.
- If `sheets` is empty (edge case — no students at all), fall back to writing a single empty sheet
  named `'Rekapitulasi Nilai'` with just the header rows, so the workbook is never invalid (an
  `.xlsx` with zero sheets will fail to open).

### 2. `src/routes/admin/penilaian/[id]/rekapitulasi/export/+server.ts`

- Change every `instructors: true` in the two `db.query.practicumSchedule.findFirst` /
  `findMany` calls (both the single-`schedule` fetch and the `allSchedules` fetch) to
  `instructors: { with: { user: true } }`, so each instructor row includes the assigned `user`
  (name) and its existing `groupId` column.
- After computing `allSchedules`, fetch the kelompok for this class:
  ```ts
  import { kelompokMahasiswa, kelompokMahasiswaMember } from '$lib/server/db/schema';
  // ...
  const groupsList = await db.query.kelompokMahasiswa.findMany({
  	where: eq(kelompokMahasiswa.classId, schedule.classId!),
  	orderBy: (km, { asc }) => [asc(km.name)]
  });
  ```
- Fetch kelompok membership for all those groups in one query:
  ```ts
  import { inArray } from 'drizzle-orm';
  const memberRows =
  	groupsList.length > 0
  		? await db.query.kelompokMahasiswaMember.findMany({
  				where: inArray(
  					kelompokMahasiswaMember.kelompokId,
  					groupsList.map((g) => g.id)
  				)
  			})
  		: [];
  ```
- Build a `Map<groupId, Set<studentUserId>>` from `memberRows` (key: `kelompokId`, value: set of
  `userId`).
- Build a `Map<groupId, string>` of DPJP names per kelompok by walking `allSchedules`' `instructors`
  (now including `user`): for every instructor row with a non-null `groupId`, collect
  `{ groupId, name: row.user.name }`, dedupe by user id per group (a DPJP could appear on more than
  one schedule in the series for the same group — only list their name once), and join names with
  `', '`. If a kelompok has no assigned instructor across all `allSchedules`, its penilai string is
  `'-'`.
- Using the existing `students` array (already fetched — all class members) plus the membership
  map, partition students into per-kelompok buckets:
  ```ts
  const sheets = groupsList
  	.map((g) => ({
  		sheetName: g.name,
  		penilai: penilaiByGroup.get(g.id) ?? '-',
  		students: students.filter((s) => (membersByGroup.get(g.id) ?? new Set()).has(s.userId))
  	}))
  	.filter((s) => s.students.length > 0);

  const assignedStudentIds = new Set(sheets.flatMap((s) => s.students.map((st) => st.userId)));
  const unassignedStudents = students.filter((s) => !assignedStudentIds.has(s.userId));
  if (unassignedStudents.length > 0) {
  	sheets.push({ sheetName: 'Tanpa Kelompok', penilai: '-', students: unassignedStudents });
  }
  ```
- If `groupsList.length === 0` (class has no kelompok configured at all), skip all of the above and
  fall back to the previous behavior: a single sheet named `'Rekapitulasi Nilai'` containing all
  `students`, `penilai: '-'`. This preserves current behavior for classes that don't use kelompok.
- Update the call to `buildRekapWorkbookBuffer` to pass `{ groups, sheets, getScore }` instead of
  `{ groups, students, getScore }`.
- Leave the response headers, `Content-Type`, and `fileName` generation unchanged.

### Verification

- Export a schedule whose class has kelompok configured with a DPJP assigned per kelompok →
  workbook should open with one tab per kelompok (plus a "Tanpa Kelompok" tab only if some
  students aren't in any kelompok), each tab showing only that kelompok's roster and the correct
  DPJP name in the title row.
- Export a schedule whose class has **no** kelompok configured → workbook should look exactly like
  before (single "Rekapitulasi Nilai" sheet, all students, no DPJP row… actually will now include a
  `penilai: '-'` title row; confirm this is acceptable, since previously there was no such row at
  all — mention this minor visual diff when reporting back).
- Run `bun run check` / `bun run build` to confirm no type errors from the `Params`/`RekapSheet`
  interface change (check `src/lib/server/db/seeds/test-rekap.ts` too — it may reference the old
  `buildRekapWorkbookBuffer` signature and needs updating to the new `sheets` shape, or leave it if
  it's a standalone seeding script not exercising this function).

---

## Fix 2 — Jadwal creation: require every selected DPJP to have ≥1 kelompok

### Problem

In `src/routes/admin/jadwal-praktikum/tambah/+page.svelte`, the form already validates:
- at least one DPJP is selected (`selectedInstructorIds.length === 0` check), and
- every kelompok in the class is assigned to *some* DPJP (`hasUnassignedGroups` check).

It does **not** validate the inverse: a DPJP can be toggled "on" (added to `instructorGroupMap`
with an empty array) without ever picking a kelompok for them. Because the hidden `assignments`
inputs are only rendered `{#if groupIds.length > 0}` (see the `{#each Object.entries(...)}` block
around line 352), an instructor left with zero kelompok silently produces **no** hidden input at
all — the form submits successfully but that DPJP is dropped without any warning to the user.

### File to change

`src/routes/admin/jadwal-praktikum/tambah/+page.svelte`

### Change

In the `use:enhance={({ cancel }) => { ... }}` block, add a new check **after** the existing
`hasUnassignedGroups` check and **before** `conflictError = null;`. Only enforce this when the
class actually has kelompok defined (`groupsForClass.length > 0`) — when a class has zero kelompok,
the existing whole-class-assignment behavior (empty `groupIds` array) is intentional and must
keep working.

```svelte
if (groupsForClass.length > 0) {
	const instructorWithoutGroup = selectedInstructorIds.find(
		(id) => (instructorGroupMap[id] ?? []).length === 0
	);
	if (instructorWithoutGroup) {
		notificationType = 'error';
		notificationTitle = 'Gagal!';
		notificationDescription = 'Setiap DPJP yang dipilih harus ditugaskan minimal 1 kelompok.';
		showNotification = true;
		cancel();
		return;
	}
}
```

Do not touch `toggleInstructor`, `toggleGroupForInstructor`, `autoDistributeGroups`, or the
template/markup — this is a submit-time guard only, consistent with how the two existing checks
in this same block work.

### Verification

- Class with kelompok configured: toggle a DPJP on, don't pick any kelompok for them, submit →
  should show the new error message and NOT submit the form.
- Same class: toggle a DPJP on, pick at least one kelompok, submit → should proceed to the
  existing `hasUnassignedGroups` check / server action as before.
- Class with zero kelompok configured: toggle a DPJP on, submit → should NOT be blocked by this new
  check (only the pre-existing "Pilih minimal satu DPJP" check applies).
- Run `bun run check` to confirm no type errors.

---

## Verification checklist (both fixes)

1. `git diff --stat` — confirm only the four files listed above are touched (2 for Fix 1, 1 for
   Fix 2, plus the seed file only if it needed a signature update).
2. `bun run check` / `bun run lint` and `bun run build` pass with zero errors.
3. Manually re-export a rekapitulasi xlsx for a schedule/class that has kelompok and confirm:
   sheet-per-kelompok, correct filtered roster per sheet, correct DPJP name per sheet, sheet names
   valid (≤31 chars, no forbidden characters), no duplicate sheet names.
4. Manually attempt to create a jadwal-praktikum with a DPJP that has no kelompok assigned and
   confirm the new validation message blocks submission.
