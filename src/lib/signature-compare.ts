// Signature comparison utility - normalizes both signatures to a fixed
// grayscale grid (cropped to the inked bounding box) and computes a
// similarity score [0..1] that is robust to small offsets and stroke-width
// differences by combining a blurred normalized cross-correlation with a
// soft IoU on dilated ink masks.

const GRID = 128; // normalized comparison grid (higher = more detail)
const INK_THRESHOLD = 200; // pixel < 200 is considered ink
const BLUR_RADIUS = 3; // box-blur radius applied before NCC (tolerates jitter)
const DILATE_RADIUS = 3; // dilation radius for soft-IoU mask

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getGrayscale(img: HTMLImageElement): { data: Uint8ClampedArray; w: number; h: number } {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const out = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const a = data[i + 3] / 255;
    const r = data[i] * a + 255 * (1 - a);
    const g = data[i + 1] * a + 255 * (1 - a);
    const b = data[i + 2] * a + 255 * (1 - a);
    out[j] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }
  return { data: out, w: canvas.width, h: canvas.height };
}

function cropToInk(gray: { data: Uint8ClampedArray; w: number; h: number }) {
  const { data, w, h } = gray;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[y * w + x] < INK_THRESHOLD) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

/** Render a signature into a square GRID canvas, preserving aspect ratio,
 *  cropped to its ink bounding box and centered. Returns inverted ink density
 *  in [0,1] (1 = ink). */
function normalizeToGrid(dataUrl: string): Promise<Float32Array | null> {
  return loadImage(dataUrl).then((img) => {
    const gray = getGrayscale(img);
    const bbox = cropToInk(gray);
    if (!bbox) return null;
    const cw = bbox.maxX - bbox.minX + 1;
    const ch = bbox.maxY - bbox.minY + 1;

    const canvas = document.createElement("canvas");
    canvas.width = GRID;
    canvas.height = GRID;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, GRID, GRID);

    // Fit cropped signature inside the GRID, preserving aspect, with padding
    const pad = 4;
    const avail = GRID - pad * 2;
    const scale = Math.min(avail / cw, avail / ch);
    const dw = cw * scale;
    const dh = ch * scale;
    const dx = (GRID - dw) / 2;
    const dy = (GRID - dh) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, bbox.minX, bbox.minY, cw, ch, dx, dy, dw, dh);

    const { data } = ctx.getImageData(0, 0, GRID, GRID);
    const out = new Float32Array(GRID * GRID);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const a = data[i + 3] / 255;
      const r = data[i] * a + 255 * (1 - a);
      const g = data[i + 1] * a + 255 * (1 - a);
      const b = data[i + 2] * a + 255 * (1 - a);
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      out[j] = Math.max(0, (255 - lum) / 255); // 1 = ink
    }
    return out;
  });
}

/** Separable box blur on a GRIDxGRID float buffer. */
function boxBlur(src: Float32Array, radius: number): Float32Array {
  if (radius <= 0) return src;
  const w = GRID, h = GRID;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const win = radius * 2 + 1;
  // Horizontal
  for (let y = 0; y < h; y++) {
    let sum = 0;
    const row = y * w;
    for (let x = -radius; x <= radius; x++) sum += src[row + Math.max(0, Math.min(w - 1, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / win;
      const xOut = Math.max(0, Math.min(w - 1, x - radius));
      const xIn = Math.max(0, Math.min(w - 1, x + radius + 1));
      sum += src[row + xIn] - src[row + xOut];
    }
  }
  // Vertical
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += tmp[Math.max(0, Math.min(h - 1, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / win;
      const yOut = Math.max(0, Math.min(h - 1, y - radius));
      const yIn = Math.max(0, Math.min(h - 1, y + radius + 1));
      sum += tmp[yIn * w + x] - tmp[yOut * w + x];
    }
  }
  return out;
}

/** Dilate a soft mask using box blur + threshold-ish saturation. */
function dilate(src: Float32Array, radius: number): Float32Array {
  const blurred = boxBlur(src, radius);
  const out = new Float32Array(blurred.length);
  for (let i = 0; i < blurred.length; i++) {
    // Saturate: anything with some neighborhood ink becomes ~1
    out[i] = Math.min(1, blurred[i] * (radius * 2 + 1));
  }
  return out;
}

function ncc(a: Float32Array, b: Float32Array): number {
  // Subtract means for a more robust correlation
  let ma = 0, mb = 0;
  for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; }
  ma /= a.length; mb /= b.length;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    dot += da * db;
    na += da * da;
    nb += db * db;
  }
  if (na === 0 || nb === 0) return 0;
  return Math.max(0, dot / Math.sqrt(na * nb));
}

/** Soft IoU between two [0,1] masks. */
function softIoU(a: Float32Array, b: Float32Array): number {
  let inter = 0, uni = 0;
  for (let i = 0; i < a.length; i++) {
    inter += Math.min(a[i], b[i]);
    uni += Math.max(a[i], b[i]);
  }
  if (uni === 0) return 0;
  return inter / uni;
}

/**
 * Compare two signature dataURLs. Returns a similarity score 0..1.
 * Combines blurred NCC (shape correlation, tolerant to jitter) with soft IoU
 * on dilated masks (overlap, tolerant to stroke-width differences).
 */
export async function compareSignatures(a: string, b: string): Promise<number> {
  const [ga, gb] = await Promise.all([normalizeToGrid(a), normalizeToGrid(b)]);
  if (!ga || !gb) return 0;

  // Blurred NCC — tolerant to small misalignments
  const ba = boxBlur(ga, BLUR_RADIUS);
  const bb = boxBlur(gb, BLUR_RADIUS);
  const corr = ncc(ba, bb);

  // Soft IoU on dilated masks — tolerant to stroke-width / thickness
  const da = dilate(ga, DILATE_RADIUS);
  const db = dilate(gb, DILATE_RADIUS);
  const iou = softIoU(da, db);

  // Weighted blend favouring shape correlation, then a gentle curve so
  // visually-similar signatures land in the higher range.
  const raw = 0.6 * corr + 0.4 * iou;
  const boosted = Math.pow(raw, 0.7); // concave boost
  return Math.max(0, Math.min(1, boosted));
}

/** Umbral por defecto. El valor efectivo se obtiene desde Ajustes. */
export const SIGNATURE_MATCH_THRESHOLD = 0.85;
