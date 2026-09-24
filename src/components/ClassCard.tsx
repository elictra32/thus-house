import Link from "next/link";
import { baht } from "@/lib/utils";
import type { Class } from "@/types/database";

const gradients = [
  "from-[#21163a] to-[#151820]",
  "from-[#16343b] to-[#151820]",
  "from-[#3b2a16] to-[#151820]",
];

type Props = {
  cls: Class;
  index?: number;
  href: string;
  progress?: number; // 0–100 — แสดงเมื่อเป็นคอร์สที่ซื้อแล้ว
  action?: React.ReactNode;
};

export default function ClassCard({ cls, index = 0, href, progress, action }: Props) {
  return (
    <article className="card flex flex-col overflow-hidden transition hover:border-edge hover:-translate-y-0.5">
      <Link
        href={href}
        className={`flex h-[165px] items-end bg-gradient-to-br p-[18px] ${gradients[index % gradients.length]}`}
        style={cls.thumbnail_url ? { backgroundImage: `linear-gradient(to top, #0b0d12cc, transparent), url(${cls.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <span className="rounded-[7px] border border-white/10 bg-white/[.08] px-2.5 py-1.5 text-[11px] uppercase">
          {cls.category || "COURSE"}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-[18px]">
        <Link href={href}>
          <h3 className="mb-1 text-[19px] font-bold">{cls.name}</h3>
        </Link>
        {cls.instructor && <p className="mb-2 text-xs text-brand-light">โดย {cls.instructor}</p>}
        <p className="line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted">{cls.description}</p>

        {progress !== undefined ? (
          <div className="mt-4">
            <div className="h-[7px] overflow-hidden rounded-full bg-edge">
              <i className="block h-full bg-brand" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted">
              <span>{cls.videos_count} Lessons</span>
              <span>{progress}% complete</span>
            </div>
          </div>
        ) : (
          <div className="mt-[18px] flex items-center justify-between text-xs text-muted">
            <span>{cls.videos_count} Lessons · {cls.duration_hours} ชม.</span>
            <span className="text-[15px] font-extrabold text-white">{baht(cls.price)}</span>
          </div>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </article>
  );
}
