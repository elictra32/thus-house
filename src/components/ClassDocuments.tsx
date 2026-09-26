import type { LessonDocument } from "@/types/database";

// เอกสารประกอบคลาส (หน้าเรียน) — กดแล้วเปิดแท็บใหม่ผ่าน API ที่ตรวจสิทธิ์ก่อน redirect ไป Google Drive
export default function ClassDocuments({ classId, docs }: { classId: string; docs: LessonDocument[] }) {
  if (!docs.length) return null;
  return (
    <section className="card mb-6 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold">📎 เอกสารประกอบคลาส</h2>
        <span className="text-xs text-muted">{docs.length} รายการ</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((d) => (
          <a
            key={d.id}
            href={`/api/classes/${classId}/documents/${d.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-edge bg-raised px-3 py-2.5 transition hover:border-brand/50 hover:bg-brand/10"
          >
            <span className="w-14 shrink-0 rounded-md bg-brand/15 py-1 text-center text-[10px] font-bold text-brand-light">{d.kind}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.title}</span>
            <span className="shrink-0 text-xs text-muted" aria-hidden>↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}
