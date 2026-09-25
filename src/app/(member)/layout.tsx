import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PresencePing from "@/components/PresencePing";
import { ViewAsBanner } from "@/components/ViewAsBar";
import { getAuthUser, getViewAs } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = supabaseConfigured() ? (await getAuthUser()).user : null;
  const view = user ? await getViewAs(user.id, user.email) : null;
  return (
    <>
      {user && <PresencePing />}
      {view && <ViewAsBanner view={view} />}
      <Navbar />
      <main className="min-h-[calc(100vh-160px)] bg-[radial-gradient(ellipse_80%_50%_at_20%_0%,rgba(90,60,120,0.28),transparent_70%)] px-[6vw] py-10">{children}</main>
      <Footer />
    </>
  );
}
