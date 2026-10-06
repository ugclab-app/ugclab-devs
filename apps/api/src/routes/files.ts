import { Hono } from "hono";
import { readFile } from "fs/promises";
import path from "path";
import { getUploadRoot } from "../lib/uploads.js";

const files = new Hono();

/** Storage key from URL (mounted at /api/files). */
function storageKeyFromRequest(c: { req: { url: string; path: string; param: (k: string) => string | undefined } }) {
  const wildcard = c.req.param("*");
  if (wildcard) return decodeURIComponent(wildcard);

  const pathname = new URL(c.req.url).pathname;
  const fromUrl = pathname.replace(/^\/api\/files\/?/, "");
  if (fromUrl && fromUrl !== pathname) return decodeURIComponent(fromUrl);

  const raw = c.req.path.replace(/^\//, "");
  if (raw.startsWith("api/files/")) return decodeURIComponent(raw.slice("api/files/".length));
  return decodeURIComponent(raw);
}

files.get("/*", async (c) => {
  const key = storageKeyFromRequest(c);
  if (!key || key.includes("..")) return c.text("Not found", 404);

  const filePath = path.join(getUploadRoot(), ...key.split("/"));
  const root = path.resolve(getUploadRoot());
  if (!filePath.startsWith(root)) return c.text("Forbidden", 403);

  try {
    const buf = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const types: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".pdf": "application/pdf",
    };
    return c.body(buf, 200, {
      "Content-Type": types[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    });
  } catch {
    return c.text("Not found", 404);
  }
});

export { files };
