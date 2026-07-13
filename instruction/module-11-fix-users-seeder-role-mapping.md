# Instruction: Fix `users.ts` seeder — map display name for koordinator & peneliti too

## Context

`src/lib/server/db/seeds/users.ts` seeds demo/testing accounts for staff roles. Today it only
special-cases **one** role (`instruktur`) when deciding the seeded account's `prefix`
(username/email local-part) and `name`:

```ts
const rolesToSeed = ['koordinator', 'instruktur', 'teknisi', 'spmi', 'laboran'];

for (const roleName of rolesToSeed) {
	const isInstruktur = roleName === 'instruktur';
	const prefix = isInstruktur ? 'dpjp' : roleName.toLowerCase();
	const email = `${prefix}@unhas.ac.id`;
	// ...
	name: isInstruktur ? 'DPJP' : faker.person.fullName();
	// ...
}
```

So the seeded `instruktur` demo account is named literally `"DPJP"` (matches the display-label
rename already applied elsewhere — see `instruction/module-08-renaming-role.md` and
`instruction/module-10-rename-role-label-topright-profile.md`), but `koordinator` still gets a
random `faker.person.fullName()` and isn't recognizable as the "PJ Mata Kuliah" demo account, and
`peneliti` isn't in `rolesToSeed` at all here (it's currently seeded separately, in
`seedTestingPeneliti()` inside `mahasiswa.ts`, already named `"Mahasiswa Testing"` — that one is
already fine and does **not** need to change, see "Out of scope" below).

**Goal:** generalize the single `isInstruktur` special case into a small config map covering
`instruktur`, `koordinator`, and `peneliti`, so all three demo accounts get a recognizable
`name` consistent with the app's current role-label mapping — without touching the underlying
role slugs, which must stay exactly as they are (`'instruktur'`, `'koordinator'`, `'peneliti'`).

## File to change

`src/lib/server/db/seeds/users.ts`

### Change 1 — replace the single boolean with a config map

Replace:

```ts
const rolesToSeed = ['koordinator', 'instruktur', 'teknisi', 'spmi', 'laboran'];

for (const roleName of rolesToSeed) {
	const isInstruktur = roleName === 'instruktur';
	const prefix = isInstruktur ? 'dpjp' : roleName.toLowerCase();
	const email = `${prefix}@unhas.ac.id`;
```

with:

```ts
const rolesToSeed = ['koordinator', 'instruktur', 'peneliti', 'teknisi', 'spmi', 'laboran'];

// Demo-account overrides: username/email prefix + display name, mirroring the label rename
// already applied across the app (module-08 / module-10). Roles not listed here fall back to
// their raw role slug as prefix, and a random Indonesian name via faker.
const roleSeedConfig: Record<string, { prefix: string; displayName: string }> = {
	instruktur: { prefix: 'dpjp', displayName: 'DPJP' },
	koordinator: { prefix: 'koordinator', displayName: 'PJ Mata Kuliah' },
	peneliti: { prefix: 'peneliti', displayName: 'Mahasiswa' }
};

for (const roleName of rolesToSeed) {
	const seedConfig = roleSeedConfig[roleName];
	const prefix = seedConfig?.prefix ?? roleName.toLowerCase();
	const email = `${prefix}@unhas.ac.id`;
```

### Change 2 — use the config's `displayName` instead of the old `isInstruktur` check

Replace:

```ts
name: isInstruktur ? 'DPJP' : faker.person.fullName();
```

with:

```ts
name: seedConfig?.displayName ?? faker.person.fullName();
```

### Change 3 — the `teknisi`/`laboran` lab-membership block further down is unaffected

The existing block:

```ts
if (roleName === 'teknisi' || roleName === 'laboran') {
	// ... add to laboratoriumMember
}
```

stays exactly as-is — `peneliti` and `koordinator` must **not** be added as lab members (matches
current behavior for every role except `teknisi`/`laboran`).

### Why `peneliti`'s email is safe to add here

`peneliti@unhas.ac.id` / username `peneliti` is the same account `seedTestingPeneliti()` in
`mahasiswa.ts` already creates. Both seeders look up by email first and only create if missing, so
running either script (in either order) is idempotent — whichever runs first creates the account,
the other just resets its password. No duplicate or conflicting account is created.

## Out of scope — do not touch

- `src/lib/server/db/seeds/mahasiswa.ts`'s `seedTestingPeneliti()` function: already creates the
  `peneliti@unhas.ac.id` / username `peneliti` account named `"Mahasiswa Testing"`, and also
  enrolls it into a `practicumClass`. Leave it exactly as-is — it's a different, more complete
  seeder (adds class membership) that this task doesn't need to replace.
- Any `role === 'instruktur'` / `role === 'koordinator'` / `role === 'peneliti'` comparisons,
  route guards, `auth.roles.ts`, `auth.ts`, or the role slugs themselves anywhere in the app —
  unaffected by this change.
- `src/lib/server/db/seeds/dpjp.ts` (the 4-DPJP seeder created separately) — not part of this fix.

## Verification

1. `git diff --stat` — confirm only `src/lib/server/db/seeds/users.ts` is touched.
2. `bun run db:seed-users` (against a scratch/dev DB) and confirm:
   - `dpjp@unhas.ac.id` (username `dpjp`) is created/updated with `name = "DPJP"`, `role = 'instruktur'`.
   - `koordinator@unhas.ac.id` (username `koordinator`) is created/updated with
     `name = "PJ Mata Kuliah"`, `role = 'koordinator'`.
   - `peneliti@unhas.ac.id` (username `peneliti`) is created/updated with `name = "Mahasiswa"`,
     `role = 'peneliti'` (if `mahasiswa.ts`'s seeder already ran first and named it
     `"Mahasiswa Testing"`, running `db:seed-users` afterwards will overwrite the name to
     `"Mahasiswa"` — confirm this ordering behavior is acceptable, since whichever seed script
     runs _last_ wins on the `name` field).
   - `teknisi`, `spmi`, `laboran` accounts are unaffected (still random faker names, `teknisi`/
     `laboran` still get added as `laboratoriumMember`).
3. `bun run check` / `bun run lint` pass (no unused `isInstruktur` references left behind).
4. Confirm the quick-login demo list in `src/routes/+page.svelte` (`dpjp` / `koordinator` /
   `peneliti` usernames) still matches what this seeder produces.
