import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Profile, UserRole } from "@/types/pasanku";
import { readLocalDb } from "@/lib/data/local-store";
import {
  createSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

export const LOCAL_SESSION_COOKIE = "pasanku_session_uid";

export async function getSessionUser(): Promise<Profile | null> {
  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) return null;
      return {
        id: profile.id,
        email: user.email ?? "",
        username: profile.username ?? (user.email ?? "").split("@")[0],
        fullName: profile.full_name,
        role: profile.role as UserRole,
        isActive: profile.is_active ?? true,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      };
    } catch {
      return null;
    }
  }

  const cookieStore = await cookies();
  const uid = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
  if (!uid) return null;

  const db = readLocalDb();
  const profile = db.profiles.find((p) => p.id === uid);
  if (!profile || !profile.isActive) return null;
  return profile;
}

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
