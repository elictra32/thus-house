import { adminRoute, ok } from "@/lib/admin-route";

const ONLINE_MS = 2 * 60 * 1000; // ping ล่าสุดภายใน 2 นาที = ออนไลน์

type Stat = { user_id: string; visits: number; seconds: number; last_seen: string };

// ออนไลน์ตอนนี้ + สถิติเข้าใช้ต่อคน (ช่วง 1 / 7 / 30 วัน)
export const GET = adminRoute("dashboard", async (req, { service }) => {
  const days = [1, 7, 30].includes(Number(new URL(req.url).searchParams.get("days"))) ? Number(new URL(req.url).searchParams.get("days")) : 7;
  // "วันนี้" = ตั้งแต่เที่ยงคืนเวลาไทย
  const since = days === 1
    ? new Date(new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10) + "T00:00:00+07:00")
    : new Date(Date.now() - days * 86400_000);
  const [{ data: stats }, { data: onlineRows }, { data: logins }] = await Promise.all([
    service.rpc("presence_stats", { since: since.toISOString() }),
    service.from("presence_sessions").select("user_id, started_at, last_seen").gte("last_seen", new Date(Date.now() - ONLINE_MS).toISOString()),
    service.from("member_logs").select("user_id").eq("action", "login").gte("created_at", since.toISOString()),
  ]);
  const rows = (stats ?? []) as Stat[];
  const ids = Array.from(new Set([...rows.map((r) => r.user_id), ...(onlineRows ?? []).map((r) => r.user_id)]));
  const { data: users } = ids.length
    ? await service.from("users").select("id, name, nickname, member_code, avatar_url, role").in("id", ids)
    : { data: [] };
  const byId = new Map((users ?? []).map((u) => [u.id, u]));
  const loginCount = new Map<string, number>();
  for (const l of logins ?? []) loginCount.set(l.user_id, (loginCount.get(l.user_id) ?? 0) + 1);

  const online = Array.from(new Map((onlineRows ?? []).map((r) => [r.user_id, r])).values()).map((r) => ({
    user: byId.get(r.user_id) ?? null,
    user_id: r.user_id,
    since: r.started_at,
  }));
  const people = rows
    .map((r) => ({ ...r, visits: Number(r.visits), seconds: Number(r.seconds), logins: loginCount.get(r.user_id) ?? 0, user: byId.get(r.user_id) ?? null }))
    .sort((a, b) => b.seconds - a.seconds);
  const totalSeconds = people.reduce((s, p) => s + p.seconds, 0);
  const totalVisits = people.reduce((s, p) => s + p.visits, 0);
  return ok({
    days,
    online,
    people,
    totals: {
      users: people.length,
      seconds: totalSeconds,
      visits: totalVisits,
      avgSession: totalVisits ? Math.round(totalSeconds / totalVisits) : 0,
      logins: logins?.length ?? 0,
    },
  });
});
