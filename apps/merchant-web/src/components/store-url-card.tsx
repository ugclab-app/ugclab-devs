import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { CopyStoreUrl } from "@/components/copy-store-url";
import {
  getStorefrontDisplayHost,
  getStorefrontUrl,
} from "@/lib/storefront";
import { markStoreUrlStepDone } from "@/lib/onboarding-store-url";

type Domain = { id: string; domain: string; verified: boolean };

export function StoreUrlCard({ tenantSlug }: { tenantSlug: string }) {
  const storeUrl = getStorefrontUrl(tenantSlug);
  const displayHost = getStorefrontDisplayHost(tenantSlug);

  const { data } = useQuery({
    queryKey: ["domains"],
    queryFn: () => api.domains(),
  });

  const verified = ((data?.domains ?? []) as Domain[]).filter((d) => d.verified);

  return (
    <div className="admin-card overflow-hidden">
      <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-4">
        <h2 className="font-semibold text-zinc-900">Your store address</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Free subdomain — share this link with customers right away.
        </p>
      </div>
      <div className="space-y-4 px-6 py-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Default URL
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-violet-700">
            {displayHost}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-zinc-500">{storeUrl}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <CopyStoreUrl
            url={storeUrl}
            onCopied={() => markStoreUrlStepDone(tenantSlug)}
          />
          <a
            href={storeUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => markStoreUrlStepDone(tenantSlug)}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            Open store
          </a>
        </div>

        {verified.length > 0 ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
            <p className="font-medium text-emerald-900">Custom domains</p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-emerald-800">
              {verified.map((d) => (
                <li key={d.id}>
                  <a
                    href={`https://${d.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    https://{d.domain}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">
            Use your own domain?{" "}
            <Link
              to="/settings?tab=domain"
              className="font-semibold text-violet-600 hover:underline"
            >
              Connect custom domain
            </Link>{" "}
            <span className="text-zinc-400">(optional)</span>
          </p>
        )}
      </div>
    </div>
  );
}
