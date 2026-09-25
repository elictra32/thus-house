/* eslint-disable @next/next/no-img-element */
// รูปโปรไฟล์วงกลม — ไม่มีรูปใช้ตัวอักษรแรกของชื่อ · ทีมงานใช้พื้นไล่สีแบรนด์
export default function Avatar({ src, name, size = 40, staff }: { src?: string | null; name: string; size?: number; staff?: boolean }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  if (src) return <img src={src} alt="" width={size} height={size} style={style} className="shrink-0 rounded-full object-cover" />;
  return (
    <div
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
        staff ? "bg-gradient-to-br from-[#ba94c7] to-[#ec9e56] text-[#2d183c]" : "bg-[#3a3042] text-ink"
      }`}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
