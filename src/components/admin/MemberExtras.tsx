"use client";
import { useState } from "react";
import Button from "@/components/Button";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { MEMBER_ACTIONS, describeLog } from "@/lib/member-actions";
import { formatBirthDate, formatThaiId, maskedThaiId } from "@/lib/member-profile";

export type Note = { id: string; body: string; createdAt: string; authorId: string | null; author: string };
export type MemberLog = { id: number; action: string; details: Record<string, unknown> | null; created_at: string };

// โน้ตประวัติสมาชิก (Mentor / Admin) — ลบได้เฉพาะของตัวเอง หรือ Admin ลบได้ทุกอัน
export function NotesPanel({
  memberId, notes, me, canDeleteAll, onChange,
}: { memberId: string; notes: Note[]; me?: string; canDeleteAll?: boolean; onChange: () => void }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    if (!text.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/api/member-notes", { memberId, body: text });
      setText("");
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("ลบโน้ตนี้?")) return;
    await api.del(`/api/member-notes/${id}`).catch((e) => setError((e as Error).message));
    onChange();
  }

  return (
    <div className="card p-5">
      <h3 className="font-bold">📝 โน้ตประวัติสมาชิก</h3>
      <p className="mt-1 text-xs text-subtle">เห็นเฉพาะทีมงาน / Mentor ที่ดูแล — สมาชิกไม่เห็น</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="เช่น คุยวันนี้: เทรด TFEX มา 2 ปี ติดปัญหาเรื่องคุม SL ..."
        className="mt-3 w-full rounded-xl border border-edge bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      <div className="mt-2 flex justify-end">
        <Button size="sm" loading={saving} disabled={!text.trim()} onClick={add}>บันทึกโน้ต</Button>
      </div>
      <ul className="mt-4 space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl bg-raised/60 p-3.5">
            <div className="flex items-center justify-between gap-2 text-xs text-muted">
              <span><b className="text-ink">{n.author}</b> · {formatDate(n.createdAt, true)}</span>
              {(canDeleteAll || n.authorId === me) && (
                <button onClick={() => remove(n.id)} className="hover:text-red-300">ลบ</button>
              )}
            </div>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm">{n.body}</p>
          </li>
        ))}
        {!notes.length && <li className="text-sm text-muted">ยังไม่มีโน้ต</li>}
      </ul>
    </div>
  );
}

// กิจกรรมของสมาชิก (จาก member_logs)
export function ActivityList({ logs, title = "กิจกรรมล่าสุด" }: { logs: MemberLog[]; title?: string }) {
  return (
    <div className="card overflow-x-auto">
      <h3 className="p-5 font-bold">{title}</h3>
      <table className="w-full min-w-[560px]">
        <thead><tr><th className="th">เวลา</th><th className="th">ทำอะไร</th><th className="th">รายละเอียด</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="td whitespace-nowrap text-muted">{formatDate(l.created_at, true)}</td>
              <td className="td whitespace-nowrap">{MEMBER_ACTIONS[l.action] ?? l.action}</td>
              <td className="td max-w-[420px] truncate text-muted">{describeLog(l.action, l.details) || "-"}</td>
            </tr>
          ))}
          {!logs.length && <tr><td className="td text-muted" colSpan={3}>ยังไม่มีกิจกรรม</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ข้อมูลส่วนตัวเพิ่มเติม (วันเกิด / ประสบการณ์ / เป้าหมาย / ที่อยู่ / เลขบัตร)
export function MemberInfo({
  birthDate, markets, years, goal, address, idCardLast4, idCardUrl,
}: {
  birthDate: string | null; markets: string[]; years: string | null; goal: string | null;
  address?: string | null; idCardLast4?: string | null; idCardUrl?: string;
}) {
  const [shown, setShown] = useState("");
  const [loading, setLoading] = useState(false);
  async function reveal() {
    if (shown) return setShown("");
    setLoading(true);
    try {
      const r = await api.get<{ idCard: string | null }>(idCardUrl!);
      setShown(r.idCard ? formatThaiId(r.idCard) : "");
    } finally {
      setLoading(false);
    }
  }
  const item = (label: string, value: React.ReactNode) => (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-0.5 break-words">{value || <span className="text-subtle">-</span>}</div>
    </div>
  );
  return (
    <div className="card space-y-4 p-5 text-sm">
      <h3 className="font-bold">ข้อมูลส่วนตัว & การเทรด</h3>
      {item("วันเกิด", formatBirthDate(birthDate))}
      {item("เคยเทรด", markets.length ? (
        <div className="flex flex-wrap gap-1.5">{markets.map((m) => <span key={m} className="rounded-full bg-brand/20 px-2.5 py-0.5 text-xs">{m}</span>)}</div>
      ) : null)}
      {item("ประสบการณ์", years)}
      {item("เป้าหมายในการเรียน", goal && <p className="whitespace-pre-wrap">{goal}</p>)}
      {address !== undefined && item("ที่อยู่ (ใบกำกับภาษี)", address && <p className="whitespace-pre-wrap">{address}</p>)}
      {idCardUrl && item("เลขบัตรประชาชน 🔒", idCardLast4 ? (
        <div className="flex items-center gap-2">
          <span className="font-mono">{shown || maskedThaiId(idCardLast4)}</span>
          <button onClick={reveal} disabled={loading} className="text-xs text-brand-light hover:underline">
            {shown ? "ซ่อน" : loading ? "..." : "แสดง"}
          </button>
        </div>
      ) : null)}
      {idCardUrl && idCardLast4 && <p className="text-xs text-subtle">การเปิดดูเลขบัตรจะถูกบันทึกใน Audit Log</p>}
    </div>
  );
}
