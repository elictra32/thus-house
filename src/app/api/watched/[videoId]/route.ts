import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { getClassAccess } from "@/lib/class-access";
import { createServiceSupabase } from "@/lib/supabase-server";

export async function POST(_req: Request, { params }: { params: { videoId: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;

  const { data: video } = await createServiceSupabase()
    .from("videos").select("id, class_id").eq("id", params.videoId).maybeSingle();
  if (!video) return jsonError("ไม่พบวิดีโอ", 404);

  const access = await getClassAccess(auth.supabase, auth.user, video.class_id);
  if (!access.hasAccess) return jsonError("ไม่มีสิทธิ์เข้าถึงคอร์สนี้", 403);

  const { error } = await auth.supabase
    .from("watched_videos")
    .upsert({ user_id: auth.user.id, video_id: video.id }, { onConflict: "user_id,video_id", ignoreDuplicates: true });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
