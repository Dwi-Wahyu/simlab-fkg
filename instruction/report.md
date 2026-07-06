# BHP Stock Expiry-Date Tracking (Batch/Lot Model) - Implementation Summary

This report documents the implementation of the batch/lot model for tracked BHP consumables to support expiry-date tracking.

## Summary of Changes

### 1. Database Schema
* **Location:** `src/lib/server/db/schema.ts`
* **Changes:**
  * Imported the `date` column type.
  * Added the `stock_batch` table definition containing:
    * `id`: varchar(36) primary key.
    * `stockId`: varchar(36) referencing `stock.id` (cascade delete).
    * `qty`: remaining quantity (decremented on consumption, non-negative).
    * `initialQty`: quantity originally received (read-only auditing).
    * `expiryDate`: nullable date column (for perishable items).
    * `receivedAt`: timestamp set automatically by the server on insertion.
    * `movementId`: nullable link back to the `movement` event that created the batch.
    * `notes`: text.
    * `createdAt`: timestamp.
  * Added indexes on `stockId` and `expiryDate` for fast querying.
  * Added the Svelte/Drizzle `stockBatchRelations` and updated `stockRelations` to include the `batches` relation.
  * Generated and applied the SQL migration: `drizzle/0004_sparkling_robin_chapel.sql`.

### 2. BHP Creation (`bhp/tambah`)
* **Files:** 
  * `src/routes/admin/inventaris/bhp/tambah/+page.svelte`
  * `src/routes/admin/inventaris/bhp/tambah/+page.server.ts`
* **Changes:**
  * Added an optional "Tanggal Kedaluwarsa" (`expiryDate`) input field near the initial stock input.
  * Hoisted stock ID generation so that the transaction can insert the new `stock_batch` row linked to the correct `stock` and sharing the same `movementId` as the `RECEIVE` movement entry.
  * Ensured `expiryDate` is parsed as a `Date` object before insertion.

### 3. Stock Mutation Endpoint & "Ubah Stok" Modal
* **Files:**
  * `src/routes/admin/inventaris/bhp/+page.svelte`
  * `src/routes/api/admin/inventaris/bhp/stock/+server.ts`
* **Changes:**
  * Added a `stockExpiryDate` state variable, reset it on modal open, and added a conditional "Tanggal Kedaluwarsa" input within the `Ubah Stok` modal (only visible when changing stock via `RECEIVE` event).
  * Included `expiryDate` in the POST request body.
  * Implemented a `deductFefo` helper function on the backend to apply a **First-Expired-First-Out** selection when issuing stock:
    * Selects batches with `qty > 0`.
    * Orders by expiry date ascending, putting non-expiring batches (`null` expiry date) last.
    * Deducts stock incrementally across batches.
  * Implemented transaction updates in the API endpoint:
    * **RECEIVE**: Inserts a new batch with the specified expiry date.
    * **ISSUE**: Invokes the `deductFefo` helper.
    * **ADJUSTMENT**: Computes the delta of changes. If positive, it inserts an unattributed batch (no expiry date). If negative, it runs `deductFefo` on the absolute difference.
  * Modified default warehouse insertion to generate a UUID for the primary key `id` as required by database constraints.

### 4. BHP Detail Page & Batches List
* **Files:**
  * `src/routes/admin/inventaris/bhp/[id]/+page.server.ts`
  * `src/routes/admin/inventaris/bhp/[id]/+page.ts`
  * `src/routes/admin/inventaris/bhp/[id]/+page.svelte`
  * `src/routes/api/admin/inventaris/bhp/[id]/entry/+server.ts`
* **Changes:**
  * Implemented a new read-only page to view all batches of a specific BHP item across different laboratories and warehouses.
  * Created the backend `/entry` handler to fetch and paginate stock batches, joining the `stock`, `laboratorium`, and `warehouse` tables.
  * Sorted batches by **longest expiry date first** (`NULL` expiry dates sort first) via the database order: `orderBy(sql`${stockBatch.expiryDate} IS NULL DESC`, desc(stockBatch.expiryDate))`.
  * Included a reactive status badge in the UI displaying:
    * *Tidak Kedaluwarsa* (if no expiry date).
    * *Kedaluwarsa* (if date is in the past).
    * *X hari lagi* (if expiring soon; colored red if <= 3 days, default/green if <= 14 days, secondary/gray if > 14 days).
  * Styled the page layout, search inputs, pagination, and back buttons to mirror the existing `alat` detail layout.

