"use client";
import { useState } from "react";
import Link from "next/link";
import PageHeader, { ErrorBox, StatCard } from "@/components/admin/PageHeader";
import Avatar from "@/components/Avatar";
import { PageLoading } from "@/components/LoadingSpinner";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/utils";

type U = { id: string; name: string | null; nickname: string | null; member_code: string | null; avatar_url: string | null; role: string } | null;
type Person = { user_id: string; visits: number; seconds: number; last_seen: string; logins: number; user: U };
type Data = {
  days: number;
  online: { user_id: string; since: string; user: U }[];
  people: Person[];
  totals: { users: number; seconds: number; visits: number; avgSession: number; logins: number };
};

const who = (u: U) => (u ? [u.member_code, u.nickname || u.name].filter(Boolean).join(" ") || "-" : "(ลบแล้ว)");
// วินาที → "2 ชม. 15 นาที" / "12 นาที"
function dur(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} ชม. ${m} นาที` : `${m} นาที`;
}

// Admin → ออนไลน์ & สถิติ: ใครออนไลน์อยู่ · ใครอยู่นานสุด / เข้าบ่อยสุด
export default function OnlinePage() {
  const [days, setDays] = useState(7);
  const [sort, setSort] = useState<"seconds" | "visits">("seconds");
  const { data, error, loading } = useApi<Data>(`/api/admin/presence?days=${days}`);
  const people = [...(data?.people ?? [])].sort((a, b) => b[sort] - a[sort]);
  const longest = [...(data?.people ?? [])].sort((a, b) => b.seconds - a.seconds)[0];
  const frequent = [...(data?.people ?? [])].sort((a, b) => b.visits - a.visits)[0];

  return (
    <>
      <PageHeader title="ออนไลน์ & สถิติการใช้งาน" subtitle="นับเวลาเฉพาะตอนเปิดหน้าเว็บอยู่ (สลับแท็บไปที่อื่นไม่นับ) · ห่างเกิน 3 นาที = นับเป็นครั้งใหม่" />
      <div className="mb-5 inline-flex rounded-xl bg-raised p-1 text-sm">
        {([[1, "วันนี้"], [7, "7 วัน"], [30, "30 วัน"]] as const).map(([d, l]) => (
          <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-4 py-2 ${days === d ? "bg-brand font-bold text-white" : "text-muted hover:text-ink"}`}>{l}</button>
        ))}
      </div>
      {error && <ErrorBox message={error} />}
      {loading && !data ? (
        <PageLoading />
      ) : data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="🟢 ออนไลน์ตอนนี้" value={data.online.length} />
            <StatCard label="คนที่เข้าใช้" value={data.totals.users} hint={`เข้าสู่ระบบ ${data.totals.logins} ครั้ง`} />
            <StatCard label="เวลาใช้งานรวม" value={dur(data.totals.seconds)} hint={`${data.totals.visits} ครั้ง`} />
            <StatCard label="เฉลี่ยต่อครั้ง" value={dur(data.totals.avgSession)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="card p-5">
              <h3 className="font-bold">🟢 ออนไลน์ตอนนี้ ({data.online.length})</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {data.online.map((o) => (
                  <li key={o.user_id}>
                    <Link href={`/admin/members/${o.user_id}`} className="flex items-center gap-2 rounded-full bg-raised py-1 pl-1 pr-3 text-sm hover:bg-edge">
                      <span className="relative">
                        <Avatar src={o.user?.avatar_url} name={o.user?.nickname || o.user?.name || "?"} size={28} />
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-card" />
                      </span>
                      {who(o.user)}
                      <span className="text-xs text-subtle">· {dur((Date.now() - Date.parse(o.since)) / 1000)}</span>
                    </Link>
                  </li>
                ))}
                {!data.online.length && <li className="text-sm text-muted">ไม่มีใครออนไลน์ตอนนี้</li>}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Highlight title="⏱ อยู่นานสุด" p={longest} value={longest && dur(longest.seconds)} />
              <Highlight title="🔁 เข้าบ่อยสุด" p={frequent} value={frequent && `${frequent.visits} ครั้ง`} />
            </div>
          </div>

          <div className="card overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <h3 className="font-bold">อันดับการใช้งาน</h3>
              <div className="inline-flex rounded-lg bg-raised p-1 text-xs">
                {([["seconds", "เรียงตามเวลารวม"], ["visits", "เรียงตามจำนวนครั้ง"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setSort(k)} className={`rounded-md px-3 py-1.5 ${sort === k ? "bg-brand font-bold text-white" : "text-muted"}`}>{l}</button>
                ))}
              </div>
            </div>
            <table className="w-full min-w-[720px]">
              <thead><tr><th className="th">#</th><th className="th">สมาชิก</th><th className="th">เวลารวม</th><th className="th">จำนวนครั้ง</th><th className="th">เฉลี่ย/ครั้ง</th><th className="th">เข้าสู่ระบบ</th><th className="th">เห็นล่าสุด</th></tr></thead>
              <tbody>
                {people.map((p, i) => (
                  <tr key={p.user_id} className="hover:bg-raised/50">
                    <td className="td font-bold text-muted">{i + 1}</td>
                    <td className="td">
                      <Link href={`/admin/members/${p.user_id}`} className="flex items-center gap-2 hover:underline">
                        <Avatar src={p.user?.avatar_url} name={p.user?.nickname || p.user?.name || "?"} size={28} />
                        {who(p.user)}
                        {p.user && p.user.role !== "member" && <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] text-muted">ทีมงาน</span>}
                      </Link>
                    </td>
                    <td className="td font-semibold">{dur(p.seconds)}</td>
                    <td className="td">{p.visits}</td>
                    <td className="td text-muted">{dur(p.seconds / p.visits)}</td>
                    <td className="td text-muted">{p.logins}</td>
                    <td className="td whitespace-nowrap text-muted">{formatDate(p.last_seen, true)}</td>
                  </tr>
                ))}
                {!people.length && <tr><td className="td text-center text-muted" colSpan={7}>ยังไม่มีข้อมูลในช่วงนี้ (เริ่มนับตั้งแต่อัปเดตนี้)</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function Highlight({ title, p, value }: { title: string; p?: Person; value?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center p-5 text-center">
      <p className="text-xs font-bold text-muted">{title}</p>
      {p ? (
        <>
          <div className="mt-3"><Avatar src={p.user?.avatar_url} name={p.user?.nickname || p.user?.name || "?"} size={56} /></div>
          <p className="mt-2 font-bold">{who(p.user)}</p>
          <p className="text-2xl font-extrabold text-brand-light">{value}</p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">-</p>
      )}
    </div>
  );
}
