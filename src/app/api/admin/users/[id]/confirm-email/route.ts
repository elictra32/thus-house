import { adminRoute, ok } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";

// Admin ยืนยันอีเมลแทนสมาชิก (กรณีอีเมลยืนยันส่งไม่ถึง หรือสมัครตอนระบบส่งอีเมลติด limit)
export const POST = adminRoute<{ id: string }>("members", async (_req, { service, email }, { id }) => {
  const { data, error } = await service.auth.admin.updateUserById(id, { email_confirm: true });
  if (error || !data.user) return jsonError(error?.message ?? "ไม่พบบัญชี", 404);
  await service.from("notifications").insert({
    user_id: id,
    type: "account",
    title: "บัญชีพร้อมใช้งานแล้ว",
    message: "ทีมงานยืนยันบัญชีของคุณแล้ว เข้าสู่ระบบได้เลย",
  });
  await logAdmin(service, email, "confirm_email", "users", id, { email: data.user.email });
  return ok();
});
