import Link from "next/link";
import { REQUIRED_FIELDS } from "@/lib/member-profile";

// ข้อมูลยังไม่ครบ → ยังซื้อคลาสไม่ได้ · แสดงเช็กลิสต์ + ปุ่มพาไปกรอกที่โปรไฟล์ (กรอกเสร็จกลับมาหน้านี้)
export default function ProfileGate({ missing, next }: { missing: string[]; next: string }) {
  const done = REQUIRED_FIELDS.length - missing.length;
  return (
    <div className="card mx-auto max-w-xl p-6 md:p-8">
      <div className="text-4xl">📝</div>
      <h2 className="mt-3 text-2xl font-bold">กรอกข้อมูลให้ครบก่อนสมัครคลาส</h2>
      <p className="mt-2 text-sm text-muted">
        ใช้สำหรับออกใบกำกับภาษีและให้ทีมงานดูแลการเรียนได้ตรงจุด — เหลืออีก <b className="text-ink">{missing.length}</b> ข้อ
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-raised">
        <div className="h-full rounded-full bg-brand" style={{ width: `${(done / REQUIRED_FIELDS.length) * 100}%` }} />
      </div>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {REQUIRED_FIELDS.map((f) => {
          const ok = !missing.includes(f.key);
          return (
            <li key={f.key} className={`flex items-center gap-2 text-sm ${ok ? "text-subtle" : "font-semibold text-ink"}`}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${ok ? "bg-green-500/20 text-green-300" : "bg-amber-400/20 text-amber-300"}`}>
                {ok ? "✓" : "!"}
              </span>
              {f.label}
            </li>
          );
        })}
      </ul>
      <Link
        href={`/profile?complete=1&next=${encodeURIComponent(next)}`}
        className="mt-6 flex w-full items-center justify-center rounded-[10px] bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark"
      >
        ไปกรอกข้อมูล →
      </Link>
      <p className="mt-3 text-center text-xs text-subtle">กรอกครบแล้วจะมีปุ่มพากลับมาชำระเงินต่อ</p>
    </div>
  );
}
