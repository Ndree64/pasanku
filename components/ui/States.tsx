import Image from "next/image";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

export function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Memuat halaman">
      <div className="h-24 rounded-panel bg-surface-soft border border-border-subtle" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 rounded-card bg-surface-soft border border-border-subtle" />
        <div className="h-32 rounded-card bg-surface-soft border border-border-subtle" />
      </div>
      <div className="h-44 rounded-card bg-surface-soft border border-border-subtle" />
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
