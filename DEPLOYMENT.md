# Petunjuk Deployment

Dokumentasi ini menjelaskan langkah-langkah untuk melakukan deployment aplikasi **SIM LAB** menggunakan Docker dan Docker Compose.

## Komponen Deployment
1. **app**: Aplikasi SvelteKit (Node.js runtime, port `3000`).
2. **db**: Database MySQL 8.0 (port `3306`).
3. **db-migrate**: Container untuk menjalankan migrasi database Drizzle.
4. **gotenberg-api**: Gotenberg 8 untuk konversi dokumen ke PDF (port host `4000`, port container `3000`).

---

## Prasyarat
Pastikan Anda sudah menginstal:
* [Docker](https://docs.docker.com/get-docker/)
* [Docker Compose](https://docs.docker.com/compose/install/)

---

## Opsi 1: Build dan Deploy Langsung di Server

### 1. Konfigurasi Environment Variables
Buat file `.env` di direktori `/var/www/simlab-fkg/` pada server dan sesuaikan nilainya:
```bash
# URL koneksi database untuk container
DATABASE_URL="mysql://simlab:simlab_password@db:3306/simlab"

# URL origin aplikasi (sesuaikan dengan domain/IP server)
ORIGIN="http://localhost:3000"

# Kunci rahasia untuk Better Auth (minimal 32 karakter)
BETTER_AUTH_SECRET="simlab_better_auth_secret_minimum_32_characters"

# Password default untuk user baru
DEFAULT_PASSWORD="password"

# URL internal container gotenberg
GOTENBERG_URL="http://gotenberg-api:3000"

# Environment runtime
NODE_ENV=production
```

### 2. Jalankan Service via Docker Compose
Jalankan perintah berikut untuk mendownload image, membuild container, menjalankan migrasi database, dan menyalakan semua service di background:
```bash
docker compose up -d --build
```

---

## Opsi 2: Build di Lokal & Deploy via SSH/SCP (Rekomendasi)

Jika Anda ingin membuild container di mesin lokal (untuk menghemat resource server), mengompres hasilnya, mengirimkannya ke server `server-csi`, lalu me-load dan menjalankannya secara otomatis, jalankan script `deploy.sh` yang telah disediakan di root proyek ini:

```bash
./deploy.sh
```

### Cara Kerja Script `deploy.sh`:
1. Membuild image `simlab-fkg-builder:latest` (target builder) dan `simlab-fkg-app:latest` (target runner) di komputer lokal.
2. Mengompresi kedua image tersebut menjadi file `simlab-fkg-images.tar.gz`.
3. Mengirimkan file `simlab-fkg-images.tar.gz` dan `docker-compose.yaml` ke direktori tujuan `/var/www/simlab-fkg` di server `server-csi`.
4. Mengekstrak dan me-load image tersebut ke dalam Docker daemon di server.
5. Menjalankan semua service (`docker compose up -d`) di server.
6. Menghapus file kompresi lokal yang sudah tidak digunakan.

---

## Perintah Tambahan

### Menjalankan Database Seeder
Jika Anda perlu memasukkan data awal/seed ke database setelah migrasi berhasil:
```bash
docker compose run --rm db-migrate bun run db:seed
```

### Mematikan Service
Untuk mematikan semua service dan membersihkan container:
```bash
docker compose down
```

Untuk mematikan service sekaligus menghapus volume database (bersih total):
```bash
docker compose down -v
```

### Memeriksa Log
Untuk memantau log aplikasi:
```bash
docker compose logs -f app
```
