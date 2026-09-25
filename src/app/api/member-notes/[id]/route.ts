import { NextResponse } from "next/server";
import { requireApiUser, jsonError, getPermissions } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase-server";

// ลบโน้ต: ผู้เขียนเอง หรือ Admin สิทธิ์ members
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const service = createServiceSupabase();
  const { data: note } = await service.from("member_notes").select("id, author_id").eq("id", params.id).maybeSingle();
  if (!note) return jsonError("ไม่พบโน้ต", 404);
  const mine = note.author_id === auth.user.id;
  if (!mine && !(await getPermissions(auth.user.id, auth.user.email)).has("members")) return jsonError("ลบได้เฉพาะโน้ตของตัวเอง", 403);
  await service.from("member_notes").delete().eq("id", note.id);
  return NextResponse.json({ ok: true });
}
