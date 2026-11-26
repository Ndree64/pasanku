import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/features/auth/LoginForm";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";

export default function LoginPage() {
  const isSupabase = isSupabaseServerConfigured();

  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
        {/* Kiri: Maskot dan Judul (Mobile di atas, Desktop kolom kiri) */}
        <div className="text-center md:text-left flex flex-col items-center md:items-start space-y-4">
          <Link href="/" className="inline-block">
            <Image
              src="/images/pasanku_logo_cream.png"
              alt="Maskot Pasanku"
              width={220}
              height={207}
              priority
              className="w-40 md:w-56 h-auto"
            />
          </Link>
          <div className="space-y-2 max-w-sm">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink">
              Mari Belajar Pasan!
            </h1>
            <p className="text-sm md:text-base text-ink-soft">
              Bahasa kita, warisan kita. Masuk untuk melanjutkan pelajaran dan
              mengumpulkan XP.
            </p>
          </div>
        </div>

        {/* Kanan: Kartu Formulir Sederhana */}
        <div className="w-full max-w-md mx-auto">
          <Suspense
            fallback={
              <div className="h-96 rounded-panel bg-surface-soft animate-pulse" />
            }
          >
            <LoginForm isSupabaseMode={isSupabase} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
