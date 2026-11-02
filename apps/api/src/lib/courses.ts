/** Gated course lessons stored on DigitalAsset.lessons. */

export type Lesson = {
  title: string;
  body: string;
  /** Embed URL (YouTube / Vimeo / Loom / direct mp4). Rendered only to buyers. */
  videoUrl: string | null;
};

export function parseLessons(raw: unknown): Lesson[] {
  let src: unknown = raw;
  if (typeof raw === "string") {
    try {
      src = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(src)) return [];
  const out: Lesson[] = [];
  for (const item of src) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = String(o.title ?? "").trim().slice(0, 160);
    const body = String(o.body ?? "").trim().slice(0, 20_000);
    const videoRaw = String(o.videoUrl ?? "").trim();
    const videoUrl = /^https?:\/\//i.test(videoRaw) ? videoRaw.slice(0, 500) : null;
    if (!title && !body && !videoUrl) continue;
    out.push({ title: title || `Lesson ${out.length + 1}`, body, videoUrl });
  }
  return out.slice(0, 200);
}

/** Convert a watch URL to an embeddable iframe src. Unknown hosts are returned as-is. */
export function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
      const m = u.pathname.match(/\/(?:embed|shorts)\/([\w-]+)/);
      if (m?.[1]) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      if (id) return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    if (host === "loom.com" && u.pathname.startsWith("/share/")) {
      return `https://www.loom.com/embed/${u.pathname.slice("/share/".length)}`;
    }
    return url;
  } catch {
    return url;
  }
}
