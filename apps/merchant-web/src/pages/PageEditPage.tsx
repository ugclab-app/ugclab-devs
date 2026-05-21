import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { RichTextEditor } from "@/components/rich-text-editor";

export default function PageEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});

  const { data, isLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: () => api.pages(),
  });

  const page = ((data?.pages ?? []) as Array<{
    id: string;
    title: string;
    slug: string;
    body: string;
    pageType: string;
    published: boolean;
  }>).find((p) => p.id === id);

  if (isLoading) return <p className="text-zinc-500">Loading…</p>;
  if (!page) return <p className="text-zinc-500">Page not found.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/pages" className="text-sm text-violet-600">
        ← Pages & blog
      </Link>
      <h1 className="text-2xl font-bold">Edit {page.title}</h1>
      <FormAlert ok={alert.ok} message={alert.message} />
      <form
        className="admin-card space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            await api.updatePage(page.id, {
              title: fd.get("title"),
              slug: fd.get("slug"),
              body: fd.get("body"),
              pageType: fd.get("pageType"),
              published: fd.get("published") === "on",
            });
            await qc.invalidateQueries({ queryKey: ["pages"] });
            setAlert({ ok: true, message: "Saved" });
          } catch (err) {
            setAlert({
              ok: false,
              message: err instanceof Error ? err.message : "Save failed",
            });
          }
        }}
      >
        <input name="title" defaultValue={page.title} required className="ugclab-input" />
        <input name="slug" defaultValue={page.slug} className="ugclab-input font-mono" />
        <select name="pageType" defaultValue={page.pageType} className="ugclab-select">
          <option value="PAGE">Page</option>
          <option value="BLOG">Blog post</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" defaultChecked={page.published} />
          Published
        </label>
        <div>
          <span className="text-sm font-medium text-zinc-700">Content</span>
          <div className="mt-1.5">
            <RichTextEditor name="body" defaultValue={page.body} rows={14} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/pages/${page.id}/builder`}
            className="ugclab-btn border border-violet-300 bg-violet-50 text-violet-800"
          >
            Visual builder
          </Link>
          <button type="submit" className="ugclab-btn ugclab-btn-primary">
            Save
          </button>
          <button
            type="button"
            className="ugclab-btn border border-zinc-200 bg-white"
            onClick={() => navigate("/pages")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
