import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { FormAlert } from "@/components/form-alert";
import {
  PageFormFields,
  formDataToPageBody,
} from "@/components/page-form-fields";
import { useAuth } from "@/context/auth";
import { getPagePreviewUrl } from "@/lib/page-preview";
import type { StorePageDetail } from "@/lib/store-page-types";

export default function PageEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { tenant } = useAuth();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});

  const { data, isLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: () => api.pages(),
  });

  const page = ((data?.pages ?? []) as StorePageDetail[]).find((p) => p.id === id);

  if (isLoading) return <p className="text-zinc-500">Loading…</p>;
  if (!page) {
    return (
      <AdminPageShell title="Page not found">
        <Link to="/pages" className="text-sm text-violet-600">
          ← Back
        </Link>
      </AdminPageShell>
    );
  }

  const initial = {
    title: page.title,
    slug: page.slug,
    pageType: page.pageType,
    published: page.published,
    publishAt: page.publishAt
      ? new Date(page.publishAt).toISOString().slice(0, 16)
      : "",
    body: page.body,
    excerpt: page.excerpt ?? "",
    featuredImageUrl: page.featuredImageUrl ?? "",
    authorName: page.authorName ?? "",
    tags: page.tags.join(", "),
    metaTitle: page.metaTitle ?? "",
    metaDescription: page.metaDescription ?? "",
    ogImageUrl: page.ogImageUrl ?? "",
    canonicalUrl: page.canonicalUrl ?? "",
    noindex: page.noindex,
  };

  return (
    <AdminPageShell
      crumbs={[
        { label: "Pages & blog", to: "/pages" },
        { label: page.title },
      ]}
      title={`Edit ${page.title}`}
      actions={
        tenant ? (
          <a
            href={getPagePreviewUrl(tenant.slug, page)}
            target="_blank"
            rel="noreferrer"
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            Preview on store
          </a>
        ) : null
      }
    >
      <FormAlert ok={alert.ok} message={alert.message} />
      <form
        className="admin-card space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            await api.updatePage(page.id, formDataToPageBody(fd));
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
        <PageFormFields initial={initial} />
        <div className="flex flex-wrap gap-3 pt-2">
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
    </AdminPageShell>
  );
}
