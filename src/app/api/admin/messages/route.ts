import { adminRoute, check, ok } from "@/lib/admin-route";

// กล่องข้อความถึงผู้สอน (ทีมงานที่มีสิทธิ์ community)
export const GET = adminRoute("community", async (req, { service }) => {
  const status = new URL(req.url).searchParams.get("status");
  let q = service
    .from("instructor_messages")
    .select("id, body, status, reply, replied_by, replied_at, created_at, classes(name), users(id, name, nickname, email, member_code)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status === "open") q = q.neq("status", "replied");
  const [messages, { count }] = await Promise.all([
    q,
    service.from("instructor_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  return ok({ messages: check(messages), newCount: count ?? 0 });
});
