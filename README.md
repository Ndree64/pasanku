# PASANKU

**Bahasa kita, warisan kita.**

Aplikasi pembelajaran Bahasa Pasan (Ratahan, Minahasa Tenggara) berbasis web menggunakan pendekatan *microlearning*, gamifikasi Experience Points (XP), validasi konten berjenjang, dan sistem rekomendasi remedial adaptif.

---

## Daftar Isi

1. [Gambaran Produk dan Peran Pengguna](#1-gambaran-produk-dan-peran-pengguna)
2. [Fitur Utama](#2-fitur-utama)
3. [Teknologi dan Optimasi Performa](#3-teknologi-dan-optimasi-performa)
4. [Struktur Direktori](#4-struktur-direktori)
5. [Menjalankan Secara Lokal](#5-menjalankan-secara-lokal)
6. [Konfigurasi Supabase dan Deploy Vercel](#6-konfigurasi-supabase-dan-deploy-vercel)
7. [Verifikasi dan Pengujian](#7-verifikasi-dan-pengujian)

---

## 1. Gambaran Produk dan Peran Pengguna

PASANKU dirancang dalam satu aplikasi Next.js (App Router) dengan pembagian hak akses berbasis peran (*Role-Based Access Control*) yang divalidasi di sisi server:

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
- **4 Variasi Latihan & Soal Quiz**:
  1. Pilihan ganda Bahasa Pasan ke Bahasa Indonesia (`multiple_choice_pasan_to_id`)
  2. Pilihan ganda Bahasa Indonesia ke Bahasa Pasan (`multiple_choice_id_to_pasan`)
  3. Mencocokkan pasangan (`matching`, dengan dukungan penilaian parsial per pasangan)
  4. Melengkapi ungkapan atau kalimat rumpang (`fill_blank`)
- **Penilaian & Kelulusan Aman di Server**: Kunci jawaban terisolasi oleh Row Level Security dan tidak pernah dikirim ke browser Learner. Ambang kelulusan lesson dan Quiz Unit adalah **75 dari 100**.
- **Rekomendasi Remedial Adaptif**: Apabila nilai Quiz Unit di bawah 75, sistem mengelompokkan jawaban salah berdasarkan `primary_lesson_id`, mengurutkan dari kesalahan terbanyak (seri diprioritaskan urutan lesson lebih awal), dan merekomendasikan maksimal **3 lesson remedial**. Quiz Unit hanya dapat diulang setelah seluruh remedial diselesaikan.
- **Gamifikasi XP Tanpa Duplikasi**:
  - Lulus lesson reguler pertama kali: **+10 XP**
  - Menyelesaikan lesson remedial pertama kali per lesson: **+5 XP**
  - Lulus Quiz Unit pertama kali: **+25 XP**
  - Pengulangan aktivitas atau percobaan gagal tidak menghasilkan XP tambahan.
- **Desain Mobile-First**: Navigasi bawah 4 tab dengan ikon solid di layar mobile (`< 768px`) dan *sidebar* di tablet/desktop (`>= 768px`), sesuai spesifikasi di [DESIGN.md](./DESIGN.md).

---

## 3. Teknologi dan Optimasi Performa

- **Framework**: Next.js 16.4.6 (App Router, `cacheComponents: true`, `partialPrefetching: true`, `proxy.ts`)
- **Bahasa & UI**: TypeScript 5, React 19, Tailwind CSS v4 (`@tailwindcss/postcss`), Lucide React
- **Backend & Auth**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`, PostgreSQL, Row Level Security)
- **Optimasi Kecepatan Muat**:
  - **Verifikasi JWT Lokal**: `getSessionUser` menggunakan `supabase.auth.getClaims()` sehingga pemeriksaan sesi tidak melakukan roundtrip HTTP berulang ke Supabase Auth.
  - **Caching Bertingkat (`"use cache"` + `cacheTag`)**: Query struktur ringan (`getCachedPathStructure`), kamus (`getCachedVocabularies`), kurikulum lengkap (`getCachedCurriculum`), status user (`getCachedUserState`), dan papan skor (`getCachedLeaderboardBase`) di-cache di server dan otomatis di-invalidasi via `revalidateTag` saat ada mutasi data.
  - **Persistent Shell Layouts**: `AppShell` dipasang di `layout.tsx` masing-masing panel (`(shell)`, `validator`, `admin`) sehingga sidebar dan bottom navigation tidak ikut me-remount atau berkedip saat berpindah halaman.
  - **Loading Skeleton Berbasis Pola**: Setiap halaman memiliki fallback `loading.tsx` dan `<Suspense>` dengan skeleton yang menyesuaikan struktur tata letak ([States.tsx](./components/ui/States.tsx)).

---

## 4. Struktur Direktori

```text
pasanku/
├── actions/                          # Server Actions (auth, learning, quiz, content, validation)
├── app/
│   ├── (auth)/                       # Halaman login dan register
│   ├── (learner)/
│   │   ├── (shell)/                  # Persistent layout AppShell untuk halaman tab Learner
│   │   │   ├── layout.tsx
│   │   │   └── learner/              # Jalur Belajar, Kamus, Papan Skor, Profil (+ loading.tsx)
│   │   └── learner/
│   │       ├── lessons/[lessonId]/   # Lesson Runner (tampilan fokus tanpa shell)
│   │       └── quizzes/[unitId]/     # Quiz Unit Runner (tampilan fokus tanpa shell)
│   ├── (validator)/validator/        # Layout persistent, Antrean, Detail Review, Riwayat, Kamus
│   ├── (admin)/admin/                # Layout persistent, Ringkasan, Unit, Builder Lesson, Quiz, Validator
│   ├── preview/                      # Mode Pratinjau Learning Path (Admin & Validator)
│   ├── globals.css                   # Token warna @theme Tailwind v4 & utilitas tombol taktil
│   ├── layout.tsx                    # Root layout (lang="id", font Candara & Segoe UI)
│   └── page.tsx                      # Halaman Welcome & Landing
├── components/
│   ├── layout/                       # AppShell responsif (Bottom Nav mobile & Sidebar desktop)
│   └── ui/                           # Primitives (Button, Card, ProgressBar) & States (Skeleton, Empty, Error)
├── features/                         # Komponen interaktif per modul (auth, learning, quiz, content, validation)
├── lib/
│   ├── auth/                         # Manajemen sesi (getClaims + cache profil) & pemeriksaan peran
│   ├── data/                         # supabase-store.ts, repository.ts, contracts.ts, sanitize.ts, question-builder.ts, seed-data.ts
│   ├── domain/                       # Logika murni: scoring, recommendation, gamification, access rules
│   └── supabase/                     # Klien Supabase server (cookie SSR) dan admin (service role singleton)
├── public/images/                    # Aset maskot dan ikon aplikasi Pasanku
├── scripts/                          # verify-domain.ts, seed-supabase.ts, test-supabase-login.ts
├── supabase/
│   ├── migrations/                   # Skema SQL 23 tabel, enum, trigger, dan RLS
│   └── seed.sql                      # Data awal 5 unit kurikulum
├── types/                            # Definisi tipe TypeScript entitas Pasanku
├── DESIGN.md                         # Dokumen sistem desain UI/UX Pasanku
├── AGENTS.md                         # Aturan pengembangan Next.js 16 & filter antislop
└── proxy.ts                          # Proxy Next.js 16 untuk penjagaan rute awal
```

---

## 5. Menjalankan Secara Lokal

### Prasyarat
- Node.js 20+ (disarankan LTS atau Node 22/24)
- npm 10+
- Project Supabase aktif (URL, Anon Key, dan Service Role Key)

### Langkah Instalasi

1. Salin berkas templat environment dan isi kredensial Supabase pada `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. Pasang dependensi, isi data awal ke Supabase, lalu jalankan server pengembangan:
   ```bash
   npm install
   node --experimental-strip-types scripts/seed-supabase.ts
   npm run dev
   ```

3. Buka [http://localhost:3000](http://localhost:3000) pada browser.

### Akun Awal (Hasil Seed Supabase)

| Peran | Email | Kata Sandi Default |
| --- | --- | --- |
| Learner | `learner@pasanku.id` | `pasanku123` |
| Validator | `validator@pasanku.id` | `pasanku123` |
| Admin | `admin@pasanku.id` | `pasanku123` |

> **Catatan**: Entri kosakata dan soal bawaan pada `lib/data/seed-data.ts` merupakan data kurikulum awal untuk uji coba sistem dan perlu diverifikasi oleh Validator/penutur asli Bahasa Pasan melalui panel Validator.

---

## 6. Konfigurasi Supabase dan Deploy Vercel

### Setup Database Supabase
1. Jalankan skrip SQL migrasi [0001_initial_schema.sql](./supabase/migrations/0001_initial_schema.sql) di **Supabase SQL Editor**.
2. Jalankan `node --experimental-strip-types scripts/seed-supabase.ts` (atau [seed.sql](./supabase/seed.sql)) untuk mengisi 5 unit, 25 lesson, kosakata, soal latihan, dan quiz.
3. Jangan pernah mengunggah berkas `.env.local` ke GitHub.

### Optimasi Deploy di Vercel
- Tambahkan `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` pada **Vercel Environment Variables**.
- **Samakan Function Region dengan Region Supabase**: Ubah **Project Settings -> Functions -> Function Region** di Vercel ke region terdekat dengan database Supabase Anda (misalnya sama-sama **Singapore `sin1` / `ap-southeast-1`**) agar latensi koneksi server ke database tetap rendah (~5-20 ms).

---

## 7. Verifikasi dan Pengujian

Jalankan perintah berikut untuk memastikan logika domain, aturan *lint*, autentikasi Supabase, dan *build* produksi berjalan bersih:

```bash
# 1. Uji logika penilaian, rekomendasi adaptif, XP, dan aturan akses
node --experimental-strip-types scripts/verify-domain.ts

# 2. Uji login & profil ke Supabase Auth (opsional)
node --experimental-strip-types scripts/test-supabase-login.ts

# 3. Pemeriksaan ESLint
npm run lint

# 4. Build produksi Next.js
npm run build
```

---

## Referensi Dokumentasi Proyek

- Sistem Desain UI/UX: [DESIGN.md](./DESIGN.md)
- Aturan Agen & Pengembangan: [AGENTS.md](./AGENTS.md)
- Dokumen Spesifikasi (PRD, SRS, SDD): folder `../docs/markdown/`
