# MODULE 5 — ASSESSMENT (PENILAIAN) DYNAMIC TABLE REDESIGN

Depends on Module 4 (`kelompokMahasiswa`, `practicumScheduleInstructor.groupId`).

Goal: replace the current drill-down flow — `/admin/penilaian/[id]` shows a
plain student list, clicking a student navigates to
`/admin/penilaian/[id]/mahasiswa/[studentId]` to actually enter scores —
with a single dynamic table directly on `/admin/penilaian/[id]`, matching
the shape of `contoh-tabel-penilaian-cropped.jpeg`: rows = students,
columns = modules (grouped, e.g. "Kelas I (SITE 1)" with PREP/RESTO
sub-columns), with inputs live inside the table cells.

**Do not delete** the existing `mahasiswa/[studentId]` route — keep it as
a working deep link (useful for printing a single student's full sheet,
and as a fallback). The new table page becomes the primary entry point;
it links to the old page rather than replacing it outright.

---

## 1. SCHEMA: optional column-grouping label

Today, `practicumModule.component` (`PREPARASI`/`RESTORASI`/`null`) marks
_which half_ a module represents, but there's no way to say "these two
modules are the same logical column group" (e.g. "Kelas I — Preparasi" +
"Kelas I — Restorasi" should render as one merged "Kelas I (SITE 1)"
header with two sub-columns, per the sample table). Add:

```ts
groupLabel: varchar('group_label', { length: 255 }), // "Kelas I (SITE 1)"
```

to `practicumModule` in `src/lib/server/db/schema.ts`. Nullable — modules
without a pair (e.g. a standalone "Caries Removal" or "Inlay — Preparasi"
with no Restorasi counterpart) just render as their own single column
using `name` as the header, same as today. Two modules sharing the same
non-null `groupLabel` render as one merged header with sub-columns split
by `component`.

Run `bun run db:generate && bun run db:push` after. Backfill existing seed
modules with sensible `groupLabel` values where a Preparasi/Restorasi pair
already exists (grep seed data for `component:` usage to find pairs).

---

## 2. REFACTOR: shared assessment-save logic

The existing `saveAssessment` action in
`src/routes/admin/penilaian/[id]/mahasiswa/[studentId]/+page.server.ts`
handles both TOTAL and RUBRIK scoring, ownership rules (only the original
grading instructor, koordinator, or superadmin can edit an existing
score), and criteria-score upserts. The new table page needs the exact
same logic but driven by a `studentId` from form data instead of a route
param (since the table page has many students on one page, not one per
URL).

Extract the body of that action into
`src/lib/server/assessment.ts`:

```ts
export async function saveAssessment(params: {
	scheduleId: string;
	studentId: string;
	moduleId: string;
	formData: FormData;
	userId: string;
	userRole: string;
	userLaboratoriumId?: string | null;
}): Promise<{ success: true } | { success: false; status: number; message: string }>;
```

Keep all existing behavior verbatim (authorization checks, RUBRIK
criteria-loop validation, transaction, "only original grader can update"
rule) — just parameterize `studentId` instead of reading it from
`params` (SvelteKit route params).

Update both:

- `mahasiswa/[studentId]/+page.server.ts`'s `saveAssessment` action → now
  a thin wrapper calling the shared function with `params.studentId`
- The new `/admin/penilaian/[id]/+page.server.ts` action (§4) → calls the
  same shared function with `studentId` read from `formData`

This avoids two divergent copies of fairly sensitive scoring/authorization
logic.

---

## 3. STUDENT SCOPING BY GROUP (uses Module 4's `groupId`)

In `/admin/penilaian/[id]/+page.server.ts`'s `load`:

- Find the current instructor's row in `schedule.instructors` (the
  `practicumScheduleInstructor` entry where `instructorId === locals.user.id`)
- If that row has a non-null `groupId`: fetch only students in
  `kelompokMahasiswaMember` for that `groupId` (via the new Module 4
  table), not the whole `classId` roster
- If `groupId` is null (today's default, or the instructor covers the
  whole class), or the viewer is `koordinator`/`superadmin`: keep today's
  behavior — full `practicumClassMember` roster for `schedule.classId`
