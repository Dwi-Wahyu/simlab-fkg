# MODULE 6 — MAINTENANCE NOTA + APPROVAL

Depends on nothing structurally from Modules 3–5. Can be built independently,
any time after Module 1 (uses the simplified `condition` enum `['BAIK','RUSAK']`
on `equipment`, already in place).

Goal: every non-calibration `maintenance` record (`PREVENTIF` / `KOREKTIF`) can
attach a receipt ("Nota") for the work/parts paid for, and `kepalaLab` can
verify/approve that maintenance before it's considered closed. The generic
`approval` table already has `referenceType: 'MAINTENANCE'` wired into the
`kepalaLab` dashboard count (`pendingMaintenanceApprovals` in
`src/routes/api/admin/dashboard/[role]/+server.ts:162-165,189`) — that number
is currently always 0 because nothing ever inserts an `approval` row with that
`referenceType`. This module is what makes that count real.

---

## 1. SCHEMA CHANGE (`src/lib/server/db/schema.ts`)

### 1.1 Add `notaFileName` to `maintenance`

```ts
export const maintenance = mysqlTable('maintenance', {
	id: varchar('id', { length: 36 }).primaryKey(),
	equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id, {
		onDelete: 'cascade'
	}),

	maintenanceType: mysqlEnum('maintenance_type', ['PREVENTIF', 'KOREKTIF', 'KALIBRASI']).notNull(),
	description: text('description').notNull(),
	scheduledDate: timestamp('scheduled_date').notNull(),
	completionDate: timestamp('completion_date'),

	status: mysqlEnum('status', ['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING').notNull(),
	technicianId: varchar('technician_id', { length: 36 }).references(() => user.id),

	vendor: varchar('vendor', { length: 255 }),
	expiryDate: timestamp('expiry_date'),
	certificatePath: text('certificate_path'),
	certificateName: varchar('certificate_name', { length: 255 }),

	notaFileName: varchar('nota_file_name', { length: 255 }), // NEW

	cost: int('cost').default(0),

	createdAt: timestamp('created_at').defaultNow().notNull()
});
```

**Deliberately only one column, not a path+originalName pair** like
`certificatePath`/`certificateName`. Per the original spec ("only store
filename to column not full path"), `notaFileName` stores just the generated
name (e.g. `3fa1...-b2.pdf`), and the full path is always reconstructed at
render/serve time as `/uploads/receipts/${notaFileName}` — never persisted.
This intentionally diverges from the calibration certificate pattern (§3.2 of
`kalibrasi/baru/+page.server.ts`, which keeps the user's original filename
separately for display); Nota doesn't need to show the original filename back
to the user, so don't add a second column for it unless you decide otherwise.

No new table needed for approval — reuse `approval` (already exists, already
supports `referenceType: 'MAINTENANCE'`, no schema change required there).

Run `bun run db:generate && bun run db:push` after.

---

## 2. SERVER LOGIC — `src/lib/server/maintenance.ts` (new file)

Follow the same shape as `src/lib/server/distribution.ts`'s
`approveDistribution` — that's the only existing example of writing to the
`approval` table, even though it isn't wired to any route yet. Centralize
here instead of duplicating across `create`, `[id]/edit`, and the new
approval action, since `pemeliharaan/create/+page.server.ts` and
`pemeliharaan/[id]/edit/+page.server.ts` currently both hand-roll the same
insert/update logic — don't add a third copy.

### 2.1 `submitMaintenanceForApproval(maintenanceId, userId)`

Called when a `KOREKTIF`/`PREVENTIF` maintenance record's `status` is set to
`COMPLETED` (from `create` or `[id]/edit`) **and** a Nota was attached. Insert:

```ts
await db.insert(approval).values({
	id: uuidv4(),
	referenceType: 'MAINTENANCE',
	referenceId: maintenanceId,
	status: 'PENDING',
	createdAt: new Date()
});
```

Leave `approvedBy` null until acted on. If `status` becomes `COMPLETED`
without a Nota, still create the `PENDING` approval row (approval covers the
completed work, Nota is supporting evidence, not a hard requirement) — but
surface a warning in the UI (§4) that no receipt was attached, so `kepalaLab`
sees that at review time rather than the record silently having no proof.

Do **not** auto-create an approval row for `KALIBRASI` type or while
`status` is still `PENDING`/`IN_PROGRESS` — only on transition to `COMPLETED`.
Guard against duplicate rows: if a `PENDING` approval already exists for this
`maintenanceId`, don't insert another (e.g. editing a `COMPLETED` record again
before it's been reviewed shouldn't spawn a second pending approval).

