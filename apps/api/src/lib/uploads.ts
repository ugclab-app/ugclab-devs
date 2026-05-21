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
