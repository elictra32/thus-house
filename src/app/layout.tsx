import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Thushouse — Learn. Build. Become.", template: "%s · Thushouse" },
  description: "Thushouse Academy — พื้นที่เรียนรู้การลงทุนที่รวมบทเรียนคุณภาพไว้เป็นระบบ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
