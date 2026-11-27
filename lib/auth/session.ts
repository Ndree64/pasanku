import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { redirect } from "next/navigation";
import type { Profile, UserRole } from "@/types/pasanku";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCachedProfileRow(userId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("profiles");

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export const getSessionUser = cache(async (): Promise<Profile | null> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (error || !claims?.sub) return null;

    const userId = String(claims.sub);
    const email = typeof claims.email === "string" ? claims.email : "";
    const profile = await getCachedProfileRow(userId);
    if (!profile || profile.is_active === false) return null;

    return {
      id: profile.id,
      email,
      username: profile.username ?? (email ? email.split("@")[0] : "pengguna"),
      fullName: profile.full_name,
      role: profile.role as UserRole,
      isActive: profile.is_active ?? true,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<Profile> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<Profile> {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    redirect(getDefaultHomeByRole(user.role));
  }
  return user;
}

export function getDefaultHomeByRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "validator":
      return "/validator";
    case "learner":
    default:
      return "/learner";
  }
}
