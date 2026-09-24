import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "THUS House of Traders — THUS Member", template: "%s · THUS House" },
  description: "THUS Members Class — หลักสูตรพัฒนาเทรดเดอร์ตั้งแต่พื้นฐานสู่มืออาชีพภายใน 1 ปีเต็ม เรียนสดทุกสัปดาห์ พร้อม Trader Support ส่วนตัว",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* ใช้โหมดสว่าง/มืดที่ผู้ชมเลือกไว้ก่อนแสดงผล (กันหน้ากระพริบ) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("thus-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
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
