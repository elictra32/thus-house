import { Fragment } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClassCard from "@/components/ClassCard";
import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import YouTubeLite from "@/components/YouTubeLite";
import MeetupSlideshow from "@/components/MeetupSlideshow";
import { getGallery, getPublicClasses } from "@/lib/data";

export const dynamic = "force-dynamic";

// วิดีโอแนะนำบนหน้าแรก (YouTube) — แสดงปกก่อน ผู้ชมกดเล่นเอง
const INTRO_VIDEO_ID = "fQoh2I0_89w";

// label แบ่งเป็นท่อน — ขึ้นบรรทัดใหม่ได้เฉพาะระหว่างท่อน (ภาษาไทยไม่ถูกตัดกลางคำบนมือถือ)
const stats = [
  { value: "1 ปีเต็ม", label: ["พัฒนาไปพร้อมกัน", "อย่างเป็นระบบ"] },
  { value: "ทุกวันพุธ", label: ["เรียนสด", "20:30 – 22:30 น."] },
  { value: "20", label: ["บทเรียน", "Class ปรับพื้นฐาน"] },
  { value: "200+", label: ["วิดีโอย้อนหลัง", "ตั้งแต่รุ่น 1"] },
];

const highlights = [
  { title: "เน้น Forward Test", body: "ฝึกฝนในตลาดจริง เพื่อให้เข้าใจพฤติกรรมตลาดที่เปลี่ยนแปลงตลอดเวลา" },
  { title: "เรียนรู้ต่อเนื่อง 1 ปีเต็ม", body: "พัฒนาไปพร้อมกันอย่างเป็นระบบ ไม่ใช่แค่เรียนจบแล้วทิ้ง" },
  { title: "เรียนสดทุกสัปดาห์", body: "ทุกวันพุธ เวลา 20:30 – 22:30 น. พร้อมระบบดูย้อนหลังได้ตลอดอายุสมาชิก" },
  { title: "Trader Support ส่วนตัว", body: "ช่วยวิเคราะห์ ปรับปรุง และค้นหา \"สไตล์การเทรดที่เหมาะกับคุณ\"" },
  { title: "Trade Record Template", body: "Template เฉพาะของ THUS ใช้บันทึกและวิเคราะห์ผลการเทรด เพื่อพัฒนาอย่างต่อเนื่อง" },
  { title: "Class ปรับพื้นฐาน + ย้อนหลัง", body: "ปรับพื้นฐาน 20 บทเรียน และ Class ย้อนหลังตั้งแต่รุ่น 1 มากกว่า 200 วิดีโอ" },
];

const benefits = [
  {
    no: "01",
    title: "Support Services",
    items: [
      "คำปรึกษาแบบใกล้ชิดจากทีม THUS House",
      "ติดตามผลการเรียนรู้และพัฒนาไปพร้อมกันตลอด 1 ปี",
      "วิเคราะห์ผลการเทรดจาก Trade Record อย่างเป็นระบบ",
    ],
  },
  {
    no: "02",
    title: "Learning Benefits",
    items: [
      "เรียนสดรายสัปดาห์ + ดูกราฟและคลิปย้อนหลังได้ตลอดอายุสมาชิก",
      "ฝึกใช้งานจริงผ่านการทำ Forward Test",
      "Update ตลาดไปกับคุณโอม",
    ],
  },
  {
    no: "03",
    title: "Community & Networking",
    items: [
      "สิทธิ์เข้าร่วม Discord กลุ่มเฉพาะสมาชิก",
      "แลกเปลี่ยนมุมมองและบทวิเคราะห์กับเทรดเดอร์คนอื่น ๆ",
      "Meetup พบปะทีมงานและสมาชิก เฉลี่ย 2 เดือนครั้ง",
    ],
  },
];

const curriculum = [
  "พื้นฐาน Futures I",
  "พื้นฐาน Futures II",
  "Gearing and Position Sizing P1",
  "Gearing and Position Sizing P2",
  "Gearing and Position Sizing P3",
  "Gearing and Position Sizing P4",
  "Steps P1",
  "Steps P2",
  "Basic TradingView P1",
  "Basic TradingView P2",
  "Unlock TradingView P1",
  "Unlock TradingView P2",
  "Candlestick",
  "Dow Theory",
  "Chart Pattern",
  "Global Events I",
  "Global Events II",
  "How to Look Back",
  "Create System",
  "ศิลปะของ Money Management",
];

