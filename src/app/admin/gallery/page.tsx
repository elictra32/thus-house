"use client";
import { useState } from "react";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Button from "@/components/Button";
import { ConfirmModal } from "@/components/Modal";
import { PageLoading } from "@/components/LoadingSpinner";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import type { GalleryItem, GalleryKind } from "@/types/database";

const TABS: { key: GalleryKind; label: string; hint: string }[] = [
  { key: "feedback", label: "Feedback", hint: "แสดงที่หน้า /feedback และตัวอย่างบนหน้าแรก" },
  { key: "meetup", label: "Meetup", hint: "แสดงเป็นสไลด์โชว์ในหน้าแรก (แนะนำรูปแนวนอน ความละเอียดสูง)" },
];

export default function GalleryAdmin() {
  const [kind, setKind] = useState<GalleryKind>("feedback");
  const { data, error, loading, reload, setData } = useApi<{ items: GalleryItem[] }>(`/api/admin/gallery?kind=${kind}`);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [toDelete, setToDelete] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const items = data?.items ?? [];

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setActionError("");
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("kind", kind);
        fd.append("file", file);
        await api.post("/api/admin/gallery", fd);
      }
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setData({ items: next });
    try {
      await api.put("/api/admin/gallery/reorder", { kind, ids: next.map((i) => i.id) });
    } catch (err) {
      setActionError((err as Error).message);
      reload();
    }
  }

  async function saveCaption(item: GalleryItem, caption: string) {
    if ((item.caption ?? "") === caption) return;
    try {
      await api.put(`/api/admin/gallery/${item.id}`, { caption });
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del(`/api/admin/gallery/${toDelete.id}`);
      setToDelete(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  const tab = TABS.find((t) => t.key === kind)!;

  return (
    <>
      <PageHeader
        title="รูปหน้าเว็บ"
        subtitle="Feedback จากสมาชิก และรูปกิจกรรม Meetup"
        action={
          <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-brand px-[18px] py-[11px] text-sm font-bold text-white hover:bg-brand-dark", uploading && "pointer-events-none opacity-60")}>
            {uploading ? "กำลังอัปโหลด..." : "+ อัปโหลดรูป"}
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={upload} />
          </label>
        }
      />
      <div className="mb-2 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setKind(t.key)}
            className={cn("rounded-lg px-4 py-2 text-sm", kind === t.key ? "bg-brand font-semibold text-white" : "bg-raised text-muted hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mb-5 text-xs text-subtle">{tab.hint} · PNG/JPG/WEBP ไม่เกิน 4MB · เลือกหลายไฟล์พร้อมกันได้</p>

      {(error || actionError) && <div className="mb-4"><ErrorBox message={error || actionError} /></div>}
      {loading && !data ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-muted">ยังไม่มีรูป</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, i) => (
            <div key={item.id} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image_url} alt={item.caption ?? ""} className="aspect-video w-full bg-raised object-cover" />
              <div className="space-y-3 p-4">
                <input
                  defaultValue={item.caption ?? ""}
                  placeholder="คำบรรยาย (ไม่บังคับ)"
                  onBlur={(e) => saveCaption(item, e.target.value.trim())}
                  className="w-full rounded-lg border border-edge bg-raised px-3 py-2 text-sm"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-subtle">ลำดับ {i + 1}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
                    <Button size="sm" variant="ghost" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</Button>
                    <Button size="sm" variant="ghost" onClick={() => setToDelete(item)}>ลบ</Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="ลบรูป"
        message="ลบรูปนี้ออกจากหน้าเว็บ ย้อนกลับไม่ได้"
        confirmLabel="ลบ"
      />
    </>
  );
}
