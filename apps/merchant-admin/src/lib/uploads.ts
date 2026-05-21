import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_BYTES = 50 * 1024 * 1024;

export function getUploadRoot() {
  return path.join(process.cwd(), "data", "uploads");
}

export async function saveDigitalFile(
  tenantId: string,
  productId: string,
  file: File
) {
  if (file.size <= 0) {
    throw new Error("Empty file");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File must be 50 MB or smaller");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dir = path.join(getUploadRoot(), tenantId, productId);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, safeName), buffer);

  return {
    storageKey: `${tenantId}/${productId}/${safeName}`,
    fileName: safeName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}
