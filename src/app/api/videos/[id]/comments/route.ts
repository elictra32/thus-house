import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { adminEmails } from "@/lib/admin";
import { displayName, isCommunityStaff, publicPerson, videoAccess } from "@/lib/community";
import { notifyDiscord } from "@/lib/discord";
import { logMember } from "@/lib/member-log";

type Row = { id: string; parent_id: string | null; body: string; created_at: string; user_id: string; video_id: string };
type Author = { id: string; nickname: string | null; name: string | null; email: string; role: string; member_code: string | null; avatar_url: string | null };

// คอมเมนต์ของ "ทุกคลิปในคลาสเดียวกัน" (บอกว่ามาจากคลิปไหน) + หัวใจของคลิปนี้ (เฉพาะผู้มีสิทธิ์เรียนคอร์สนี้)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { video, ok, service } = await videoAccess(auth.supabase, auth.user, params.id);
  if (!video) return jsonError("ไม่พบวิดีโอ", 404);
  if (!ok) return jsonError("ไม่มีสิทธิ์เข้าถึงคอร์สนี้", 403);

  const { data: classVideos } = await service.from("videos").select("id, title, order_index").eq("class_id", video.class_id).order("order_index");
  const lessons = new Map((classVideos ?? []).map((v, i) => [v.id, { no: i + 1, title: v.title as string }]));
  const [{ data: rows, error: rowsError }, { data: vlikes }, { data: roles }] = await Promise.all([
    service
      .from("lesson_comments")
      .select("id, parent_id, body, created_at, user_id, video_id")
      .in("video_id", Array.from(lessons.keys()))
      .order("created_at", { ascending: true })
      .limit(1000),
    service.from("video_likes").select("user_id, created_at").eq("video_id", video.id).order("created_at", { ascending: false }),
    service.from("roles").select("id, permissions"),
  ]);
  if (rowsError) {
    console.error("lesson_comments load failed", rowsError.message);
    return jsonError("โหลดคอมเมนต์ไม่สำเร็จ กรุณาลองใหม่", 500);
  }
  const comments = (rows ?? []) as Row[];
  const ids = comments.map((c) => c.id);
  // ดึงข้อมูลผู้เขียนแยก (ไม่ใช้ embed ของ PostgREST — ถ้า schema cache ไม่เห็น relationship คอมเมนต์จะหายทั้งหมด)
  // + คนที่กดหัวใจบทเรียน (แสดงว่าใครถูกใจบ้าง)
  const authorIds = Array.from(new Set([...comments.map((c) => c.user_id), ...(vlikes ?? []).map((l) => l.user_id)]));
  const { data: authorRows } = authorIds.length
    ? await service.from("users").select("id, nickname, name, email, role, member_code, avatar_url").in("id", authorIds)
    : { data: [] as Author[] };
  const authors = new Map(((authorRows ?? []) as Author[]).map((a) => [a.id, a]));
  const { data: likes } = ids.length
    ? await service.from("lesson_comment_likes").select("comment_id, user_id").in("comment_id", ids)
    : { data: [] as { comment_id: string; user_id: string }[] };

  const staffRoles = new Set((roles ?? []).filter((r) => (r.permissions as string[]).includes("community")).map((r) => r.id));
  const owners = adminEmails();
  const me = auth.user.id;
  const canModerate = await isCommunityStaff(auth.user);

  return NextResponse.json({
    canModerate,
    video: {
      likes: vlikes?.length ?? 0,
      liked: !!vlikes?.some((l) => l.user_id === me),
      likers: (vlikes ?? []).map((l) => ({ ...publicPerson(authors.get(l.user_id) ?? null), me: l.user_id === me })),
    },
    comments: comments.map((c) => {
      const u = authors.get(c.user_id) ?? null;
      const who = publicPerson(u);
      const cl = (likes ?? []).filter((l) => l.comment_id === c.id);
      return {
        id: c.id,
        parentId: c.parent_id,
        videoId: c.video_id,
        lessonNo: lessons.get(c.video_id)?.no ?? null,
        lessonTitle: lessons.get(c.video_id)?.title ?? "",
        body: c.body,
        createdAt: c.created_at,
        author: who.name,
        code: who.code,
        avatar: who.avatar,
        staff: !!u && (staffRoles.has(u.role) || owners.includes(u.email.toLowerCase())),
        mine: c.user_id === me,
        likes: cl.length,
        liked: cl.some((l) => l.user_id === me),
      };
    }),
  });
}

