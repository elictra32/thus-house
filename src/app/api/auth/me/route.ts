import { NextResponse } from "next/server";
import { getPermissions, requireApiUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { data: row } = await auth.supabase.from("users").select("*").eq("id", auth.user.id).maybeSingle();
  // ไม่ส่งเลขบัตร (เข้ารหัส) / รหัสเครื่องที่ล็อกอิน ออกไปฝั่งเบราว์เซอร์
  const { id_card_enc: _enc, active_session: _sid, ...profile } = row ?? {};
  void _enc; void _sid;
  const perms = [...(await getPermissions(auth.user.id, auth.user.email))];
  return NextResponse.json({ user: row ? profile : null, isAdmin: perms.length > 0, permissions: perms });
}
