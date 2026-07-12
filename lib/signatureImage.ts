"use client";

// Client-side signature image processing: turns an uploaded photo/scan of a
// signature into a compact transparent PNG by knocking out light (paper)
// pixels, so the ink floats cleanly over the signature line in generated PDFs.

const MAX_W = 600;
const WHITE_THRESHOLD = 235; // pixels at least this bright become transparent
const SOFT_THRESHOLD = 190; // brighter than this fades out proportionally

export async function fileToTransparentPng(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("That file does not look like an image."));
    el.src = dataUrl;
  });

  const scale = Math.min(1, MAX_W / img.width);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;
  for (let i = 0; i < px.length; i += 4) {
    const brightness = (px[i] + px[i + 1] + px[i + 2]) / 3;
    if (brightness >= WHITE_THRESHOLD) {
      px[i + 3] = 0;
    } else if (brightness > SOFT_THRESHOLD) {
      const t = (brightness - SOFT_THRESHOLD) / (WHITE_THRESHOLD - SOFT_THRESHOLD);
      px[i + 3] = Math.round(px[i + 3] * (1 - t));
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png");
}
