"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";

type Comment = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  author: string;
  staff: boolean;
  mine: boolean;
  likes: number;
  liked: boolean;
};
type Data = { canModerate: boolean; video: { likes: number; liked: boolean }; comments: Comment[] };

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชม.ที่แล้ว`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" strokeLinejoin="round" />
    </svg>
  );
}

// ไลก์บทเรียน + คอมเมนต์ใต้คลิป (ตอบกลับได้ 1 ชั้น) — ทีมงานตอบ/ลบได้ สมาชิกลบของตัวเองได้
export default function LessonComments({ videoId }: { videoId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => {
    api
      .get<Data>(`/api/videos/${videoId}/comments`)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [videoId]);
  useEffect(load, [load]);

  async function post(body: string, parentId?: string) {
    if (!body.trim()) return;
    setPosting(true);
    setError("");
    try {
      await api.post(`/api/videos/${videoId}/comments`, { body, parentId });
      if (parentId) {
        setReplyText("");
        setReplyTo(null);
      } else setText("");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPosting(false);
    }
  }

  async function likeVideo() {
    const r = await api.post<{ liked: boolean; likes: number }>(`/api/videos/${videoId}/like`);
    setData((d) => (d ? { ...d, video: r } : d));
  }
  async function likeComment(id: string) {
    const r = await api.post<{ liked: boolean; likes: number }>(`/api/comments/${id}/like`);
    setData((d) => (d ? { ...d, comments: d.comments.map((c) => (c.id === id ? { ...c, ...r } : c)) } : d));
  }
  async function remove(c: Comment) {
    if (!confirm(c.mine ? "ลบคอมเมนต์ของคุณ?" : `ลบคอมเมนต์ของ ${c.author}? (คำตอบใต้คอมเมนต์จะถูกลบด้วย)`)) return;
    try {
      await api.del(`/api/comments/${c.id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const top = data?.comments.filter((c) => !c.parentId) ?? [];
  const repliesOf = (id: string) => data?.comments.filter((c) => c.parentId === id) ?? [];

  const Item = ({ c, reply }: { c: Comment; reply?: boolean }) => (
    <div className={`flex gap-3 ${reply ? "mt-4" : ""}`}>
      <div
        className={`flex shrink-0 items-center justify-center rounded-full font-bold ${reply ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"} ${
          c.staff ? "bg-gradient-to-br from-[#ba94c7] to-[#ec9e56] text-[#2d183c]" : "bg-white/10 text-ink"
        }`}
        aria-hidden
      >
        {c.author.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-bold">{c.author}</span>
          {c.staff && <span className="rounded-full bg-[#ba94c7]/20 px-2 py-0.5 text-[11px] font-bold text-[#d9c2e3]">ทีมงาน</span>}
          <span className="text-xs text-subtle">{timeAgo(c.createdAt)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/90">{c.body}</p>
        <div className="mt-1.5 flex items-center gap-4 text-xs text-muted">
          <button onClick={() => likeComment(c.id)} className={`flex items-center gap-1 hover:text-ink ${c.liked ? "text-[#e3a3a8]" : ""}`}>
            <Heart filled={c.liked} /> {c.likes > 0 && c.likes}
          </button>
          <button onClick={() => { setReplyTo(c); setReplyText(""); }} className="font-semibold hover:text-ink">
            ตอบกลับ
          </button>
          {(c.mine || data?.canModerate) && (
            <button onClick={() => remove(c)} className="hover:text-red-300">
              ลบ
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section className="card mt-6 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">
          คอมเมนต์ {data ? <span className="text-muted">· {data.comments.length}</span> : null}
        </h3>
        <button
          onClick={likeVideo}
          disabled={!data}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ring-1 ring-inset transition ${
            data?.video.liked ? "bg-[#e3a3a8]/15 text-[#f0c4c7] ring-[#e3a3a8]/40" : "ring-white/15 hover:bg-white/5"
          }`}
        >
          <Heart filled={!!data?.video.liked} /> ชอบบทเรียนนี้ {data && data.video.likes > 0 && `· ${data.video.likes}`}
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          post(text);
        }}
        className="mt-4"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="ถามคำถาม หรือแชร์ความเห็นเกี่ยวกับบทเรียนนี้..."
          className="w-full resize-y rounded-2xl border border-edge bg-bg px-4 py-3 text-sm outline-none focus:border-brand"
        />
        <div className="mt-2 flex justify-end">
          <button disabled={posting || !text.trim()} className="rounded-[10px] bg-brand px-4 py-2 text-sm font-bold hover:bg-brand-dark disabled:opacity-40">
            ส่งคอมเมนต์
          </button>
        </div>
      </form>
      {error && <p className="mt-2 rounded-lg bg-danger/15 p-3 text-sm text-red-300">{error}</p>}

      <div className="mt-4 space-y-6">
        {!data && !error && <p className="text-sm text-muted">กำลังโหลด...</p>}
        {data && !top.length && <p className="text-sm text-muted">ยังไม่มีคอมเมนต์ — เป็นคนแรกที่ถามหรือแชร์ได้เลย</p>}
        {top.map((c) => (
          <div key={c.id}>
            <Item c={c} />
            <div className="ml-[52px] border-l border-line pl-4 empty:hidden">
              {repliesOf(c.id).map((r) => (
                <Item key={r.id} c={r} reply />
              ))}
              {replyTo && (replyTo.id === c.id || replyTo.parentId === c.id) && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    post(replyText, c.id);
                  }}
                  className="mt-3"
                >
                  <textarea
                    autoFocus
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder={`ตอบ ${replyTo.author}...`}
                    className="w-full resize-y rounded-xl border border-edge bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setReplyTo(null)} className="px-3 py-1.5 text-sm text-muted hover:text-ink">
                      ยกเลิก
                    </button>
                    <button disabled={posting || !replyText.trim()} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-bold disabled:opacity-40">
                      ตอบกลับ
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
