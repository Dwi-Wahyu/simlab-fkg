# MODULE 4 — MAHASISWA KELOMPOK (GROUP)

Depends on nothing structurally, but do this before Module 5 (Assessment
Table Redesign) — Module 5 will scope each dosen's view to a `groupId`
added here.

Goal: `koordinator` (displayed as "PJ Mata Kuliah", per Module 1 §2.4) can
organize students within a `practicumClass` (e.g. "REGULER A") into small
groups ("Kelompok 1", "Kelompok 2", ...), matching the real CSL assessment
forms where a group of ~13 students shares one assessment sheet and one
assigned dosen.

---

## 1. SCHEMA CHANGES (`src/lib/server/db/schema.ts`)

### 1.1 New table: `kelompokMahasiswa`

```ts
export const kelompokMahasiswa = mysqlTable(
	'kelompok_mahasiswa',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: varchar('name', { length: 255 }).notNull(), // "Kelompok 1"
		classId: varchar('class_id', { length: 36 })
			.notNull()
			.references(() => practicumClass.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('kelompok_mahasiswa_class_idx').on(table.classId),
		uniqueIndex('kelompok_mahasiswa_unique_idx').on(table.classId, table.name)
	]
);
```

`classId` is required — a kelompok only makes sense within a
`practicumClass` (matches the sample: "Kelompok 1 REG A" is scoped to
"REG A"). Name uniqueness is per-class, so "Kelompok 1" can exist in both
REG A and REG B without conflict.

### 1.2 New table: `kelompokMahasiswaMember`

```ts
export const kelompokMahasiswaMember = mysqlTable(
	'kelompok_mahasiswa_member',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		kelompokId: varchar('kelompok_id', { length: 36 })
			.notNull()
			.references(() => kelompokMahasiswa.id, { onDelete: 'cascade' }),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('kelompok_member_kelompok_idx').on(table.kelompokId),
		index('kelompok_member_user_idx').on(table.userId),
		uniqueIndex('kelompok_member_unique_idx').on(table.kelompokId, table.userId)
	]
);
```

A student can theoretically belong to more than one kelompok across
different classes/semesters, but should not be duplicated within the same
kelompok (hence the unique index). Do **not** add a uniqueness constraint
across "one kelompok per class" for a student here — that's a UX-level
concern for the detail page (§3), not a hard DB constraint, since a
student mistakenly in two kelompoks within the same class shouldn't be a
crash, just something the UI should warn about or prevent when assigning.

### 1.3 Add nullable `groupId` to `practicumScheduleInstructor`

```ts
groupId: varchar('group_id', { length: 36 }).references(() => kelompokMahasiswa.id, {
	onDelete: 'set null'
}),
```

Nullable, `onDelete: 'set null'` (don't cascade-delete an instructor
assignment just because a kelompok was later removed). Existing rows will
have `groupId = null`, meaning "this instructor covers the whole
schedule/class" (today's behavior, preserved). A non-null `groupId` means
"this instructor is only assigned to this specific kelompok within the
schedule" — this is what Module 5 will read to scope the assessment table
per dosen.

### 1.4 Relations

```ts
export const kelompokMahasiswaRelations = relations(kelompokMahasiswa, ({ one, many }) => ({
	class: one(practicumClass, {
		fields: [kelompokMahasiswa.classId],
		references: [practicumClass.id]
	}),
	members: many(kelompokMahasiswaMember),
	scheduleInstructors: many(practicumScheduleInstructor)
}));

export const kelompokMahasiswaMemberRelations = relations(kelompokMahasiswaMember, ({ one }) => ({
	kelompok: one(kelompokMahasiswa, {
		fields: [kelompokMahasiswaMember.kelompokId],
		references: [kelompokMahasiswa.id]
	}),
	user: one(user, {
		fields: [kelompokMahasiswaMember.userId],
		references: [user.id]
	})
}));
```

Update `practicumScheduleInstructorRelations` to add:

```ts
group: one(kelompokMahasiswa, {
	fields: [practicumScheduleInstructor.groupId],
	references: [kelompokMahasiswa.id]
}),
```

Also add the foreign key constraint for `groupId` in the same `(table) => [...]`
array as the existing `ps_instr_schedule_fk`/`ps_instr_user_fk`
`foreignKey()` definitions, following that file's existing convention
rather than relying only on the inline `.references()` call.

Run `bun run db:generate && bun run db:push` after.

---

## 2. LIST OF KELOMPOK MAHASISWA PAGE

`src/routes/admin/kelompok-mahasiswa/+page.svelte` (+ `.server.ts`)

- Table columns: Nama Kelompok, Kelas (practicumClass.name + batch),
  Jumlah Anggota (count of `kelompokMahasiswaMember`), Aksi (Detail / Edit
  / Delete)
