import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { getUserTotalXp } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { LearningPathSkeleton, ShellSkeleton } from "@/components/ui/States";

async function LearnerShell({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["learner"]);
  const totalXp = await getUserTotalXp(user.id);

  return (
    <AppShell user={user} totalXp={totalXp}>
      {children}
    </AppShell>
  );
}

export default function LearnerShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <ShellSkeleton label="Memuat ruang belajar">
          <LearningPathSkeleton />
        </ShellSkeleton>
      }
    >
      <LearnerShell>{children}</LearnerShell>
    </Suspense>
  );
}
