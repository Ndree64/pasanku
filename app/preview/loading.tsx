import { LearningPathSkeleton, ShellSkeleton } from "@/components/ui/States";

export default function PreviewLoading() {
  return (
    <ShellSkeleton label="Memuat pratinjau jalur belajar">
      <LearningPathSkeleton />
    </ShellSkeleton>
  );
}
