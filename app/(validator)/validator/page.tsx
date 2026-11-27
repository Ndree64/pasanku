import { Suspense } from "react";
import { getValidatorQueueData } from "@/lib/data/repository";
import { Card } from "@/components/ui/Primitives";
import { DashboardSkeleton } from "@/components/ui/States";
import { ValidatorQueueClient } from "@/features/validation/ValidatorQueueClient";

async function ValidatorQueueContent() {
  const { reviews, counts } = await getValidatorQueueData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
          Antrean Review Konten
        </h1>
        <p className="text-sm text-ink-soft">
          Periksa keakuratan Bahasa Pasan, contoh kalimat, latihan, dan kunci
          jawaban sebelum diterbitkan Admin.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="space-y-1">
          <p className="text-xs font-bold text-ink-soft">Menunggu Review</p>
          <p className="font-display text-2xl font-extrabold text-accent-lip">
            {counts.pending}
          </p>
        </Card>
        <Card className="space-y-1">
          <p className="text-xs font-bold text-ink-soft">Disetujui</p>
          <p className="font-display text-2xl font-extrabold text-success">
            {counts.approved}
          </p>
        </Card>
        <Card className="space-y-1">
          <p className="text-xs font-bold text-ink-soft">Perlu Revisi</p>
          <p className="font-display text-2xl font-extrabold text-brand">
            {counts.changesRequested}
          </p>
        </Card>
        <Card className="space-y-1">
          <p className="text-xs font-bold text-ink-soft">Total Pengajuan</p>
          <p className="font-display text-2xl font-extrabold text-ink">
            {counts.total}
          </p>
        </Card>
      </div>

      <ValidatorQueueClient reviews={reviews} />
    </div>
  );
}

export default function ValidatorPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ValidatorQueueContent />
    </Suspense>
  );
}
