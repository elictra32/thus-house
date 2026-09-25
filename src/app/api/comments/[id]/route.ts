import { NextResponse } from "next/server";
import { requireApiUser, jsonError, logAdmin } from "@/lib/auth";
import { isCommunityStaff } from "@/lib/community";
import { createServiceSupabase } from "@/lib/supabase-server";
import { logMember } from "@/lib/member-log";

// ลบคอมเมนต์: เจ้าของคอมเมนต์ลบของตัวเองได้ · ทีมงาน (สิทธิ์ community) ลบของทุกคนได้ — คำตอบใต้คอมเมนต์ถูกลบตาม
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const service = createServiceSupabase();
  const { data: comment } = await service
    .from("lesson_comments").select("id, user_id, body, video_id").eq("id", params.id).maybeSingle();
  if (!comment) return jsonError("ไม่พบคอมเมนต์", 404);

  const own = comment.user_id === auth.user.id;
  if (!own && !(await isCommunityStaff(auth.user))) return jsonError("ไม่มีสิทธิ์ลบคอมเมนต์นี้", 403);

  const { error } = await service.from("lesson_comments").delete().eq("id", comment.id);
  if (error) return jsonError(error.message, 500);
  if (own) await logMember(service, auth.user.id, "delete_comment", { body: comment.body.slice(0, 200), video_id: comment.video_id });
  if (!own) {
    await logAdmin(service, auth.user.email ?? "", "delete", "lesson_comments", comment.id, {
      body: comment.body.slice(0, 500),
      video_id: comment.video_id,
    });
  }
  return NextResponse.json({ ok: true });
}