// ข้อความหลายบรรทัด: จอ md ขึ้นไปขึ้นบรรทัดใหม่ตรงตามที่กำหนด · มือถือไหลต่อกันตามความกว้างจอ
function Lines({ children }: { children: React.ReactNode[] }) {
  return (
    <>
      {children.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="md:block md:whitespace-nowrap">{line}</span>
        </Fragment>
      ))}
    </>
  );
}

// แสง gradient เบลอแบบสไลด์ THUS MEMBER BENEFITS
function Glow({ className }: { className: string }) {
  return <div aria-hidden className={`glow pointer-events-none absolute rounded-full blur-[90px] ${className}`} />;
}

export default async function Landing() {
  const [classes, meetups, feedback] = await Promise.all([getPublicClasses(), getGallery("meetup"), getGallery("feedback")]);

  return (
    <div className="bg-paper text-charcoal">
      <Navbar light />

      {/* ---------- Hero ---------- */}
      <header className="relative overflow-hidden px-5 pb-16 pt-10 sm:px-[6vw] md:pb-20 md:pt-16 lg:pt-20">
        <Glow className="-left-32 top-10 h-[420px] w-[300px] rotate-12 bg-glow-lilac/60" />
        <Glow className="right-[-120px] top-[-60px] h-[460px] w-[420px] bg-glow-orange/45 dark:bg-[#6b3fa0]/60" />
        <Glow className="bottom-[-160px] left-1/3 h-[380px] w-[520px] bg-glow-pink/40 dark:bg-glow-blue/30" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            {/* ข้อความส่วนหัวจัดกึ่งกลางในคอลัมน์ */}
            <div className="text-center">
            <p className="flex items-center justify-center gap-3 text-[11px] font-bold tracking-[0.32em] text-accent-muted sm:text-xs">
              <span aria-hidden className="h-px w-8 bg-accent-muted/40" />
              THUS HOUSE OF TRADERS
              <span aria-hidden className="h-px w-8 bg-accent-muted/40" />
            </p>

            <h1 className="mt-5 text-[clamp(3.6rem,12vw,6rem)] font-extrabold uppercase leading-[0.86] xl:text-[7rem] tracking-[-0.04em] text-charcoal">
              THUS
              <br />
              Member
            </h1>

            <p className="mx-auto mt-5 w-fit bg-gradient-to-r from-plum-700 via-[#a45c95] to-glow-orange dark:from-[#cdb6ea] dark:via-[#e59ac0] dark:to-glow-orange bg-clip-text pb-1 text-[clamp(1.4rem,3.6vw,2rem)] font-bold leading-tight tracking-[-0.02em] text-transparent">
              Winners Average Winners
            </p>

            <p className="mt-6 text-[17px] leading-[1.85] text-charcoal/75 [text-wrap:pretty] lg:text-[17px] xl:text-lg">
              <Lines>
                {[
                  <>
                    หลักสูตรที่ออกแบบมาเพื่อพัฒนาเทรดเดอร์<span className="whitespace-nowrap">ตั้งแต่ระดับพื้นฐาน</span>
                  </>,
                  <>
                    ไปจนถึง<span className="whitespace-nowrap">การต่อยอดสู่การเป็นมืออาชีพ</span>{" "}
                    <span className="whitespace-nowrap">
                      ภายในระยะเวลา <b className="font-bold text-accent">1 ปีเต็ม</b>
                    </span>
                  </>,
                  <>
                    เน้นทั้ง <b className="whitespace-nowrap font-bold text-accent">“ทักษะการเทรดจริง”</b> และ{" "}
                    <b className="whitespace-nowrap font-bold text-accent">“กระบวนการคิดแบบมืออาชีพ”</b>
                  </>,
                ]}
              </Lines>
            </p>
            </div>

            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
              <ButtonLink href="/signup" variant="plum" className="h-12 px-6 text-base">
                สมัคร THUS Member →
              </ButtonLink>
              <ButtonLink href="#benefits" variant="paper" className="h-12 px-6 text-base">
                ดูสิทธิประโยชน์
              </ButtonLink>
            </div>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-white/70 bg-white/40 p-1.5 dark:border-white/10 dark:bg-white/5 shadow-[0_30px_80px_-20px_#2d183c55] backdrop-blur sm:rounded-[24px] sm:p-2">
            <div className="relative aspect-video overflow-hidden rounded-[15px] bg-plum-900 sm:rounded-[18px]">
              <YouTubeLite id={INTRO_VIDEO_ID} title="THUS House of Traders" />
            </div>
          </div>
        </div>

        {/* ตัวเลขสรุป */}
        <div className="relative mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-charcoal/10 bg-charcoal/10 md:mt-16 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.value} className="bg-paper-light/90 px-5 py-5 sm:px-6 sm:py-6">
              <div className="text-[26px] font-extrabold leading-none tracking-[-0.03em] text-accent sm:text-3xl lg:text-4xl">{s.value}</div>
              <div className="mt-2.5 text-[13px] leading-snug text-charcoal/65 sm:text-sm">
                {s.label.map((part, i) => (
                  <Fragment key={part}>
                    {i > 0 && " "}
                    <span className="whitespace-nowrap">{part}</span>
                  </Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* ---------- Highlights ---------- */}
      <section id="highlights" className="scroll-mt-20 px-[6vw] py-20">
        <p className="text-xs font-bold tracking-[3px] text-accent-muted">HIGHLIGHTS</p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-[-1.5px] md:text-6xl">
          Learn smarter.
          <br />
          <span className="text-accent-soft">Build better.</span>
        </h2>
        <p className="mt-4 text-lg text-charcoal/70">เรียนจากตลาดจริง ไปพร้อมกัน 1 ปีเต็ม</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {highlights.map((h, i) => (
            <div key={h.title} className="rounded-2xl border border-charcoal/10 bg-paper-light p-6 transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-25px_#2d183c66]">
              <div className="text-sm font-extrabold text-accent-soft">{String(i + 1).padStart(2, "0")}</div>
              <h3 className="mt-3 text-xl font-bold text-accent">{h.title}</h3>
              <p className="mt-2 leading-relaxed text-charcoal/75">{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Member Benefits (พื้นม่วงเข้มแบบแบนเนอร์โลโก้) ---------- */}
      <section
        id="benefits"
        className="relative scroll-mt-20 overflow-hidden bg-[radial-gradient(ellipse_at_50%_100%,#2d183c_0%,#3a2449_45%,#5a4a68_100%)] px-[6vw] py-24 text-white"
      >
        <Glow className="-right-24 top-0 h-[360px] w-[360px] bg-glow-blue/25" />
        <div className="relative">
          <p className="text-xs font-bold tracking-[3px] text-plum-300">MEMBER BENEFITS</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-[-1.5px] md:text-6xl">สิทธิประโยชน์สมาชิก</h2>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-white/10 bg-white/[.06] p-7 backdrop-blur">
                <div className="text-5xl font-extrabold text-white/15">{b.no}</div>
                <h3 className="mt-2 text-2xl font-extrabold tracking-[-0.5px]">{b.title}</h3>
                <ul className="mt-5 space-y-3">
                  {b.items.map((it) => (
                    <li key={it} className="flex gap-3 leading-relaxed text-white/85">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-glow-orange" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Meetup (สไลด์โชว์) ---------- */}
      {meetups.length > 0 && (
        <section id="meetup" className="relative scroll-mt-20 overflow-hidden bg-plum-900 px-[6vw] pb-24 pt-4 text-white">
          <Glow className="-left-32 top-10 h-[380px] w-[380px] bg-glow-lilac/25" />
          <Glow className="-right-24 bottom-0 h-[340px] w-[420px] bg-glow-orange/20" />
          <div className="relative">
            <div className="mb-10 text-center">
              <p className="text-xs font-bold tracking-[3px] text-plum-300">COMMUNITY & NETWORKING</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-1.5px] md:text-5xl">THUS Meetup</h2>
              <p className="mx-auto mt-4 max-w-3xl leading-relaxed text-white/75">
                พบปะสังสรรค์ แลกเปลี่ยนประสบการณ์กับสมาชิกและทีมงาน THUS House{" "}
                <span className="whitespace-nowrap">เฉลี่ย 2 เดือนครั้ง</span>
              </p>
            </div>
            <MeetupSlideshow items={meetups} />
          </div>
        </section>
      )}

      {/* ---------- Feedback (ตัวอย่าง → หน้า /feedback) ---------- */}
      {feedback.length > 0 && (
        <section id="feedback" className="relative scroll-mt-20 overflow-hidden px-[6vw] py-20">
          <Glow className="-right-40 top-0 h-[380px] w-[380px] bg-glow-lilac/45" />
          <div className="relative">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[3px] text-accent-muted">FEEDBACK LOVER</p>
                <h2 className="mt-3 text-4xl font-extrabold tracking-[-1.5px] md:text-5xl">เสียงจากสมาชิก</h2>
              </div>
              <ButtonLink href="/feedback" variant="paper">ดู Feedback ทั้งหมด ({feedback.length}) →</ButtonLink>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {feedback.slice(0, 3).map((f) => (
                <Link
                  key={f.id}
                  href="/feedback"
                  className="overflow-hidden rounded-2xl border border-charcoal/10 shadow-[0_20px_50px_-30px_#2d183c88] transition hover:-translate-y-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.image_url} alt={f.caption ?? "Feedback จากสมาชิก THUS"} loading="lazy" className="aspect-video w-full object-cover" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- หลักสูตร Class ปรับพื้นฐาน ---------- */}
      <section id="curriculum" className="relative scroll-mt-20 overflow-hidden px-[6vw] py-20">
        <Glow className="-left-40 bottom-0 h-[380px] w-[380px] bg-glow-blue/35" />
        <div className="relative">
          <div className="flex items-end justify-between gap-8">
            <div>
              <p className="text-xs font-bold tracking-[3px] text-accent-muted">CURRICULUM</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-1.5px] md:text-5xl">
                หัวข้อ <span className="whitespace-nowrap">Class ปรับพื้นฐาน</span>
              </h2>
              <p className="mt-4 text-[17px] leading-[1.85] text-charcoal/75">
                <Lines>
                  {[
                    <>
                      <b className="font-bold text-accent">20 บทเรียน</b>ปูพื้นให้พร้อมก่อนเรียนสด{" "}
                      <span className="whitespace-nowrap">ตั้งแต่พื้นฐาน Futures</span>
                    </>,
                    <>
                      การคุมขนาดสถานะ, <span className="whitespace-nowrap">เครื่องมือ TradingView</span> ไปจนถึง
                      <span className="whitespace-nowrap">การสร้างระบบเทรดของตัวเอง</span>
                    </>,
                  ]}
                </Lines>
              </p>
            </div>
            <Image src="/brand/mark.png" alt="" width={96} height={96} className="hidden shrink-0 opacity-90 dark:opacity-100 dark:[filter:brightness(2.2)] lg:block" />
          </div>
          <ol className="mt-10 grid gap-x-10 sm:grid-cols-2">
            {curriculum.map((c, i) => (
              <li key={c} className="flex items-baseline gap-4 border-b border-charcoal/10 py-3.5">
                <span className="w-7 shrink-0 text-sm font-extrabold text-accent-soft">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-medium">{c}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- คอร์สในระบบ ---------- */}
      {classes.length > 0 && (
        <section id="courses" className="scroll-mt-20 bg-bg px-[6vw] py-20 text-ink">
          <p className="text-xs font-bold tracking-[3px] text-plum-300">CLASSES</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-[-1.5px]">คลาสที่เปิดอยู่</h2>
          <div className="mt-8 grid gap-[18px] md:grid-cols-3">
            {classes.map((c, i) => (
              <ClassCard key={c.id} cls={c} index={i} href={`/classes/${c.id}`} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden px-[6vw] py-24 text-center">
        <Glow className="left-1/2 top-1/2 h-[320px] w-[620px] -translate-x-1/2 -translate-y-1/2 bg-glow-lilac/45" />
        <div className="relative">
          <h2 className="text-5xl font-extrabold tracking-[-2px] md:text-7xl">Build your edge.</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-charcoal/75">
            Thushouse — พื้นที่สำหรับคนที่อยากเรียนจริงและพัฒนาตัวเองอย่างต่อเนื่อง
          </p>
          <ButtonLink href="/signup" variant="plum" className="mt-8 px-7 py-4 text-base">
            สมัคร THUS Member →
          </ButtonLink>
        </div>
      </section>

      <Footer />
    </div>
  );
}
