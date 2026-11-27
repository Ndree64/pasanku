import { Suspense } from "react";
import { Trophy } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getLeaderboardData } from "@/lib/data/repository";
import { Card, XpBadge } from "@/components/ui/Primitives";
import { LeaderboardSkeleton } from "@/components/ui/States";

async function LeaderboardContent() {
  const user = await requireRole(["learner"]);
  const entries = await getLeaderboardData(user.id);
  const top3 = entries.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
          Papan Skor Learner
        </h1>
        <p className="text-sm text-ink-soft">
          Peringkat dihitung berdasarkan total XP dari kelulusan lesson,
          remedial, dan quiz unit.
        </p>
      </div>

      {/* Podium 3 Teratas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {top3.map((entry) => (
          <Card
            key={entry.userId}
            focal={entry.rank === 1}
            className={`text-center space-y-2 ${
              entry.isCurrentUser ? "bg-surface-highlight border-brand/40" : ""
            }`}
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent text-ink border border-accent-border font-extrabold text-sm">
              <Trophy className="w-4 h-4 mr-0.5" aria-hidden="true" />
              {entry.rank}
            </div>
            <p className="font-display font-extrabold text-base text-ink truncate">
              {entry.fullName}
            </p>
            <p className="text-xs text-ink-soft">{entry.levelTitle}</p>
            <div className="pt-1">
              <XpBadge amount={entry.totalXp} />
            </div>
          </Card>
        ))}
      </div>

      {/* Daftar Peringkat Lengkap */}
      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-border-subtle">
          {entries.map((entry) => (
            <div
              key={entry.userId}
              className={`px-4 py-3.5 flex items-center justify-between gap-3 ${
                entry.isCurrentUser ? "bg-surface-highlight" : "bg-surface"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-chip bg-surface-soft border border-border-control flex items-center justify-center text-xs font-extrabold text-ink shrink-0">
                  #{entry.rank}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-ink truncate">
                    {entry.fullName}{" "}
                    {entry.isCurrentUser ? (
                      <span className="text-xs font-extrabold text-brand">
                        (Kamu)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {entry.levelTitle} · {entry.completedLessons} lesson selesai
                  </p>
                </div>
              </div>
              <XpBadge amount={entry.totalXp} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function PapanSkorPage() {
  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <LeaderboardContent />
    </Suspense>
  );
}
