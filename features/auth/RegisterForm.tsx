"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { registerAction, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/Primitives";

const initialState: AuthActionState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState
  );

  return (
    <div className="bg-surface border border-border-subtle rounded-panel p-6 md:p-7 shadow-(--shadow-focal)">
      <form action={formAction} className="space-y-4">
        {state.error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-control bg-brand-tint border border-brand/40 text-sm text-ink"
          >
            <AlertCircle
              className="w-4 h-4 text-brand shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{state.error}</span>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label
            htmlFor="fullName"
            className="block text-xs font-extrabold uppercase tracking-wider text-ink-soft"
          >
            Nama Lengkap
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            placeholder="Contoh: Sari Wowor"
            className="w-full h-12 px-3.5 rounded-control border border-border-control bg-canvas text-ink text-sm placeholder:text-ink-soft/60"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-extrabold uppercase tracking-wider text-ink-soft"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="nama@email.com"
            className="w-full h-12 px-3.5 rounded-control border border-border-control bg-canvas text-ink text-sm placeholder:text-ink-soft/60"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-extrabold uppercase tracking-wider text-ink-soft"
          >
            Kata Sandi
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            placeholder="Minimal 6 karakter"
            className="w-full h-12 px-3.5 rounded-control border border-border-control bg-canvas text-ink text-sm placeholder:text-ink-soft/60"
          />
        </div>

        <p className="text-xs text-ink-soft">
          Akun pendaftar baru otomatis memperoleh peran{" "}
          <strong className="text-ink">Learner</strong> dan langsung membuka
          Unit 1.
        </p>

        <Button type="submit" variant="success" fullWidth disabled={pending}>
          {pending ? "MENDAFTARKAN..." : "BUAT AKUN LEARNER"}
        </Button>
      </form>

      <div className="mt-5 pt-4 border-t border-border-subtle flex items-center justify-center gap-2 text-sm text-ink-soft">
        <span>Sudah punya akun?</span>
        <Link
          href="/login"
          className="inline-flex items-center justify-center min-h-[36px] px-3.5 rounded-chip border border-border-control bg-surface-soft text-brand font-extrabold text-xs uppercase hover:bg-brand-tint"
        >
          MASUK
        </Link>
      </div>
    </div>
  );
}