// โพสต์คอมเมนต์ / ตอบกลับ
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { video, ok, service } = await videoAccess(auth.supabase, auth.user, params.id);
  if (!video) return jsonError("ไม่พบวิดีโอ", 404);
  if (!ok) return jsonError("ไม่มีสิทธิ์เข้าถึงคอร์สนี้", 403);

  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return jsonError("กรุณาพิมพ์ข้อความ");
  if (text.length > 2000) return jsonError("ข้อความยาวเกิน 2,000 ตัวอักษร");

  // ตอบกลับได้ชั้นเดียว: ตอบคอมเมนต์ที่เป็นคำตอบอยู่แล้ว → ผูกกับคอมเมนต์หลักแทน
  // คอมเมนต์แสดงรวมทั้งคลาส → ตอบคอมเมนต์ของคลิปอื่นในคลาสเดียวกันได้ · คำตอบผูกกับคลิปของกระทู้นั้น
  let parentId: string | null = null;
  let parentOwner: string | null = null;
  let target = video;
  if (typeof body.parentId === "string" && body.parentId) {
    const { data: parent } = await service
      .from("lesson_comments").select("id, parent_id, user_id, video_id").eq("id", body.parentId).maybeSingle();
    const { data: parentVideo } = parent
      ? await service.from("videos").select("id, class_id, title").eq("id", parent.video_id).maybeSingle()
      : { data: null };
    if (!parent || !parentVideo || parentVideo.class_id !== video.class_id) return jsonError("ไม่พบคอมเมนต์ที่ต้องการตอบ", 404);
    parentId = parent.parent_id ?? parent.id;
    parentOwner = parent.user_id;
    target = parentVideo;
  }

  // กันสแปม: ไม่เกิน 10 คอมเมนต์ต่อ 10 นาที
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await service
    .from("lesson_comments").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).gte("created_at", since);
  if ((count ?? 0) >= 10) return jsonError("คอมเมนต์ถี่เกินไป กรุณารอสักครู่", 429);

  const { data: row, error } = await service
    .from("lesson_comments")
    .insert({ video_id: target.id, user_id: auth.user.id, parent_id: parentId, body: text })
    .select("id")
    .single();
  if (error) return jsonError(error.message, 500);
  await logMember(service, auth.user.id, "comment", { lesson: target.title, body: text.slice(0, 200), reply: !!parentId });

  const { data: me } = await service.from("users").select("nickname, name, email, member_code").eq("id", auth.user.id).maybeSingle();
  const who = [me?.member_code, displayName(me)].filter(Boolean).join(" ");
  const { data: cls } = await service.from("classes").select("name").eq("id", video.class_id).maybeSingle();

  // แจ้งเตือน 🔔 คนในกระทู้เมื่อมีคนตอบ: เจ้าของคอมเมนต์ที่ถูกตอบ + เจ้าของกระทู้ + คนที่เคยตอบในกระทู้นี้ (ยกเว้นตัวเอง)
  if (parentId) {
    const { data: thread } = await service
      .from("lesson_comments").select("user_id").or(`id.eq.${parentId},parent_id.eq.${parentId}`);
    const targets = new Set((thread ?? []).map((t) => t.user_id));
    if (parentOwner) targets.add(parentOwner);
    targets.delete(auth.user.id);
    const link = `/classes/${target.class_id}?v=${target.id}#comment-${row.id}`;
    if (targets.size) {
      await service.from("notifications").insert(
        Array.from(targets).map((uid) => ({
          user_id: uid,
          type: "comment",
          title: uid === parentOwner ? `${who} ตอบคอมเมนต์ของคุณ` : `${who} ตอบในกระทู้ที่คุณร่วมคุย`,
          message: `บทเรียน "${target.title}": ${text.slice(0, 200)}`,
          link,
        })),
      );
    }
  }
  await notifyDiscord(
    "comment",
    parentId ? "มีคนตอบคอมเมนต์ใต้คลิป" : "คอมเมนต์ใหม่ใต้คลิป",
    { จาก: `${who} (${me?.email ?? "-"})`, คอร์ส: cls?.name, บทเรียน: target.title, ข้อความ: text },
    `/classes/${target.class_id}?v=${target.id}`,
  );
  return NextResponse.json({ id: row.id });
}
