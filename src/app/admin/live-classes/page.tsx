"use client";
import { useState } from "react";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Button from "@/components/Button";
import Input, { Select } from "@/components/Input";
import Modal, { ConfirmModal } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { PageLoading } from "@/components/LoadingSpinner";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/utils";
import type { LiveClass, LiveStatus } from "@/types/database";

type Form = {
  title: string; instructor: string; scheduled_date: string; status: LiveStatus;
  zoom_link: string; discord_link: string; youtube_live_url: string;
};
const empty: Form = { title: "", instructor: "", scheduled_date: "", status: "upcoming", zoom_link: "", discord_link: "", youtube_live_url: "" };

// ISO → ค่าของ <input type="datetime-local"> ตามเวลาเครื่อง
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function LiveClassesAdmin() {
  const { data, error, loading, reload } = useApi<{ liveClasses: LiveClass[] }>("/api/admin/live-classes");
  const [editing, setEditing] = useState<LiveClass | "new" | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState<LiveClass | null>(null);
  const [deleting, setDeleting] = useState(false);

  function open(l: LiveClass | "new") {
    setEditing(l);
    setFormError("");
    setForm(
      l === "new"
        ? empty
        : {
            title: l.title, instructor: l.instructor ?? "", scheduled_date: toLocalInput(l.scheduled_date), status: l.status,
            zoom_link: l.zoom_link ?? "", discord_link: l.discord_link ?? "", youtube_live_url: l.youtube_live_url ?? "",
          },
    );
  }
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setFormError("กรุณากรอกหัวข้อ");
    if (!form.scheduled_date) return setFormError("กรุณาเลือกวันเวลา");
    setSaving(true);
    setFormError("");
    const body = { ...form, scheduled_date: new Date(form.scheduled_date).toISOString() };
    try {
      if (editing === "new") await api.post("/api/admin/live-classes", body);
      else if (editing) await api.put(`/api/admin/live-classes/${editing.id}`, body);
      setEditing(null);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(l: LiveClass, status: LiveStatus) {
    await api.put(`/api/admin/live-classes/${l.id}`, { status }).catch(() => {});
    reload();
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del(`/api/admin/live-classes/${toDelete.id}`);
      setToDelete(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader title="Live Classes" subtitle="ตารางเรียนสดผ่าน Zoom / Discord / YouTube" action={<Button onClick={() => open("new")}>+ สร้าง Live Class</Button>} />
      {error && <ErrorBox message={error} />}
      {loading ? (
        <PageLoading />
      ) : (
        <div className="grid gap-3">
          {data?.liveClasses.map((l) => (
            <div key={l.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={l.status} />
                  <h3 className="font-bold">{l.title}</h3>
                </div>
                <p className="mt-1 text-sm text-muted">{formatDate(l.scheduled_date, true)} {l.instructor && `· ${l.instructor}`}</p>
                <p className="mt-1 text-xs text-subtle">
                  {[l.zoom_link && "Zoom", l.discord_link && "Discord", l.youtube_live_url && "YouTube"].filter(Boolean).join(" · ") || "ยังไม่มีลิงก์"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {l.status === "upcoming" && <Button size="sm" variant="danger" onClick={() => setStatus(l, "live")}>● เริ่มไลฟ์</Button>}
                {l.status === "live" && <Button size="sm" variant="ghost" onClick={() => setStatus(l, "ended")}>จบไลฟ์</Button>}
                <Button size="sm" variant="ghost" onClick={() => open(l)}>แก้ไข</Button>
                <Button size="sm" variant="ghost" onClick={() => setToDelete(l)}>ลบ</Button>
              </div>
            </div>
          ))}
          {data?.liveClasses.length === 0 && <div className="card p-10 text-center text-muted">ยังไม่มี Live Class</div>}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "สร้าง Live Class" : "แก้ไข Live Class"}>
        <form onSubmit={save} className="space-y-4">
          <Input label="หัวข้อ *" name="title" value={form.title} onChange={set("title")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="ผู้สอน" name="instructor" value={form.instructor} onChange={set("instructor")} />
            <Select label="สถานะ" name="status" value={form.status} onChange={set("status")}>
              <option value="upcoming">กำลังจะมาถึง</option>
              <option value="live">กำลังไลฟ์</option>
              <option value="ended">จบแล้ว</option>
            </Select>
          </div>
          <Input label="วันเวลา *" name="scheduled_date" type="datetime-local" value={form.scheduled_date} onChange={set("scheduled_date")} />
          <Input label="Zoom link" name="zoom_link" value={form.zoom_link} onChange={set("zoom_link")} placeholder="https://zoom.us/j/..." />
          <Input label="Discord link" name="discord_link" value={form.discord_link} onChange={set("discord_link")} placeholder="https://discord.gg/..." />
          <Input label="YouTube Live" name="youtube_live_url" value={form.youtube_live_url} onChange={set("youtube_live_url")} placeholder="https://youtube.com/live/..." />
          {formError && <ErrorBox message={formError} />}
          <Button type="submit" loading={saving} className="w-full">บันทึก</Button>
        </form>
      </Modal>

      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} loading={deleting}
        title="ลบ Live Class" message={`ลบ "${toDelete?.title}"?`} confirmLabel="ลบ" />
    </>
  );
}
