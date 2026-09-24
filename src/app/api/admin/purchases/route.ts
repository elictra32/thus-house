import { adminRoute, check, ok } from "@/lib/admin-route";

export const GET = adminRoute(async (req, { service }) => {
  const status = new URL(req.url).searchParams.get("status");
  let q = service
    .from("purchases")
    .select("*, classes(id, name), users(id, name, email)")
    .order("created_at", { ascending: status === "pending" })
    .limit(200);
  if (status && status !== "all") q = q.eq("status", status);
  const purchases = check(await q);

  // สลิปอยู่ใน bucket ส่วนตัว — ออก signed URL อายุ 1 ชม. ให้ Admin ดู
  const paths = purchases.map((p) => p.slip_image_url).filter(Boolean) as string[];
  const signed: Record<string, string> = {};
  if (paths.length) {
    const { data } = await service.storage.from("slips").createSignedUrls(paths, 3600);
    data?.forEach((s) => s.path && s.signedUrl && (signed[s.path] = s.signedUrl));
  }
  return ok({
    purchases: purchases.map((p) => ({ ...p, slip_url: p.slip_image_url ? signed[p.slip_image_url] ?? null : null })),
  });
});
