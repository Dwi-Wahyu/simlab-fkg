**Subjek: Refaktor Navigasi SvelteKit ke Base Path `/simlab`**

"Saya telah mengubah `svelte.config.js` untuk menggunakan `kit.paths.base = '/simlab'`. Tolong bantu saya melakukan refaktor pada seluruh codebase dengan aturan berikut:

1.  **Gunakan base dari $app/paths:** Cari semua elemen `<a>` dan fungsi `goto()` di seluruh proyek. Ubah link yang sebelumnya hardcoded (contoh: `href="/dashboard"`) menjadi menggunakan variabel `base`.
2.  **Import Statement:** Pastikan untuk menambahkan `import { base } from '$app/paths';` di bagian `<script>` jika belum ada.
3.  **Template Literals:** Gunakan template literals untuk menggabungkan base path, contoh: `href="{base}/dashboard"`.
4.  **Aset Statis:** Periksa juga tag `<img>` atau `<link>` yang merujuk ke folder `/static`. Pastikan jalurnya diawali dengan `{base}/`.
5.  **Redirects:** Jika ada fungsi `redirect(...)` di file `+page.server.js` atau `+layout.server.js`, pastikan tujuannya juga menyertakan prefix `/simlab`.

Tolong telusuri seluruh folder `src/routes` dan `src/lib`."

---

### Contoh Perubahan yang Diharapkan

Agar Anda bisa memverifikasi kerja Agent, berikut adalah transformasi kode yang benar:

#### 1. Di dalam Komponen (`.svelte`)

**Sebelum:**

```html
<script>
	import { goto } from '$app/navigation';
</script>

<a href="/profile">Profil</a>
<button on:click="{()" ="">goto('/settings')}>Setelan</button>
```

**Sesudah (Hasil Refaktor Agent):**

```html
<script>
	import { goto } from '$app/navigation';
	import { base } from '$app/paths'; // Ditambahkan oleh Agent
</script>

<a href="{base}/profile">Profil</a>
<button on:click="{()" ="">goto(`${base}/settings`)}>Setelan</button>
```

#### 2. Di dalam Load Function (`+page.server.js`)

**Sebelum:**

```javascript
throw redirect(302, '/login');
```

**Sesudah:**

```javascript
import { base } from '$app/paths';
// ...
throw redirect(302, `${base}/login`);
```

---

### Mengapa ini perlu?

SvelteKit tidak secara otomatis menambahkan prefix pada tag `<a>` meskipun kita sudah mengatur `base` di config. Menggunakan `$app/paths` adalah metode "best practice" karena:

- **Portabilitas:** Jika suatu saat Anda mengubah prefix dari `/simlab` menjadi `/lab-baru`, Anda hanya perlu mengubah satu file (`svelte.config.js`).
- **Kesesuaian Proxy:** Menjamin Apache tidak melempar error 404 karena aplikasi mencoba mencari rute di root server.

**Tips:** Jika Anda menggunakan **Cursor**, Anda bisa melakukan "Command+Shift+L" (Codebase Search) dan memasukkan instruksi di atas agar ia memproses seluruh file sekaligus.
