import React from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-card bg-surface-soft border border-border-subtle ${className}`}
    />
  );
}

function HeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-8 w-60 max-w-full rounded-control" />
        <Skeleton className="h-4 w-80 max-w-full rounded-chip" />
      </div>
      {withAction ? <Skeleton className="h-11 w-40 rounded-control" /> : null}
    </div>
  );
}

export function ShellSkeleton({
  hasRightRail = false,
  label = "Memuat halaman",
  children,
}: {
  hasRightRail?: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="min-h-screen flex flex-col md:flex-row bg-canvas text-ink"
    >
      <div
        aria-hidden="true"
        className="md:hidden sticky top-0 z-30 bg-surface border-b border-border-subtle px-4 h-14 flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-[34px] h-[34px] rounded-chip" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-20 rounded-chip" />
            <Skeleton className="h-2.5 w-14 rounded-chip" />
          </div>
        </div>
        <Skeleton className="h-7 w-16 rounded-chip" />
      </div>

      <aside
        aria-hidden="true"
        className="hidden md:flex md:w-56 lg:w-[248px] shrink-0 flex-col bg-surface border-r border-border-subtle sticky top-0 h-screen justify-between p-4"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 py-1">
            <Skeleton className="w-10 h-10 rounded-control shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-24 rounded-chip" />
              <Skeleton className="h-3 w-16 rounded-chip" />
            </div>
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-20 mx-3 rounded-chip" />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-control" />
            ))}
          </div>
        </div>
        <div className="pt-4 border-t border-border-subtle space-y-3">
          <Skeleton className="h-3.5 w-28 mx-2 rounded-chip" />
          <Skeleton className="h-11 w-full rounded-control" />
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        <main className="flex-1 min-w-0 px-4 py-5 md:px-7 md:py-7 pb-24 md:pb-10">
          <div className="max-w-4xl mx-auto">{children}</div>
        </main>

        {hasRightRail ? (
          <aside
            aria-hidden="true"
            className="hidden xl:block w-[360px] shrink-0 border-l border-border-subtle bg-surface/60 p-6"
          >
            <div className="sticky top-6 space-y-5">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </aside>
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-[68px] bg-surface border-t border-border-subtle grid grid-cols-4 items-center px-3 gap-2"
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="w-5 h-5 rounded-chip" />
            <Skeleton className="w-10 h-2.5 rounded-chip" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LearningPathSkeleton() {
  const offsets = ["translate-x-0", "-translate-x-8", "translate-x-8", "-translate-x-5"];
  return (
    <div className="space-y-6">
      <HeaderSkeleton withAction />
      <Skeleton className="h-24 w-full rounded-panel" />
      <div className="flex flex-col items-center gap-5 py-2">
        {offsets.map((offset, idx) => (
          <div key={idx} className={`flex flex-col items-center gap-2 ${offset}`}>
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-3.5 w-28 rounded-chip" />
          </div>
        ))}
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function KamusSkeleton() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton />
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-12 flex-1 rounded-control" />
        <Skeleton className="h-12 w-full sm:w-44 rounded-control" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="col-span-2 sm:col-span-1 h-24 w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton withAction />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}

export function ListDetailSkeleton() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton withAction />
      <Skeleton className="h-12 w-full rounded-control" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}

export function RunnerSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat sesi latihan"
      className="min-h-screen bg-canvas flex flex-col"
    >
      <div className="max-w-[960px] w-full mx-auto px-4 py-5 md:px-6 md:py-7 flex-1 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-control shrink-0" />
          <Skeleton className="h-4 flex-1 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-chip shrink-0" />
        </div>
        <Skeleton className="flex-1 min-h-[320px] w-full rounded-panel" />
        <div className="flex justify-end">
          <Skeleton className="h-12 w-full sm:w-44 rounded-control" />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="bg-surface border border-border-subtle rounded-card p-6 md:p-8 text-center flex flex-col items-center gap-3">
      <Image
        src="/images/pasanku_app_icon.png"
        alt="Maskot Pasanku"
        width={64}
        height={64}
        className="rounded-card"
      />
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      <p className="text-sm text-ink-soft max-w-md">{description}</p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-1 inline-flex items-center justify-center min-h-[44px] px-5 rounded-control bg-brand text-white font-bold text-sm tactile-btn tactile-brand"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "Terjadi Kendala",
  message,
  retryHref,
  retryLabel = "Kembali",
}: {
  title?: string;
  message: string;
  retryHref?: string;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="bg-brand-tint border border-brand/40 rounded-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-brand shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h3 className="font-display font-bold text-ink text-base">{title}</h3>
          <p className="text-sm text-ink-soft mt-0.5">{message}</p>
        </div>
      </div>
      {retryHref ? (
        <Link
          href={retryHref}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-control bg-surface border-2 border-border-control text-ink text-sm font-bold hover:bg-surface-soft shrink-0"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          {retryLabel}
        </Link>
      ) : null}
    </div>
  );
}
