import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type Draft = {
  id: string;
  title: string;
  caption: string;
  hashtags: string;
  imageUrl: string | null;
  format: string;
  updatedAt: string;
};

const STARTERS: { label: string; title: string; caption: string; hashtags: string }[] = [
  {
    label: "Open a store",
    title: "Open a store",
    caption:
      "Open a store and get paid.\n\nTescommerce is the shop, the checkout, and the payout in one place. Start free.",
    hashtags: "#ecommerce #onlinestore #tescommerce",
  },
  {
    label: "For sellers",
    title: "Your own shop",
    caption:
      "Still selling only in DMs?\n\nGive the shop its own page, take the payment, and keep the customer.",
    hashtags: "#smallbusiness #sellonline #tescommerce",
  },
];

const FRAME: Record<string, string> = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  story: "aspect-[9/16]",
};

export default function InstagramPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["instagram-posts"], queryFn: () => api.instagramPosts() });
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [format, setFormat] = useState("square");
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function load(post: Draft) {
    setId(post.id);
    setTitle(post.title);
    setCaption(post.caption);
    setHashtags(post.hashtags);
    setImageUrl(post.imageUrl ?? "");
    setFormat(post.format);
    setNotice(null);
    setCopied(false);
  }

  function blank() {
    setId(null);
    setTitle("");
    setCaption("");
    setHashtags("");
    setImageUrl("");
    setFormat("square");
    setNotice(null);
    setCopied(false);
  }

  const packed = [caption.trim(), hashtags.trim()].filter(Boolean).join("\n\n");

  async function copyCaption() {
    await navigator.clipboard.writeText(packed);
    setCopied(true);
  }

  async function save() {
    setNotice(null);
    try {
      const res = await api.saveInstagramPost(
        { title, caption, hashtags, imageUrl, format },
        id ?? undefined
      );
      setId(res.post.id);
      setNotice("Draft saved. Copy the caption and paste it into Instagram.");
      await qc.invalidateQueries({ queryKey: ["instagram-posts"] });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not save.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Instagram</h1>
        <p className="mt-1 text-sm text-slate-500">
          Write the post here, then copy it into the Instagram app. Nothing is published from Tescommerce.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="platform-card space-y-3 p-6">
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((starter) => (
              <button
                key={starter.label}
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                onClick={() => {
                  setTitle(starter.title);
                  setCaption(starter.caption);
                  setHashtags(starter.hashtags);
                  setCopied(false);
                }}
              >
                {starter.label}
              </button>
            ))}
          </div>
          <label className="block text-sm">
            Draft name
            <input className="ugclab-input mt-1 w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block text-sm">
            Caption
            <textarea
              className="ugclab-input mt-1 w-full"
              rows={8}
              maxLength={2200}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <span className="mt-1 block text-xs text-slate-400">{caption.length}/2200</span>
          </label>
          <label className="block text-sm">
            Hashtags
            <input
              className="ugclab-input mt-1 w-full"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#ecommerce #tescommerce"
            />
          </label>
          <label className="block text-sm">
            Image URL
            <input
              className="ugclab-input mt-1 w-full"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://"
            />
          </label>
          <label className="block text-sm">
            Frame
            <select
              className="ugclab-input mt-1 w-full"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="square">Feed square</option>
              <option value="portrait">Feed portrait</option>
              <option value="story">Story</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ugclab-btn ugclab-btn-primary text-sm" onClick={() => void save()}>
              {id ? "Update draft" : "Save draft"}
            </button>
            <button
              type="button"
              className="ugclab-btn border border-slate-200 bg-white text-sm"
              disabled={!packed}
              onClick={() => void copyCaption()}
            >
              {copied ? "Copied" : "Copy caption"}
            </button>
            <button type="button" className="text-sm text-slate-500 underline" onClick={blank}>
              New draft
            </button>
          </div>
          {notice ? <p className="text-sm text-slate-700">{notice}</p> : null}
        </section>

        <aside className="platform-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
          <div className={`overflow-hidden rounded-2xl bg-zinc-100 ${FRAME[format] ?? FRAME.square}`}>
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">Image</div>
            )}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{packed || "Caption"}</p>
        </aside>
      </div>

      <QueryState query={query}>
        {(data) => (
          <section className="platform-card p-6">
            <h2 className="font-semibold">Saved drafts</h2>
            {data.posts.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No drafts yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {data.posts.map((post) => (
                  <li key={post.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <button type="button" className="text-left" onClick={() => load(post)}>
                      <span className="font-medium text-sky-700">{post.title}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        {new Date(post.updatedAt).toLocaleString()}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      onClick={async () => {
                        await api.deleteInstagramPost(post.id);
                        if (id === post.id) blank();
                        await qc.invalidateQueries({ queryKey: ["instagram-posts"] });
                      }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </QueryState>
    </div>
  );
}
