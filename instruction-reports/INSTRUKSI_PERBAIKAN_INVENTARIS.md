# Summary of Changes for INSTRUKSI_PERBAIKAN_INVENTARIS.md

## Modified Files:
- `src/lib/utils/item-badge.ts` (New file)
- `src/lib/server/db/schema.ts`
- `src/routes/admin/inventaris/alat/+page.svelte`
- `src/routes/admin/inventaris/bhp/+page.svelte`
- `src/routes/admin/inventaris/bhp/+page.ts`
- `src/routes/api/admin/inventaris/bhp/+server.ts`
- `src/routes/api/admin/inventaris/alat/+server.ts`
- `src/routes/admin/inventaris/bhp/tambah/+page.server.ts`
- `src/routes/admin/inventaris/bhp/tambah/+page.svelte`
- `src/routes/admin/inventaris/alat/tambah/+page.server.ts`
- `src/routes/admin/inventaris/alat/tambah/+page.svelte`
- `src/routes/admin/inventaris/alat/[id]/+page.svelte`
- `src/routes/admin/inventaris/bhp/[id]/+page.svelte`

## Logic Changes:
- **TASK 1**:
  - Removed duplicate laboratory export select in `alat/+page.svelte` and unified export to use `selectedLabId`.
  - Added laboratory filter select next to category filter in `bhp/+page.svelte` for roles that can view cross-lab data (superadmin, koordinator, etc.).
  - Updated `bhp/+page.ts` to forward `laboratoriumId` search param to `/api/admin/inventaris/bhp`.
  - Updated `/api/admin/inventaris/bhp/+server.ts` to parse `laboratoriumId` query param and filter stocks accordingly for non-restricted roles.
- **TASK 2**:
  - Added `eq(fields.isDeleted, false)` to item query condition in `/api/admin/inventaris/bhp/+server.ts` so soft-deleted BHP items no longer appear in the table.
- **TASK 3**:
  - Wrapped "Tambah BHP" button in `bhp/+page.svelte` with `{#if data.user?.role !== 'koordinator'}` to hide it for `koordinator` role.
  - Added role checks in `bhp/tambah/+page.server.ts` to redirect (on load) or fail with 403 (on action submit) for `koordinator`.
- **TASK 4**:
  - Centralized "Baru" item badge utility in `src/lib/utils/item-badge.ts` with a 1-week window (`7 * 24 * 60 * 60 * 1000` ms).
  - Added `hideNewBadge` boolean column to `item` table schema.
  - Added "Jangan tandai sebagai barang baru" checkbox to form in `bhp/tambah/+page.svelte` and `alat/tambah/+page.svelte`, passing `hideNewBadge` to server actions when creating new items.
  - Included `hideNewBadge` property in API list responses for both BHP and Alat.
  - Updated item list table views to use `shouldShowNewBadge(item.createdAt, item.hideNewBadge)`.
- **TASK 5**:
  - Added "Tambah Alat" / "Tambah Stok" button on detail pages (`alat/[id]/+page.svelte` and `bhp/[id]/+page.svelte`) linking to `/tambah?itemId={res.item.id}` or `/tambah?itemId={res.equipment.id}`.
  - Added `onMount` prefill logic in `alat/tambah/+page.svelte` and `bhp/tambah/+page.svelte` to auto-select and populate item template details when `itemId` is passed in URL query parameters.
  - Added `with: { equipments: true }` in `existingAssets` query in `alat/tambah/+page.server.ts` so asset details are fully populated.

## Impact on Graph:
- New utility module `src/lib/utils/item-badge.ts` added and consumed by inventaris BHP and Alat page components.
- Direct navigation/link reference between detail pages (`[id]/+page.svelte`) and create form pages (`tambah/+page.svelte`) via `itemId` query param.
