import Link from "next/link";

export default function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="text-2xl font-extrabold tracking-[-1px]">
      thus<span className="text-brand">house</span>
    </Link>
  );
}
