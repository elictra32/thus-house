// เอกสารประกอบคลาส = ลิงก์ Google Drive / Docs / Sheets / Slides (ใช้ทั้งหน้า Admin, หน้าเรียน และ API)

// ชนิดเอกสารจากลิงก์ — ใช้เป็นป้ายสั้นๆ หน้ารายการ
export function docKind(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "LINK";
  }
  if (u.hostname === "docs.google.com") {
    if (u.pathname.startsWith("/document")) return "DOC";
    if (u.pathname.startsWith("/spreadsheets")) return "SHEET";
    if (u.pathname.startsWith("/presentation")) return "SLIDE";
    if (u.pathname.startsWith("/forms")) return "FORM";
  }
  if (u.hostname === "drive.google.com") return u.pathname.includes("/folders/") ? "FOLDER" : "DRIVE";
  return "LINK";
}

export function isGoogleLink(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "drive.google.com" || host === "docs.google.com";
  } catch {
    return false;
  }
}
