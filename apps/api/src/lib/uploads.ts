import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function getUploadRoot() {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../data/uploads"
  );
  return root;
}

export async function saveDigitalFile(
  tenantId: string,
  productId: string,
  file: { name: string; type: string; size: number; buffer: Buffer }
) {
  if (file.size <= 0) throw new Error("Empty file");
  if (file.size > MAX_BYTES) throw new Error("File must be 50 MB or smaller");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dir = path.join(getUploadRoot(), tenantId, productId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), file.buffer);

  return {
    storageKey: `${tenantId}/${productId}/${safeName}`,
    fileName: safeName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

export async function saveProductImage(
  tenantId: string,
  productId: string,
  file: { name: string; type: string; size: number; buffer: Buffer }
) {
  if (file.size <= 0) throw new Error("Empty file");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be 8 MB or smaller");
  const mime = file.type || "image/jpeg";
  if (!IMAGE_TYPES.has(mime)) throw new Error("Only JPEG, PNG, WebP, or GIF images");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dir = path.join(getUploadRoot(), tenantId, productId, "images");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), file.buffer);

  return {
    storageKey: `${tenantId}/${productId}/images/${safeName}`,
    fileName: safeName,
    mimeType: mime,
  };
}

export function uploadPublicUrl(storageKey: string) {
  return `/api/files/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0") {
    return true;
  }
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(h)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(h)) return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  return false;
}

const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/** Download a remote image for product media import (server-side, SSRF-safe). */
export async function downloadRemoteImage(rawUrl: string): Promise<{
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
}> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("Invalid image URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL must be http or https");
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error("That URL is not allowed");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "image/*,*/*;q=0.8" },
    });
  } catch {
    throw new Error("Could not download image from URL");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(`Download failed (${res.status})`);

  const finalHost = new URL(res.url).hostname;
  if (isPrivateHostname(finalHost)) {
    throw new Error("That URL is not allowed");
  }

  const contentType = (res.headers.get("content-type") ?? "")
    .split(";")[0]
    ?.trim()
    .toLowerCase();
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length <= 0) throw new Error("Empty file");
  if (buf.length > MAX_IMAGE_BYTES) throw new Error("Image must be 8 MB or smaller");

  const pathExt = path.extname(parsed.pathname).toLowerCase();
  let mime = contentType && IMAGE_TYPES.has(contentType) ? contentType : "";
  if (!mime && EXT_MIME[pathExt]) mime = EXT_MIME[pathExt];
  if (!mime) {
    // sniff magic bytes
    if (buf[0] === 0xff && buf[1] === 0xd8) mime = "image/jpeg";
    else if (buf[0] === 0x89 && buf[1] === 0x50) mime = "image/png";
    else if (buf[0] === 0x47 && buf[1] === 0x49) mime = "image/gif";
    else if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
      mime = "image/webp";
  }
  if (!IMAGE_TYPES.has(mime)) {
    throw new Error("URL must point to a JPEG, PNG, WebP, or GIF image");
  }

  const base =
    path.basename(parsed.pathname).replace(/[^a-zA-Z0-9._-]/g, "_") ||
    `import-${Date.now()}`;
  const withExt =
    path.extname(base) ||
    (mime === "image/jpeg"
      ? ".jpg"
      : mime === "image/png"
        ? ".png"
        : mime === "image/webp"
          ? ".webp"
          : ".gif");
  const name = path.extname(base) ? base : `${base}${withExt}`;

  return { name, type: mime, size: buf.length, buffer: buf };
}

export async function saveStoreMedia(
  tenantId: string,
  file: { name: string; type: string; size: number; buffer: Buffer }
) {
  if (file.size <= 0) throw new Error("Empty file");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be 8 MB or smaller");
  const mime = file.type || "image/jpeg";
  if (!IMAGE_TYPES.has(mime)) throw new Error("Only JPEG, PNG, WebP, or GIF images");

  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const dir = path.join(getUploadRoot(), tenantId, "media");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), file.buffer);

  const storageKey = `${tenantId}/media/${safeName}`;
  return {
    storageKey,
    fileName: safeName,
    mimeType: mime,
    url: uploadPublicUrl(storageKey),
  };
}
