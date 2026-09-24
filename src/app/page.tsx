import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClassCard from "@/components/ClassCard";
import { ButtonLink } from "@/components/Button";
import { getPublicClasses } from "@/lib/data";

export const dynamic = "force-dynamic";

const features = [
  { icon: "▶", title: "300+ วิดีโอบทเรียน", body: "คลังความรู้ที่จัดเป็นระบบ Course → Chapter → Lesson ค้นหาและทบทวนได้ง่าย" },
  { icon: "◆", title: "สอนโดยผู้เชี่ยวชาญตัวจริง", body: "ผู้สอนที่ลงสนามจริงทุกวัน ถ่ายทอดทั้งวิธีคิดและเครื่องมือที่ใช้ได้จริง" },
  { icon: "●", title: "Live Class ทุกสัปดาห์", body: "เรียนสดผ่าน Discord / Zoom ถาม–ตอบกับผู้สอนและสมาชิกคนอื่น" },
  { icon: "↻", title: "เรียนต่อจากจุดเดิม", body: "ระบบจำ Progress ของแต่ละบทเรียน เปิดกลับมาก็เรียนต่อได้ทันที" },
  { icon: "◎", title: "เรียนได้ตลอดอายุสมาชิก", body: "กลับมาทบทวนได้ทุกเมื่อ บนทุกอุปกรณ์" },
  { icon: "↗", title: "เห็นพัฒนาการของตัวเอง", body: "Dashboard แสดงคอร์สที่เรียนอยู่ ความคืบหน้า และบทเรียนถัดไป" },
];

export default async function Landing() {
  const classes = await getPublicClasses();

  return (
    <>
      <Navbar />

      <header className="grid items-center gap-[55px] bg-[radial-gradient(circle_at_75%_25%,#2a1b4a_0,transparent_35%)] px-[6vw] pb-[75px] pt-[55px] md:grid-cols-[1.1fr_.9fr] md:pt-[90px]">
        <div>
          <div className="kicker">THUSHOUSE ACADEMY</div>
          <h1 className="my-[18px] text-5xl font-bold leading-[1.02] tracking-[-3px] md:text-[64px]">
            Learn smarter.
            <br />
            <span className="text-brand-light">Build better.</span>
          </h1>
          <p className="max-w-[610px] text-lg leading-[1.7] text-[#aeb3c0]">
            พื้นที่เรียนรู้ที่รวมบทเรียนคุณภาพไว้เป็นระบบ เรียนตามจังหวะของตัวเอง กลับมาทบทวนได้ทุกเวลา
            และติดตามความก้าวหน้าได้ในที่เดียว
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/signup">Get Started →</ButtonLink>
            <ButtonLink href="#courses" variant="ghost">
              ดูคอร์สทั้งหมด
            </ButtonLink>
          </div>
        </div>

        <div className="rounded-[20px] border border-edge bg-[#13161d] p-5 shadow-[0_25px_80px_#0008]">
          <div className="mb-4 flex justify-between text-xs text-[#9298a6]">
            <span>CONTINUE LEARNING</span>
            <span>68% COMPLETE</span>
          </div>
          <div className="relative flex h-60 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#251943] to-[#171a24]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl text-[#111]">▶</div>
            <span className="absolute bottom-[15px] left-[15px] rounded-[7px] bg-black/60 px-2.5 py-1.5 text-xs">
              Lesson 08 · Market Structure
            </span>
          </div>
          <div className="mt-4">
            <div className="h-[7px] overflow-hidden rounded-full bg-edge">
              <i className="block h-full w-[68%] bg-brand" />
            </div>
            <div className="mt-2 flex justify-between text-xs text-[#8e94a3]">
              <span>12:42 / 18:51</span>
              <span>Resume →</span>
            </div>
          </div>
        </div>
      </header>

      <section id="courses" className="px-[6vw] py-[75px]">
        <div className="mb-7 items-end justify-between md:flex">
          <div>
            <h2 className="text-[34px] font-bold tracking-[-1px]">Featured Courses</h2>
            <p className="mt-1 text-muted">คอร์สที่กำลังเปิดให้เรียน</p>
          </div>
          <ButtonLink href="/dashboard" variant="ghost" className="mt-4 md:mt-0">
            ดูทั้งหมด
          </ButtonLink>
        </div>
        <div className="grid gap-[18px] md:grid-cols-3">
          {classes.map((c, i) => (
            <ClassCard key={c.id} cls={c} index={i} href={c.id.startsWith("sample") ? "/signup" : `/classes/${c.id}`} />
          ))}
        </div>
      </section>

      <section id="why" className="border-y border-line bg-panel px-[6vw] py-[75px]">
        <div className="mb-7">
          <h2 className="text-[34px] font-bold tracking-[-1px]">Designed for real learning</h2>
          <p className="mt-1 text-muted">ไม่ใช่แค่ดูวิดีโอแล้วจบ</p>
        </div>
        <div className="grid gap-[22px] md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-[15px] border border-[#252934] bg-card p-6">
              <div className="mb-[15px] text-[25px] text-brand-light">{f.icon}</div>
              <h3 className="mb-[7px] text-lg font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="px-[6vw] py-[75px] text-center">
        <h2 className="mb-3 text-[42px] font-bold tracking-[-1.5px]">Build your edge.</h2>
        <p className="mb-[25px] text-muted">Thushouse — พื้นที่สำหรับคนที่อยากเรียนจริงและพัฒนาตัวเองอย่างต่อเนื่อง</p>
        <ButtonLink href="/signup">เริ่มต้นกับ Thushouse</ButtonLink>
      </section>

      <Footer />
    </>
  );
}
