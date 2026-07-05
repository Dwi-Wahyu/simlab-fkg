# MODULE 3 — LABORATORIUM SEEDER

Independent of Modules 1 & 2 — can be done any time, but do it before
Module 4 (Mahasiswa Kelompok) since that module's seed data references
real labs.

Goal: a dedicated, standalone seeder for exactly 3 laboratoriums —
**"Preparasi"**, **"Terpadu"**, **"Frontier Dental Lab Research"** — each
with its own `kepalaLab` user.

## Context: what exists today

`src/lib/server/db/seeds/index.ts` currently hardcodes 2 placeholder labs
inline inside `main()`:

```ts
const labs = [
	{ name: 'Laboratorium Molar', slug: 'molar' },
	{ name: 'Laboratorium Premolar', slug: 'premolar' }
];
```

`src/lib/server/db/seeds/users.ts` seeds exactly **one** user per role
(`koordinator`, `kepalaLab`, `instruktur`, `teknisi`, `spmi`), and for the
lab-scoped roles it always attaches them to the single `molar` lab. This
doesn't give you 3 separate `kepalaLab` users, one per lab.

"Molar"/"Premolar" were clearly placeholder names. Since this is a fresh
database, replace them with the 3 real labs rather than keeping both sets
around — **flagging this as an assumption**: if you want to keep
Molar/Premolar as an additional test fixture, say so and I'll adjust to
add-alongside instead of replace.

---

## 1. NEW FILE: `src/lib/server/db/seeds/laboratorium.ts`

Self-contained seeder, following the same `auth.api.signUpEmail` +
"upsert by unique field" pattern already used in `users.ts` and
`index.ts`. Structure:

```ts
import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, admin, username, customSession } from 'better-auth/plugins';
import { hashPassword } from 'better-auth/crypto';
import {
	accessControl,
	superadmin,
	koordinator,
	kepalaLab,
	instruktur,
	peneliti,
	teknisi,
	spmi,
	laboran // from Module 1
} from '../../auth.roles';
import { eq } from 'drizzle-orm';

// ...same db/auth bootstrap boilerplate as users.ts (copy it verbatim,
// including the full `allAuthRoles` map and betterAuth config — needed so
// auth.api.signUpEmail works standalone without importing app runtime)...

export const LABORATORIUM_SEEDS = [
	{ name: 'Preparasi (lt 2)', slug: 'preparasi' },
	{ name: 'Terpadu (lt 4)', slug: 'terpadu' },
	{ name: 'Frontier Dental Lab Research (lt 4)', slug: 'frontier-dental-lab-research' }
];

async function main() {
	console.log('Seeding 3 laboratorium + kepalaLab...');

	for (const lab of LABORATORIUM_SEEDS) {
		// 1. Upsert laboratorium by slug (same pattern as index.ts's lab loop)
		let existingLab = await db.query.laboratorium.findFirst({
			where: eq(authSchema.laboratorium.slug, lab.slug)
		});

		let labId: string;
		if (!existingLab) {
			labId = crypto.randomUUID();
			await db.insert(authSchema.laboratorium).values({
				id: labId,
				name: lab.name,
				slug: lab.slug,
				createdAt: new Date()
			});
			console.log(`- Lab dibuat: ${lab.name}`);
		} else {
			labId = existingLab.id;
			console.log(`- Lab sudah ada: ${lab.name}`);
		}

		// 2. Upsert a kepalaLab user for this specific lab
		const email = `kepalalab.${lab.slug}@unhas.ac.id`;
		const usernameSlug = `kepalalab.${lab.slug}`;

		let existingUser = await db.query.user.findFirst({
			where: eq(authSchema.user.email, email)
		});

		let userId: string;
		if (!existingUser) {
			const userResponse = await auth.api.signUpEmail({
				body: {
					email,
					username: usernameSlug,
					password: process.env.DEFAULT_PASSWORD ?? 'password',
					name: `Kepala Lab ${lab.name}`
				}
			});
			if (!userResponse) {
				console.error(`Gagal membuat kepalaLab untuk ${lab.name}`);
				continue;
			}
			userId = userResponse.user.id;
			console.log(`  -> User kepalaLab dibuat: ${email}`);
		} else {
			userId = existingUser.id;
			const hashedPwd = await hashPassword(process.env.DEFAULT_PASSWORD ?? 'password');
			await db
				.update(authSchema.account)
				.set({ password: hashedPwd })
				.where(eq(authSchema.account.userId, userId));
			console.log(`  -> User kepalaLab sudah ada, password direset: ${email}`);
		}

		await db
			.update(authSchema.user)
			.set({ role: 'kepalaLab' })
			.where(eq(authSchema.user.id, userId));

		// 3. Attach as laboratoriumMember with role kepalaLab (this is what
		// makes locals.user.laboratorium populate via customSession)
		const existingMember = await db.query.laboratoriumMember.findFirst({
			where: (m, { and, eq }) => and(eq(m.laboratoriumId, labId), eq(m.userId, userId))
		});

		if (!existingMember) {
			await db.insert(authSchema.laboratoriumMember).values({
				id: crypto.randomUUID(),
				laboratoriumId: labId,
				userId,
				role: 'kepalaLab',
				createdAt: new Date()
			});
			console.log(`  -> Ditambahkan sebagai kepalaLab member`);
		}
	}

	console.log('\nSeeding laboratorium selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
```

