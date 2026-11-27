"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCachedProfileRow, getDefaultHomeByRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthActionState {
  error?: string;
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password,
  });
  if (error || !data.user) {
    return { error: "Email atau kata sandi tidak valid." };
  }

  const profile = await getCachedProfileRow(data.user.id);
  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut();
    return {
      error: "Akun ini belum aktif atau dinonaktifkan. Hubungi Admin.",
    };
  }

  const role = (profile.role as "admin" | "validator" | "learner") ?? "learner";
  redirect(getDefaultHomeByRole(role));
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || password.length < 6) {
    return {
      error: "Isi nama lengkap, email valid, dan kata sandi minimal 6 karakter.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error || !data.user) {
    return { error: error?.message ?? "Pendaftaran gagal." };
  }

  revalidateTag("profiles", "max");
  revalidateTag("leaderboard", "max");
  redirect("/learner");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
