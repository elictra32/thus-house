import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { videoAccess } from "@/lib/community";
import { createServiceSupabase } from "@/lib/supabase-server";

// กดไลก์ / เลิกไลก์คอมเมนต์
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { data: comment } = await createServiceSupabase()
    .from("lesson_comments").select("id, video_id").eq("id", params.id).maybeSingle();
  if (!comment) return jsonError("ไม่พบคอมเมนต์", 404);
  const { ok, service } = await videoAccess(auth.supabase, auth.user, comment.video_id);
  if (!ok) return jsonError("ไม่มีสิทธิ์เข้าถึงคอร์สนี้", 403);

  const key = { comment_id: comment.id, user_id: auth.user.id };
  const { data: existing } = await service.from("lesson_comment_likes").select("comment_id").match(key).maybeSingle();
  if (existing) await service.from("lesson_comment_likes").delete().match(key);
  else await service.from("lesson_comment_likes").insert(key);
  const { count } = await service
    .from("lesson_comment_likes").select("user_id", { count: "exact", head: true }).eq("comment_id", comment.id);
  return NextResponse.json({ liked: !existing, likes: count ?? 0 });
}