### 2.2 `reviewMaintenanceApproval(approvalId, userId, isApproved, note?)`

```ts
export async function reviewMaintenanceApproval(
	approvalId: string,
	userId: string,
	isApproved: boolean,
	note?: string
) {
	return await db.transaction(async (tx) => {
		const approvalRow = await tx.query.approval.findFirst({
			where: eq(approval.id, approvalId)
		});
		if (!approvalRow) throw new Error('Approval record not found');
		if (approvalRow.referenceType !== 'MAINTENANCE') {
			throw new Error('Approval record is not a maintenance approval');
		}
		if (approvalRow.status !== 'PENDING') {
			throw new Error('Approval already reviewed');
		}

		await tx
			.update(approval)
			.set({
				status: isApproved ? 'APPROVED' : 'REJECTED',
				approvedBy: userId,
				note
			})
			.where(eq(approval.id, approvalId));

		await createAuditLog({
			userId,
			action: isApproved ? 'APPROVE' : 'REJECT',
			tableName: 'maintenance',
			recordId: approvalRow.referenceId,
			newValue: { approvalStatus: isApproved ? 'APPROVED' : 'REJECTED', note }
		});

		// Notify the technician/creator, mirroring distribution.ts's
		// createNotification call after approveDistribution — resolve the
		// right recipient (technicianId on the maintenance row) here.
		const maintenanceRow = await tx.query.maintenance.findFirst({
			where: eq(maintenance.id, approvalRow.referenceId!)
		});
		if (maintenanceRow?.technicianId) {
			await createNotification({
				userId: maintenanceRow.technicianId,
				title: isApproved ? 'Pemeliharaan Disetujui' : 'Pemeliharaan Ditolak',
				body: note || (isApproved ? 'Nota telah diverifikasi.' : 'Perlu tindak lanjut.'),
				priority: 'MEDIUM'
			});
		}

		return { success: true };
	});
}
```

Rejection does **not** revert `maintenance.status` back to `IN_PROGRESS`
automatically — the work itself is still done, only the paperwork was
rejected. Leave `maintenance.status` as `COMPLETED`; the rejection just means
`kepalaLab` wants a corrected Nota or clarification, tracked via the `note`
field and a fresh `PENDING` approval once resubmitted (§2.1's duplicate-guard
naturally allows a new row once the rejected one is no longer `PENDING`).

---

## 3. NOTA FILE UPLOAD

### 3.1 Where it's captured

Add the Nota file input to both:

- `src/routes/admin/pemeliharaan/create/+page.svelte` /
  `+page.server.ts`
- `src/routes/admin/pemeliharaan/[id]/edit/+page.svelte` /
  `+page.server.ts`

Only show/require it when `maintenanceType !== 'KALIBRASI'` (calibration
already has its own `certificatePath`/`certificateName` upload in
`kalibrasi/baru` and `kalibrasi/[id]/edit` — don't touch those, Nota is
separate and additive).

Reuse the same dashed-border upload box markup from
`kalibrasi/baru/+page.svelte` (lines ~180-240: preview thumbnail, filename +
size, "Hapus & Ganti File" reset), just renamed to `nota` for the field/id, and
`accept=".pdf,.png,.jpg,.jpeg"` kept the same. Remember to add
`enctype="multipart/form-data"` to the `<form>` in `create/+page.svelte` if
it isn't already there (it currently has no file input, unlike
`kalibrasi/baru`).

### 3.2 Server-side handling (both `create` and `[id]/edit` actions)

```ts
const notaFile = formData.get('nota') as File;
let notaFileName: string | null = null;

if (notaFile && notaFile.size > 0) {
	const ext = notaFile.name.split('.').pop();
	const generatedName = `${uuidv4()}.${ext}`;
	const uploadDir = join(process.cwd(), 'static', 'uploads', 'receipts');

	await mkdir(uploadDir, { recursive: true });

	const arrayBuffer = await notaFile.arrayBuffer();
	await writeFile(join(uploadDir, generatedName), Buffer.from(arrayBuffer));

	notaFileName = generatedName; // filename only — no '/uploads/receipts/' prefix stored
}
```

