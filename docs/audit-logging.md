# Panduan Pencatatan Audit Log - SIM LAB

Audit log digunakan untuk mencatat setiap aktivitas perubahan data kritikal dalam sistem untuk keperluan akuntabilitas dan keamanan.

## Lokasi Service

Service tersedia di `$lib/server/audit.ts`.

## Penggunaan Dasar

Impor fungsi `createAuditLog` dan gunakan di dalam SvelteKit Actions atau Server Load functions.

```typescript
import { createAuditLog } from '$lib/server/audit';

// Contoh penggunaan saat update data
await createAuditLog({
	userId: locals.user.id,
	action: 'UPDATE_EQUIPMENT',
	tableName: 'equipment',
	recordId: 'uuid-alat-123',
	oldValue: dataLama,
	newValue: dataBaru,
	status: 'SUCCESS',
	ipAddress: event.getClientAddress(),
	userAgent: event.request.headers.get('user-agent') || undefined
});
```

## Parameter `AuditParams`

| Properti    | Tipe                    | Deskripsi                                                    |
| :---------- | :---------------------- | :----------------------------------------------------------- |
| `userId`    | `string`                | ID pengguna yang melakukan aksi (opsional untuk login gagal) |
| `action`    | `string`                | Deskripsi aksi (misal: `CREATE_USER`, `DELETE_ITEM`)         |
| `tableName` | `string`                | Nama tabel database yang terdampak                           |
| `recordId`  | `string`                | ID record yang diubah (opsional)                             |
| `oldValue`  | `any`                   | Data sebelum perubahan (akan di-stringify ke JSON)           |
| `newValue`  | `any`                   | Data setelah perubahan (akan di-stringify ke JSON)           |
| `status`    | `'SUCCESS' \| 'FAILED'` | Status keberhasilan aksi                                     |
| `ipAddress` | `string`                | Alamat IP perangkat pengguna                                 |
| `userAgent` | `string`                | Informasi browser/perangkat pengguna                         |

## Standar Nama Tabel (`tableName`)

Pastikan menggunakan nama tabel asli sesuai skema agar mapping di dashboard admin berjalan dengan benar:

- `laboratorium`: Laboratorium
- `user`: Pengguna
- `equipment`: Inventori Alat
- `item`: Katalog Barang
- `stock`: Stok Barang
- `movement`: Mutasi Barang
- `maintenance`: Pemeliharaan
- `lending`: Peminjaman
- `waste_log`: Limbah Medis
- `audit_checklist`: Audit Mutu
- `notification`: Notifikasi
- `approval`: Persetujuan
- `safety_incident`: Insiden Keselamatan

## Tips Implementasi

1. **Gunakan `getClientAddress()`**: Di SvelteKit, gunakan `event.getClientAddress()` untuk mendapatkan IP pengguna secara akurat.
2. **Serialisasi Data**: Anda tidak perlu melakukan `JSON.stringify` pada `oldValue` dan `newValue`, service akan menanganinya secara otomatis.
3. **Login Gagal**: Untuk mencatat login gagal, set `status: 'FAILED'` dan `action: 'LOGIN'`.
