"use client";
import { useState } from "react";
import Link from "next/link";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Button from "@/components/Button";
import { PageLoading } from "@/components/LoadingSpinner";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/utils";

type Msg = {
  id: string;
  body: string;
  status: "new" | "read" | "replied";
  reply: string | null;
  replied_by: string | null;
  replied_at: string | null;
  created_at: string;
  classes: { name: string } | null;
  users: { id: string; name: string | null; nickname: string | null; email: string; member_code: string | null } | null;
};

export default function AdminMessagesPage() {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const { data, error, loading, reload } = useApi<{ messages: Msg[]; newCount: number }>(
    `/api/admin/messages${filter === "open" ? "?status=open" : ""}`,
  );

  return (
    <>
      <PageHeader
        title="ข้อความถึงผู้สอน"
        subtitle={data ? `ยังไม่ได้อ่าน ${data.newCount} ข้อความ` : undefined}
      />
      <div className="mb-5 flex gap-2">
        {(["open", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm ${filter === f ? "bg-brand font-bold" : "ring-1 ring-inset ring-white/15 text-muted"}`}
          >
            {f === "open" ? "รอตอบ" : "ทั้งหมด"}
          </button>
        ))}
      </div>
      {error && <ErrorBox message={error} />}
      {loading && !data ? (
        <PageLoading />
      ) : (
        <div className="space-y-4">
          {data?.messages.map((m) => <MessageCard key={m.id} m={m} onDone={reload} />)}
          {data?.messages.length === 0 && <div className="card p-10 text-center text-muted">ไม่มีข้อความ{filter === "open" ? "ที่รอตอบ" : ""}</div>}
        </div>
      )}
    </>
  );
}

function MessageCard({ m, onDone }: { m: Msg; onDone: () => void }) {
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const who = m.users?.nickname || m.users?.name || m.users?.email || "สมาชิก";

  async function send() {
    setSaving(true);
    setErr("");
    try {
      await api.put(`/api/admin/messages/${m.id}`, { reply });
      setReply("");
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function markRead() {
    await api.put(`/api/admin/messages/${m.id}`, { read: true });
    onDone();
  }

  return (
    <div className={`card p-5 ${m.status === "new" ? "ring-[#ec9e56]/40" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {m.status === "new" && <span className="rounded-full bg-[#ec9e56]/20 px-2 py-0.5 text-[11px] font-bold text-[#f3c08f]">ใหม่</span>}
          {m.users ? (
            <Link href={`/admin/members/${m.users.id}`} className="font-bold hover:underline">{who}</Link>
          ) : (
            <span className="font-bold">{who}</span>
          )}
          {m.users?.member_code && <span className="text-xs text-brand-light">{m.users.member_code}</span>}
          <span className="text-xs text-muted">{m.users?.email}</span>
        </div>
        <span className="text-xs text-muted">{formatDate(m.created_at, true)}{m.classes && ` · ${m.classes.name}`}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>

      {m.reply ? (
        <div className="mt-4 rounded-2xl bg-[#ba94c7]/10 p-4 ring-1 ring-inset ring-[#ba94c7]/20">
          <p className="text-xs font-bold text-[#d9c2e3]">ตอบโดย {m.replied_by} · {formatDate(m.replied_at, true)}</p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{m.reply}</p>
        </div>
      ) : (
        <div className="mt-4">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="พิมพ์คำตอบ — สมาชิกจะได้รับแจ้งเตือน 🔔"
            className="w-full resize-y rounded-xl border border-edge bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
          />
          {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
          <div className="mt-2 flex justify-end gap-2">
            {m.status === "new" && <Button size="sm" variant="ghost" onClick={markRead}>ทำเครื่องหมายว่าอ่านแล้ว</Button>}
            <Button size="sm" loading={saving} disabled={!reply.trim()} onClick={send}>ตอบกลับ</Button>
          </div>
        </div>
      )}
    </div>
  );
}
