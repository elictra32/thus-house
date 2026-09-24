import { NextResponse } from "next/server";
import { getPermissions, requireApiUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { data: profile } = await auth.supabase.from("users").select("*").eq("id", auth.user.id).maybeSingle();
  const perms = [...(await getPermissions(auth.user.id, auth.user.email))];
  return NextResponse.json({ user: profile, isAdmin: perms.length > 0, permissions: perms });
}
