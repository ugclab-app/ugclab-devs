import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { SiteBuilder } from "@/components/site-builder/site-builder";
import {
  parseStoreTheme,
  type HomeBlock,
  type StoreTheme,
} from "@ugclab/tenant/store-theme";
import type { PageStyleState } from "@/components/site-builder/page-style-panel";
import { useAuth } from "@/context/auth";

export default function PageBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant } = useAuth();
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);
  const homeBlocksRef = useRef<HomeBlock[]>([]);
  const pageStyleRef = useRef<PageStyleState>({
    blockGap: "md",
    scrollAnimation: "none",
  });

  const { data: pagesData } = useQuery({
    queryKey: ["pages"],
    queryFn: () => api.pages(),
  });
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.settings(),
  });

  const page = ((pagesData?.pages ?? []) as Array<{ id: string; slug: string; title: string }>).find(
    (p) => p.id === id
  );

  if (!tenant || !page) {
    return <p className="text-zinc-500">Page not found.</p>;
  }

  const s = settingsData as Record<string, unknown> | undefined;
  const draftTheme = parseStoreTheme(
    (s?.themeDraft as unknown) ?? (tenant.settings as { themeDraft?: unknown })?.themeDraft ?? s?.theme
  );
  const slug = page.slug;
  const existing = draftTheme.pageBlocks?.[slug] ?? [];
  if (homeBlocksRef.current.length === 0 && existing.length > 0) {
    homeBlocksRef.current = existing;
  }

  async function saveBlocks() {
    setPending(true);
    try {
      const pageBlocks = { ...(draftTheme.pageBlocks ?? {}), [slug]: homeBlocksRef.current };
      await api.updateSettings({
        themeDraft: {
          ...draftTheme,
          pageBlocks,
        } as StoreTheme,
      });
      await qc.invalidateQueries({ queryKey: ["settings"] });
      setAlert({ ok: true, message: "Page layout saved to draft" });
    } catch (e) {
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setPending(false);
    }
  }

  const pseudoTheme: StoreTheme = {
    ...draftTheme,
    homeBlocks: homeBlocksRef.current.length ? homeBlocksRef.current : existing,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to={`/pages/${page.id}`} className="text-sm text-violet-600">
            ← {page.title}
          </Link>
          <h1 className="text-2xl font-bold">Visual page builder</h1>
          <p className="text-sm text-zinc-500">
            /pages/{slug} — blocks replace the HTML body when published.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          className="ugclab-btn ugclab-btn-primary"
          onClick={() => void saveBlocks()}
        >
          {pending ? "Saving…" : "Save page layout"}
        </button>
      </div>
      <FormAlert ok={alert.ok} message={alert.message} />
      <SiteBuilder
        theme={pseudoTheme}
        primaryColor={(tenant.settings as { primaryColor?: string })?.primaryColor ?? "#7c3aed"}
        storeName={tenant.name}
        onBlocksChange={(blocks) => {
          homeBlocksRef.current = blocks;
        }}
        pageStyle={pageStyleRef.current}
        onPageStyleChange={(patch) => Object.assign(pageStyleRef.current, patch)}
      />
    </div>
  );
}
