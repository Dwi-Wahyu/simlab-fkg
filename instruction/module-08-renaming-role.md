# Instruction: Rename display labels "Instruktur" → "DPJP" and "Peneliti" → "Mahasiswa"

## Context

This is a SvelteKit + better-auth + Drizzle project (Simlab). "Instruktur" and "Peneliti" are
**both** used in this codebase as:

1. A **role slug / identifier** — stored in the database (`user.role` column), registered in
   `better-auth` (access-control roles), used in route params, and compared in `if`/`case`
   statements throughout the server code.
2. A **display label** — plain text shown to the user in the UI (page titles, table headers,
   dropdown labels, notifications, generated documents).

**Goal: change ONLY (2), the human-facing text. Do NOT touch (1).**
Renaming the role slug would require a database migration (existing rows have
`role = 'instruktur'` / `role = 'peneliti'`), would break `better-auth` role registration, route
guards, and every `role === 'instruktur'` / `role === 'peneliti'` comparison. That is explicitly
out of scope — **any change to a role slug, enum value, variable/function/interface name, file
name, or URL path segment is a breaking change and must NOT be made.**

## Ground rules for the agent

1. Do **not** use a blind project-wide find-and-replace. Several files mix code identifiers and
   display text on different lines of the _same_ string set (e.g. `role: ['instruktur']` vs.
   `name: 'Instruktur'` in the same file). Edit only the specific lines listed below.
2. Never touch:
   - `src/lib/server/auth.roles.ts` (role definitions `instruktur`, `peneliti`)
   - `src/lib/server/auth.ts` (role registration)
   - Any `role.eq(...)`, `user.role ===`, `case 'instruktur'`, `case 'peneliti'`,
     `inArray(user.role, [...])`, `slugToRole` map values, URL paths like
     `/admin/users/instruktur`, seed data `role: 'instruktur'` / `role: 'peneliti'`, or login
     `username` values.
   - Component/file names (`InstrukturDashboard.svelte`, `PenelitiDashboard.svelte`,
     `InstrukturSkeleton.svelte`, `PenelitiSkeleton.svelte`) and their imports.
   - TypeScript identifiers: `InstrukturDashboardData`, `PenelitiDashboardData`, the role union
     type values `'instruktur' | 'peneliti'` in `src/lib/types/dashboard.ts`.
   - `PENELITIAN_DOSEN` in `src/lib/server/db/schema.ts` — this is an unrelated lending-purpose
     enum ("Penelitian" = "research [activity]"), not the `peneliti` role. Do not confuse the two.
   - `src/routes/admin/users/mahasiswa/` and `src/routes/api/admin/users/mahasiswa/+server.ts` —
     these already exist as the student-listing route; leave as-is.
3. After editing, run `grep -rn "Instruktur\|Peneliti" src/` (case-sensitive, capitalized form) to
   confirm no remaining literal display-label occurrences were missed, and separately confirm the
   lowercase role-slug occurrences (`instruktur`, `peneliti`) are unchanged and identical in count