- For `koordinator`/`superadmin` specifically, additionally provide a
  kelompok filter Select on the page (populate from `kelompokMahasiswa`
  rows for `schedule.classId`) so they can narrow the table to one group
  at a time when reviewing — this is a view-only filter, doesn't affect
  what any dosen is authorized to submit

---

## 4. THE DYNAMIC TABLE PAGE

Rework `src/routes/admin/penilaian/[id]/+page.svelte` and its
`+page.server.ts`.

### 4.1 Load function

Fetch (mostly already fetched today, extend as needed):

- `schedule` with `modules` (`practicumScheduleModule` → `practicumModule`,
  now including `groupLabel`, `component`, `scoringMode`, and `criteria`
  for RUBRIK modules — criteria weren't loaded on this page before,
  they'll be needed for the inline RUBRIK dialog, §4.3)
- `students` scoped per §3
- `assessments` for this schedule (all students, all modules) — already
  fetched today
- `criteriaScores` for those assessments (needed to prefill the RUBRIK
  dialog) — wasn't fetched on this page before, add it (same query already
  used in `mahasiswa/[studentId]/+page.server.ts`)

### 4.2 Column model

Build a derived column list, grouping `schedule.modules` by `groupLabel`:

```ts
type Column =
	| { kind: 'single'; module: Module }
	| {
			kind: 'grouped';
			label: string;
			sub: { component: 'PREPARASI' | 'RESTORASI'; module: Module }[];
	  };
```

- Modules with `groupLabel === null` → `single` column, header = `module.name`
- Modules sharing the same non-null `groupLabel` → one `grouped` column,
  outer header = `groupLabel`, inner sub-headers = "PREP"/"RESTO" (derived
  from `component`), rendered as a nested `<thead>` row like the sample
  table (outer header cell spans 2 columns via `colspan`, sub-header row
  underneath)
- Append a final computed **RATA-RATA** column (not backed by a DB column)
  — for each student row, average that student's `score` across all
  `assessments` for this schedule where `status = 'FINAL'`. Show `-` if
  no assessments yet, avoid divide-by-zero (don't reproduce the sample's
  `#DIV/0!` — show a clean placeholder instead).

### 4.3 Cell rendering

For each `(student, module)` pair, look up the existing `practicumAssessment`
(if any) by `(scheduleId, studentId, moduleId)`.

**TOTAL scoring mode** — inline numeric `<input type="number">` directly in
the cell, prefilled with the existing score or empty:

- On blur (or debounced on change), submit via `fetch` (not full-page
  form navigation) to a form action, e.g. `?/saveAssessment`, with
  `studentId`, `moduleId`, `score` in the body
- Show a small inline saving/saved/error indicator per cell (don't block
  the whole table on one save)
- Respect the existing "only original grader can edit" rule from §2 — if
  the save fails with 403, show the returned message and revert the input
  to its last saved value

