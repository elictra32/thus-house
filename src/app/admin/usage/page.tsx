import PageHeader from "@/components/admin/PageHeader";
import { requirePageAdmin } from "@/lib/auth";
import { BREVO_FREE_PER_DAY, supabasePlan, vercelPlan } from "@/lib/usage-plans";

export const metadata = { title: "Usage & ค่าใช้จ่าย" };
export const dynamic = "force-dynamic";

type Usage = {
  db_bytes: number;
  storage_bytes: number;
  storage_by_bucket: Record<string, number>;
  auth_users: number;
  mau: number;
  rows: Record<string, number>;
};
type BrevoPlan = { type: string; credits: number; creditsType: string };

const mb = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(2)} GB` : `${(b / 1024 ** 2).toFixed(1)} MB`);
const n = (x: number) => x.toLocaleString("th-TH");

async function brevoAccount(): Promise<{ plans: BrevoPlan[]; email?: string } | null> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": key, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return { plans: j.plan ?? [], email: j.email };
  } catch {
    return null;
  }
}

function level(pct: number) {
  if (pct >= 85) return { bar: "bg-red-400", text: "text-red-300", label: "ใกล้เต็ม — ควรอัปเกรด" };
  if (pct >= 60) return { bar: "bg-[#ec9e56]", text: "text-[#f3c08f]", label: "เริ่มสูง — เตรียมอัปเกรด" };
  return { bar: "bg-green-400", text: "text-green-300", label: "ปกติ" };
}

function Meter({ label, used, limit, fmt, hint }: { label: string; used: number; limit: number; fmt: (x: number) => string; hint?: string }) {
  const pct = Math.min(100, (used / limit) * 100);
  const l = level(pct);
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-muted">
          {fmt(used)} / {fmt(limit)} · <span className={`font-bold ${l.text}`}>{pct < 1 ? "<1" : pct.toFixed(0)}%</span>
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
        <i className={`block h-full rounded-full ${l.bar}`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      <p className={`mt-1.5 text-xs ${pct >= 60 ? l.text : "text-subtle"}`}>{pct >= 60 ? l.label : hint}</p>
    </div>
  );
}

function Service({ name, plan, price, link, children }: { name: string; plan: string; price: string; link: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{name}</h2>
          <p className="mt-0.5 text-sm text-muted">แพ็กเกจ {plan} · {price}</p>
        </div>
        <a href={link} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ring-inset ring-white/15 hover:bg-white/5">
          เปิดหน้า Usage ↗
        </a>
      </div>
      {children}
    </section>
  );
}

export default async function UsagePage() {
  const { service } = await requirePageAdmin("dashboard");
  const sp = supabasePlan();
  const vp = vercelPlan();
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [{ data: usage }, brevo, { count: opens }, { count: emails }] = await Promise.all([
    service.rpc("admin_usage"),
    brevoAccount(),
    service.from("video_access_logs").select("id", { count: "exact", head: true }).gte("created_at", since),
    service.from("admin_logs").select("id", { count: "exact", head: true }).eq("action", "email").gte("created_at", since),
  ]);
  const u = (usage ?? { db_bytes: 0, storage_bytes: 0, storage_by_bucket: {}, auth_users: 0, mau: 0, rows: {} }) as Usage;
  const slips = u.storage_by_bucket.slips ?? 0;
  const brevoSend = brevo?.plans.find((p) => p.creditsType === "sendLimit") ?? brevo?.plans[0];

  const alerts: string[] = [];
  if (u.db_bytes / sp.dbBytes >= 0.6 || u.storage_bytes / sp.storageBytes >= 0.6 || u.mau / sp.mau >= 0.6)
    alerts.push(`Supabase ใกล้เต็มแพ็กเกจ ${sp.label} — อัปเกรดเป็น Pro ($25/เดือน)`);
  if (vp.label === "Hobby") alerts.push("Vercel Hobby ไม่อนุญาตให้ใช้กับเว็บที่มีรายได้ — ควรอัปเกรดเป็น Pro ($20/เดือน) เมื่อเปิดขายจริง");
  if (sp.label === "Free") alerts.push("Supabase Free ไม่มีสำรองข้อมูลอัตโนมัติ และหยุดโปรเจกต์ถ้าไม่มีคนใช้ ~1 สัปดาห์ — Pro มี backup รายวัน");

  return (
    <>
      <PageHeader title="Usage & ค่าใช้จ่าย" subtitle="ดูว่าบริการไหนใกล้เต็ม และควรเริ่มจ่ายเมื่อไร" />

      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a) => (
            <p key={a} className="rounded-xl bg-[#ec9e56]/10 p-3 text-sm text-[#f3c08f] ring-1 ring-inset ring-[#ec9e56]/30">⚠️ {a}</p>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Service name="Supabase — ฐานข้อมูล / ล็อกอิน / ไฟล์" plan={sp.label} price={sp.price} link="https://supabase.com/dashboard/org/jqbxkyhmytymrlbxirgd/usage">
          <Meter label="ขนาดฐานข้อมูล" used={u.db_bytes} limit={sp.dbBytes} fmt={mb} hint="ข้อมูลสมาชิก คอร์ส คอมเมนต์ ประวัติต่างๆ" />
          <Meter label="พื้นที่ไฟล์ (สลิป / รูปหน้าเว็บ)" used={u.storage_bytes} limit={sp.storageBytes} fmt={mb} hint={`สลิป ${mb(slips)} · สลิปใหม่ถูกย่อขนาดอัตโนมัติ`} />
          <Meter label="ผู้ใช้ที่ล็อกอินใน 30 วัน (MAU)" used={u.mau} limit={sp.mau} fmt={n} hint={`บัญชีทั้งหมด ${n(u.auth_users)} คน`} />
          <p className="text-xs text-subtle">Egress (ปริมาณข้อมูลที่ส่งออก) ดูได้ในหน้า Usage ของ Supabase — วิดีโอไม่ได้ผ่าน Supabase จึงใช้น้อย</p>
        </Service>

        <Service name="Vercel — ตัวเว็บ" plan={vp.label} price={vp.price} link="https://vercel.com/elictra32/~/usage">
          <div className="space-y-2 text-sm leading-relaxed text-muted">
            <p>
              ลิมิตหลัก: Bandwidth ~{vp.bandwidthGb} GB/เดือน — หน้าเว็บเราเล็ก (วิดีโอเล่นจาก YouTube/Drive) สมาชิกหลักพันคน/เดือนยังไม่ถึง
            </p>
            <p>ตัวเลขจริงดูได้ที่ปุ่ม &quot;เปิดหน้า Usage&quot; (Vercel ไม่ให้ดึงตัวเลขมาแสดงที่นี่โดยไม่ใช้ token พิเศษ)</p>
          </div>
        </Service>

        <Service name="Brevo — อีเมล" plan={brevoSend ? brevoSend.type : "ยังไม่ได้เชื่อม"} price={brevoSend?.type === "free" ? "ฟรี" : "ตามแพ็กเกจ"} link="https://app.brevo.com/settings/plan">
          {brevo ? (
            brevoSend?.creditsType === "sendLimit" && brevoSend.type === "free" ? (
              <Meter
                label="อีเมลที่ยังส่งได้วันนี้"
                used={Math.max(0, BREVO_FREE_PER_DAY - brevoSend.credits)}
                limit={BREVO_FREE_PER_DAY}
                fmt={n}
                hint={`เหลือ ${n(brevoSend.credits)} ฉบับวันนี้ · รีเซ็ตทุกวัน`}
              />
            ) : (
              <p className="text-sm text-muted">เครดิตคงเหลือ: <b className="text-ink">{n(brevoSend?.credits ?? 0)}</b> ({brevoSend?.creditsType})</p>
            )
          ) : (
            <p className="text-sm text-muted">ยังไม่ได้ตั้งค่า BREVO_API_KEY หรือเชื่อมต่อไม่ได้</p>
          )}
          <p className="text-xs text-subtle">ส่งประกาศจาก Admin ใน 30 วัน: {n(emails ?? 0)} ครั้ง · แพ็กเกจฟรีส่งได้ {BREVO_FREE_PER_DAY} ฉบับ/วัน (รวมอีเมลยืนยันสมัคร)</p>
        </Service>

        <Service name="YouTube / Discord" plan="ฟรี" price="ไม่มีลิมิตที่ต้องจ่าย" link="https://studio.youtube.com">
          <p className="text-sm text-muted">วิดีโอ Unlisted และแจ้งเตือน Discord ใช้ฟรี ไม่มีค่าใช้จ่ายเพิ่มตามจำนวนสมาชิก</p>
          <p className="text-xs text-subtle">
            เปิดบทเรียนใน 30 วัน: {n(opens ?? 0)} ครั้ง · คอมเมนต์ทั้งหมด {n(u.rows.lesson_comments ?? 0)} · ข้อความถึงผู้สอน {n(u.rows.instructor_messages ?? 0)}
          </p>
        </Service>
      </div>

      <section className="card mt-6 p-6 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">ควรจ่ายเมื่อไร</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
          <li><b className="text-ink">ทดสอบ / สมาชิกไม่ถึง 20 คน</b> — ฟรีทั้งหมดได้</li>
          <li><b className="text-ink">เปิดขายจริง</b> — Vercel Pro $20 + Supabase Pro $25 ≈ <b className="text-ink">1,600 บาท/เดือน</b> (รับได้หลายร้อยคน ใช้พร้อมกัน 100+ คนสบาย)</li>
          <li><b className="text-ink">ส่งประกาศหาสมาชิกเกิน 300 คน/วัน</b> — อัปเกรด Brevo (~$9–25/เดือน)</li>
          <li>แถบสี <span className="text-green-300">เขียว</span> = ปกติ · <span className="text-[#f3c08f]">ส้ม</span> (60%+) = เตรียมอัปเกรด · <span className="text-red-300">แดง</span> (85%+) = ควรอัปเกรดทันที</li>
        </ul>
      </section>
    </>
  );
}
