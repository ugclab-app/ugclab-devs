import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import {
  PageFormFields,
  formDataToPageBody,
} from "@/components/page-form-fields";
import { FormAlert } from "@/components/form-alert";
import { useAuth } from "@/context/auth";
import { PAGE_TEMPLATES } from "@/lib/page-templates";
import { getPagePreviewUrl } from "@/lib/page-preview";
import type { PageTemplate } from "@/lib/page-templates";
import type { StorePageDetail } from "@/lib/store-page-types";

type StorePageRow = Pick<
  StorePageDetail,
  | "id"
  | "title"
  | "slug"
  | "pageType"
  | "published"
  | "status"
  | "authorName"
  | "tags"
  | "updatedAt"
>;

const FILTERS = [
  { key: "", label: "All" },
  { key: "type=PAGE", label: "Pages" },
  { key: "type=BLOG", label: "Blog" },
  { key: "status=draft", label: "Draft" },
  { key: "status=scheduled", label: "Scheduled" },
  { key: "status=published", label: "Published" },
] as const;

function statusBadge(status: StorePageRow["status"]) {
  const styles = {
    draft: "bg-zinc-100 text-zinc-700",
    scheduled: "bg-amber-50 text-amber-800",
    published: "bg-emerald-50 text-emerald-800",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default function PagesPage() {
  const { tenant } = useAuth();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [template, setTemplate] = useState<PageTemplate | null>(null);
  const [formKey, setFormKey] = useState(0);

  const queryKey = ["pages", params.toString()];
  const listParams = new URLSearchParams();
  const type = params.get("type");
  const status = params.get("status");
  if (type) listParams.set("type", type);
  if (status) listParams.set("status", status);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.pages(listParams.toString() ? listParams : undefined),
  });

  const pages = (data?.pages ?? []) as StorePageRow[];

  const templateInitial = useMemo(() => {
    if (!template) return undefined;
    return {
      title: template.title,
      slug: template.slug,
      pageType: template.pageType,
      body: template.body,
      excerpt: template.excerpt ?? "",
      published: false,
    };
  }, [template, formKey]);

  return (
    <AdminPageShell
      title="Pages & blog"
      description="Static pages, blog posts, SEO, and scheduled publishing."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active =
            (f.key === "" && !type && !status) ||
            f.key === `type=${type}` ||
            f.key === `status=${status}`;
          return (
            <button
              key={f.key || "all"}
              type="button"
              onClick={() => {
                const next = new URLSearchParams();
                if (f.key.startsWith("type=")) next.set("type", f.key.split("=")[1]!);
                if (f.key.startsWith("status="))
                  next.set("status", f.key.split("=")[1]!);
                setParams(next);
              }}
              className={`rounded-full px-3 py-1 text-sm ${
                active
                  ? "bg-violet-600 text-white"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-sm text-zinc-500 self-center">Templates:</span>
        {PAGE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:border-violet-300"
            onClick={() => {
              setTemplate(t);
              setFormKey((k) => k + 1);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <FormAlert ok={alert.ok} message={alert.message} />
          {isLoading ? (
            <p className="text-zinc-500">Loading…</p>
          ) : pages.length === 0 ? (
            <p className="admin-card p-6 text-zinc-500">No pages yet. Create one →</p>
          ) : (
            <ul className="admin-card divide-y">
              {pages.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{p.title}</p>
                      {statusBadge(p.status)}
                      <span className="text-xs text-zinc-400">
                        {p.pageType === "BLOG" ? "Blog" : "Page"}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 font-mono">
                      /{p.pageType === "BLOG" ? "blog" : "pages"}/{p.slug}
                    </p>
                    {p.tags.length > 0 ? (
                      <p className="mt-1 text-xs text-zinc-400">
                        {p.tags.map((t) => `#${t}`).join(" ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {tenant ? (
                      <a
                        href={getPagePreviewUrl(tenant.slug, p)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-600 hover:underline"
                      >
                        Preview
                      </a>
                    ) : null}
                    <Link to={`/pages/${p.id}/edit`} className="text-violet-600">
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="text-zinc-600"
                      onClick={async () => {
                        await api.duplicatePage(p.id);
                        await qc.invalidateQueries({ queryKey: ["pages"] });
                        setAlert({ ok: true, message: "Duplicated as draft" });
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Delete “${p.title}”? This cannot be undone.`
                          )
                        ) {
                          return;
                        }
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
          )}
        </div>

        <div className="lg:col-span-2">
          <form
            key={formKey}
            className="admin-card space-y-4 p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              try {
                await api.createPage(formDataToPageBody(fd));
                await qc.invalidateQueries({ queryKey: ["pages"] });
                setTemplate(null);
                setFormKey((k) => k + 1);
                setAlert({ ok: true, message: "Page created" });
                e.currentTarget.reset();
              } catch (err) {
                setAlert({
                  ok: false,
                  message: err instanceof Error ? err.message : "Create failed",
                });
              }
            }}
          >
            <h2 className="font-semibold text-zinc-900">New page or post</h2>
            <PageFormFields initial={templateInitial} slugAuto />
            <button type="submit" className="ugclab-btn ugclab-btn-primary w-full">
              Create
            </button>
          </form>
        </div>
      </div>
    </AdminPageShell>
  );
}
