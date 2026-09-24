import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Class, Purchase, User } from "@/types/database";

const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }); // YYYY-MM-DD
const monthKey = (d: Date) => dayKey(d).slice(0, 7);

// คำนวณตัวเลขทั้งหมดของหน้า Admin Dashboard / Analytics
// (สมาชิก ~100 คน ดึงมาคำนวณใน server ได้สบาย)
export async function computeAnalytics(service: SupabaseClient) {
  const [{ data: users }, { data: purchases }, { data: classes }] = await Promise.all([
    service.from("users").select("id, status, created_at, last_login_at, name, email"),
    service.from("purchases").select("id, class_id, amount, status, created_at, approved_at"),
    service.from("classes").select("id, name"),
  ]);
  const U = (users ?? []) as Pick<User, "id" | "status" | "created_at" | "last_login_at" | "name" | "email">[];
  const P = (purchases ?? []) as Pick<Purchase, "id" | "class_id" | "amount" | "status" | "created_at" | "approved_at">[];
  const C = (classes ?? []) as Pick<Class, "id" | "name">[];
  const approved = P.filter((p) => p.status === "approved");
  const revenueDate = (p: (typeof P)[number]) => new Date(p.approved_at ?? p.created_at);

  // รายได้รายวัน 30 วันล่าสุด
  const daily: { date: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    daily.push({ date: dayKey(d), revenue: 0 });
  }
  const dailyIdx = new Map(daily.map((d, i) => [d.date, i]));
  approved.forEach((p) => {
    const i = dailyIdx.get(dayKey(revenueDate(p)));
    if (i !== undefined) daily[i].revenue += Number(p.amount);
  });

  // รายเดือน 12 เดือนล่าสุด: สมาชิกสะสม + รายได้
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 15)));
  const monthly = months.map((m) => ({
    month: m,
    users: U.filter((u) => monthKey(new Date(u.created_at)) <= m).length,
    newUsers: U.filter((u) => monthKey(new Date(u.created_at)) === m).length,
    revenue: approved.filter((p) => monthKey(revenueDate(p)) === m).reduce((s, p) => s + Number(p.amount), 0),
  }));

  // ความนิยมของแต่ละคอร์ส
  const classStats = C.map((c) => {
    const ps = approved.filter((p) => p.class_id === c.id);
    return { name: c.name, students: ps.length, revenue: ps.reduce((s, p) => s + Number(p.amount), 0) };
  }).sort((a, b) => b.students - a.students);

  const statusCount = (s: string) => P.filter((p) => p.status === s).length;
  const thirtyDaysAgo = now.getTime() - 30 * 86400000;
  const activeRecently = U.filter((u) => u.last_login_at && new Date(u.last_login_at).getTime() >= thirtyDaysAgo).length;
  const churned = U.filter((u) => u.status !== "active").length;

  return {
    totals: {
      users: U.length,
      revenue: approved.reduce((s, p) => s + Number(p.amount), 0),
      purchases: approved.length,
      pending: statusCount("pending"),
      popularClass: classStats[0]?.students ? classStats[0].name : "-",
    },
    daily,
    monthly,
    classStats,
    paymentStatus: [
      { name: "อนุมัติแล้ว", value: statusCount("approved") },
      { name: "รอตรวจสอบ", value: statusCount("pending") },
      { name: "ถูกปฏิเสธ", value: statusCount("rejected") },
    ],
    activity: {
      activeLast30d: activeRecently,
      inactiveLast30d: U.length - activeRecently,
      // Churn = สมาชิกที่สถานะไม่ใช่ active (inactive/suspended) ต่อสมาชิกทั้งหมด
      churnRate: U.length ? Math.round((churned / U.length) * 1000) / 10 : 0,
      recentLogins: [...U]
        .filter((u) => u.last_login_at)
        .sort((a, b) => b.last_login_at!.localeCompare(a.last_login_at!))
        .slice(0, 10)
        .map((u) => ({ name: u.name ?? u.email, email: u.email, last_login_at: u.last_login_at })),
    },
  };
}

export type Analytics = Awaited<ReturnType<typeof computeAnalytics>>;
