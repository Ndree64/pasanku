# Panduan Belajar Project-Based: Membangun Aplikasi PASANKU dari Nol

Panduan ini dirancang untuk membantumu mempelajari **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, dan **Supabase** secara langsung dengan membangun ulang aplikasi **PASANKU** (pembelajaran Bahasa Pasan berbasis *microlearning*) tahap demi tahap.

Setiap milestone disusun dari lapisan paling aman hingga fitur lengkap, mengikuti praktik industri (*best practice*) agar kamu paham **mengapa** kode ditulis seperti itu, bukan sekadar menyalin kode.

---

## Daftar Isi

- [Peta Konsep Wajib Paham](#peta-konsep-wajib-paham)
- [Milestone 0: Setup Project, Tailwind v4, dan Sistem Desain](#milestone-0-setup-project-tailwind-v4-dan-sistem-desain)
- [Milestone 1: Pemodelan TypeScript dan Domain Logic Murni](#milestone-1-pemodelan-typescript-dan-domain-logic-murni)
- [Milestone 2: Database PostgreSQL dan Keamanan Supabase](#milestone-2-database-postgresql-dan-keamanan-supabase)
- [Milestone 3: Autentikasi, Proxy Penjaga Rute, dan RBAC](#milestone-3-autentikasi-proxy-penjaga-rute-dan-rbac)
- [Milestone 4: Persistent Layout Shell dan Loading Skeleton](#milestone-4-persistent-layout-shell-dan-loading-skeleton)
- [Milestone 5: Fitur Inti Learner](#milestone-5-fitur-inti-learner)
- [Milestone 6: Panel Admin, Panel Validator, dan Mode Pratinjau](#milestone-6-panel-admin-panel-validator-dan-mode-pratinjau)
- [Milestone 7: Optimasi Performa, Pengujian, dan Deploy ke Vercel](#milestone-7-optimasi-performa-pengujian-dan-deploy-ke-vercel)
- [Peta Referensi File dan Jebakan Umum Pemula](#peta-referensi-file-dan-jebakan-umum-pemula)

---

## Peta Konsep Wajib Paham

Sebelum menulis kode, pahami peran masing-masing teknologi di stack ini:

| Teknologi | Peran di Aplikasi | Analogi Sederhana |
| --- | --- | --- |
| **React 19** | Membangun komponen antarmuka (tombol, kartu, form) dan state interaktif (`useState`, `useMemo`) | Batu bata penyusun tampilan UI |
| **TypeScript 5** | Menambahkan tipe data statis agar salah ketik properti langsung ketahuan sebelum aplikasi dijalankan | Pengecek ejaan dan kontrak data |
| **Next.js 16** | Mengatur routing berbasis folder, Server Component, Server Action, dan cache server | Kerangka bangunan utama (frontend + backend) |
| **Tailwind CSS v4** | Styling cepat lewat class utility dan token tema terpusat di `@theme` | Palet cat dan ukuran seragam |
| **Supabase** | Database PostgreSQL, sistem Login/Register (Auth), dan isolasi data berbasis Row Level Security (RLS) | Gudang data + satpam autentikasi |

### 5 Konsep Kunci Next.js 16 yang Harus Kamu Kuasai

1. **Server Component vs Client Component (`"use client"`)**
   - Secara *default*, semua file di folder `app/` adalah **Server Component**: berjalan di server, aman memakai rahasia server, tidak menambah ukuran JavaScript browser, dan bisa langsung memanggil database.
   - Tambahkan `"use client"` di baris pertama file **hanya jika** komponen butuh interaksi browser: `useState`, `onClick`, `onChange`, `usePathname`, atau `useActionState`.
   - *Best practice*: taruh logika fetch data di Server Component (`page.tsx`), lalu kirim hasilnya sebagai `props` ke Client Component di folder `features/`.

2. **Server Actions (`"use server"`)**
   - Fungsi async yang berjalan aman di server, tetapi bisa dipanggil langsung dari `<form action={...}>` atau event handler di Client Component (tanpa perlu repot membuat API endpoint `/api/...` manual).
   - Dipakai di folder `actions/` (`auth.ts`, `learning.ts`, `quiz.ts`, `content.ts`, `validation.ts`).

3. **File-Based Routing & Konvensi Khusus App Router**
   - `page.tsx`: halaman yang tampil ke URL (mis. `app/(learner)/(shell)/learner/kamus/page.tsx` -> `/learner/kamus`).
   - `layout.tsx`: pembungkus UI yang tetap menempel saat pindah sub-halaman (ideal untuk sidebar dan navigasi bawah).
   - `loading.tsx`: UI loading otomatis (skeleton) selama `page.tsx` mengambil data di server.
   - `(nama-grup)`: folder dalam tanda kurung disebut **Route Group** untuk mengelompokkan rute dan layout tanpa mengubah URL.

4. **`cacheComponents: true`, `<Suspense>`, dan `"use cache"`**
   - Di Next.js 16 dengan `cacheComponents: true`, komponen yang membaca data dinamis (seperti `cookies()`, `params`, `searchParams`, atau query DB non-cache) **wajib** dibungkus `<Suspense fallback={...}>` agar kerangka statis langsung terkirim (*Partial Prerendering*).
   - Fungsi berat yang jarang berubah bisa ditandai `"use cache"` + `cacheLife("minutes")` + `cacheTag("nama-tag")`, lalu di-refresh otomatis saat mutasi lewat `revalidateTag("nama-tag", "max")`.

5. **Row Level Security (RLS) & Pemisahan Kunci Jawaban**
   - Aturan keamanan di level PostgreSQL. Di Pasanku, tabel soal (publik) dipisahkan dari tabel kunci jawaban (`lesson_question_answer_keys`, `quiz_question_answer_keys`) sehingga browser Learner **tidak pernah** bisa mengintip kunci jawaban.

### Cara Belajar Efektif dari Panduan Ini
1. Kerjakan **satu milestone sampai selesai dan teruji** sebelum pindah ke milestone berikutnya.
2. Jangan hanya menyalin kode: baca bagian *"Kenapa pakai cara ini?"* di setiap tahap.
3. Setiap kali menyelesaikan milestone, jalankan verifikasi (test domain, `npm run lint`, atau `npm run build`).

---

## Milestone 0: Setup Project, Tailwind v4, dan Sistem Desain

**Tujuan**: Menyiapkan fondasi project Next.js 16, tema warna hangat Pasanku, dan komponen UI dasar yang bisa dipakai ulang di semua halaman.

### Langkah 0.1: Inisialisasi Project & Dependensi
Buat project Next.js baru dengan TypeScript, Tailwind CSS, dan ESLint:

```bash
npx create-next-app@latest pasanku --typescript --tailwind --eslint --app --no-src-dir
cd pasanku
npm install @supabase/supabase-js @supabase/ssr lucide-react
npm install -D @tailwindcss/postcss
```

### Langkah 0.2: Konfigurasi `next.config.ts` & `postcss.config.mjs`
Aktifkan `cacheComponents` dan `partialPrefetching` di `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
```

Pastikan `postcss.config.mjs` memakai `@tailwindcss/postcss`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

Di `package.json`, apabila menjalankan di Windows dengan Node v24 dan Turbopack mengalami kendala PostCSS worker, gunakan `--webpack` pada skrip `dev` dan `build`:

```json
"scripts": {
  "dev": "next dev --webpack",
  "build": "next build --webpack",
  "start": "next start",
  "lint": "eslint"
}
```

### Langkah 0.3: Token Desain di `app/globals.css` & Root `app/layout.tsx`
Daripada menuliskan kode hex warna berulang-ulang di komponen (`bg-[#FFF9F0]`), definisikan token tema satu kali di `app/globals.css` memakai blok `@theme`:

```css
@import "tailwindcss";

@theme {
  --color-canvas: #fff9f0;
  --color-surface: #ffffff;
  --color-surface-soft: #faf2e6;
  --color-surface-highlight: #fff0db;
  --color-border-subtle: #efe4d4;
  --color-border-control: #dccab4;

  --color-ink: #4a1f0c;
  --color-ink-soft: #7b4e38;

  --color-brand: #c92a2a;
  --color-brand-lip: #9e1f1f;
  --color-brand-tint: #fdeaea;

  --color-accent: #f5a623;
  --color-accent-lip: #c97f09;
  --color-accent-tint: #fff6e0;
  --color-accent-border: #e2b86b;

  --color-success: #2b7a4b;
  --color-success-lip: #1d5735;
  --color-success-tint: #e7f6ed;

  --radius-panel: 20px;
  --radius-card: 16px;
  --radius-control: 12px;
  --radius-chip: 999px;
}
```

Di `app/layout.tsx`, pasang bahasa dokumen `lang="id"`, metadata aplikasi, dan import `globals.css`.

### Langkah 0.4: Komponen Dasar UI (`components/ui/`)
Buat dua file dasar:
1. `components/ui/Primitives.tsx`:
   - `Button` (mendukung varian `primary`, `accent`, `success`, `secondary`, `ghost` serta tinggi sentuh minimal 44-50px untuk mobile).
   - `Card` (dengan prop `focal` opsional).
   - `ProgressBar` (lengkap dengan `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`).
   - `ContentStatusBadge` (memetakan 5 status konten: `draft`, `pending_review`, `changes_requested`, `approved`, `published`).
   - `XpBadge` dan `WovenDivider`.
2. `components/ui/States.tsx`:
   - `EmptyState`, `ErrorState` (`role="alert"`), dan blok `Skeleton`.

**Checklist Milestone 0**:
- [ ] `npm run dev` berjalan di `http://localhost:3000`.
- [ ] Latar krem `#FFF9F0` (`bg-canvas`) dan warna teks cokelat tua `#4A1F0C` (`text-ink`) aktif.
- [ ] `npm run lint` lolos tanpa error.

---

## Milestone 1: Pemodelan TypeScript dan Domain Logic Murni

**Tujuan**: Menulis aturan bisnis inti (penilaian soal, remedial adaptif, XP, dan pembukaan kunci unit/lesson) dalam file TypeScript murni **sebelum** menyentuh database atau UI.

> **Kenapa best practice?** Logika bisnis yang murni (tanpa `fetch`, tanpa Supabase, tanpa React) bisa diuji dalam hitungan milidetik, mudah dibaca, dan tidak akan rusak saat tampilan UI berubah.

### Langkah 1.1: Definisikan Tipe Data (`types/pasanku.ts`)
Gunakan **Discriminated Union** pada `QuestionData`, `AnswerKey`, dan `QuestionResponseData` untuk 4 format soal yang diizinkan:
1. `multiple_choice_pasan_to_id`
2. `multiple_choice_id_to_pasan`
3. `matching`
4. `fill_blank`

Contoh pola Discriminated Union di TypeScript:

```ts
export type QuestionType =
  | "multiple_choice_pasan_to_id"
  | "multiple_choice_id_to_pasan"
  | "matching"
  | "fill_blank";

export type QuestionResponseData =
  | { selectedOption: string }
  | { pairs: Record<string, string> }
  | { selectedOption: string; answerText?: string };
```

Dengan union seperti ini, TypeScript memaksa kita menangani seluruh varian tipe soal secara aman.

### Langkah 1.2: Pecah Aturan Bisnis ke 4 File Kecil (`lib/domain/`)
1. `lib/domain/scoring.ts`:
   - `PASSING_SCORE = 75`.
   - `gradeQuestion()`: menilai jawaban per soal. Untuk `matching`, hitung poin parsial proporsional berdasarkan jumlah pasangan yang benar.
   - `calculatePercentageScore()` dan `isScorePassed()`.
2. `lib/domain/recommendation.ts`:
   - `generateRemedialPlan()`: saat Learner gagal Quiz Unit (< 75), kelompokkan soal yang salah berdasarkan `primaryLessonId`, abaikan yang kesalahannya 0, urutkan dari jumlah salah terbanyak (jika seri, prioritaskan nomor urut lesson lebih kecil), lalu ambil maksimal **3 lesson remedial**.
3. `lib/domain/gamification.ts`:
   - `XP_REWARDS`: `{ lesson: 10, remedial: 5, quiz: 25 }`.
   - `getXpAwardIfEligible()`: hanya memberi XP bila `passed === true` dan belum pernah ada transaksi XP untuk kombinasi `(userId, activityType, referenceId)` yang sama.
   - `calculateLevel()` dan `computeBadges()`.
4. `lib/domain/access.ts`:
   - `isUnitUnlocked()`, `isLessonUnlocked()`, `canStartQuiz()`.
   - Aturan: Unit 1 terbuka otomatis; Lesson 1 di unit terbuka langsung aktif; Lesson 2-5 terbuka jika lesson sebelumnya lulus versi terbaru; Quiz Unit terbuka hanya jika 5 lesson terbit sudah lulus dan **0 remedial aktif** (kecuali `isPreview: true`).

### Langkah 1.3: Uji Domain Logic (`scripts/verify-domain.ts`)
Gunakan modul bawaan `node:assert/strict` untuk menguji setiap fungsi domain di atas tanpa perlu install framework test tambahan:

```bash
node --experimental-strip-types scripts/verify-domain.ts
```

**Checklist Milestone 1**:
- [ ] Keempat file di `lib/domain/` bebas dari import React atau Supabase.
- [ ] `verify-domain.ts` mencetak `100% PASS` termasuk kasus *partial credit matching*, batas maksimal 3 remedial, dan pencegahan XP ganda.

---

## Milestone 2: Database PostgreSQL dan Keamanan Supabase

**Tujuan**: Menghubungkan aplikasi ke PostgreSQL dan Auth terkelola di Supabase dengan struktur tabel yang aman.

### Langkah 2.1: Siapkan Environment (`.env.local`)
Buat `.env.local` (pastikan ada di `.gitignore` agar tidak pernah terunggah ke GitHub):

```env
NEXT_PUBLIC_SUPABASE_URL=https://project-kamu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

> **Penting**: Jangan pernah menaruh awalan `NEXT_PUBLIC_` pada `SUPABASE_SERVICE_ROLE_KEY`. Service role bypasses RLS dan hanya boleh berjalan di server.

### Langkah 2.2: Migrasi Skema SQL & RLS (`supabase/migrations/0001_initial_schema.sql`)
Jalankan SQL migrasi di **Supabase SQL Editor** yang mencakup:
- **23 tabel & enum**: `profiles`, `units`, `lessons`, `lesson_activities`, `lesson_materials`, `vocabularies`, `material_vocabularies`, `material_examples`, `lesson_questions`, `lesson_question_answer_keys`, `unit_quizzes`, `quiz_questions`, `quiz_question_answer_keys`, `content_reviews`, `learner_lesson_progress`, `lesson_activity_progress`, `unit_unlocks`, `quiz_attempts`, `remedial_assignments`, `xp_transactions`, dan tabel pendukung.
- **Trigger `handle_new_user()`**: setiap user mendaftar via Supabase Auth otomatis dibuatkan baris di `public.profiles` dengan peran `learner`.
- **Row Level Security (RLS)**: tabel kunci jawaban (`lesson_question_answer_keys` dan `quiz_question_answer_keys`) hanya boleh dibaca oleh `admin` dan `validator`, terblokir total untuk `learner`.

### Langkah 2.3: Dua Klien Supabase di Server (`lib/supabase/`)
1. `lib/supabase/server.ts` (`createSupabaseServerClient`): membaca dan menulis cookie sesi pengguna menggunakan `cookies()` dari `next/headers` + `@supabase/ssr`.
2. `lib/supabase/admin.ts` (`createSupabaseAdminClient`): memakai `SUPABASE_SERVICE_ROLE_KEY` untuk query agregat atau penilaian di server, disimpan sebagai **singleton** agar tidak membuat ulang koneksi di setiap panggilan.

### Langkah 2.4: Seed Data Kurikulum (`scripts/seed-supabase.ts`)
Jalankan skrip seed untuk mengisi 3 akun awal (`learner@pasanku.id`, `validator@pasanku.id`, `admin@pasanku.id`, sandi `pasanku123`) beserta 5 unit, 25 lesson, 20 kosakata, soal latihan, dan quiz unit.

**Checklist Milestone 2**:
- [ ] Seluruh tabel dan policy RLS terbentuk di Supabase.
- [ ] `scripts/seed-supabase.ts` selesai tanpa error dan data terlihat di Supabase Table Editor.

---

## Milestone 3: Autentikasi, Proxy Penjaga Rute, dan RBAC

**Tujuan**: Mengamankan seluruh rute berdasarkan sesi login dan peran pengguna (`learner`, `validator`, `admin`).

### Langkah 3.1: Manajemen Sesi Berperforma Tinggi (`lib/auth/session.ts`)
Gunakan pola **3 lapis efisiensi**:
1. **`React.cache()`** pada `getSessionUser()`: meskipun `layout.tsx` dan `page.tsx` sama-sama memanggil `requireRole()`, sesi hanya dicek 1 kali per request HTTP.
2. **`supabase.auth.getClaims()`** menggantikan `getUser()`: memverifikasi JWT langsung di server lokal (~0-2 ms) tanpa melakukan HTTP roundtrip ke server Supabase Auth di tiap perpindahan halaman.
3. **`getCachedProfileRow(userId)`** dengan `"use cache"` + `cacheTag("profiles")`: data profil (peran & status aktif) di-cache dan ditolak otomatis jika `is_active === false`.

Lalu sediakan dua guard helper:
- `requireUser()`: redirect ke `/login` jika belum masuk.
- `requireRole(allowedRoles)`: redirect ke beranda peran masing-masing (`getDefaultHomeByRole`) jika role tidak cocok.

### Langkah 3.2: Proxy Penjaga Rute Awal (`proxy.ts`)
Di Next.js 16, file penjaga rute bernama `proxy.ts` (menggantikan `middleware.ts` lama). Cek keberadaan cookie sesi Supabase (`sb-*`) untuk rute terproteksi (`/learner/*`, `/validator/*`, `/admin/*`, `/preview/*`) sebelum halaman di-render.

### Langkah 3.3: Server Actions Autentikasi (`actions/auth.ts`)
- `loginAction`: panggil `supabase.auth.signInWithPassword()`, hangatkan cache profil dengan `getCachedProfileRow(user.id)`, cek `is_active`, lalu `redirect()` sesuai role.
- `registerAction`: panggil `supabase.auth.signUp()`, invalidasi cache `revalidateTag("profiles", "max")` & `revalidateTag("leaderboard", "max")`, lalu redirect ke `/learner`.
- `logoutAction`: panggil `supabase.auth.signOut()` dan redirect ke `/login`.

### Langkah 3.4: Halaman Publik (`app/page.tsx`, `app/(auth)/login/`, `app/(auth)/register/`)
Di `LoginForm.tsx` dan `RegisterForm.tsx`, gunakan hook React 19 `useActionState(loginAction, initialState)` untuk menangani loading state `pending` dan pesan error dari server secara otomatis tanpa `fetch()` manual.

**Checklist Milestone 3**:
- [ ] Akses `/learner` tanpa login otomatis diarahkan ke `/login`.
- [ ] Akun `learner` yang membuka `/admin` otomatis dikembalikan ke `/learner`.
- [ ] `scripts/test-supabase-login.ts` lolos untuk ke-3 peran dan menolak kata sandi salah.

---

## Milestone 4: Persistent Layout Shell dan Loading Skeleton

**Tujuan**: Membuat navigasi yang responsif (*mobile-first*) dan tidak ikut berkedip atau menghilang saat berpindah antar tab.

### Langkah 4.1: Shell Responsif (`components/layout/AppShell.tsx`)
Bangun satu komponen shell untuk ke-3 peran:
- **Mobile (`< 768px`)**: header atas ringkas + **Bottom Navigation 4 tab** tetap di bawah (`h-[68px]`) dengan target sentuh `>= 44px`.
- **Tablet & Desktop (`>= 768px`)**: **Sidebar kiri (`248px`)** lengkap dengan penanda tab aktif menggunakan `usePathname()`.

### Langkah 4.2: Pindahkan `AppShell` ke `layout.tsx` Menggunakan Route Group
Jangan taruh `<AppShell>` di dalam setiap `page.tsx`, karena akan memaksa sidebar me-render ulang setiap pindah tab. Gunakan struktur berikut:
- `app/(learner)/(shell)/layout.tsx`: membungkus `/learner`, `/learner/kamus`, `/learner/papan-skor`, dan `/learner/profil` dengan `<AppShell>`.
- Biarkan `app/(learner)/learner/lessons/[lessonId]/page.tsx` dan `app/(learner)/learner/quizzes/[unitId]/page.tsx` di **luar `(shell)`** agar tampilan pengerjaan soal tetap fokus layar penuh tanpa gangguan navigasi.
- Buat hal yang sama untuk `app/(validator)/validator/layout.tsx` dan `app/(admin)/admin/layout.tsx`.

### Langkah 4.3: Pola Loading Skeleton (`components/ui/States.tsx` & `loading.tsx`)
Ikuti 3 aturan best practice skeleton:
1. **Pisahkan Shell dan Konten**: `ShellSkeleton` hanya dipakai sebagai fallback `<Suspense>` di `layout.tsx`, sedangkan tiap `page.tsx` dan `loading.tsx` hanya merender skeleton kontennya (`LearningPathSkeleton`, `KamusSkeleton`, `LeaderboardSkeleton`, `ProfileSkeleton`, `DashboardSkeleton`, `ListDetailSkeleton`, `RunnerSkeleton`).
2. **Samakan Geometri**: samakan tinggi, jumlah kolom grid responsif, dan radius sudut dengan UI asli untuk mencegah *layout shift* (CLS).
3. **Aksesibilitas**: gunakan `role="status"`, `aria-busy="true"`, `aria-label` pada wrapper, `aria-hidden="true"` pada kotak placeholder, serta token warna hangat (`bg-surface-soft`).

**Checklist Milestone 4**:
- [ ] Pindah antara Belajar, Kamus, Papan Skor, dan Profil tidak membuat sidebar atau bottom nav berkedip.
- [ ] Saat throttling `Slow 3G` di Chrome DevTools, skeleton konten tampil rapi di dalam shell.

---

## Milestone 5: Fitur Inti Learner

**Tujuan**: Mengimplementasikan seluruh alur belajar Learner mulai dari Learning Path, Lesson Runner, Quiz Unit, Remedial Adaptif, Kamus, Papan Skor, hingga Profil XP.

### Langkah 5.1: Isolasi Data & Sanitizer (`lib/data/`)
- `lib/data/contracts.ts`: kontrak tipe data respons untuk view (seperti `LearningPathPayload`, `LessonRunnerPayload`, `QuizRunnerPayload`).
- `lib/data/sanitize.ts`: fungsi `toPublicLessonQuestion()` dan `toPublicQuizQuestion()` yang membuang properti rahasia sebelum objek soal dikirim ke Client Component.
- `lib/data/supabase-store.ts` & `lib/data/repository.ts`: seluruh query database dan mutasi server dipusatkan di `supabase-store.ts`, lalu diekspor lewat `repository.ts` agar pemanggil (`page.tsx` dan `actions/`) tetap bersih.

### Langkah 5.2: UI Interaktif Learner (`features/learning/` & `features/quiz/`)
1. `LearningPathView.tsx`: menampilkan 5 unit dan lingkaran node lesson zig-zag, status terkunci/aktif/lulus, kartu Quiz Unit, serta banner tugas remedial jika ada.
2. `QuestionWidget.tsx`: satu komponen reusable untuk 4 variasi soal (`multiple_choice_pasan_to_id`, `multiple_choice_id_to_pasan`, `matching` ketuk kiri-kanan, `fill_blank` bank kata).
3. `LessonRunner.tsx`: memandu Learner melewati langkah `material` dan `exercise` secara berurutan, lalu menampilkan skor, pembahasan, dan perolehan XP.
4. `QuizRunner.tsx`: menampilkan 15-20 soal Quiz Unit. Jika lulus (`>= 75`), membuka unit berikutnya; jika gagal (`< 75`), menampilkan maksimal 3 lesson remedial beserta jumlah kesalahannya.
5. `KamusView.tsx`: pencarian kata *real-time* + filter per unit (gunakan `useMemo` agar ringan saat mengetik).

### Langkah 5.3: Server Actions Pembelajaran (`actions/learning.ts` & `actions/quiz.ts`)
- Setiap selesai materi (`completeMaterialStepAction`), evaluasi lesson (`submitLessonEvaluationAction`), atau evaluasi quiz (`submitQuizEvaluationAction`):
  1. Validasi sesi lewat `requireUser()` (dan cek peran jika `mode === "preview"`).
  2. Hitung skor dan XP sepenuhnya di server menggunakan `lib/domain/*`.
  3. Invalidasi cache user dan papan skor:
     ```ts
     revalidateTag(`user-${user.id}`, "max");
     revalidateTag("leaderboard", "max");
     revalidatePath("/learner");
     ```

**Checklist Milestone 5**:
- [ ] Learner bisa menyelesaikan Lesson 1.1, mendapat +10 XP sekali saja, dan Lesson 1.2 otomatis terbuka.
- [ ] Pada tab Network DevTools, payload `LessonRunner` maupun `QuizRunner` **tidak mengandung** kunci jawaban soal.
- [ ] Nilai Quiz < 75 memunculkan tugas remedial dan mengunci pengulangan Quiz sampai remedial tuntas.

---

## Milestone 6: Panel Admin, Panel Validator, dan Mode Pratinjau

**Tujuan**: Membangun alur kerja penyusunan dan penjaminan kualitas konten sebelum materi/soal dilihat Learner.

### Langkah 6.1: Mesin Status Konten (*Content Lifecycle*)
Pastikan seluruh aksi menghormati alur status berikut:

```text
draft -> pending_review -> approved -> published
                  \-> changes_requested -> (Admin revisi) -> pending_review
```

- Validator **tidak boleh** langsung menerbitkan konten (`published`), hanya bisa `approved` atau `changes_requested` (wajib mengisi catatan revisi).
- Mengedit lesson yang sudah `published` otomatis menaikkan `content_version` dan mengembalikan status ke `draft` agar tetap divalidasi ulang.

### Langkah 6.2: Panel Admin (`app/(admin)/admin/` & `features/content/`)
- **Composer Soal Terpadu**: pisahkan parser form ke `lib/data/question-builder.ts` (`parseQuestionFormData`) dan field UI-nya ke `features/content/QuestionComposerFields.tsx`. Komponen yang sama dipakai ulang di **Lesson Builder**, **Quiz Manager**, dan **Validator Review Detail** agar tidak ada duplikasi logika form 4 tipe soal.
- `UnitsManagerClient.tsx`: melihat 5 unit, membuat lesson baru, dan masuk ke builder lesson.
- `LessonBuilderClient.tsx`: mengubah metadata lesson, menambah materi + contoh kalimat, menambah latihan 4 tipe soal, mengatur urutan naik-turun, mengajukan review, membatalkan pengajuan, dan menerbitkan konten `approved`.
- `QuizManagerClient.tsx`: mengelola 15-20 soal per Quiz Unit dan menghubungkan tiap soal ke `primaryLessonId` (bahan untuk sistem remedial adaptif).
- `ValidatorsManagerClient.tsx`: mendaftarkan akun penutur/validator baru dan mengaktifkan/menonaktifkan akun.

### Langkah 6.3: Panel Validator (`app/(validator)/validator/` & `features/validation/`)
- `ValidatorQueueClient.tsx`: daftar pengajuan review konten lengkap dengan ringkasan jumlah status.
- `ReviewDetailClient.tsx`: menampilkan materi, kosakata, contoh kalimat, serta soal **beserta kunci jawabannya** untuk diperiksa Validator, lalu mengirim keputusan lewat `actions/validation.ts`.

### Langkah 6.4: Mode Pratinjau (`app/preview/page.tsx`)
- Hanya untuk `admin` dan `validator` (`requireRole(["admin", "validator"])`).
- Memanggil `getLearningPathData(user.id, { isPreview: true, includeUnpublished })` sehingga seluruh unit, lesson, dan quiz terbuka *stateless* (tanpa menyimpan progres atau XP).

**Checklist Milestone 6**:
- [ ] Admin bisa membuat soal baru untuk ke-4 format dan mengirim lesson ke antrean Validator.
- [ ] Validator bisa menyetujui atau meminta revisi dengan catatan wajib.
- [ ] Konten baru tampil di akun Learner hanya setelah Admin menekan **Terbitkan**.

---

## Milestone 7: Optimasi Performa, Pengujian, dan Deploy ke Vercel

**Tujuan**: Memangkas waktu muat dari detik ke puluhan milidetik, memastikan build produksi bersih, dan men-deploy ke cloud dengan konfigurasi optimal.

### Langkah 7.1: Strategi Caching Berlapis & Eliminasi Waterfall
Terapkan 4 teknik optimasi utama di `lib/data/supabase-store.ts`:
1. **Pecah Cache Sesuai Kebutuhan Halaman** (jangan menarik 10 tabel untuk halaman yang cuma butuh 3 tabel):
   - `getCachedPathStructure()`: hanya `units`, `lessons`, `unit_quizzes` (untuk `/learner`, `/learner/profil`, `/preview`, `/admin`, `/validator`).
   - `getCachedVocabularies()`: khusus halaman Kamus.
   - `getCachedCurriculum()`: lengkap 10 tabel (hanya untuk Lesson/Quiz Runner & Admin Builder).
2. **Cache Status Per User (`getCachedUserState(userId)`)**: gabungkan `unit_unlocks`, `learner_lesson_progress`, `remedial_assignments`, `quiz_attempts`, `xp_transactions`, dan `lesson_activity_progress` dalam satu `Promise.all` ber-tag `user-${userId}`.
3. **Cache Data Publik Agregat**: `getCachedLeaderboardBase()` (`cacheTag("leaderboard")`) dan `listAuthEmails()` (`cacheTag("profiles")`).
4. **Hindari Query Berurutan (Waterfall)**: pada `sbGetPrivilegedContentDetail()`, jalankan pembacaan kurikulum, antrean review, dan tabel kunci jawaban secara paralel dalam `Promise.all`.

### Langkah 7.2: Verifikasi Sebelum Deploy
Jalankan ketiga perintah ini setiap selesai perubahan besar:

```bash
# 1. Uji seluruh logika domain murni
node --experimental-strip-types scripts/verify-domain.ts

# 2. Uji login & RLS Supabase Auth
node --experimental-strip-types scripts/test-supabase-login.ts

# 3. Pemeriksaan aturan kode & lint
npm run lint

# 4. Build produksi penuh (memverifikasi TypeScript & ke-22 rute Next.js)
npm run build
```

### Langkah 7.3: Deploy ke Vercel (Tips Krusial)
1. Push repository ke GitHub (pastikan `.env.local` **tidak ikut ter-push**).
2. Hubungkan repo di Vercel dan isi 3 environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. **Samakan Function Region dengan Region Supabase**:
   - Secara default, Vercel menjalankan fungsi server di US East (`iad1`), sedangkan database Supabase Asia umumnya berada di Singapura (`ap-southeast-1`).
   - Ubah **Vercel Project Settings -> Functions -> Function Region** menjadi **Singapore (`sin1`)**. Tanpa langkah ini, setiap query server ke database tetap terkena latensi lintas benua (~250-500 ms per roundtrip).

---

## Peta Referensi File dan Jebakan Umum Pemula

### Peta Ringkas Folder Proyek

```text
pasanku/
├── app/                     # Rute URL, layout persistent, loading.tsx, & Server Component halaman
├── actions/                 # Server Actions ("use server") sebagai gerbang mutasi aman
├── components/              # Komponen UI umum (AppShell, Primitives, States/Skeleton)
├── features/                # Client Component spesifik fitur (Learning, Quiz, Auth, Content, Validation)
├── lib/
│   ├── auth/                # getSessionUser (getClaims + cache), requireUser, requireRole
│   ├── data/                # supabase-store.ts, repository.ts, contracts.ts, sanitize.ts, question-builder.ts
│   ├── domain/              # Logika bisnis murni tanpa framework (scoring, recommendation, gamification, access)
│   └── supabase/            # Klien server SSR & klien admin singleton
├── scripts/                 # Utilitas CLI: verify-domain.ts, seed-supabase.ts, test-supabase-login.ts
├── supabase/migrations/     # Skema PostgreSQL & Row Level Security
├── types/                   # Kontrak TypeScript entitas aplikasi
└── proxy.ts                 # Guard ringan berbasis cookie di Next.js 16
```

### 6 Jebakan Pemula yang Wajib Dihindari
1. **Lupa `<Suspense>` saat `cacheComponents: true` aktif**: Next.js 16 akan menggagalkan `npm run build` dengan error `blocking-route` bila ada halaman yang membaca `cookies()`, `params`, atau `searchParams` tanpa pembungkus `<Suspense>`.
2. **Menaruh `"use client"` di `page.tsx`**: menyebabkan kamu tidak bisa memanggil `requireRole()` atau `supabase-store` secara langsung dan memperbesar bundle JS user.
3. **Mengirim kunci jawaban dari server ke client**: selalu lewatkan soal ke `sanitize.ts` sebelum mengirim payload ke browser Learner.
4. **Lupa `revalidateTag` setelah mutasi**: halaman yang memakai `"use cache"` akan terus menampilkan data lama meskipun database sudah diperbarui.
5. **Menjalankan `await` berurutan yang tidak saling bergantung**: dua query independen yang di-`await` satu per satu menggandakan waktu tunggu; selalu gabungkan dengan `Promise.all([...])`.
6. **Mengabaikan error saat menjalankan skrip `.ts` di Node**: untuk skrip di folder `scripts/`, pastikan `"scripts"` masuk daftar `"exclude"` di `tsconfig.json` agar `next build` tidak ikut memeriksa import `.ts` mentah milik CLI Node.
