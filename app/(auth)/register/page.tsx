import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { RegisterForm } from "@/features/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
        <div className="text-center md:text-left flex flex-col items-center md:items-start space-y-4">
          <Link href="/" className="inline-block">
            <Image
              src="/images/pasanku_logo_cream.png"
              alt="Maskot Pasanku"
              width={220}
              height={207}
              priority
              className="w-36 md:w-52 h-auto"
            />
          </Link>
          <div className="space-y-2 max-w-sm">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink">
              Daftar Akun Baru
            </h1>
            <p className="text-sm md:text-base text-ink-soft">
              Mulai dari Unit 1: Sapaan dan Ungkapan Dasar dalam Bahasa Pasan.
            </p>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto">
          <Suspense
            fallback={
              <div className="h-96 rounded-panel bg-surface-soft animate-pulse" />
            }
          >
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
