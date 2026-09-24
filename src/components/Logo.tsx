import Image from "next/image";
import Link from "next/link";

// โลโก้ THUS House of Traders — tone="light" ใช้บนพื้นสีอ่อน (โลโก้สีม่วงเข้ม), "dark" ใช้บนพื้นเข้ม (โลโก้สีขาว)
export default function Logo({ href = "/", tone = "dark", height = 36 }: { href?: string; tone?: "light" | "dark"; height?: number }) {
  return (
    <Link href={href} aria-label="THUS House of Traders" className="inline-flex shrink-0 items-center">
      <Image
        src={tone === "light" ? "/brand/wordmark-plum.png" : "/brand/wordmark-white.png"}
        alt="THUS House of Traders"
        width={Math.round((height * 900) / 347)}
        height={height}
        priority
      />
    </Link>
  );
}
