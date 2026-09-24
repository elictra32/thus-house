import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";

// อ่านแจ้งเตือนทั้งหมด
export async function POST() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { error } = await auth.supabase
    .from("notifications").update({ is_read: true }).eq("user_id", auth.user.id).eq("is_read", false);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
