"use client";
import { useState } from "react";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function MobileMenu({ links, loggedIn }: { links: { href: string; label: string }[]; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button onClick={() => setOpen(!open)} className="px-2 text-2xl" aria-label="เมนู" aria-expanded={open}>
        ☰
      </button>
      {open && (
        <div className="absolute inset-x-0 top-[76px] flex flex-col gap-1 border-b border-line bg-panel p-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-raised">
              {l.label}
            </Link>
          ))}
          {loggedIn && (
            <div className="mt-2">
              <LogoutButton />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