**RUBRIK scoring mode** — the cell is not directly editable (multi-criteria
doesn't fit a single input). Show a small button/badge with the current
computed average score (or "Isi" if ungraded). Clicking opens a Dialog:

- Dialog content = the criteria list for that module (`maxScore` per
  criterion), one numeric input per criterion, prefilled from
  `criteriaScores` if present — this is the same field set as
  `mahasiswa/[studentId]/+page.svelte`'s RUBRIK form, just relocated into
  a Dialog instead of a full page section
- Submit via the same shared action (§2) with all `criteriaScore_{id}`
  fields plus `studentId`/`moduleId`
- On success, close the dialog and update that cell's displayed
  average in place (re-fetch just that assessment, or optimistically
  compute the average client-side from the submitted values)

### 4.4 Row-level link to full detail

Keep a small "Detail" link/icon per student row pointing to the existing
`mahasiswa/[studentId]` page, for cases where seeing everything for one
student on its own page/printing is still useful. Don't remove that route
or its UI — just de-emphasize it as the primary flow.

---

## 5. SCHEMA: CSL checklist scoring mode

New requirement (CSL practicum series specifically, confirmed against
`Format_Penilaian_CSL_-_Blok_Bedah_Minor.docx`): a third scoring shape
alongside TOTAL and RUBRIK. The CSL sheet groups items into lettered
sections (A. Persiapan, B. Prosedur Cuci Tangan Bedah (WHO), ...), each
item scored 0/1/2 against a fixed legend ("0: Tidak dilakukan", "1:
Dilakukan tapi belum memuaskan/sempurna", "2: Dilakukan dengan
memuaskan/sempurna"), and a final `Nilai = (Jumlah Skor / Jumlah Skor
Total) × 100%` — the denominator differs per CSL topic (24, 22, 30, 44 in
the sample file) because item counts differ, not because it's a fixed
constant.

Don't hardcode CSL's specific sections/items/legend — the person flagged
that other practicum series may need their own scoring shape later with a
different scale. Model this as data, reusing as much of the existing
RUBRIK plumbing (`practicumModuleCriteria`,
`practicumAssessmentCriteriaScore`) as possible rather than inventing a
parallel table.

### 5.1 New scoring mode + section grouping

```ts
export const practicumModuleScoringModeEnum = mysqlEnum('practicum_module_scoring_mode', [
	'TOTAL',
	'RUBRIK',
	'CHECKLIST' // new
]);
```

Add section grouping to `practicumModuleCriteria` (mirrors the
`groupLabel` pattern from §1 — same idea, one level down):

```ts
sectionLabel: varchar('section_label', { length: 255 }), // "A. Persiapan"
```

Nullable. For `RUBRIK` modules this stays `null` (flat list, unchanged
behavior). For `CHECKLIST` modules, criteria rows sharing the same
`sectionLabel` render grouped under that section header, in `sortOrder`;
this reproduces the sample's A/B/C/D section rows without a separate
sections table. Existing `maxScore` on `practicumModuleCriteria` is
reused as-is for the per-item scale — set it to `2` for CSL items (0/1/2
scale). A future series with a different scale (e.g. 0–3) just sets a
different `maxScore` per item; no schema change needed.

### 5.2 Score legend (display-only, per module)

The "Skor 0 : Tidak dilakukan / Skor 1 : ... / Skor 2 : ..." legend is
static text shown above the table, and the scale differs from series to
series. Add it to `practicumModule` rather than hardcoding it in the
component:

```ts
scoreLegend: json('score_legend').$type<{ value: number; label: string }[] | null>(),
```

Nullable — only populated for `CHECKLIST` modules. Seed the CSL modules
with:

```ts
[
	{ value: 0, label: 'Tidak dilakukan' },
	{ value: 1, label: 'Dilakukan tapi belum memuaskan/sempurna' },
	{ value: 2, label: 'Dilakukan dengan memuaskan/sempurna' }
];
```

Run `bun run db:generate && bun run db:push` after both changes. Seed
CSL's modules (and their `practicumModuleCriteria` rows, grouped by
`sectionLabel`, one row per numbered item from the sample doc, all
`maxScore: 2`) as part of the Module 3 laboratorium seeder's data set —
add them there rather than a separate migration script, so a fresh
database seed produces working CSL modules out of the box.

---

## 6. SHARED SAVE LOGIC: CHECKLIST branch

Extend the `saveAssessment` function from §2 with a third branch,
alongside the existing `RUBRIK`/else split:

```ts
if (moduleObj.scoringMode === 'RUBRIK') {
	// unchanged — existing average-of-raw-scores behavior
} else if (moduleObj.scoringMode === 'CHECKLIST') {
	let totalScore = 0;
	let totalMax = 0;
	for (const crit of moduleObj.criteria) {
		const valRaw = formData.get(`criteriaScore_${crit.id}`);
		if (valRaw === null || valRaw === undefined || valRaw.toString().trim() === '') {
			return fail(400, { message: `Skor untuk "${crit.name}" wajib diisi` });
		}
		const val = parseInt(valRaw as string);
		if (isNaN(val) || val < 0 || val > crit.maxScore) {
			return fail(400, {
				message: `Skor untuk "${crit.name}" harus antara 0 dan ${crit.maxScore}`
			});
		}
		criteriaInputs.push({ criteriaId: crit.id, score: val });
		totalScore += val;
		totalMax += crit.maxScore;
	}
	// Nilai = (Jumlah Skor / Jumlah Skor Total) × 100 — matches the CSL
	// sheet's formula exactly, unlike RUBRIK's plain average. This keeps
	// practicumAssessment.score on the same 0–100 scale used everywhere
	// else in the app (RATA-RATA column in §4.2, rekap export, logbook),
	// regardless of how many items or what per-item maxScore this
	// particular module uses.
	finalScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
} else {
	// unchanged — TOTAL mode
}
```

The criteria-score upsert loop later in the transaction already iterates
`criteriaInputs` generically (§2's existing code) — no change needed
there, `CHECKLIST` reuses the exact same
`practicumAssessmentCriteriaScore` upsert path as `RUBRIK`.

---

## 7. DYNAMIC TABLE: CHECKLIST cell UI

In the cell-rendering logic from §4.3, add `CHECKLIST` as a third case,
visually similar to `RUBRIK` (badge + dialog) but with the dialog content
reshaped to match the CSL sheet:

- Badge on the cell shows the computed percentage score (or "Isi" if
  ungraded) — same as `RUBRIK`'s badge, just semantically a percentage
  here instead of a raw average.
- Dialog groups `module.criteria` by `sectionLabel` (preserving
  `sortOrder` within and across groups) into visually separated
  sub-sections with the label as a small heading, each item rendered as a
  numeric input capped at `crit.maxScore` (or a segmented 0/1/2 control
  when `crit.maxScore === 2`, for faster entry than typing a number).
- Show `module.scoreLegend` (if present) as a small caption at the top of
  the dialog, e.g. "0 = Tidak dilakukan · 1 = Dilakukan tapi belum
  memuaskan/sempurna · 2 = Dilakukan dengan memuaskan/sempurna".
- Show a live-computed "Nilai" readout at the bottom of the dialog as the
  person fills scores in: `(sum entered / sum maxScore) × 100%`, so it
  matches what they'd see on the printed sheet before they submit.
- Submits via the same shared action (§6) — no separate endpoint.

---

## 8. CSL ASSESSMENT DOCX EXPORT

Per-student export of the filled CSL sheet, matching
`Format_Penilaian_CSL_-_Blok_Bedah_Minor.docx`'s layout, for every
`CHECKLIST`-mode module the student has been graded on within a schedule.
Reuses the project's existing `docx-templates` + `pizzip` + raw-OpenXML-
builder pattern from `src/lib/server/logbook/generateLogbook.ts` — same
approach, new template and builder, not a new library.

### 8.1 Template file

Add `static/templates/csl/TEMPLATE_CSL_ASSESSMENT.docx`: a trimmed
version of the uploaded sample with the repeating per-topic block (title,
date, table, Nilai line, Komentar line) reduced to _one_ instance, driven
by placeholders:

- `{studentName}`, `{className}`, `{scheduleDate}` — plain text fields
- `||{tableCsl}||` — literal-XML placeholder (same
  `literalXmlDelimiter: '||'` convention already used in
  `generateLogbook.ts`) where the builder injects one full CSL block
  (title + date + table + Nilai + Komentar) **per graded `CHECKLIST`
  module**, looped, so a student with 3 graded CSL topics in one schedule
  gets 3 stacked blocks in one document — matching how the sample file
  itself concatenates multiple topics back to back.

### 8.2 Builder

New file `src/lib/server/csl/generateCslAssessment.ts`, structured like
`generateLogbook.ts`'s builder section:

```ts
type CslModuleData = {
	moduleName: string;
	scheduleDate: string;
	scoreLegend: { value: number; label: string }[] | null;
	sections: {
		label: string | null; // null = ungrouped items render with no section header
		items: { name: string; maxScore: number; score: number | null }[];
	}[];
	totalScore: number;
	totalMax: number;
	comment: string | null;
};

function buildCslBlockXml(data: CslModuleData): string {
	// Mirrors buildLogbookRowspanTableXml's approach: hand-built <w:tbl>
	// with the sample's column layout (No / Aspek Penilaian / Skor 0 / 1 / 2),
	// a shaded row per section.label (gridSpan across all columns, like
	// the sample's "A  Persiapan" row), one row per item with a checkmark
	// glyph ('✓' or 'X') placed in the <w:tc> matching item.score,
	// a TOTAL row summing totalScore, and a closing paragraph with
	// "Nilai = {totalScore}/{totalMax} × 100% = {computed}%" plus the
	// comment line.
}

export async function generateCslAssessmentForStudent(
	studentId: string,
	scheduleId: string
): Promise<{ fileName: string; buffer: Buffer }> {
	// 1. Load schedule + its CHECKLIST-mode modules (with criteria,
	//    grouped by sectionLabel, ordered by sortOrder)
	// 2. Load this student's practicumAssessment + criteriaScores for
	//    each of those modules
	// 3. Build one CslModuleData per graded module, render each via
	//    buildCslBlockXml, concatenate
	// 4. generateReport() against TEMPLATE_CSL_ASSESSMENT.docx, same
	//    cmdDelimiter/literalXmlDelimiter/fixSmartQuotes/failFast options
	//    as generateLogbookForSeries
	// 5. Save to static/generated/csl/{studentId}/, return buffer —
	//    skip the Gotenberg PDF conversion + generation-record bookkeeping
	//    from generateLogbook.ts (no equivalent "CSL logbook" record
	//    exists yet); revisit only if the person wants a persisted
	//    generation history like the logbook feature has
}
```

If a schedule has zero `CHECKLIST`-mode modules, this export simply isn't
offered — see §8.3.

### 8.3 Route

New `src/routes/admin/penilaian/[id]/mahasiswa/[studentId]/export-csl/+server.ts`:

```ts
export const GET: RequestHandler = async ({ params, locals }) => {
	// Same auth shape as the existing rekap export route: require
	// locals.user, then isInstructor (schedule.instructors) OR
	// role in ['superadmin', 'koordinator'] — reuse, don't duplicate,
	// the schedule-authorization check already written for §2/rekap export
	// 404 if the schedule has no CHECKLIST-mode modules with a graded
	// assessment for this student (nothing to export)
	const { buffer, fileName } = await generateCslAssessmentForStudent(studentId, scheduleId);
	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'Content-Disposition': `attachment; filename="${fileName}"`
		}
	});
};
```

Surface this as a "Export CSL" button/link next to the existing "Detail"
link on rows for students that have at least one graded `CHECKLIST`
module in this schedule (§4.4) — hidden otherwise, since most
schedules won't have any CSL modules.

---

## 9. ACCEPTANCE CHECKLIST

- [ ] `practicumModule.groupLabel` exists and pairs of Preparasi/Restorasi
      modules sharing a label render as one merged header with two
      sub-columns; ungrouped modules still render as a single column
- [ ] A dosen assigned to a specific `groupId` (Module 4) on this schedule
      only sees that kelompok's students in the table; a dosen with no
      `groupId` (or koordinator/superadmin) sees the whole class, with an
      optional kelompok filter for koordinator/superadmin
- [ ] TOTAL-mode module cells: typing a score and blurring saves without a
      full page reload, respecting the "only original grader can edit"
      rule
- [ ] RUBRIK-mode module cells: clicking opens a dialog with all criteria,
      submitting saves and updates the cell's average score in place
- [ ] A RATA-RATA column shows each student's average score across all
      graded modules in this schedule, with a clean placeholder (not
      `#DIV/0!`) when nothing is graded yet
