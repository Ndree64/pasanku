"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Info } from "lucide-react";
import {
  demoQuickLoginAction,
  loginAction,
  type AuthActionState,
} from "@/actions/auth";
import { Button } from "@/components/ui/Primitives";

const initialState: AuthActionState = {};

export function LoginForm({
  isSupabaseMode,
}: {
  isSupabaseMode: boolean;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [helperNotice, setHelperNotice] = useState<string | null>(null);

  return (
    <div className="space-y-4">
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

          {helperNotice ? (
            <div
              role="status"
              className="flex items-start gap-2.5 p-3.5 rounded-control bg-accent-tint border border-accent-border text-sm text-ink"
            >
              <Info
                className="w-4 h-4 text-accent-lip shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{helperNotice}</span>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label
              htmlFor="identifier"
              className="block text-xs font-extrabold uppercase tracking-wider text-ink-soft"
            >
              Email atau Username
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              placeholder="Contoh: learner@pasanku.id"
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
              autoComplete="current-password"
              required
              placeholder="Masukkan kata sandi"
              className="w-full h-12 px-3.5 rounded-control border border-border-control bg-canvas text-ink text-sm placeholder:text-ink-soft/60"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                setHelperNotice(
                  "Pada mode uji coba lokal, kata sandi akun demo adalah pasanku123. Untuk akun produksi, reset sandi dilakukan lewat Supabase Auth."
                )
              }
              className="text-xs font-bold text-success hover:underline cursor-pointer"
            >
              Lupa Kata Sandi?
            </button>
          </div>

          <Button type="submit" fullWidth disabled={pending}>
            {pending ? "MEMPROSES..." : "MASUK"}
          </Button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border-subtle" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-3 font-bold text-ink-soft">ATAU</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setHelperNotice(
              isSupabaseMode
                ? "Aktifkan penyedia Google OAuth di dashboard Supabase Anda untuk masuk lewat Google."
                : "Masuk dengan Google tersedia saat environment Supabase Auth terhubung. Gunakan formulir di atas atau akses demo lokal di bawah."
            )
          }
          className="w-full h-12 rounded-control border-2 border-border-control bg-surface hover:bg-surface-soft text-ink font-bold text-sm flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface-soft font-extrabold text-brand text-xs"
            aria-hidden="true"
          >
            G
          </span>
          GOOGLE
        </button>

        <div className="mt-5 pt-4 border-t border-border-subtle flex items-center justify-center gap-2 text-sm text-ink-soft">
          <span>Belum punya akun?</span>
          <Link
            href="/register"
            className="inline-flex items-center justify-center min-h-[36px] px-3.5 rounded-chip border border-border-control bg-surface-soft text-success font-extrabold text-xs uppercase hover:bg-success-tint"
          >
            DAFTAR
          </Link>
        </div>
      </div>

      {!isSupabaseMode ? (
        <div className="bg-surface-soft border border-border-subtle rounded-card p-4 space-y-2.5">
          <p className="text-xs font-bold text-ink-soft">
            Akses Cepat Demo Lokal (Sandi:{" "}
            <code className="font-mono text-ink">pasanku123</code>)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <form action={demoQuickLoginAction}>
              <input
                type="hidden"
                name="identifier"
                value="learner@pasanku.id"
              />
              <button
                type="submit"
                className="w-full min-h-[40px] px-2 rounded-chip bg-surface border border-border-control text-xs font-bold text-ink hover:bg-surface-highlight cursor-pointer"
              >
                Learner
              </button>
            </form>
            <form action={demoQuickLoginAction}>
              <input
                type="hidden"
                name="identifier"
                value="validator@pasanku.id"
              />
              <button
                type="submit"
                className="w-full min-h-[40px] px-2 rounded-chip bg-surface border border-border-control text-xs font-bold text-ink hover:bg-surface-highlight cursor-pointer"
              >
                Validator
              </button>
            </form>
            <form action={demoQuickLoginAction}>
              <input type="hidden" name="identifier" value="admin@pasanku.id" />
              <button
                type="submit"
                className="w-full min-h-[40px] px-2 rounded-chip bg-surface border border-border-control text-xs font-bold text-ink hover:bg-surface-highlight cursor-pointer"
              >
                Admin
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