- Filter by `practicumClass` (Select, options loaded from
  `db.query.practicumClass.findMany()`)
- "Tambah Kelompok" button opens the input dialog (§2.1)
- Access: `koordinator` (PJ Mata Kuliah) and `superadmin` only — follow
  whatever route-guard pattern is used elsewhere under `admin/` for
  role-restricted pages (check how `admin/laboratorium` or
  `admin/rekapitulasi` gate access, and mirror it)

### 2.1 Input & Edit Dialog

Reuse a single Dialog component for both create and edit (same pattern as
the notification/asset-search dialogs already in the codebase):

- Fields: Nama Kelompok (text), Kelas (Select, required)
- On submit: insert/update `kelompokMahasiswa`; enforce the
  `(classId, name)` uniqueness at the app level too (friendly error
  message, not just a raw DB constraint error) — e.g. "Kelompok dengan
  nama ini sudah ada di kelas tersebut."
- Delete (from the list table's Aksi column): confirm dialog, make sure before deleting there is no mahasiswa tied to that group
  `kelompokMahasiswaMember` (FK `onDelete: 'restrict'`)
  — warn the user to move every mahasiswa to another group

---

## 3. KELOMPOK MAHASISWA DETAIL PAGE

`src/routes/admin/kelompok-mahasiswa/[id]/+page.svelte` (+ `.server.ts`)

Two-panel layout:

**Left panel — Available mahasiswa (not yet in this kelompok):**

- List of students NOT currently a member of this specific kelompok
  (query: all `user` with `role = 'peneliti'` — confirm the actual
  student role slug used in this codebase, likely `peneliti` per
  `PROJECT_CONTEXT.md` — minus those already in `kelompokMahasiswaMember`
  for this `kelompokId`)
- **Angkatan filter**: Select sourced from distinct `practicumClass.batch`
  values, or simpler — since a kelompok belongs to one `classId`, and a
  class has one `batch`, default this filter to the kelompok's own batch
  but still allow browsing other batches (some programs mix cohorts).
  Confirm with existing `practicumClassMember` data if angkatan filtering
  should actually restrict to only students in the _same_ `practicumClass`
  as this kelompok, or any student system-wide — recommend defaulting to
  "students in the same practicumClass first" via a toggle/default filter,
  since that matches the real workflow (you assign kelompok from within an
  existing class roster), while still allowing search across all students
  if needed.
- Basic name search (text Input, client-side filter on the loaded list is
  fine given class sizes are ~50-100 students)
- Each row has an "Add →" button that inserts a `kelompokMahasiswaMember`
  row (use a form action or a small fetch to an API route — either is
  fine, follow whatever pattern `admin/kelompok-mahasiswa` itself already
  leans toward for consistency)

**Right panel — Members of this kelompok:**

- List of students currently in `kelompokMahasiswaMember` for this
  `kelompokId`
- Each row has a "Remove" button (with confirm) that deletes the
  membership row
- Show a running count (e.g. "13 mahasiswa")

Both panels should update reactively after add/remove without a full page
reload (SvelteKit's `invalidate`/`use:enhance` pattern, consistent with
how other admin pages in this codebase already handle post-action
refreshes).

---

## 4. NAVIGATION

Add a "Kelompok Mahasiswa" entry to `Sidebar.svelte` under whatever
academic/practicum section already contains links like "Penilaian" or
"Kelas Praktikum" — visible to `koordinator`/ PJ Mata Kuliah and
`superadmin`.

---

## 5. SEED DATA

Update seeders to create a few `kelompokMahasiswa` rows per existing
`practicumClass` (e.g. "Kelompok 1".."Kelompok 4" under "REGULER A"), and
distribute the class's existing `practicumClassMember` students across
them via `kelompokMahasiswaMember`, roughly matching the ~13-students-per-
group size seen in the reference sheet. Leave `practicumScheduleInstructor.groupId`
null in seed data for existing schedules unless you're also seeding a
schedule specifically meant to exercise Module 5's per-group instructor
scoping — in that case, seed at least one schedule with 2+ instructors
each pointing at a different `groupId` within the same class, so Module 5
has something real to test against.

---

## 6. ACCEPTANCE CHECKLIST

- [ ] `bun run db:push` succeeds; `kelompokMahasiswa`,
      `kelompokMahasiswaMember` tables exist; `practicumScheduleInstructor.groupId`
      is nullable and existing rows are unaffected
- [ ] PJ Mata Kuliah can list, create, and edit kelompok, scoped per class
- [ ] Detail page: adding a student on the left removes them from the left
      list and adds them to the right list (and vice versa for remove)
- [ ] Angkatan filter and name search both work on the left panel
- [ ] Deleting a kelompok warns about member count and cascades cleanly
- [ ] A student can't be added twice to the same kelompok (unique
      constraint + friendly UI handling, not a raw 500 error)
