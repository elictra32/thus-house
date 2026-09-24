"use client";
import { useState } from "react";
import Link from "next/link";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Button from "@/components/Button";
import Input, { Textarea } from "@/components/Input";
import Modal, { ConfirmModal } from "@/components/Modal";
import { PageLoading } from "@/components/LoadingSpinner";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { cn, formatDuration } from "@/lib/utils";
import type { Class, Video } from "@/types/database";

type Form = { title: string; description: string; video_url: string; minutes: string; seconds: string };
const empty: Form = { title: "", description: "", video_url: "", minutes: "", seconds: "" };

export default function VideosAdmin({ params }: { params: { id: string } }) {
  const classRes = useApi<{ class: Class }>(`/api/classes/${params.id}`);
  const { data, error, loading, reload, setData } = useApi<{ videos: Video[] }>(`/api/admin/videos?classId=${params.id}`);
  const [editing, setEditing] = useState<Video | "new" | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState("");

  const videos = data?.videos ?? [];

  function open(v: Video | "new") {
    setEditing(v);
    setFormError("");
    setForm(
      v === "new"
        ? empty
        : {
            title: v.title, description: v.description ?? "", video_url: v.video_url,
            minutes: String(Math.floor(v.duration_seconds / 60)), seconds: String(v.duration_seconds % 60),
          },
    );
  }
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setFormError("กรุณากรอกชื่อบทเรียน");
    if (!/^https?:\/\//.test(form.video_url)) return setFormError("กรุณาใส่ลิงก์ YouTube หรือ Google Drive ให้ถูกต้อง");
    const duration_seconds = (Number(form.minutes) || 0) * 60 + (Number(form.seconds) || 0);
    const body = { title: form.title, description: form.description, video_url: form.video_url, duration_seconds };
    setSaving(true);
    setFormError("");
    try {
      if (editing === "new") await api.post("/api/admin/videos", { ...body, class_id: params.id });
      else if (editing) await api.put(`/api/admin/videos/${editing.id}`, body);
      setEditing(null);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del(`/api/admin/videos/${toDelete.id}`);
      setToDelete(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  // ลากวางเพื่อเรียงลำดับ (HTML5 drag & drop) แล้วบันทึกทันที
  function onDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    const from = videos.findIndex((v) => v.id === dragId);
    const to = videos.findIndex((v) => v.id === overId);
    const next = [...videos];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setData({ videos: next });
  }
  async function onDragEnd() {
    setDragId(null);
    setOrderError("");
    try {
      await api.put("/api/admin/videos/reorder", { classId: params.id, ids: videos.map((v) => v.id) });
    } catch (err) {
      setOrderError((err as Error).message);
      reload();
    }
  }
  function move(index: number, dir: -1 | 1) {
    const next = [...videos];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setData({ videos: next });
    api.put("/api/admin/videos/reorder", { classId: params.id, ids: next.map((v) => v.id) })
      .catch((err) => { setOrderError((err as Error).message); reload(); });
  }

  return (
    <>
      <Link href="/admin/classes" className="text-sm text-muted hover:text-ink">← คอร์สทั้งหมด</Link>
      <PageHeader
        title={classRes.data?.class.name ?? "วิดีโอ"}
        subtitle={`${videos.length} บทเรียน · ลากเพื่อเรียงลำดับ`}
        action={<Button onClick={() => open("new")}>+ เพิ่มวิดีโอ</Button>}
      />
      {(error || orderError) && <div className="mb-4"><ErrorBox message={error || orderError} /></div>}
      {loading ? (
        <PageLoading />
      ) : (
        <ol className="card divide-y divide-line">
          {videos.map((v, i) => (
            <li
              key={v.id}
              draggable
              onDragStart={() => setDragId(v.id)}
              onDragOver={(e) => onDragOver(e, v.id)}
              onDrop={(e) => e.preventDefault()}
              onDragEnd={onDragEnd}
              className={cn("flex items-center gap-3 px-4 py-3", dragId === v.id && "bg-brand/10 opacity-60")}
            >
              <span className="cursor-grab select-none text-subtle" aria-hidden>⠿</span>
              <span className="w-6 text-sm text-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{v.title}</p>
                <p className="truncate text-xs text-subtle">{formatDuration(v.duration_seconds)} · {v.video_url}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-2 py-1 text-muted hover:bg-raised disabled:opacity-30" aria-label="เลื่อนขึ้น">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === videos.length - 1} className="rounded px-2 py-1 text-muted hover:bg-raised disabled:opacity-30" aria-label="เลื่อนลง">↓</button>
                <Button size="sm" variant="ghost" onClick={() => open(v)}>แก้ไข</Button>
                <Button size="sm" variant="ghost" onClick={() => setToDelete(v)}>ลบ</Button>
              </div>
            </li>
          ))}
          {!videos.length && <li className="p-10 text-center text-muted">ยังไม่มีวิดีโอ</li>}
        </ol>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "เพิ่มวิดีโอ" : "แก้ไขวิดีโอ"}>
        <form onSubmit={save} className="space-y-4">
          <Input label="ชื่อบทเรียน *" name="title" value={form.title} onChange={set("title")} />
          <Textarea label="คำอธิบาย" name="description" rows={3} value={form.description} onChange={set("description")} />
          <Input
            label="ลิงก์วิดีโอ (YouTube หรือ Google Drive) *"
            name="video_url"
            placeholder="https://youtu.be/... หรือ https://drive.google.com/file/d/.../view"
            value={form.video_url}
            onChange={set("video_url")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="ความยาว (นาที)" name="minutes" type="number" min={0} value={form.minutes} onChange={set("minutes")} />
            <Input label="วินาที" name="seconds" type="number" min={0} max={59} value={form.seconds} onChange={set("seconds")} />
          </div>
          <p className="text-xs leading-relaxed text-subtle">
            YouTube: ตั้งคลิปเป็น <b>&quot;ไม่เป็นสาธารณะ (Unlisted)&quot;</b> — คลิปแบบ &quot;ส่วนตัว (Private)&quot; YouTube ไม่ให้เล่นบนเว็บอื่น
            <br />
            Google Drive: แชร์ไฟล์เป็น &quot;ทุกคนที่มีลิงก์ดูได้&quot;
          </p>
          {formError && <ErrorBox message={formError} />}
          <Button type="submit" loading={saving} className="w-full">บันทึก</Button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="ลบวิดีโอ"
        message={`ลบ "${toDelete?.title}" ออกจากคอร์ส (ไฟล์ใน Google Drive ไม่ถูกลบ)`}
        confirmLabel="ลบ"
      />
    </>
  );
}
