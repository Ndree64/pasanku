import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Sparkles, Target } from "lucide-react";
import { WovenDivider } from "@/components/ui/Primitives";
import { getDefaultHomeByRole, getSessionUser } from "@/lib/auth/session";

async function LandingActions() {
  const user = await getSessionUser();

  if (user) {
    const dest = getDefaultHomeByRole(user.role);
    return (
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
        <Link
          href={dest}
          className="flex-1 inline-flex items-center justify-center min-h-[50px] px-6 rounded-control bg-brand text-white font-bold text-base tactile-btn tactile-brand"
        >
          Lanjutkan sebagai {user.fullName.split(" ")[0]}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
      <Link
        href="/register"
        className="flex-1 inline-flex items-center justify-center min-h-[50px] px-6 rounded-control bg-brand text-white font-bold text-base tactile-btn tactile-brand"
      >
        MULAI BELAJAR
      </Link>
      <Link
        href="/login"
        className="flex-1 inline-flex items-center justify-center min-h-[50px] px-6 rounded-control bg-surface text-ink border-2 border-border-control font-bold text-base hover:bg-surface-soft tactile-btn tactile-neutral"
      >
        SUDAH PUNYA AKUN
      </Link>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <header className="w-full border-b border-border-subtle bg-surface/80 backdrop-blur-xs">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/pasanku_app_icon.png"
              alt="Pasanku"
              width={36}
              height={36}
              className="rounded-chip"
            />
            <span className="font-display font-extrabold text-xl tracking-tight text-ink">
              PASANKU
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-control text-sm font-bold text-ink hover:bg-surface-soft"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-control bg-brand text-white text-sm font-bold tactile-btn tactile-brand"
            >
              Daftar
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center px-4 py-10 md:py-16">
        <div className="max-w-3xl mx-auto w-full text-center space-y-6">
          <div className="flex justify-center">
            <Image
              src="/images/pasanku_logo_cream.png"
              alt="Maskot ayam jago Pasanku berselendang tenun Pasan"
              width={210}
              height={198}
              priority
              className="h-auto w-44 md:w-52"
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">
              Bahasa kita, warisan kita.
            </p>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold text-ink leading-tight">
              Belajar Bahasa Pasan Langkah demi Langkah
            </h1>
            <p className="text-base md:text-lg text-ink-soft max-w-xl mx-auto">
              Pelajaran singkat, latihan interaktif, evaluasi unit, dan
              rekomendasi remedial adaptif untuk pemula Bahasa Pasan di Ratahan.
            </p>
          </div>

          <WovenDivider />

          <Suspense
            fallback={
              <div className="h-[50px] max-w-md mx-auto rounded-control bg-surface-soft animate-pulse" />
            }
          >
            <LandingActions />
          </Suspense>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left">
            <div className="bg-surface border border-border-subtle rounded-card p-5 space-y-2">
              <div className="w-10 h-10 rounded-control bg-surface-highlight flex items-center justify-center text-brand">
                <BookOpen className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="font-display font-bold text-base text-ink">
                Microlearning Bertahap
              </h2>
              <p className="text-sm text-ink-soft">
                5 unit dengan 25 lesson singkat yang langsung dipraktikkan lewat
                latihan.
              </p>
            </div>

            <div className="bg-surface border border-border-subtle rounded-card p-5 space-y-2">
              <div className="w-10 h-10 rounded-control bg-accent-tint flex items-center justify-center text-accent-lip">
                <Target className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="font-display font-bold text-base text-ink">
                Remedial Adaptif
              </h2>
              <p className="text-sm text-ink-soft">
                Analisis otomatis kesalahan quiz unit untuk merekomendasikan
                lesson prioritas.
              </p>
            </div>

            <div className="bg-surface border border-border-subtle rounded-card p-5 space-y-2">
              <div className="w-10 h-10 rounded-control bg-success-tint flex items-center justify-center text-success">
                <Sparkles className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="font-display font-bold text-base text-ink">
                Tervalidasi Penutur
              </h2>
              <p className="text-sm text-ink-soft">
                Kosakata dan kunci jawaban diperiksa Validator sebelum terbit ke
                Learner.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
