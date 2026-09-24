import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="kicker">404</p>
      <h1 className="text-4xl font-bold">ไม่พบหน้านี้</h1>
      <Link href="/" className="rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold">กลับหน้าแรก</Link>
    </main>
  );
}
