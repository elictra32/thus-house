// ย่อรูปสลิปในเบราว์เซอร์ก่อนอัปโหลด (ด้านยาวสุด 1600px, JPEG 85%) — ไฟล์เล็กลงหลายเท่า อัปโหลดเร็ว ประหยัดพื้นที่
// ถ้าย่อไม่ได้หรือไม่ได้เล็กลง ใช้ไฟล์เดิม
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // PNG พื้นใส → พื้นขาว
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
