import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-160px)] bg-[radial-gradient(ellipse_80%_50%_at_20%_0%,rgba(90,60,120,0.28),transparent_70%)] px-[6vw] py-10">{children}</main>
      <Footer />
    </>
  );
}
