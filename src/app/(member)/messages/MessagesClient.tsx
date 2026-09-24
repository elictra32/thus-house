"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/utils";

type Message = {
  id: string;
  body: string;
  status: "new" | "read" | "replied";
  reply: string | null;
  replied_at: string | null;
  created_at: string;
  classes: { name: string } | null;
};

export default function MessagesClient({ classes }: { classes: { id: string; name: string }[] }) {
  const { data, reload } = useApi<{ messages: Message[] }>("/api/messages");
  const [text, setText] = useState("");
  const [classId, setClassId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    setSent(false);
    try {
      await api.post("/api/messages", { body: text, classId });
      setText("");
      setSent(true);
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <div className="kicker">ASK THE INSTRUCTOR</div>
        <h1 className="mt-2 text-3xl font-bold">ถามผู้สอน / ส่ง Feedback</h1>
        <p className="mt-2 text-sm text-muted">ข้อความนี้ส่งถึงผู้สอนและทีมงานโดยตรง เห็นเฉพาะคุณกับทีมงาน</p>
      </div>

      <form onSubmit={send} className="card space-y-4 p-5 md:p-6">
        {classes.length > 0 && (
          <label className="block">
            <span className="label">เกี่ยวกับคอร์ส (ไม่บังคับ)</span>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full rounded-[10px] border border-edge bg-bg px-3.5 py-3 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="">— ทั่วไป —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="label">ข้อความ</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder="คำถาม ข้อเสนอแนะ หรือสิ่งที่อยากให้ผู้สอนช่วย..."
            className="w-full resize-y rounded-2xl border border-edge bg-bg px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>
        {error && <p className="rounded-lg bg-danger/15 p-3 text-sm text-red-300">{error}</p>}
        {sent && <p className="rounded-lg bg-success/15 p-3 text-sm text-green-300">ส่งแล้ว — ผู้สอนตอบกลับเมื่อไร จะมีแจ้งเตือนที่ 🔔</p>}
        <button disabled={sending || !text.trim()} className="w-full rounded-[10px] bg-brand px-4 py-3 text-sm font-bold hover:bg-brand-dark disabled:opacity-40">
          {sending ? "กำลังส่ง..." : "ส่งถึงผู้สอน"}
        </button>
      </form>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">ข้อความของฉัน</h2>
        {!data && <p className="text-sm text-muted">กำลังโหลด...</p>}
        {data && !data.messages.length && <p className="text-sm text-muted">ยังไม่เคยส่งข้อความ</p>}
        {data?.messages.map((m) => (
          <div key={m.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>{formatDate(m.created_at, true)}{m.classes && ` · ${m.classes.name}`}</span>
              <span className={m.status === "replied" ? "font-bold text-green-300" : ""}>
                {m.status === "replied" ? "✓ ตอบแล้ว" : m.status === "read" ? "ผู้สอนอ่านแล้ว" : "รอผู้สอนอ่าน"}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
            {m.reply && (
              <div className="mt-4 rounded-2xl bg-[#ba94c7]/10 p-4 ring-1 ring-inset ring-[#ba94c7]/20">
                <p className="text-xs font-bold text-[#d9c2e3]">ผู้สอนตอบ · {formatDate(m.replied_at, true)}</p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{m.reply}</p>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
