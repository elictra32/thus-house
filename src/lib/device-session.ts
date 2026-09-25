// ล็อกอินได้ทีละเครื่อง: cookie รหัสเครื่อง (thus_sid) เทียบกับ users.active_session ผ่าน RPC session_check
export const SID_COOKIE = "thus_sid";
export const SID_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
};
export const DEVICE_BUSY =
  "บัญชีนี้กำลังใช้งานอยู่ที่อุปกรณ์อื่น — กด “ออกจากระบบ” ที่อุปกรณ์เดิมก่อน หรือติดต่อทีมงานให้ปลดล็อกอุปกรณ์";
