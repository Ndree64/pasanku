# PASANKU

**Bahasa kita, warisan kita.**

Aplikasi pembelajaran Bahasa Pasan (Ratahan, Minahasa Tenggara) berbasis web menggunakan pendekatan *microlearning*, gamifikasi Experience Points (XP), validasi konten berjenjang, dan sistem rekomendasi remedial adaptif.

---

## Daftar Isi

1. [Gambaran Produk dan Peran Pengguna](#1-gambaran-produk-dan-peran-pengguna)
2. [Fitur Utama](#2-fitur-utama)
3. [Teknologi yang Digunakan](#3-teknologi-yang-digunakan)
4. [Struktur Direktori](#4-struktur-direktori)
5. [Menjalankan Secara Lokal](#5-menjalankan-secara-lokal)
6. [Konfigurasi Supabase (Produksi)](#6-konfigurasi-supabase-produksi)
7. [Verifikasi dan Pengujian](#7-verifikasi-dan-pengujian)

---

## 1. Gambaran Produk dan Peran Pengguna

PASANKU dirancang dalam satu aplikasi monolitik Next.js (App Router) dengan pembagian hak akses berbasis peran (*Role-Based Access Control*) yang divalidasi di sisi server:

| Peran | Tanggung Jawab | Rute Utama |
| --- | --- | --- |
| **Learner** | Mengikuti pelajaran bertahap, mengerjakan latihan & Quiz Unit, menyelesaikan remedial, melihat Kamus, Papan Skor, dan Profil XP. Pendaftar publik otomatis mendapat peran `learner`. | `/learner`, `/learner/kamus`, `/learner/papan-skor`, `/learner/profil` |
| **Validator** | Memeriksa ketepatan kosakata Bahasa Pasan, arti Indonesia, contoh kalimat, soal, dan kunci jawaban; menyetujui atau meminta revisi dengan catatan. Validator tidak dapat menerbitkan konten langsung. | `/validator`, `/validator/riwayat`, `/validator/kamus` |
| **Admin** | Mengelola 5 unit kurikulum, menyusun urutan aktivitas materi/latihan pada Lesson Builder, mengelola bank soal Quiz Unit (15-20 soal), mendaftarkan akun Validator, dan menerbitkan konten yang sudah disetujui. | `/admin`, `/admin/units`, `/admin/quizzes`, `/admin/validators` |
| **Mode Pratinjau** | Jalur belajar terbuka penuh untuk Admin & Validator guna meninjau tampilan Learner (status `Terbit` maupun `Draf`) secara *stateless* tanpa mengubah progres atau XP Learner. | `/preview` |

---

## 2. Fitur Utama

- **Kurikulum 5 Unit, 25 Lesson, dan 5 Quiz Unit**:
  - Unit 1: Sapaan dan Ungkapan Dasar
  - Unit 2: Perkenalan Diri dan Identitas
  - Unit 3: Angka dan Benda di Sekitar
  - Unit 4: Keluarga dan Kehidupan Sehari-hari
  - Unit 5: Ungkapan dan Percakapan Sederhana
- **Microlearning & Urutan Fleksibel**: Materi singkat disajikan bertahap bersama latihan dalam satu lesson, dengan urutan aktivitas (`material` dan `exercise`) yang dapat diatur naik-turun oleh Admin.
- **5 Variasi Latihan & Soal Quiz**:
  1. Pilihan ganda Bahasa Pasan ke Bahasa Indonesia
  2. Pilihan ganda Bahasa Indonesia ke Bahasa Pasan
  3. Mencocokkan pasangan (*matching* dengan dukungan penilaian parsial per pasangan)
  4. Melengkapi ungkapan atau kalimat rumpang
  5. Memahami percakapan tertulis
- **Penilaian & Kelulusan Aman di Server**: Kunci jawaban terisolasi dan tidak pernah dikirim ke browser Learner. Ambang kelulusan lesson dan Quiz Unit adalah **75 dari 100**.
- **Rekomendasi Remedial Adaptif**: Apabila nilai Quiz Unit di bawah 75, sistem mengelompokkan jawaban salah berdasarkan `primary_lesson_id`, mengurutkan dari kesalahan terbanyak (seri diprioritaskan urutan lesson lebih awal), dan merekomendasikan maksimal **3 lesson remedial**. Quiz Unit hanya dapat diulang setelah seluruh remedial diselesaikan.
- **Gamifikasi XP Tanpa Duplikasi**:
  - Lulus lesson reguler pertama kali: **+10 XP**
  - Menyelesaikan lesson remedial pertama kali per lesson: **+5 XP**
  - Lulus Quiz Unit pertama kali: **+25 XP**
  - Pengulangan aktivitas atau percobaan gagal tidak menghasilkan XP tambahan.
- **Desain Mobile-First**: Navigasi bawah 4 tab dengan ikon solid di layar mobile (`< 768px`) dan *sidebar* di tablet/desktop (`>= 768px`), sesuai spesifikasi di [DESIGN.md](./DESIGN.md).

---

## 3. Teknologi yang Digunakan

- **Framework**: Next.js 16.4.6 (App Router, `cacheComponents: true`, `proxy.ts`)
- **Bahasa & UI**: TypeScript 5, React 19, Tailwind CSS v4 (`@tailwindcss/postcss`), Lucide React
- **Backend & Auth Terkelola**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`, PostgreSQL, Row Level Security)
- **Mode Pengembangan Lokal**: Penyimpanan JSON sisi server otomatis (`.pasanku-local-db.json`) saat environment Supabase belum dikonfigurasi

---

## 4. Struktur Direktori

```text
pasanku/
├── actions/                  # Server Actions (auth, learning, quiz, content, validation)
├── app/
│   ├── (auth)/               # Halaman login dan register
│   ├── (learner)/learner/    # Learning Path, Lesson Runner, Quiz Unit, Kamus, Papan Skor, Profil
│   ├── (validator)/validator/# Antrean review, detail pemeriksaan kunci jawaban, riwayat, kamus
│   ├── (admin)/admin/        # Dashboard pipeline, manajemen unit, builder lesson, quiz, validator
│   ├── preview/              # Mode Pratinjau Learning Path (Admin & Validator)
│   ├── globals.css           # Token warna @theme Tailwind v4 & utilitas tombol taktil
│   ├── layout.tsx            # Root layout (lang="id", font Candara & Segoe UI)
│   └── page.tsx              # Halaman Welcome & Landing
├── components/
│   ├── layout/               # AppShell responsif (Bottom Nav mobile & Sidebar desktop)
│   └── ui/                   # Komponen dasar (Button, Card, ProgressBar, Empty/Error states)
├── features/                 # Komponen interaktif per modul (auth, learning, quiz, content, validation)
├── lib/
│   ├── auth/                 # Manajemen sesi & pemeriksaan peran di server
│   ├── data/                 # Seed data kurikulum, sanitizer kunci jawaban, local store, repository
│   ├── domain/               # Logika murni: scoring, recommendation, gamification, access rules
│   └── supabase/             # Klien Supabase browser, server, dan admin
├── public/images/            # Aset maskot dan ikon aplikasi Pasanku
├── scripts/                  # Skrip verifikasi logika domain
├── supabase/
│   ├── migrations/           # Skema SQL 23 tabel, enum, trigger, dan RLS
│   └── seed.sql              # Data awal 5 unit kurikulum
├── types/                    # Definisi tipe TypeScript entitas Pasanku
├── DESIGN.md                 # Dokumen sistem desain UI/UX Pasanku
├── AGENTS.md                 # Aturan pengembangan Next.js 16 & filter antislop
└── proxy.ts                  # Proxy Next.js 16 untuk penjagaan rute awal
```

---

## 5. Menjalankan Secara Lokal

### Prasyarat
- Node.js 20+ (disarankan LTS atau Node 22/24)
- npm 10+

### Langkah Instalasi

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) pada browser. Jika variabel Supabase belum diisi, aplikasi otomatis berjalan menggunakan mode penyimpanan lokal.

### Akun Demo Lokal

Pada halaman [http://localhost:3000/login](http://localhost:3000/login), tersedia tombol **Akses Cepat Demo Lokal** atau gunakan kredensial berikut (kata sandi seluruh akun demo: `pasanku123`):

| Peran | Email |
| --- | --- |
| Learner | `learner@pasanku.id` |
| Validator | `validator@pasanku.id` |
| Admin | `admin@pasanku.id` |

> **Catatan**: Entri kosakata dan soal bawaan pada `lib/data/seed-data.ts` merupakan data kurikulum awal untuk uji coba sistem dan perlu diverifikasi oleh Validator/penutur asli Bahasa Pasan melalui panel Validator.

---

## 6. Konfigurasi Supabase (Produksi)

1. Salin berkas templat environment:
   ```bash
   cp .env.example .env.local
   ```
2. Isi variabel pada `.env.local` (jangan pernah mengunggah `.env.local` ke GitHub):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. Jalankan skrip SQL migrasi dan data awal pada **Supabase SQL Editor** secara berurutan:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/seed.sql`
4. Buat akun Admin pertama melalui Supabase Auth Dashboard, lalu tetapkan perannya secara terkontrol:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE id = '<UUID_ADMIN>';
   ```

---

## 7. Verifikasi dan Pengujian

Jalankan perintah berikut untuk memastikan logika domain, aturan *lint*, dan *build* produksi berjalan bersih:

```bash
# 1. Uji logika penilaian, rekomendasi adaptif, XP, dan aturan akses
node --experimental-strip-types scripts/verify-domain.ts

# 2. Pemeriksaan ESLint
npm run lint

# 3. Build produksi Next.js
npm run build
```

---

## Referensi Dokumentasi Proyek

- Sistem Desain UI/UX: [DESIGN.md](./DESIGN.md)
- Aturan Agen & Pengembangan: [AGENTS.md](./AGENTS.md)
- Dokumen Spesifikasi (PRD, SRS, SDD): folder `../docs/markdown/`
