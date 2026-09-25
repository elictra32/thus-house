import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { canAccessMember } from "@/lib/mentor";
import { createServiceSupabase } from "@/lib/supabase-server";

// จดโน้ตประวัติสมาชิก (Mentor ของสมาชิกคนนั้น / Admin)
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!memberId || !text) return jsonError("กรุณาพิมพ์โน้ต");
  if (text.length > 4000) return jsonError("โน้ตยาวเกินไป (ไม่เกิน 4,000 ตัวอักษร)");
  if (!(await canAccessMember(auth.user, memberId)).ok) return jsonError("ไม่มีสิทธิ์จดโน้ตสมาชิกคนนี้", 403);
  const { error } = await createServiceSupabase().from("member_notes").insert({ member_id: memberId, author_id: auth.user.id, body: text });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
