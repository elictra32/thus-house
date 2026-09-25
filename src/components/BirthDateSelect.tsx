"use client";
// เลือกวันเกิดแบบ วัน / เดือน / ปี พ.ศ. (ใช้ง่ายกว่าปฏิทินบนมือถือ) · ค่า = "YYYY-MM-DD" (ค.ศ.) หรือ ""
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const cls = "w-full rounded-[10px] border bg-bg px-2.5 py-3 text-sm text-ink outline-none focus:border-brand";

export default function BirthDateSelect({
  label, value, onChange, error,
}: { label?: string; value: string; onChange: (v: string) => void; error?: string }) {
  const [y = "", m = "", d = ""] = value ? value.split("-") : [];
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 91 }, (_, i) => thisYear - 10 - i);
  const days = y && m ? new Date(Number(y), Number(m), 0).getDate() : 31;
  // ครบ 3 ช่องค่อยส่งค่าเป็นวันที่ · ยังไม่ครบเก็บเป็น "YYYY-MM-DD" ที่มีช่องว่าง
  const emit = (ny: string, nm: string, nd: string) => {
    if (nd && ny && nm) nd = String(Math.min(Number(nd), new Date(Number(ny), Number(nm), 0).getDate())).padStart(2, "0");
    onChange(ny || nm || nd ? `${ny}-${nm}-${nd}` : "");
  };
  const border = error ? "border-danger" : "border-edge";
  return (
    <div>
      {label && <p className="label">{label}</p>}
      <div className="grid grid-cols-[1fr_1.2fr_1.3fr] gap-2">
        <select aria-label="วัน" className={`${cls} ${border}`} value={d} onChange={(e) => emit(y, m, e.target.value)}>
          <option value="">วัน</option>
          {Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, "0")).map((v) => (
            <option key={v} value={v}>{Number(v)}</option>
          ))}
        </select>
        <select aria-label="เดือน" className={`${cls} ${border}`} value={m} onChange={(e) => emit(y, e.target.value, d)}>
          <option value="">เดือน</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, "0")}>{name}</option>
          ))}
        </select>
        <select aria-label="ปี พ.ศ." className={`${cls} ${border}`} value={y} onChange={(e) => emit(e.target.value, m, d)}>
          <option value="">ปี พ.ศ.</option>
          {years.map((v) => (
            <option key={v} value={String(v)}>{v + 543}</option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
