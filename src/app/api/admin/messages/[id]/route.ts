import { adminRoute, check, ok, readJson } from "@/lib/admin-route";
import { jsonError } from "@/lib/auth";
import { str } from "@/lib/validate";

type P = { id: string };

// ตอบข้อความ (แจ้งเตือนสมาชิกในเว็บ) หรือทำเครื่องหมายว่าอ่านแล้ว
export const PUT = adminRoute<P>("community", async (req, { service, email }, { id }) => {
  const body = await readJson(req);
  const { data: msg } = await service.from("instructor_messages").select("id, user_id, status, body").eq("id", id).maybeSingle();
  if (!msg) return jsonError("ไม่พบข้อความ", 404);

  if (body.read === true) {
    if (msg.status === "new") await service.from("instructor_messages").update({ status: "read" }).eq("id", id);
    return ok();
  }
  const reply = str(body, "reply", { required: true, max: 4000 })!;
  const updated = check(
    await service
      .from("instructor_messages")
      .update({ reply, status: "replied", replied_by: email, replied_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single(),
  );
  await service.from("notifications").insert({
    user_id: msg.user_id,
    type: "message",
    link: "/messages",
    title: "ผู้สอนตอบข้อความของคุณแล้ว",
    message: reply.slice(0, 300),
  });
  return ok({ message: updated });
});
