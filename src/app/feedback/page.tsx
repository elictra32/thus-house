import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FeedbackGallery from "@/components/FeedbackGallery";
import { ButtonLink } from "@/components/Button";
import { getGallery } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feedback จากสมาชิก" };

export default async function FeedbackPage() {
  const items = await getGallery("feedback");
  return (
    <div className="bg-paper text-charcoal">
      <Navbar light />
      <main className="relative overflow-hidden px-[6vw] pb-20 pt-14">
        <div aria-hidden className="pointer-events-none absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-glow-lilac/50 blur-[90px]" />
        <div aria-hidden className="pointer-events-none absolute -left-40 top-[40%] h-[380px] w-[380px] rounded-full bg-glow-blue/35 blur-[90px]" />
        <div className="relative">
          <p className="text-xs font-bold tracking-[3px] text-plum-700">FEEDBACK LOVER</p>
          <h1 className="mt-3 text-5xl font-extrabold uppercase tracking-[-2px] md:text-7xl">เสียงจากสมาชิก</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-charcoal/75">
            ประสบการณ์จริงของสมาชิก THUS จาก Discord — การเรียน การฝึก Forward Test และการพัฒนาไปด้วยกันตลอด 1 ปี
          </p>
          <div className="mt-12">
            {items.length ? <FeedbackGallery items={items} /> : <p className="text-charcoal/60">ยังไม่มี Feedback</p>}
          </div>
          <div className="mt-16 text-center">
            <ButtonLink href="/signup" variant="plum" className="px-7 py-4 text-base">สมัคร THUS Member →</ButtonLink>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
