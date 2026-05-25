"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken } from "@/lib/auth";

export type LoginState = { error: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const secret = process.env.ADMIN_PASSWORD ?? "";

  if (!secret) return { error: "ADMIN_PASSWORD is not configured." };
  if (password !== secret) return { error: "Incorrect password." };

  const token = await createSessionToken(secret);
  const store = await cookies();
  store.set("pm_admin", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/admin");
}
