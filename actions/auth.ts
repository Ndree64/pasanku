"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getDefaultHomeByRole,
  LOCAL_SESSION_COOKIE,
} from "@/lib/auth/session";
import {
  registerLearnerAccount,
  verifyCredentials,
} from "@/lib/data/repository";
import {
  createSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

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
    return { error: "Email/username dan kata sandi wajib diisi." };
  }

  if (isSupabaseServerConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });
    if (error || !data.user) {
      return { error: "Email atau kata sandi tidak valid." };
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    const role = (profile?.role as "admin" | "validator" | "learner") ?? "learner";
    redirect(getDefaultHomeByRole(role));
  }

  const res = verifyCredentials(identifier, password);
  if (!res.profile) {
    return { error: res.error ?? "Gagal masuk." };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCAL_SESSION_COOKIE, res.profile.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(getDefaultHomeByRole(res.profile.role));
}

export async function demoQuickLoginAction(formData: FormData): Promise<void> {
  const identifier = String(formData.get("identifier") ?? "");
  const res = verifyCredentials(identifier, "pasanku123");
  if (!res.profile) {
    redirect("/login");
  }
  const cookieStore = await cookies();
  cookieStore.set(LOCAL_SESSION_COOKIE, res.profile.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect(getDefaultHomeByRole(res.profile.role));
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

  if (isSupabaseServerConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error || !data.user) {
      return { error: error?.message ?? "Pendaftaran gagal." };
    }
    redirect("/learner");
  }

  const result = registerLearnerAccount({ fullName, email, password });
  if (result.error || !result.profile) {
    return { error: result.error ?? "Pendaftaran gagal." };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCAL_SESSION_COOKIE, result.profile.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/learner");
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseServerConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  const cookieStore = await cookies();
  cookieStore.delete(LOCAL_SESSION_COOKIE);
  redirect("/login");
}