- [ ] `mahasiswa/[studentId]` route still works unmodified in behavior,
      now powered by the shared `saveAssessment` helper instead of its own
      inline copy
- [ ] No duplicated authorization/scoring logic between the two routes —
      both call `src/lib/server/assessment.ts`
- [ ] `practicumModuleScoringModeEnum` includes `CHECKLIST`;
      `practicumModuleCriteria.sectionLabel` groups items into
      lettered sections; `practicumModule.scoreLegend` stores the
      per-scale 0/1/2-style legend text
- [ ] CSL modules + their criteria (grouped by `sectionLabel`, `maxScore:
2`) exist in the Module 3 seeder, not a one-off migration script
- [ ] Saving a `CHECKLIST` module computes
      `finalScore = round((totalScore / totalMax) × 100)` — verified
      against the sample doc's own Nilai formula for at least one CSL
      topic (e.g. 24-point topic, all items scored 2 → Nilai 100%)
- [ ] `CHECKLIST` cells in the table open a dialog grouped by section
      with a live Nilai % readout, reusing the same `saveAssessment`
      action as `RUBRIK`
- [ ] A student with at least one graded `CHECKLIST` module in a schedule
      can download a `.docx` via `export-csl` reproducing the sample
      sheet's layout (sections, checkmarks in the right Skor column,
      TOTAL row, Nilai %, comment) for every graded CSL topic in that
      schedule
- [ ] The export route enforces the same schedule-authorization rule as
      the existing rekap export route, and 404s cleanly when the
      schedule/student has no `CHECKLIST` data to export
