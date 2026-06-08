// Generate thumbnails for images and videos. Returns a Blob (image/webp).
const MAX_SIZE = 320;

export async function generateImageThumb(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_SIZE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/webp", 0.85),
  );
  return { blob, width, height };
}

export async function generateVideoThumb(
  file: Blob,
): Promise<{ blob: Blob; width: number; height: number; durationMs: number }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("video load failed"));
    });
    const seekTo = Math.min(1, (video.duration || 0) * 0.1);
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("video seek failed"));
      try {
        video.currentTime = seekTo;
      } catch (e) {
        reject(e as Error);
      }
    });
    const vw = video.videoWidth || 320;
    const vh = video.videoHeight || 180;
    const scale = Math.min(1, MAX_SIZE / Math.max(vw, vh));
    const w = Math.max(1, Math.round(vw * scale));
    const h = Math.max(1, Math.round(vh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/webp", 0.8),
    );
    return { blob, width: vw, height: vh, durationMs: Math.round((video.duration || 0) * 1000) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