### 5. Detail Link Wiring
* **File:** `src/routes/admin/inventaris/bhp/+page.svelte`
* **Changes:**
  * Added a new dropdown item "Detail" utilizing Lucide's `Eye` icon linking to `/admin/inventaris/bhp/{item.id}` before the "Ubah Stok" item.

### 6. User Laboratorium Autoprefill and Lock
* **Files:**
  * `src/routes/admin/inventaris/bhp/tambah/+page.svelte`
  * `src/routes/admin/inventaris/alat/tambah/+page.svelte`
  * `src/routes/admin/inventaris/alat/[id]/edit/+page.svelte`
* **Changes:**
  * Declared a derived value `isRestrictedLabUser` which resolves to `true` if the logged-in user has the role `kepalaLab` or `laboran`.
  * Added Svelte 5 state initialization and reactive `$effect` blocks to automatically pre-select the user's assigned laboratorium from their session (`data.user.laboratorium.id`).
  * Bound the `disabled` property of the `Select.Root` components to `isRestrictedLabUser`.
  * Preserved the `laboratoriumId` in a hidden input so it still correctly submits the pre-selected laboratory value in the form submission even when the select input is disabled.

### 7. Sorting of Newly Created Items First
* **Files:**
  * `src/routes/api/admin/inventaris/alat/+server.ts`
  * `src/routes/api/admin/inventaris/bhp/+server.ts`
  * `src/routes/api/admin/inventaris/alat/[id]/entry/+server.ts`
* **Changes:**
  * Modified the main equipment API list query to order results by `desc(item.createdAt)` instead of `item.name`.
  * Modified the main BHP API list query to order results by `desc(fields.createdAt)` inside `findMany`.
  * Modified the individual equipment entries API list query to order entries by `desc(equipment.createdAt)` instead of `equipment.createdAt`.
  * This guarantees that newly created items/entries appear at the top of their respective listing tables.

### 8. Expiry Date Robust Validation (500 Error Fix)
* **Files:**
  * `src/routes/api/admin/inventaris/bhp/stock/+server.ts`
  * `src/routes/api/admin/inventaris/bhp/tambah/+page.server.ts`
* **Changes:**
  * Implemented robust date validation: `const parsedExpiryDate = expiryDate && !isNaN(new Date(expiryDate).getTime()) ? new Date(expiryDate) : null;`.
  * This prevents the server from attempting to parse empty strings `""` or malformed inputs into `Invalid Date` objects and sending them to the MySQL database, which was resulting in prepared statement insertion crashes (500 errors).
  * Now, all invalid or missing dates default cleanly to `null` database values.

### 9. Varian / Brand Selection in Stock Mutations & Laboran Lock
* **Files:**
  * `src/routes/admin/inventaris/bhp/+page.svelte`
  * `src/routes/api/admin/inventaris/bhp/+server.ts`
  * `src/routes/api/admin/inventaris/bhp/stock/+server.ts`
* **Changes:**
  * Expanded the user laboratory lock behavior to check for both `kepalaLab` and `laboran` roles (`isRestrictedLabUser`). This locks the mutation preselected lab value cleanly to the logged-in user's assigned lab, preventing mutation into wrong labs.
  * Updated the BHP catalog API query response to include the full `stocks` array containing specific batches (with unique `id`, `brand`, `variant`, and `qty`).
  * Updated the stock mutation endpoint to support and query specific stock rows by `(itemId, laboratoriumId, brand, variant)` instead of just the item ID globally. Newly received stock rows are also inserted with the specified brand and variant.
  * Re-architected the "Ubah Stok" modal:
    * Implemented a **"Merk / Varian Stok"** selector interface.
    * For `RECEIVE` (Masuk), users can either pick an existing brand/variant to increment, or choose "+ Tambah Merk/Varian Baru" which displays inputs to specify a custom Brand and Variant.
    * For `ISSUE` (Keluar) and `ADJUSTMENT` (Penyesuaian), users are restricted to selecting an existing brand/variant from the active laboratory's stocks. Client-side validation prevents issuing more stock than is available for the selected variant.
  * Derived a type-safe `selectedStockRow` in the Svelte component script to pass Svelte-Kit type checking validation cleanly.
