// ช่องทางติดตาม THUS House — ใช้ใน Footer (ไอคอน) และหน้าแรก (ปุ่มมีชื่อ)
export const SOCIALS = [
  { key: "facebook", label: "Facebook", handle: "THUS House", href: "https://www.facebook.com/profile.php?id=100085620125891" },
  { key: "youtube", label: "YouTube", handle: "@THUSHouse", href: "https://www.youtube.com/@THUSHouse" },
  { key: "instagram", label: "Instagram", handle: "@thus.house", href: "https://www.instagram.com/thus.house/" },
  { key: "tiktok", label: "TikTok", handle: "@thus.house", href: "https://www.tiktok.com/@thus.house" },
] as const;

type Key = (typeof SOCIALS)[number]["key"];

export function SocialIcon({ name, className = "h-5 w-5" }: { name: Key; className?: string }) {
  switch (name) {
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M16.6 3h-3.1v12.2a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .8.1V9.4a5.8 5.8 0 1 0 5 5.8V9.1a7.3 7.3 0 0 0 4.1 1.3V7.3a4.2 4.2 0 0 1-4.1-4.3z" />
        </svg>
      );
  }
}

// ไอคอนกลม (Footer)
export function SocialIcons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {SOCIALS.map((s) => (
        <a
          key={s.key}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${s.label} ${s.handle}`}
          title={`${s.label} ${s.handle}`}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/85 transition hover:bg-white hover:text-plum-900"
        >
          <SocialIcon name={s.key} className="h-[18px] w-[18px]" />
        </a>
      ))}
    </div>
  );
}

// ปุ่มมีชื่อ (หน้าแรก)
export function SocialButtons() {
  return (
    <div className="mx-auto grid max-w-sm grid-cols-2 gap-3 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center">
      {SOCIALS.map((s) => (
        <a
          key={s.key}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 rounded-full border border-charcoal/15 bg-white/60 px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-charcoal/40 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
        >
          <SocialIcon name={s.key} />
          <span>{s.label}</span>
          <span className="hidden font-normal text-charcoal/55 sm:inline">{s.handle}</span>
        </a>
      ))}
    </div>
  );
}
