import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { RichTextEditor } from "@/components/rich-text-editor";

export default function PagesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["pages"], queryFn: () => api.pages() });
  const pages = (data?.pages ?? []) as {
    id: string;
    title: string;
    slug: string;
    pageType: string;
    published: boolean;
  }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pages & blog</h1>
      <form
        className="admin-card grid gap-3 p-6 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await api.createPage({
            title: fd.get("title"),
            slug: fd.get("slug"),
            body: fd.get("body"),
            pageType: fd.get("pageType"),
          });
          await qc.invalidateQueries({ queryKey: ["pages"] });
          e.currentTarget.reset();
        }}
      >
        <input name="title" placeholder="Title" required className="ugclab-input" />
        <input name="slug" placeholder="slug" className="ugclab-input font-mono" />
        <select name="pageType" className="ugclab-select">
          <option value="PAGE">Page</option>
          <option value="BLOG">Blog post</option>
        </select>
        <div className="sm:col-span-2">
          <RichTextEditor name="body" defaultValue="" rows={6} />
        </div>
        <button type="submit" className="ugclab-btn ugclab-btn-primary sm:col-span-2">
          Create
        </button>
      </form>
      <ul className="admin-card divide-y">
        {pages.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-zinc-500">
                /{p.pageType === "BLOG" ? "blog" : "pages"}/{p.slug}
              </p>
            </div>
            <div className="flex gap-3">
              <Link to={`/pages/${p.id}/edit`} className="text-sm text-violet-600">
                Edit
              </Link>
              <button
              type="button"
              className="text-sm text-red-600"
              onClick={async () => {
                await api.deletePage(p.id);
                await qc.invalidateQueries({ queryKey: ["pages"] });
              }}
            >
              Delete
            </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
