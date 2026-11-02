import type { Hono } from "hono";
import { prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requirePlatformPerm } from "../middleware/platform-perm.js";

const FORMATS = new Set(["square", "portrait", "story"]);

function clean(body: {
  title?: string;
  caption?: string;
  hashtags?: string;
  imageUrl?: string | null;
  format?: string;
}) {
  const title = String(body.title ?? "").trim().slice(0, 120);
  const caption = String(body.caption ?? "").trim().slice(0, 2200);
  const hashtags = String(body.hashtags ?? "").trim().slice(0, 500);
  const imageUrl = String(body.imageUrl ?? "").trim().slice(0, 2000);
  const format = FORMATS.has(String(body.format)) ? String(body.format) : "square";
  if (!title) return { error: "Add a name for this draft." as const };
  if (!caption) return { error: "Write a caption." as const };
  return { title, caption, hashtags, imageUrl: imageUrl || null, format };
}

function mapPost(row: {
  id: string;
  title: string;
  caption: string;
  hashtags: string;
  imageUrl: string | null;
  format: string;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    title: row.title,
    caption: row.caption,
    hashtags: row.hashtags,
    imageUrl: row.imageUrl,
    format: row.format,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function registerPlatformInstagramRoutes(platform: Hono<AuthEnv>) {
  platform.get("/instagram-posts", requirePlatformPerm("announcements:write"), async (c) => {
    const posts = await prisma.platformInstagramPost.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return c.json({ posts: posts.map(mapPost) });
  });

  platform.post("/instagram-posts", requirePlatformPerm("announcements:write"), async (c) => {
    const parsed = clean(await c.req.json().catch(() => ({})));
    if ("error" in parsed) return c.json({ error: parsed.error }, 400);
    const post = await prisma.platformInstagramPost.create({ data: parsed });
    return c.json({ post: mapPost(post) });
  });

  platform.patch("/instagram-posts/:id", requirePlatformPerm("announcements:write"), async (c) => {
    const existing = await prisma.platformInstagramPost.findUnique({
      where: { id: c.req.param("id") },
    });
    if (!existing) return c.json({ error: "Draft not found." }, 404);
    const parsed = clean(await c.req.json().catch(() => ({})));
    if ("error" in parsed) return c.json({ error: parsed.error }, 400);
    const post = await prisma.platformInstagramPost.update({
      where: { id: existing.id },
      data: parsed,
    });
    return c.json({ post: mapPost(post) });
  });

  platform.delete("/instagram-posts/:id", requirePlatformPerm("announcements:write"), async (c) => {
    await prisma.platformInstagramPost.deleteMany({ where: { id: c.req.param("id") } });
    return c.json({ ok: true });
  });
}
