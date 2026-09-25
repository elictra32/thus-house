"use client";
import { useEffect, useState } from "react";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import Input from "@/components/Input";
import StatusBadge from "@/components/StatusBadge";
import { PageLoading } from "@/components/LoadingSpinner";
import { ActivityList, MemberInfo, NotesPanel, type MemberLog, type Note } from "@/components/admin/MemberExtras";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/utils";

type Member = {
  id: string; name: string | null; nickname: string | null; member_code: string | null; email: string; phone: string | null;
  avatar_url: string | null; status: string; last_login_at: string | null; birth_date: string | null;
  trading_markets: string[]; trading_years: string | null; learning_goal: string | null; created_at: string;
  notes?: number; last_note_at?: string | null;
};
type Found = { id: string; name: string | null; nickname: string | null; member_code: string | null; avatar_url: string | null };
type Detail = {
  member: Member; notes: Note[]; logs: MemberLog[]; me: string;
  purchases: { id: string; status: string; expires_at: string | null; created_at: string; classes: { name: string } | null }[];
};

const who = (m: { member_code: string | null; nickname: string | null; name: string | null }) =>
  [m.member_code, m.nickname || m.name].filter(Boolean).join(" ") || "-";

// Mentor: สมาชิกที่ฉันดูแล — เพิ่ม/เอาออก + ดูข้อมูล + จดโน้ต
export default function MentorPage() {
  const { data, error, loading, reload } = useApi<{ members: Member[] }>("/api/mentor");
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!selected && data?.members.length) setSelected(data.members[0].id);
  }, [data, selected]);

  if (loading && !data) return <PageLoading />;
  return (
    <>
      <PageHeader
        title="สมาชิกที่ฉันดูแล"
        subtitle={data ? `${data.members.length} คน` : undefined}
        action={<Button size="sm" onClick={() => setAdding(!adding)}>{adding ? "ปิด" : "+ เพิ่มสมาชิก"}</Button>}
      />
      {error && <ErrorBox message={error} />}
      {adding && <AddMember existing={data?.members.map((m) => m.id) ?? []} onAdded={(id) => { reload(); setSelected(id); }} />}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="card h-fit divide-y divide-line">
          {data?.members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${selected === m.id ? "bg-brand/15" : "hover:bg-raised/60"}`}
            >
              <Avatar src={m.avatar_url} name={m.nickname || m.name || "?"} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{who(m)}</p>
                <p className="truncate text-xs text-muted">
                  โน้ต {m.notes ?? 0} · {m.last_note_at ? `ล่าสุด ${formatDate(m.last_note_at)}` : "ยังไม่มีโน้ต"}
                </p>
              </div>
            </button>
          ))}
          {!data?.members.length && <p className="p-5 text-sm text-muted">ยังไม่มีสมาชิกในความดูแล — กด “+ เพิ่มสมาชิก”</p>}
        </div>
        {selected && <MemberPanel key={selected} id={selected} onRemoved={() => { setSelected(null); reload(); }} onNote={reload} />}
      </div>
    </>
  );
}

function AddMember({ existing, onAdded }: { existing: string[]; onAdded: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = setTimeout(() => {
      api.get<{ results: Found[] }>(`/api/mentor/search?q=${encodeURIComponent(q.trim())}`).then((r) => setResults(r.results)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  async function add(id: string) {
    setBusy(id);
    try {
      await api.post("/api/mentor", { memberId: id });
      onAdded(id);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="card mb-6 p-5">
      <Input name="q" placeholder="พิมพ์รหัสสมาชิก ชื่อ หรือชื่อเล่น" value={q} onChange={(e) => setQ(e.target.value)} autoFocus className="max-w-md" />
      <ul className="mt-3 space-y-2">
        {results.map((r) => (
          <li key={r.id} className="flex items-center gap-3">
            <Avatar src={r.avatar_url} name={r.nickname || r.name || "?"} size={32} />
            <span className="flex-1 text-sm">{who(r)} {r.nickname && r.name && <span className="text-muted">· {r.name}</span>}</span>
            {existing.includes(r.id) ? (
              <span className="text-xs text-subtle">ดูแลอยู่แล้ว</span>
            ) : (
              <Button size="sm" variant="outline" loading={busy === r.id} onClick={() => add(r.id)}>+ เพิ่ม</Button>
            )}
          </li>
        ))}
        {q.trim() && !results.length && <li className="text-sm text-muted">ไม่พบสมาชิก</li>}
      </ul>
    </div>
  );
}

function MemberPanel({ id, onRemoved, onNote }: { id: string; onRemoved: () => void; onNote: () => void }) {
  const { data, error, loading, reload } = useApi<Detail>(`/api/mentor/${id}`);
  if (loading && !data) return <PageLoading />;
  if (error || !data) return <ErrorBox message={error || "ไม่พบสมาชิก"} />;
  const m = data.member;
  async function remove() {
    if (!confirm(`เลิกดูแล ${who(m)}? (โน้ตที่จดไว้ยังอยู่)`)) return;
    await api.del(`/api/mentor?memberId=${m.id}`);
    onRemoved();
  }
  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <Avatar src={m.avatar_url} name={m.nickname || m.name || "?"} size={64} />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold">{who(m)}</p>
          <p className="text-sm text-muted">{m.name} · {m.phone || "-"} · {m.email}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted">
            <StatusBadge status={m.status} /> เข้าสู่ระบบล่าสุด {formatDate(m.last_login_at, true)}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={remove}>เลิกดูแล</Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <MemberInfo birthDate={m.birth_date} markets={m.trading_markets ?? []} years={m.trading_years} goal={m.learning_goal} />
          <div className="card p-5 text-sm">
            <h3 className="mb-3 font-bold">คอร์สที่ซื้อ</h3>
            <ul className="space-y-2">
              {data.purchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span>{p.classes?.name ?? "-"}</span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {p.status === "approved" && (p.expires_at ? `ถึง ${formatDate(p.expires_at)}` : "ไม่หมดอายุ")}
                    <StatusBadge status={p.status} />
                  </span>
                </li>
              ))}
              {!data.purchases.length && <li className="text-muted">ยังไม่มี</li>}
            </ul>
          </div>
        </div>
        <NotesPanel memberId={m.id} notes={data.notes} me={data.me} onChange={() => { reload(); onNote(); }} />
      </div>
      <ActivityList logs={data.logs} title="กิจกรรมล่าสุด (30 รายการ)" />
    </div>
  );
}
