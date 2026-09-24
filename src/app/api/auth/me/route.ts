import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { data: profile } = await auth.supabase.from("users").select("*").eq("id", auth.user.id).maybeSingle();
  return NextResponse.json({ user: profile, isAdmin: isAdminEmail(auth.user.email) });
}
