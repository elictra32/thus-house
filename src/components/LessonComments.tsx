"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";

type Comment = {
  id: string;
  parentId: string | null;
  videoId: string;
  lessonNo: number | null;
  lessonTitle: string;
  body: string;
  createdAt: string;
  author: string;
  code: string | null;
  avatar: string | null;
  staff: boolean;
  mine: boolean;
  likes: number;
  liked: boolean;
};
type Liker = { code: string | null; name: string; avatar: string | null; me: boolean };
type VideoLikes = { likes: number; liked: boolean; likers: Liker[] };
type Data = { canModerate: boolean; video: VideoLikes; comments: Comment[] };

// "THUS-001 บอส" — รหัสสมาชิกสีม่วงอ่อน ตามด้วยชื่อเล่น
function Name({ code, name }: { code: string | null; name: string }) {
  return (
    <>
      {code && <span className="text-brand-light">{code} </span>}
      {name}
    </>
  );
}

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

// ไลก์บทเรียน + คอมเมนต์ (ตอบกลับได้ 1 ชั้น) — ทีมงานตอบ/ลบได้ สมาชิกลบของตัวเองได้
// คอมเมนต์แสดงรวมทุกคลิปในคลาสเดียวกัน พร้อมบอกว่ามาจากคลิปไหน (กดเพื่อไปคลิปนั้น)
export default function LessonComments({ videoId, onOpenLesson }: { videoId: string; onOpenLesson?: (videoId: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);
  const [highlight, setHighlight] = useState("");
  const [showLikers, setShowLikers] = useState(false);

  const load = useCallback(() => {
    api
      .get<Data>(`/api/videos/${videoId}/comments`)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [videoId]);
  useEffect(load, [load]);

  // มาจากแจ้งเตือน (#comment-<id>) → เลื่อนไปที่คอมเมนต์นั้นแล้วไฮไลต์สักครู่
  useEffect(() => {
    if (!data) return;
    const id = window.location.hash.match(/^#comment-(.+)$/)?.[1];
    if (!id || !data.comments.some((c) => c.id === id)) return;
    setHighlight(id);
    requestAnimationFrame(() => document.getElementById(`comment-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    const t = setTimeout(() => setHighlight(""), 3500);
    return () => clearTimeout(t);
  }, [data]);

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
    const r = await api.post<VideoLikes>(`/api/videos/${videoId}/like`);
    setData((d) => (d ? { ...d, video: r } : d));
  }
  async function likeComment(id: string) {
    const r = await api.post<{ liked: boolean; likes: number }>(`/api/comments/${id}/like`);
    setData((d) => (d ? { ...d, comments: d.comments.map((c) => (c.id === id ? { ...c, ...r } : c)) } : d));
  }
  async function remove(c: Comment) {
    if (!confirm(c.mine ? "ลบคอมเมนต์ของคุณ?" : `ลบคอมเมนต์ของ ${[c.code, c.author].filter(Boolean).join(" ")}? (คำตอบใต้คอมเมนต์จะถูกลบด้วย)`)) return;
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
    <div
      id={`comment-${c.id}`}
      className={`-mx-2 flex scroll-mt-28 gap-3 rounded-2xl px-2 py-1 transition-colors duration-700 ${reply ? "mt-3" : ""} ${
        highlight === c.id ? "bg-[#ec9e56]/15 ring-1 ring-inset ring-[#ec9e56]/40" : ""
      }`}
    >
      <Avatar src={c.avatar} name={c.author} size={reply ? 32 : 40} staff={c.staff} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-bold"><Name code={c.code} name={c.author} /></span>
          {c.staff && <span className="rounded-full bg-[#ba94c7]/20 px-2 py-0.5 text-[11px] font-bold text-[#d9c2e3]">ทีมงาน</span>}
          <span className="text-xs text-subtle">{timeAgo(c.createdAt)}</span>
          {!reply && (c.videoId === videoId ? (
            <span className="text-xs text-subtle">(คลิปนี้)</span>
          ) : (
            <button
              type="button"
              onClick={() => onOpenLesson?.(c.videoId)}
              className="max-w-full truncate text-left text-xs text-brand-light hover:underline"
              title={c.lessonTitle}
            >
              (จากคลิป บทที่ {c.lessonNo} · {c.lessonTitle})
            </button>
          ))}
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
    <section className="card p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">
          คอมเมนต์ {data ? <span className="text-muted">· {data.comments.length}</span> : null}
          <span className="mt-0.5 block text-xs font-normal text-subtle">รวมทุกคลิปในคลาสนี้</span>
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

      {/* ใครกดหัวใจบ้าง — กดเพื่อดูรายชื่อทั้งหมด */}
      {data && data.video.likers.length > 0 && (
        <button onClick={() => setShowLikers(true)} className="mt-3 flex items-center gap-2 text-left text-xs text-muted hover:text-ink">
          <span className="flex -space-x-2">
            {data.video.likers.slice(0, 5).map((l, i) => (
              <span key={i} className="rounded-full ring-2 ring-card">
                <Avatar src={l.avatar} name={l.name} size={24} />
              </span>
            ))}
          </span>
          <span>
            ถูกใจโดย{" "}
            <b className="font-semibold text-ink">
              {data.video.likers.slice(0, 2).map((l) => (l.me ? "คุณ" : l.name)).join(", ")}
            </b>
            {data.video.likers.length > 2 && ` และอีก ${data.video.likers.length - 2} คน`}
          </span>
        </button>
      )}
      <Modal open={showLikers} onClose={() => setShowLikers(false)} title={`ถูกใจบทเรียนนี้ · ${data?.video.likes ?? 0} คน`}>
        <ul className="max-h-[60vh] space-y-3 overflow-y-auto">
          {data?.video.likers.map((l, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <Avatar src={l.avatar} name={l.name} size={36} />
              <span className="font-semibold">
                <Name code={l.code} name={l.name} />
                {l.me && <span className="ml-1 font-normal text-subtle">(คุณ)</span>}
              </span>
              <span className="ml-auto text-[#e3a3a8]"><Heart filled /></span>
            </li>
          ))}
        </ul>
      </Modal>

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
                    placeholder={`ตอบ ${[replyTo.code, replyTo.author].filter(Boolean).join(" ")}...`}
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