4. Run `bun run check` / `bun run lint` (or the project's equivalent) and `bun run build` to
   confirm nothing broke.
5. Where a literal replace would create an awkward duplicate (e.g. label already contains the
   target word, like `"Peneliti (Mahasiswa)"` → naive replace gives `"Mahasiswa (Mahasiswa)"`),
   use judgement to produce a clean label instead of a mechanical substitution. These cases are
   flagged explicitly below.

---

## File-by-file changes

### `src/lib/components/Sidebar.svelte`

- Line ~75: `name: 'Rekapitulasi per Instruktur'` → `name: 'Rekapitulasi per DPJP'`
- Line ~228: `name: 'Instruktur',` (sidebar menu item title) → `name: 'DPJP',`
- Leave unchanged: `path: `/admin/users/instruktur``(line ~229), and all`role: ['instruktur']`,
`role: ['peneliti']`, `role: [..., 'peneliti', 'instruktur']` guard arrays (lines ~107, 115,
  123, 132, 140, 172).

### `src/lib/server/assessment.ts`

- Line ~179: in the error message string, change the word `instruktur` → `DPJP`:
  `'Anda tidak memiliki akses untuk mengubah nilai ini. Hanya instruktur yang memberikan nilai...'`
  → `'... Hanya DPJP yang memberikan nilai pertama kali yang dapat mengubahnya.'`

### `src/lib/server/csl/generateCslAssessment.ts`

- Line ~201: in the generated Word document text: `Catatan / Feedback Instruktur:` →
  `Catatan / Feedback DPJP:`

### `src/routes/+page.svelte` (login / quick-access demo page)

- Line ~37: `{ name: 'Instruktur', username: 'instruktur', role: 'instruktur' }` → change only the
  `name` field: `{ name: 'DPJP', username: 'instruktur', role: 'instruktur' }`
- Line ~38: `{ name: 'Peneliti (Mhs)', username: 'peneliti', role: 'peneliti' }` → change only the
  `name` field: `{ name: 'Mahasiswa', username: 'peneliti', role: 'peneliti' }`
- Leave unchanged: the `{#if user.role === 'instruktur'}` / `{:else if user.role === 'peneliti'}`
  icon-selection blocks (~lines 265–267).

### `src/routes/admin/audit-log/+page.svelte`

- Line ~72: `instruktur: 'Instruktur',` → `instruktur: 'DPJP',` (map key stays `instruktur`, only
  the label value changes)
- Line ~73: `peneliti: 'Peneliti',` → `peneliti: 'Mahasiswa',`

### `src/routes/admin/dashboard/+page.svelte`

- Line ~27: `instruktur: 'Instruktur / Dosen',` → `instruktur: 'DPJP / Dosen',`
- Line ~28: `peneliti: 'Peneliti / Mahasiswa',` → **special case**: naive replace produces
  `'Mahasiswa / Mahasiswa'`. Instead simplify to `peneliti: 'Mahasiswa',`
- Leave unchanged: all component imports/usages (`InstrukturDashboard`, `InstrukturSkeleton`,
  `PenelitiDashboard`, `PenelitiSkeleton`) and the `role === 'instruktur'` / `role === 'peneliti'`
  conditionals.

### `src/routes/admin/jadwal-praktikum/+page.svelte`

- Line ~140: `<span ...>Instruktur</span>` → `DPJP`
- Line ~208: `<Table.Head>Instruktur</Table.Head>` → `<Table.Head>DPJP</Table.Head>`
- Line ~271: comment `<!-- Column 3: Instruktur -->` → `<!-- Column 3: DPJP -->`
- Line ~277: `<span ...>Instruktur</span>` → `DPJP`

### `src/routes/admin/jadwal-praktikum/[id]/edit/+page.svelte` and

### `src/routes/admin/jadwal-praktikum/tambah/+page.svelte` (same pattern in both files)

- Comments: `// Union semua kelompok yang sudah dipakai instruktur MANAPUN` → `... DPJP MANAPUN`
- Comments: `// Kelompok kelas yang belum dipilih instruktur manapun` → `... DPJP manapun`
- `notificationDescription = 'Pilih minimal satu instruktur.';` → `'Pilih minimal satu DPJP.';`
- `notificationDescription = 'Semua kelompok harus ditugaskan ke instruktur.';` →
  `'... ditugaskan ke DPJP.';`
- `<Card.Title>Instruktur</Card.Title>` → `<Card.Title>DPJP</Card.Title>`
- `<Card.Description>Pilih satu atau lebih instruktur untuk jadwal ini.</Card.Description>` →
  `Pilih satu atau lebih DPJP untuk jadwal ini.`
- `placeholder="Cari nama instruktur..."` → `placeholder="Cari nama DPJP..."`
- `Instruktur tidak ditemukan.` → `DPJP tidak ditemukan.`
- `{selectedInstructorIds.length} Instruktur dipilih` → `{selectedInstructorIds.length} DPJP
dipilih` (do **not** rename the `selectedInstructorIds` variable itself)
- `<span>{unassignedGroups.length} kelompok belum ditugaskan ke instruktur manapun.</span>` →
  `... ke DPJP manapun.</span>`
- Leave unchanged in the corresponding `+page.server.ts` files: `where: eq(user.role,
'instruktur')`.

### `src/routes/admin/kalender-jadwal/+page.svelte`

- Comment `// Filter state (non-instruktur only)` → `// Filter state (non-DPJP only)`
- Comment `<!-- Sidebar Filter (non-instruktur) -->` → `<!-- Sidebar Filter (non-DPJP) -->`
- `<h3 ...>Instruktur</h3>` → `DPJP`
- `<div class="mb-0.5 font-medium">Instruktur</div>` → `DPJP`
- Leave unchanged: `data.role !== 'instruktur'` / `data.role === 'instruktur'` conditionals.
- In `+page.server.ts` for this route: leave `role !== 'instruktur'`, `eq(user.role,
'instruktur')`, `role === 'instruktur'` unchanged (logic only).

### `src/routes/admin/logbook-saya/[seriesId]/+page.svelte`

- `<Table.Head>Instruktur</Table.Head>` → `<Table.Head>DPJP</Table.Head>`
- Comment `<!-- Instruktur -->` → `<!-- DPJP -->`
- `<span class="text-xs font-semibold text-slate-400">Instruktur</span>` → `DPJP`
- In `+page.server.ts`, comment `// Ambil semua penilaian mahasiswa di seri ini, sekaligus modul &
instruktur` → `... & DPJP` (comment only, safe).

### `src/routes/admin/master/modul/[id]/edit/+page.svelte` and

### `src/routes/admin/master/modul/tambah/+page.svelte`

- `<i>Total: instruktur mengisi satu nilai akhir langsung. Rubrik: ...</i>` → `Total: DPJP mengisi
satu nilai akhir langsung. Rubrik: ...`

### `src/routes/admin/peminjaman/+page.svelte`

- Comment `// --- MAHASISWA (PENELITI) LAZY LOAD STATE & LOGIC ---` → **special case**: simplify
  to `// --- MAHASISWA LAZY LOAD STATE & LOGIC ---` (avoid "MAHASISWA (MAHASISWA)")
- Leave unchanged: `if (data.user.role === 'peneliti')` and
  `{#if data.user.role === 'peneliti' || data.user.role === 'instruktur'}`.

### `src/routes/admin/peminjaman/+page.server.ts`

- Comment `// If student (peneliti), do not load all lendings on server side ...` → `// If student
(mahasiswa), do not load all lendings on server side ...` (comment only)
- Leave unchanged: `locals.user?.role === 'peneliti'`.

### `src/routes/admin/peminjaman/baru/+page.server.ts`

- Comment `// 1. Fetch potential requesters (Peneliti & Instruktur)` → `// 1. Fetch potential
requesters (Mahasiswa & DPJP)`
- Leave unchanged: `inArray(user.role, ['peneliti', 'instruktur'])`.

### `src/routes/admin/rekapitulasi/+page.svelte`

- `?? 'Pilih Instruktur'` → `?? 'Pilih DPJP'`
- `<label for="instructor-select" ...>Instruktur</label>` → `DPJP` (leave the `for="instructor-
select"` id attribute unchanged)
- `searchPlaceholder="Cari instruktur..."` → `searchPlaceholder="Cari DPJP..."`

### `src/routes/admin/rekapitulasi/export/+server.ts`

- `throw error(404, 'Tidak ada jadwal mengajar ditemukan untuk instruktur ini');` → `'... untuk
DPJP ini');`

### `src/routes/admin/riwayat-praktikum/+page.svelte`

- Two occurrences of `<Table.Head>Instruktur</Table.Head>` → `<Table.Head>DPJP</Table.Head>`
- Comment `<!-- Instruktur -->` → `<!-- DPJP -->`
- `<span ...>Instruktur</span>` (md:hidden label) → `DPJP`

### `src/routes/admin/users/+page.svelte`

- `{ value: 'instruktur', label: 'Instruktur' },` → `{ value: 'instruktur', label: 'DPJP' },`
  (only the `label`, not the `value`)
- `{ value: 'peneliti', label: 'Peneliti (Mahasiswa)' },` → **special case**: simplify to
  `{ value: 'peneliti', label: 'Mahasiswa' },`

### `src/routes/admin/users/mahasiswa/+page.svelte`

- `<p class="text-slate-500">Manajemen data mahasiswa peneliti dan penempatan kelas.</p>` →
  **special case**: simplify to `Manajemen data mahasiswa dan penempatan kelas.` (dropping the
  redundant "peneliti" rather than producing "mahasiswa mahasiswa")

### `src/routes/api/admin/dashboard/[role]/+server.ts`

- Comment `// Jadwal yang diampu instruktur ini` → `// Jadwal yang diampu DPJP ini`
- Comment `// Logbook terbaru instruktur ini` → `// Logbook terbaru DPJP ini`
- Leave unchanged: `case 'instruktur':`, `case 'peneliti':`, `role: 'instruktur'`,
  `role: 'peneliti'` (these are the API's returned role identifiers, not labels).

### Not touched (flagged for your awareness only, not part of this task)

- `src/routes/admin/users/[role_slug]/+page.server.ts`,
  `src/routes/admin/users/[role_slug]/edit/[id]/+page.server.ts`,
  `src/routes/admin/users/[role_slug]/tambah/+page.server.ts`: these already map
  `'instruktur': 'Dosen'` in `roleToLabel` — the literal word there is "Dosen", not "Instruktur",
  so it doesn't match this rename task and is left as-is. This does mean the app will show
  "DPJP" in some places and "Dosen" in this one, which is a pre-existing inconsistency unrelated
  to this change — worth a separate follow-up ticket if you want full consistency, but out of
  scope here since it's not a literal "Instruktur"/"Peneliti" string.
- Historical docs (`instruction/*.md`, `contexts/PROJECT_CONTEXT.md`) mention Instruktur/Peneliti
  as records of past development work. Not updated by this task; update only if you also want the
  documentation trail relabeled (optional, no code impact either way).

---

## Verification checklist

1. `git diff --stat` — confirm only the files above are touched.
2. `grep -rn "'instruktur'\|'peneliti'" src/` before/after diff — the **count and locations**
   of these lowercase quoted role-slug occurrences must be identical before and after (proves no
   logic/identifier was renamed).
3. `grep -rn "Instruktur\|Peneliti" src/` after the change — should return zero results except
   inside the intentionally-untouched `roleToLabel` "Dosen" files (which won't match anyway) and
   any files explicitly listed as "not touched" above.
4. Verify by `bun run check` and manually check:
   - Sidebar menu item and jadwal-praktikum pages show "DPJP" instead of "Instruktur"
   - `/admin/users` role dropdown shows "DPJP" and "Mahasiswa"
   - Generated CSL assessment Word doc shows "Feedback DPJP"
   - Existing login credentials (`instruktur` / `peneliti` usernames) still work — role-based
     access control is unaffected.
