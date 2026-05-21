import { Hono } from "hono";
import { readFile } from "fs/promises";
import path from "path";
import { getUploadRoot } from "../lib/uploads.js";

const files = new Hono();

files.get("/*", async (c) => {
  const key = c.req.path.replace(/^\//, "");
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
