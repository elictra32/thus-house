import { adminRoute, ok } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { sendDailyReport } from "@/lib/daily-report";

export const maxDuration = 60;

// กดส่งรายงานประจำวัน (สถิติเมื่อวาน) เข้าห้อง Discord Backup ทันที
export const POST = adminRoute("roles", async (_req, { service, email }) => {
  const r = await sendDailyReport();
  if (!r.ok) return jsonError(r.error, 500);
  await logAdmin(service, email, "daily_report", "all", null, {});
  return ok({ sent: true });
});
