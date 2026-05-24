import { useState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { MediaPicker } from "@/components/media-picker";
import { slugifyTitle } from "@/lib/slugify";

export type StorePageFormValues = {
  title: string;
  slug: string;
  pageType: string;
  published: boolean;
  publishAt: string;
  body: string;
  excerpt: string;
  featuredImageUrl: string;
  authorName: string;
  tags: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noindex: boolean;
};

export function PageFormFields({
  initial,
  slugAuto = false,
  compact = false,
}: {
  initial?: Partial<StorePageFormValues>;
  slugAuto?: boolean;
  compact?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [featured, setFeatured] = useState(initial?.featuredImageUrl ?? "");
  const [ogImage, setOgImage] = useState(initial?.ogImageUrl ?? "");

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Title</span>
          <input
            name="title"
            required
            value={title}
            onChange={(e) => {
              const v = e.target.value;
              setTitle(v);
              if (slugAuto && !slugTouched) setSlug(slugifyTitle(v));
            }}
            className="ugclab-input mt-1 w-full"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">URL slug</span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="ugclab-input mt-1 w-full font-mono"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Type</span>
          <select
            name="pageType"
            defaultValue={initial?.pageType ?? "PAGE"}
            className="ugclab-select mt-1 w-full"
          >
            <option value="PAGE">Page</option>
            <option value="BLOG">Blog post</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="published"
            defaultChecked={initial?.published !== false}
          />
          Published
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="noindex"
            defaultChecked={initial?.noindex === true}
          />
          Hide from search (noindex)
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Schedule publish</span>
        <input
          type="datetime-local"
          name="publishAt"
          defaultValue={initial?.publishAt ?? ""}
          className="ugclab-input mt-1 w-full max-w-xs"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Leave empty to publish immediately when &quot;Published&quot; is checked.
        </p>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Excerpt</span>
        <textarea
          name="excerpt"
          rows={2}
          defaultValue={initial?.excerpt ?? ""}
          className="ugclab-input mt-1 w-full"
          placeholder="Short summary for blog list cards"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="text-sm font-medium text-zinc-700">Featured image</span>
          <input type="hidden" name="featuredImageUrl" value={featured} />
          <input
            className="ugclab-input mt-1 w-full text-xs font-mono"
            value={featured}
            onChange={(e) => setFeatured(e.target.value)}
            placeholder="https://…"
          />
          <div className="mt-2">
            <MediaPicker onUploaded={(url) => setFeatured(url)} />
          </div>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Author</span>
          <input
            name="authorName"
            defaultValue={initial?.authorName ?? ""}
            className="ugclab-input mt-1 w-full"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Tags</span>
        <input
          name="tags"
          defaultValue={initial?.tags ?? ""}
          className="ugclab-input mt-1 w-full"
          placeholder="news, tips (comma-separated)"
        />
      </label>

      <div>
        <span className="text-sm font-medium text-zinc-700">Content</span>
        <div className="mt-1.5">
          <RichTextEditor
            name="body"
            defaultValue={initial?.body ?? ""}
            rows={compact ? 8 : 12}
          />
        </div>
      </div>

      <details className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700">
          SEO settings
        </summary>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs text-zinc-600">Meta title</span>
            <input
              name="metaTitle"
              defaultValue={initial?.metaTitle ?? ""}
              className="ugclab-input mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-600">Meta description</span>
            <textarea
              name="metaDescription"
              rows={2}
              defaultValue={initial?.metaDescription ?? ""}
              className="ugclab-input mt-1 w-full"
            />
          </label>
          <div>
            <span className="text-xs text-zinc-600">Open Graph image</span>
            <input type="hidden" name="ogImageUrl" value={ogImage} />
            <input
              className="ugclab-input mt-1 w-full text-xs font-mono"
              value={ogImage}
              onChange={(e) => setOgImage(e.target.value)}
            />
            <div className="mt-2">
              <MediaPicker onUploaded={(url) => setOgImage(url)} />
            </div>
          </div>
          <label className="block">
            <span className="text-xs text-zinc-600">Canonical URL (optional)</span>
            <input
              name="canonicalUrl"
              defaultValue={initial?.canonicalUrl ?? ""}
              className="ugclab-input mt-1 w-full font-mono text-sm"
              placeholder="https://…"
            />
          </label>
        </div>
      </details>
    </div>
  );
}

export function formDataToPageBody(fd: FormData): Record<string, unknown> {
  const publishAt = String(fd.get("publishAt") ?? "").trim();
  return {
    title: fd.get("title"),
    slug: fd.get("slug"),
    body: fd.get("body"),
    pageType: fd.get("pageType"),
    published: fd.get("published") === "on",
    publishAt: publishAt || "",
    excerpt: fd.get("excerpt"),
    featuredImageUrl: fd.get("featuredImageUrl"),
    authorName: fd.get("authorName"),
    tags: fd.get("tags"),
    metaTitle: fd.get("metaTitle"),
    metaDescription: fd.get("metaDescription"),
    ogImageUrl: fd.get("ogImageUrl"),
    canonicalUrl: fd.get("canonicalUrl"),
    noindex: fd.get("noindex") === "on",
  };
}
