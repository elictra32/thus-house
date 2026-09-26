import { adminRoute, check, ok, readJson } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { str, url } from "@/lib/validate";

// เอกสารประกอบคลาส (ลิงก์ Google Drive) ของ ?classId=
export const GET = adminRoute("classes", async (req, { service }) => {
  const classId = new URL(req.url).searchParams.get("classId");
  if (!classId) return jsonError("ต้องระบุ classId");
  return ok({ docs: check(await service.from("class_documents").select("*").eq("class_id", classId).order("order_index")) });
});

// body: { class_id, title, url } → ต่อท้ายรายการ
export const POST = adminRoute("classes", async (req, { service, email }) => {
  const body = await readJson(req);
  const class_id = str(body, "class_id", { required: true })!;
  const title = str(body, "title", { required: true, max: 200 })!;
  const link = url(body, "url", { required: true })!;
  const { data: last } = await service
    .from("class_documents").select("order_index").eq("class_id", class_id)
    .order("order_index", { ascending: false }).limit(1).maybeSingle();
  const doc = check(
    await service.from("class_documents")
      .insert({ class_id, title, url: link, order_index: (last?.order_index ?? -1) + 1, created_by: email })
      .select().single(),
  );
  await logAdmin(service, email, "create", "class_documents", doc.id, { title, class_id });
  return ok({ doc });
});