On edit, if a new Nota is uploaded and an old `notaFileName` already exists,
overwrite the DB column with the new filename; deleting the old physical file
is a nice-to-have (not required — orphaned files under `static/uploads/receipts`
are an acceptable tradeoff here, consistent with how `certificatePath` is
handled on calibration edit today, which also doesn't clean up old files).

When rendering, build the download/preview URL as
`` `/uploads/receipts/${maintenance.notaFileName}` `` — never store that
prefix in the DB column itself (this is the one deliberate deviation from
the `certificatePath` convention; don't copy that column's "store the full
`/uploads/...` path" approach here).

---

## 4. APPROVAL UI

### 4.1 New page — `src/routes/admin/pemeliharaan/approval/+page.svelte` (+ `.server.ts`)

Access: `kepalaLab` and `superadmin` only, following the guard pattern in
`admin/pengaturan/pengguna/+page.server.ts` (`throw error(403, ...)` for
anyone else). `kepalaLab` sees only approvals for maintenance whose
`equipment.laboratoriumId` matches `currentUser.laboratorium.id`; `superadmin`
sees all.

Load: join `approval` (`referenceType = 'MAINTENANCE'`, `status = 'PENDING'`)
→ `maintenance` (via `referenceId`) → `equipment` → `item`, same join shape
already used in `pemeliharaan/+page.server.ts`'s `labFilter` helper — reuse
that filtering approach rather than re-deriving it.

Table columns: Alat (item name + serial number), Jenis (maintenance type
badge), Tanggal Selesai (`completionDate`), Biaya, Nota (link/thumbnail if
`notaFileName` present, else a muted "Tidak ada nota" badge), Aksi (Setujui /
Tolak buttons).

Each row's Setujui/Tolak opens a small confirm dialog (Tolak requires a
`note` textarea — reason for rejection; Setujui's note is optional) and posts
to a form action that calls `reviewMaintenanceApproval` (§2.2). Use
`use:enhance` + `invalidate` so the row disappears from the pending list
immediately on success, consistent with how other list pages in this codebase
refresh post-action.

### 4.2 Link into the existing maintenance list

On `src/routes/admin/pemeliharaan/+page.svelte`, add a small "Menunggu
Persetujuan (`n`)" badge/tab visible to `kepalaLab`/`superadmin` linking to
`/admin/pemeliharaan/approval`, and show an "Approval" status pill next to
`COMPLETED` records so it's visible from the main list whether a completed
maintenance is still `PENDING` review, `APPROVED`, or `REJECTED` (small
additional query per row or a batched lookup — don't N+1 query per row,
fetch all relevant `approval` rows for the loaded `maintenance.id`s in one
query and map client-side).

### 4.3 Wire the dashboard count that already exists

`src/lib/components/dashboard/KepalaLabDashboard.svelte` currently ignores
`data.pendingMaintenanceApprovals` even though the API already returns it
(`+server.ts:189`). Add a stat/badge for it (mirroring how
`data.pendingLendingApprovals` is presumably rendered nearby — match that
existing pattern) linking to `/admin/pemeliharaan/approval`.

---

## 5. NAVIGATION

No new sidebar entry needed — `/admin/pemeliharaan/approval` hangs off the
existing "Pemeliharaan & Kalibrasi" section (`Sidebar.svelte:175-182`); reach
it via the badge/tab in §4.1-4.2 rather than a separate top-level nav item.
Role list on that sidebar entry (`['superadmin','koordinator','kepalaLab','teknisi']`)
already includes `kepalaLab`, so no change required there either.

---

## 6. SEED DATA

Seed at least:

- One `maintenance` row with `maintenanceType: 'KOREKTIF'`,
  `status: 'COMPLETED'`, a `notaFileName` pointing at a placeholder file you
  drop into `static/uploads/receipts/`, and a matching `approval` row with
  `status: 'PENDING'` — so the approval page has something to review out of
  the box.
- One `maintenance` row already `APPROVED` and one already `REJECTED` (with
  a `note`), so the status pill (§4.2) has all three states to render during
  review.

---

## 7. ACCEPTANCE CHECKLIST

- [ ] `bun run db:push` succeeds; `maintenance.notaFileName` column exists,
      nullable, existing rows unaffected
- [ ] Uploading a Nota on create/edit saves only the generated filename to
      `notaFileName` (verify in DB — no `/uploads/...` prefix stored) and the
      file lands in `static/uploads/receipts/`
- [ ] Setting a `KOREKTIF`/`PREVENTIF` maintenance to `COMPLETED` creates
      exactly one `PENDING` `approval` row (`referenceType: 'MAINTENANCE'`);
      re-saving while still pending does not create a second one
      `KALIBRASI` records never get an approval row
- [ ] `kepalaLab` sees only their own lab's pending maintenance approvals;
      `superadmin` sees all
- [ ] Approve/Reject updates `approval.status` + `approvedBy`, writes an
      audit log entry, and notifies the assigned `technicianId`
- [ ] Rejecting does not revert `maintenance.status` from `COMPLETED`
- [ ] KepalaLab dashboard's pending-maintenance count (already computed
      server-side) is now visible and links to the approval page
