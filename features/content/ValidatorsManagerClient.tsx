"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserPlus, UserX } from "lucide-react";
import type { Profile } from "@/types/pasanku";
import {
  createValidatorAction,
  toggleValidatorAction,
} from "@/actions/content";
import { Button, Card } from "@/components/ui/Primitives";

export function ValidatorsManagerClient({
  validators,
}: {
  validators: Profile[];
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = (fd: FormData) => {
    setNotice(null);
    startTransition(async () => {
      const res = await createValidatorAction(fd);
      setNotice(
        res.ok
          ? "Akun Validator baru berhasil ditambahkan."
          : res.error ?? "Gagal menambah Validator."
      );
      router.refresh();
    });
  };

  const handleToggle = (userId: string) => {
    setNotice(null);
    startTransition(async () => {
      await toggleValidatorAction(userId);
      setNotice("Status aktif Validator diperbarui.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
          Manajemen Akun Validator
        </h1>
        <p className="text-sm text-ink-soft">
          Daftarkan penutur asli atau ahli Bahasa Pasan sebagai Validator.
          Pendaftaran Validator hanya dapat dilakukan melalui Admin.
        </p>
      </div>

      {notice ? (
        <div
          role="status"
          className="p-3.5 rounded-control bg-accent-tint border border-accent-border text-sm font-bold text-ink"
        >
          {notice}
        </div>
      ) : null}

      <Card focal className="space-y-4">
        <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-brand" aria-hidden="true" />
          Tambah Akun Validator Baru
        </h2>
        <form
          action={handleCreate}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <input
            name="fullName"
            required
            placeholder="Nama lengkap Validator"
            className="h-11 px-3 rounded-control border border-border-control bg-canvas text-sm text-ink"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="email.validator@pasanku.id"
            className="h-11 px-3 rounded-control border border-border-control bg-canvas text-sm text-ink"
          />
          <div className="flex gap-2">
            <input
              name="password"
              type="password"
              minLength={6}
              required
              placeholder="Sandi awal (min 6)"
              className="flex-1 h-11 px-3 rounded-control border border-border-control bg-canvas text-sm text-ink"
            />
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>
              Tambah
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {validators.map((val) => (
          <Card
            key={val.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="font-bold text-base text-ink">{val.fullName}</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-chip text-[11px] font-extrabold border ${
                    val.isActive
                      ? "bg-success-tint text-success border-success/40"
                      : "bg-brand-tint text-brand border-brand/40"
                  }`}
                >
                  {val.isActive ? (
                    <>
                      <UserCheck className="w-3 h-3" aria-hidden="true" />
                      Aktif
                    </>
                  ) : (
                    <>
                      <UserX className="w-3 h-3" aria-hidden="true" />
                      Nonaktif
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-ink-soft">{val.email}</p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => handleToggle(val.id)}
            >
              {val.isActive ? "Nonaktifkan" : "Aktifkan Kembali"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
