"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/db/server";

export type LoginState = { error?: string; email?: string };

const loginSchema = z.object({
  email: z.email("Email tidak valid").max(254),
  password: z.string().min(1, "Password wajib diisi").max(256),
});

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message for every failure: do not reveal whether the email exists.
  if (error) return { error: "Email atau password salah.", email };
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
