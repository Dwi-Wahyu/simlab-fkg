# Instruction: Rename display labels under the top-right profile

## Context

SvelteKit + better-auth + Drizzle project (Simlab). This is the same kind of rename as
`instruction/module-08-renaming-role.md` — **display label only**, never the underlying role
slug. Do not repeat the mistakes that file already warns about: `user.role` is a stored DB value
(`'instruktur'`, `'koordinator'`, `'peneliti'`, plus `'superadmin'`, `'kepalaLab'`, `'teknisi'`,
`'spmi'`, `'laboran'`, `'kakomlek'`, etc.) used throughout route guards, `better-auth` role
registration, and `if`/`case` comparisons. **Never rename the slug, only the text shown to the
user.**

### Target mapping (display label only)

| Role slug (unchanged) | Old label shown | New label to show  |
| --------------------- | --------------- | ------------------ |
| `instruktur`          | Instruktur      | **DPJP**           |
| `koordinator`         | Koordinator     | **PJ Mata Kuliah** |
| `peneliti`            | Peneliti        | **Mahasiswa**      |

Note: `instruktur` → `DPJP` and `peneliti` → `Mahasiswa` were already applied to _other_ files by
module-08. This instruction is scoped to a **different location** module-08 didn't touch: the
role text shown directly under the user's name in the top-right profile widget (desktop dropdown
trigger + mobile dropdown menu) inside the shared admin layout. `koordinator` → `PJ Mata Kuliah`
is a new mapping not covered anywhere before — check the codebase doesn't already special-case
"Koordinator" elsewhere in a way that would now read inconsistently (informational only, not part
of this task's file list below).

## File to change

`src/routes/admin/+layout.svelte`

### What's there today

The file defines a shared helper:

```svelte
const toTitleCase = (str: string) => {
	if (!str) return '';
	return str
		.toLowerCase()
		.split('_')
		.join(' ')
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
};
```

and calls `{toTitleCase(data.user.role)}` in **two** places — both render the same info, once for
desktop and once for the mobile dropdown:

1. ~line 135, inside the desktop profile link (`<a href="/admin/profil" ...>`):
   ```svelte
   <span class="text-[11px] font-medium text-slate-400">
   	{toTitleCase(data.user.role)}
   </span>
   ```
2. ~line 169, inside the mobile `DropdownMenu.Label`:
   ```svelte
   <p class="text-xs leading-none text-muted-foreground">
   	{toTitleCase(data.user.role)}
   </p>
   ```

### Change to make

1. Leave `toTitleCase` itself untouched (other code may still rely on it, and it's still needed as
   the fallback for roles not in the mapping table below).
2. Add a small label map + derived value near the other `$derived`s (right after `initials`, or
   right after `toTitleCase`'s definition):

   ```svelte
   const roleLabelMap: Record<string, string> = {
   	instruktur: 'DPJP',
   	koordinator: 'PJ Mata Kuliah',
   	peneliti: 'Mahasiswa'
   };

   const roleLabel = $derived(roleLabelMap[data.user.role] ?? toTitleCase(data.user.role));
   ```

   Roles not in the map (`superadmin`, `kepalaLab`, `teknisi`, `spmi`, `laboran`, `kakomlek`, etc.)
   fall through to the existing `toTitleCase` behavior unchanged.

3. Replace **both** call sites with `{roleLabel}`:
   - ~line 135: `{toTitleCase(data.user.role)}` → `{roleLabel}`
   - ~line 169: `{toTitleCase(data.user.role)}` → `{roleLabel}`
4. Do **not** touch `data.user.role` itself, any `href`/route-guard logic in this file (e.g. the
   `hasRole` checks or menu filtering happens in `Sidebar.svelte`, not here — leave that alone
   too), or the `toTitleCase` function signature/behavior.

## Explicitly out of scope (do not touch)

- `src/routes/admin/profil/+page.svelte` (~line 125): uses `{data.user.role.toUpperCase()}`, a
  different pattern on a different page (the full profile page, not the top-right widget). Not
  part of this task. Flagging only for awareness — if you also want that page's role text
  relabeled the same way, that's a separate follow-up ticket.
- `Sidebar.svelte`, `Sidebar.svelte`'s `role: [...]` guard arrays, any `role === 'koordinator'` /
  `role === 'instruktur'` / `role === 'peneliti'` conditionals anywhere in the app, `auth.roles.ts`,
  `auth.ts`, seed scripts, and any `roleToLabel` maps in `src/routes/admin/users/[role_slug]/...`
  that already say `'instruktur': 'Dosen'` — none of these are touched by this change.

## Verification

1. `git diff --stat` — confirm only `src/routes/admin/+layout.svelte` is touched.
2. `grep -n "data.user.role" src/routes/admin/+layout.svelte` — should now show 0 remaining direct
   `toTitleCase(data.user.role)` calls in the two spots above (they now read `roleLabel`); the
   `roleLabelMap`/`roleLabel` declaration is the only new reference to `data.user.role`.
3. `bun run check` / `bun run lint` and `bun run build` pass.
4. Manually log in as each of `instruktur`, `koordinator`, `peneliti`, and one unmapped role (e.g.
   `superadmin`) and confirm:
   - Desktop top-right widget shows "DPJP" / "PJ Mata Kuliah" / "Mahasiswa" respectively.
   - Mobile dropdown menu label shows the same three values.
   - The unmapped role (`superadmin`) still shows its title-cased name as before (unchanged
     behavior).
