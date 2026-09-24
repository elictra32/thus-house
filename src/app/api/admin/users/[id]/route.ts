import { adminRoute, check, ok, readJson, must } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { oneOf, str } from "@/lib/validate";

type P = { id: string };

export const GET = adminRoute<P>(async (_req, { service }, { id }) => {
  const [user, purchases, watched] = await Promise.all([
    service.from("users").select("*").eq("id", id).maybeSingle(),
    service.from("purchases").select("*, classes(id, name, videos_count)").eq("user_id", id).order("created_at", { ascending: false }),
    service.from("watched_videos").select("video_id, videos(class_id)").eq("user_id", id),
  ]);
  if (!user.data) return jsonError("ไม่พบสมาชิก", 404);

  const watchedByClass: Record<string, number> = {};
  for (const w of (watched.data ?? []) as unknown as { videos: { class_id: string } | null }[]) {
    const cid = w.videos?.class_id;
    if (cid) watchedByClass[cid] = (watchedByClass[cid] ?? 0) + 1;
  }
  return ok({ user: user.data, purchases: check(purchases), watchedByClass });
});

export const PUT = adminRoute<P>(async (req, { service, email }, { id }) => {
  const body = await readJson(req);
  const update: Record<string, unknown> = {};
  const status = oneOf(body, "status", ["active", "inactive", "suspended"] as const);
  if (status) update.status = status;
  if ("name" in body) update.name = str(body, "name", { max: 100 });
  if ("phone" in body) update.phone = str(body, "phone", { max: 20 });
  if ("membership_end" in body) update.membership_end = str(body, "membership_end");
  if (!Object.keys(update).length) return jsonError("ไม่มีข้อมูลที่จะแก้ไข");

  const user = check(await service.from("users").update(update).eq("id", id).select().single());
  await logAdmin(service, email, "update", "users", id, update);
  return ok({ user });
});

export const DELETE = adminRoute<P>(async (_req, { service, email, user }, { id }) => {
  if (id === user.id) return jsonError("ลบบัญชีตัวเองไม่ได้");
  const { data: target } = await service.from("users").select("email").eq("id", id).maybeSingle();
  // ลบจาก auth.users → cascade ลบ users, purchases, watched_videos, notifications
  const { error } = await service.auth.admin.deleteUser(id);
  if (error) {
    // กรณีไม่มีใน auth แล้ว ลบแถวใน users ตรงๆ
    must(await service.from("users").delete().eq("id", id));
  }
  await logAdmin(service, email, "delete", "users", id, { email: target?.email });
  return ok();
});
