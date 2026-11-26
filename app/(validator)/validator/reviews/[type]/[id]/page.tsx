import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getPrivilegedContentDetail } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState, PageSkeleton } from "@/components/ui/States";
import { ReviewDetailClient } from "@/features/validation/ReviewDetailClient";

async function ReviewDetailLoader({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ reviewId?: string }>;
}) {
  const user = await requireRole(["validator"]);
  const { type, id } = await params;
  const sp = await searchParams;

  if (type !== "lesson" && type !== "quiz") {
    return (
      <AppShell user={user}>
        <ErrorState
          title="Jenis Konten Tidak Valid"
          message="Hanya lesson dan quiz yang dapat diperiksa."
          retryHref="/validator"
        />
      </AppShell>
    );
  }

  const detail = getPrivilegedContentDetail(type, id);
  if (!detail) {
    return (
      <AppShell user={user}>
        <ErrorState
          title="Konten Tidak Ditemukan"
          message="Data konten yang diminta tidak tersedia."
          retryHref="/validator"
        />
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <Link
          href="/validator"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand hover:underline"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Kembali ke Antrean Review
        </Link>
        <ReviewDetailClient detail={detail} reviewId={sp.reviewId} />
      </div>
    </AppShell>
  );
}

export default function ReviewDetailPage(props: {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ reviewId?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      }
    >
      <ReviewDetailLoader params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
