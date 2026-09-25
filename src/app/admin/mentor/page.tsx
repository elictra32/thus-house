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
  // ยังไม่มีใครในความดูแล → เปิดรายชื่อให้เลือกเลย
  useEffect(() => {
    if (data && !data.members.length) setAdding(true);
  }, [data]);

  useEffect(() => {
    if (!selected && data?.members.length) setSelected(data.members[0].id);
  }, [data, selected]);

  if (loading && !data) return <PageLoading />;
  return (
    <>
      <PageHeader
        title="สมาชิกที่ฉันดูแล"
        subtitle={data ? `${data.members.length} คน` : undefined}
        action={<Button size="sm" onClick={() => setAdding(!adding)}>{adding ? "ปิดรายชื่อ" : "+ เลือกสมาชิก"}</Button>}
      />
      {error && <ErrorBox message={error} />}
      {adding && <AddMember onAdded={(id) => { reload(); setSelected(id); }} />}

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
          {!data?.members.length && <p className="p-5 text-sm text-muted">ยังไม่มีสมาชิกในความดูแล — กด “+ เลือกสมาชิก”</p>}
        </div>
        {selected && <MemberPanel key={selected} id={selected} onRemoved={() => { setSelected(null); reload(); }} onNote={reload} />}
      </div>
    </>
  );
}

// รายชื่อสมาชิกที่ยังไม่มี Mentor — กดเลือกได้เลย (พิมพ์เพื่อกรอง)
function AddMember({ onAdded }: { onAdded: (id: string) => void }) {
  const { data, error, loading, reload } = useApi<{ members: Found[] }>("/api/mentor/available");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const term = q.trim().toLowerCase();
  const list = (data?.members ?? []).filter(
    (m) => !term || [m.member_code, m.nickname, m.name].some((v) => v?.toLowerCase().includes(term)),
  );
  async function add(id: string) {
    setBusy(id);
    setErr("");
    try {
      await api.post("/api/mentor", { memberId: id });
      reload();
      onAdded(id);
    } catch (e) {
      setErr((e as Error).message);
      reload();
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="card mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          สมาชิกที่ยังไม่มี Mentor <b>{data?.members.length ?? "…"}</b> คน — กด <b>+ ดูแล</b> เพื่อเพิ่ม
        </p>
        <Input name="q" placeholder="กรองด้วยรหัส / ชื่อ / ชื่อเล่น" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-72" />
      </div>
      {(error || err) && <p className="mt-3 text-sm text-red-300">{error || err}</p>}
      {loading && !data ? (
        <p className="mt-4 text-sm text-muted">กำลังโหลด...</p>
      ) : (
        <ul className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl bg-raised/60 px-3 py-2.5">
              <Avatar src={r.avatar_url} name={r.nickname || r.name || "?"} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{who(r)}</p>
                {r.name && <p className="truncate text-xs text-muted">{r.name}</p>}
              </div>
              <Button size="sm" variant="outline" loading={busy === r.id} onClick={() => add(r.id)}>+ ดูแล</Button>
            </li>
          ))}
          {!list.length && <li className="text-sm text-muted">{term ? "ไม่พบสมาชิก" : "สมาชิกทุกคนมี Mentor ดูแลแล้ว"}</li>}
        </ul>
      )}
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
