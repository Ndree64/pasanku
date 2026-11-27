import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env.local");
  const result: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(url && anonKey && serviceKey, "Env Supabase harus lengkap");

  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testAccounts = [
    {
      email: "learner@pasanku.id",
      fullName: "Sari Wowor",
      role: "learner" as const,
      username: "sari",
    },
    {
      email: "validator@pasanku.id",
      fullName: "Ibu Meyke Tumbel",
      role: "validator" as const,
      username: "meyke",
    },
    {
      email: "admin@pasanku.id",
      fullName: "Admin Kurikulum",
      role: "admin" as const,
      username: "admin",
    },
  ];

  const { data: listed, error: listErr } = await adminClient.auth.admin.listUsers({
    perPage: 200,
  });
  assert.ifError(listErr);
  console.log(`Existing auth users count: ${listed.users.length}`);

  for (const acc of testAccounts) {
    let user = listed.users.find(
      (u) => u.email?.toLowerCase() === acc.email.toLowerCase()
    );
    if (!user) {
      const { data: created, error: createErr } =
        await adminClient.auth.admin.createUser({
          email: acc.email,
          password: "pasanku123",
          email_confirm: true,
          user_metadata: { full_name: acc.fullName },
        });
      assert.ifError(createErr);
      user = created.user;
      console.log(`Created Auth user: ${acc.email} (${user.id})`);
    } else {
      console.log(`Found Auth user: ${acc.email} (${user.id})`);
    }

    const { error: profErr } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: acc.fullName,
          username: acc.username,
          role: acc.role,
          is_active: true,
        },
        { onConflict: "id" }
      );
    assert.ifError(profErr);
  }

  // Test real signInWithPassword + RLS profile read using anon client
  for (const acc of testAccounts) {
    const anonClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: loginData, error: loginErr } =
      await anonClient.auth.signInWithPassword({
        email: acc.email,
        password: "pasanku123",
      });
    assert.ifError(loginErr);
    assert.ok(loginData.user && loginData.session, `Session harus ada untuk ${acc.email}`);

    // Baca profil memakai session user yang login (menguji RLS)
    const { data: prof, error: rlsErr } = await anonClient
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("id", loginData.user.id)
      .single();
    assert.ifError(rlsErr);
    assert.equal(prof.role, acc.role);
    assert.equal(prof.is_active, true);

    await anonClient.auth.signOut();
    console.log(
      `PASS LOGIN [${acc.role.toUpperCase()}]: ${acc.email} -> profile="${prof.full_name}", is_active=${prof.is_active}`
    );
  }

  // Test negative case: wrong password
  const badClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: badErr } = await badClient.auth.signInWithPassword({
    email: "learner@pasanku.id",
    password: "salah_password",
  });
  assert.ok(badErr, "Sandi salah wajib ditolak oleh Supabase Auth");
  console.log(`PASS NEGATIVE TEST: sandi salah ditolak ("${badErr.message}")`);
}

main().catch((err) => {
  console.error("TEST LOGIN GAGAL:", err);
  process.exit(1);
});