Result: 3 laboratorium rows, 3 distinct `kepalaLab` users
(`kepalalab.preparasi@unhas.ac.id`, `kepalalab.terpadu@unhas.ac.id`,
`kepalalab.frontier-dental-lab-research@unhas.ac.id`), each a member of
exactly one lab.

---

## 2. UPDATE `index.ts` TO USE THE SAME 3 LABS

Replace the hardcoded `labs` array in `index.ts`'s `main()`:

```ts
const labs = [
	{ name: 'Laboratorium Molar', slug: 'molar' },
	{ name: 'Laboratorium Premolar', slug: 'premolar' }
];
```

with:

```ts
const labs = [
	{ name: 'Preparasi', slug: 'preparasi' },
	{ name: 'Terpadu', slug: 'terpadu' },
	{ name: 'Frontier Dental Lab Research', slug: 'frontier-dental-lab-research' }
];
```

`index.ts` uses `labIds['molar']` later (as `labIdMolar`) to seed
departments/blocks/practicum data against a single default lab — update
that reference to `labIds['preparasi']` (rename the variable to
`labIdPreparasi` or similar) since `preparasi` is now the "default" lab
that general seed data (blocks, practicum series, etc.) hangs off of. Grep
`labIdMolar` in `index.ts` to catch every usage before renaming.

---

## 3. UPDATE `users.ts`'s SINGLE-LAB ATTACHMENT

`users.ts` still seeds one `koordinator`, one `instruktur`, one `teknisi`,
one `spmi` (kepalaLab is now handled by the new dedicated seeder, so
remove `'kepalaLab'` from `users.ts`'s `rolesToSeed` array to avoid a
conflicting/duplicate kepalaLab user, and remove `'kepalaLab'` from the
`if (roleName === 'koordinator' || roleName === 'kepalaLab' || ...)`
condition — leave `koordinator` and `teknisi` there since they still need
lab attachment).

Update the lookup at the top of `users.ts` from:

```ts
let labMolar = await db.query.laboratorium.findFirst({
	where: eq(authSchema.laboratorium.slug, 'molar')
});
```

to:

```ts
let labMolar = await db.query.laboratorium.findFirst({
	where: eq(authSchema.laboratorium.slug, 'preparasi')
});
```

(rename the variable too, e.g. `labPreparasi`) — koordinator/instruktur/
teknisi/spmi remain single global seed users attached to "Preparasi" by
default; that's an acceptable simplification since only `kepalaLab` (and
`laboran`, per Module 1) were asked to be per-lab.

Also add `laboran` to `rolesToSeed` here if Module 1's laboran seeding
wasn't already handled elsewhere — attach to `labMolar`/`labPreparasi`
the same way as `teknisi`.

---

## 4. PACKAGE.JSON SCRIPT

Add alongside the existing `db:seed-*` scripts:

```json
"db:seed-laboratorium": "bun run src/lib/server/db/seeds/laboratorium.ts"
```

Document run order in `README.md`/`DEPLOYMENT.md` if such a section
exists: `db:push` → `db:seed` → `db:seed-laboratorium` → `db:seed-users` →
`db:seed-mahasiswa` → ... (laboratorium seeder must run before
`db:seed-users` now that `users.ts` looks up the `preparasi` lab by slug).

---

## 5. ACCEPTANCE CHECKLIST

- [ ] `bun run db:seed-laboratorium` creates exactly 3 laboratorium rows:
      Preparasi, Terpadu, Frontier Dental Lab Research
- [ ] Each has exactly one `kepalaLab` user, and that user's session has
      `locals.user.laboratorium` correctly populated to their own lab
      (log in as each and confirm)
- [ ] Running the seeder twice is idempotent — no duplicate labs or users
- [ ] `index.ts`'s full seed run no longer creates "Molar"/"Premolar"
      and instead uses the same 3 labs, with department/block/practicum
      seed data now hanging off "Preparasi" instead of "Molar"
- [ ] `users.ts` no longer creates a second, conflicting `kepalaLab` user
- [ ] Run order works end-to-end from an empty DB:
      `db:push` → `db:seed` → `db:seed-laboratorium` → `db:seed-users` →
      `db:seed-mahasiswa`
